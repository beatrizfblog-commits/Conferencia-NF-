import {
  ExtractedDocument,
  ExtractedDocumentSchema,
} from "../../domain/documents/extraction-schema";
import { buildExtractionSystemPrompt } from "./prompts";

export interface DocumentExtractor {
  extractDocument(
    imageOrPdfBase64: string,
    mimeType: string,
    documentType: "purchase_order" | "invoice"
  ): Promise<ExtractedDocument>;
}

export class GroqDocumentExtractor implements DocumentExtractor {
  private apiKey: string;
  private model: string;
  private apiUrl: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || "";
    this.model = model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    if (!this.apiKey) {
      throw new Error(
        "Chave da API Groq não configurada. Defina a variável GROQ_API_KEY no arquivo .env.local."
      );
    }
  }

  async extractDocument(
    imageOrPdfBase64: string,
    mimeType: string,
    documentType: "purchase_order" | "invoice"
  ): Promise<ExtractedDocument> {
    const systemPrompt = buildExtractionSystemPrompt(documentType);

    // Garante formato data URL de imagem (se for PDF, o cliente já deve ter renderizado para JPEG)
    const effectiveMime = mimeType === "application/pdf" ? "image/jpeg" : mimeType;
    const dataUrl = imageOrPdfBase64.startsWith("data:")
      ? imageOrPdfBase64
      : `data:${effectiveMime};base64,${imageOrPdfBase64}`;

    const payload = {
      model: this.model,
      temperature: 0.1,
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise o documento anexo (${
                documentType === "purchase_order" ? "Ordem de Compra" : "Nota Fiscal"
              }) e retorne estritamente o JSON com os campos solicitados no formato {"documentType": "${documentType}", ...}.`,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
    };

    // Tenta até 3 vezes se receber HTTP 429 (Rate Limit temporário)
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 429 && attempt < 3) {
          const errorText = await response.text();
          const match = errorText.match(/try again in ([0-9.]+)s/i);
          const waitSeconds = match ? Math.ceil(parseFloat(match[1])) + 1 : 7;
          console.warn(
            `[Groq Rate Limit] Aguardando ${waitSeconds}s para retentar (tentativa ${attempt}/3)...`
          );
          await new Promise((res) => setTimeout(res, waitSeconds * 1000));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Groq API Error (HTTP ${response.status}):`, errorText);
          let detail = "Erro no processamento da imagem.";
          try {
            const errJson = JSON.parse(errorText);
            if (errJson.error?.message) {
              detail = errJson.error.message;
            }
          } catch {}
          throw new Error(
            `Falha ao comunicar com o serviço de visão Groq (HTTP ${response.status}): ${detail}`
          );
        }

        const json = await response.json();
        const rawContent = json.choices?.[0]?.message?.content;

        if (!rawContent) {
          throw new Error("O provedor de IA não retornou conteúdo legível para o documento.");
        }

        // Extrai o JSON do conteúdo (inclusive se houver blocos de markdown ou tags de reasoning)
        const parsedObj = this.extractJson(rawContent);

        // Valida pelo Schema Zod
        const parseResult = ExtractedDocumentSchema.safeParse(parsedObj);

        if (!parseResult.success) {
          const normalized = this.normalizeExtractedKeys(parsedObj, documentType);
          const secondAttempt = ExtractedDocumentSchema.safeParse(normalized);
          if (secondAttempt.success) {
            return secondAttempt.data;
          }

          // Fallback resiliente
          return {
            documentType,
            documentNumber: (parsedObj as any)?.documentNumber ?? null,
            supplier: (parsedObj as any)?.supplier ?? null,
            recipient: (parsedObj as any)?.recipient ?? null,
            paymentTerms: (parsedObj as any)?.paymentTerms ?? null,
            items: Array.isArray((parsedObj as any)?.items) ? (parsedObj as any).items : [],
            totals: (parsedObj as any)?.totals ?? null,
            purchaseOrderReferences: Array.isArray((parsedObj as any)?.purchaseOrderReferences)
              ? (parsedObj as any).purchaseOrderReferences
              : [],
            overallStatus: "found",
            warnings: ["Extração parcial realizada com sucesso."],
          };
        }

        return parseResult.data;
      } catch (err: any) {
        lastError = err;
        if (attempt < 2 && err.message?.includes("429")) {
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error("Falha ao processar o documento fiscal.");
  }

  private extractJson(content: string): any {
    // 1. Remove eventuais tags <think>...</think> do modelo
    const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // 2. Tenta extrair de bloco markdown ```json ... ``` ou ``` ... ```
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {}
    }

    // 3. Procura delimitadores JSON { ... }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {}
    }

    // 4. Última tentativa parse direto
    return JSON.parse(cleaned);
  }

  private normalizeExtractedKeys(obj: any, documentType: "purchase_order" | "invoice"): any {
    if (!obj || typeof obj !== "object") return obj;

    return {
      documentType,
      documentNumber: obj.documentNumber || obj.document_number || null,
      supplier: obj.supplier || null,
      recipient: obj.recipient || null,
      paymentTerms: obj.paymentTerms || obj.payment_terms || null,
      items: Array.isArray(obj.items)
        ? obj.items.map((it: any) => ({
            lineNumber: it.lineNumber || it.line_number || null,
            productCode: it.productCode || it.product_code || null,
            description: it.description || "",
            unit: it.unit || null,
            quantity: it.quantity ? String(it.quantity) : null,
            unitPrice: it.unitPrice || it.unit_price ? String(it.unitPrice || it.unit_price) : null,
            discount: it.discount ? String(it.discount) : "0.00",
            lineTotal: it.lineTotal || it.line_total ? String(it.lineTotal || it.line_total) : null,
            status: "found",
          }))
        : [],
      totals: {
        products: obj.totals?.products ? String(obj.totals.products) : null,
        freight: obj.totals?.freight ? String(obj.totals.freight) : null,
        insurance: obj.totals?.insurance ? String(obj.totals.insurance) : null,
        discount: obj.totals?.discount ? String(obj.totals.discount) : null,
        otherExpenses:
          obj.totals?.otherExpenses || obj.totals?.other_expenses
            ? String(obj.totals.otherExpenses || obj.totals.other_expenses)
            : null,
        ipi: obj.totals?.ipi ? String(obj.totals.ipi) : null,
        invoiceTotal:
          obj.totals?.invoiceTotal || obj.totals?.invoice_total
            ? String(obj.totals.invoiceTotal || obj.totals.invoice_total)
            : null,
      },
      purchaseOrderReferences: Array.isArray(obj.purchaseOrderReferences)
        ? obj.purchaseOrderReferences
        : Array.isArray(obj.purchase_order_references)
        ? obj.purchase_order_references
        : [],
      overallStatus: "found",
      warnings: [],
    };
  }
}
