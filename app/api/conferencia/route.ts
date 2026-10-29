import { NextRequest, NextResponse } from "next/server";
import { GroqDocumentExtractor } from "@/src/infrastructure/groq/groq-document-extractor";
import { ProcessDocumentsUseCase } from "@/src/application/use-cases/process-documents";

export const maxDuration = 60; // Permite até 60 segundos de timeout na Vercel

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      purchaseOrder,
      invoice,
      priceTolerance = 0.99,
      totalTolerance = 0.99,
    } = body;

    if (!purchaseOrder || !invoice) {
      return NextResponse.json(
        {
          error: "Ambos os documentos (Ordem de Compra e Nota Fiscal) são obrigatórios.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const extractor = new GroqDocumentExtractor();
    const useCase = new ProcessDocumentsUseCase(extractor);

    const result = await useCase.execute({
      purchaseOrderImageBase64: purchaseOrder.data,
      purchaseOrderMimeType: purchaseOrder.mimeType || "image/jpeg",
      invoiceImageBase64: invoice.data,
      invoiceMimeType: invoice.mimeType || "image/jpeg",
      options: {
        priceTolerance: Number(priceTolerance),
        totalTolerance: Number(totalTolerance),
      },
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("Erro na conferência de documentos:", error.message || error);

    const isClientError = error.message?.includes("obrigatório") || error.message?.includes("inválid");
    const statusCode = isClientError ? 400 : 502;

    return NextResponse.json(
      {
        status: "processing_failed",
        error: error.message || "Erro interno ao processar a conferência.",
      },
      {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
