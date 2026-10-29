import { DocumentExtractor } from "../../infrastructure/groq/groq-document-extractor";
import { compareDocuments, CompareDocumentsOptions } from "../../domain/comparison/compare-documents";
import { ConferenceResult } from "../../domain/documents/comparison-types";

export type ProcessDocumentsInput = {
  purchaseOrderImageBase64: string;
  purchaseOrderMimeType: string;
  invoiceImageBase64: string;
  invoiceMimeType: string;
  options?: CompareDocumentsOptions;
};

export class ProcessDocumentsUseCase {
  constructor(private extractor: DocumentExtractor) {}

  async execute(input: ProcessDocumentsInput): Promise<ConferenceResult> {
    if (!input.purchaseOrderImageBase64) {
      throw new Error("Arquivo da Ordem de Compra (OC) é obrigatório.");
    }
    if (!input.invoiceImageBase64) {
      throw new Error("Arquivo da Nota Fiscal (NF-e) é obrigatório.");
    }

    // Executa as duas extrações sequencialmente para não estourar o limite de tokens/min da Groq
    const extractedPo = await this.extractor.extractDocument(
      input.purchaseOrderImageBase64,
      input.purchaseOrderMimeType,
      "purchase_order"
    );

    // Pausa preventiva de 1.5s entre as chamadas para respeitar o rate-limit da API
    await new Promise((res) => setTimeout(res, 1500));

    const extractedInvoice = await this.extractor.extractDocument(
      input.invoiceImageBase64,
      input.invoiceMimeType,
      "invoice"
    );

    // Executa o motor determinístico de comparação com as regras de negócio
    const result = compareDocuments(extractedPo, extractedInvoice, input.options);

    return result;
  }
}
