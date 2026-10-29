import { describe, it, expect } from "vitest";
import { compareDocuments } from "../../src/domain/comparison/compare-documents";
import { ExtractedDocument } from "../../src/domain/documents/extraction-schema";

describe("compareDocuments - End to end domain test", () => {
  it("should match Appendix A scenario with payment terms divergence", () => {
    // Documentos do Apêndice A do PRD:
    // OC nº 5.738 vs NF-e nº 22.156
    const mockPo: ExtractedDocument = {
      documentType: "purchase_order",
      documentNumber: "5738",
      supplier: {
        name: "D'GICON MAQUINAS E SUPRIMENTOS PARA ESCRITORIOS LTDA",
        cnpj: "25.682.279/0001-61",
      },
      recipient: {
        name: "WLM PARTICIPAÇÕES E COMÉRCIO",
        cnpj: "33.228.024/0004-02",
      },
      paymentTerms: {
        rawText: "7 DIAS",
        days: 7,
        status: "found",
      },
      items: [
        {
          lineNumber: 1,
          productCode: "10020272",
          description: "CALCULADORA DE MESA 12 DIGITOS",
          unit: "UN",
          quantity: "2.00",
          unitPrice: "38.00",
          discount: "0.00",
          lineTotal: "76.00",
          status: "found",
          sourcePage: 1,
        },
      ],
      totals: {
        products: "76.00",
        freight: "0.00",
        insurance: null,
        discount: "0.00",
        otherExpenses: null,
        ipi: "0.00",
        invoiceTotal: "76.00",
      },
      purchaseOrderReferences: [],
      overallStatus: "found",
      warnings: [],
    };

    const mockInvoice: ExtractedDocument = {
      documentType: "invoice",
      documentNumber: "22156",
      supplier: {
        name: "D'GICON MAQUINAS E SUPRIMENTOS PARA ESCRITORIOS LTDA",
        cnpj: "25682279000161",
      },
      recipient: {
        name: "WLM PARTICIPAÇÕES E COMÉRCIO",
        cnpj: "33228024000402",
      },
      paymentTerms: {
        rawText: "28 DIAS",
        days: 28,
        status: "found",
      },
      items: [
        {
          lineNumber: 1,
          productCode: "10020272",
          description: "CALCULADORA DE MESA 12 DIGITOS",
          unit: "UN",
          quantity: "2",
          unitPrice: "38.00",
          discount: "0.00",
          lineTotal: "76.00",
          status: "found",
          sourcePage: 1,
        },
      ],
      totals: {
        products: "76.00",
        freight: "0.00",
        insurance: null,
        discount: "0.00",
        otherExpenses: null,
        ipi: "0.00",
        invoiceTotal: "76.00",
      },
      purchaseOrderReferences: ["Ref OC 5738", "Chave de Acesso"],
      overallStatus: "found",
      warnings: [],
    };

    const result = compareDocuments(mockPo, mockInvoice, {
      priceTolerance: 0.99,
      totalTolerance: 0.99,
    });

    // Deve acusar divergência exclusivamente na condição de pagamento (7 dias vs 28 dias)
    expect(result.status).toBe("divergences_found");
    expect(result.summary.mismatched).toBe(1);

    const paymentFinding = result.findings.find((f) => f.id === "payment-terms");
    expect(paymentFinding).toBeDefined();
    expect(paymentFinding?.status).toBe("mismatch");
    expect(paymentFinding?.difference).toBe("7 DIAS vs 28 DIAS");

    // Todos os outros campos devem coincidir
    const cnpjSupplier = result.findings.find((f) => f.id === "cnpj-supplier");
    expect(cnpjSupplier?.status).toBe("match");

    const poRef = result.findings.find((f) => f.id === "po-reference");
    expect(poRef?.status).toBe("match");

    const totalInvoice = result.findings.find((f) => f.id === "total-invoice");
    expect(totalInvoice?.status).toBe("match");
  });
});
