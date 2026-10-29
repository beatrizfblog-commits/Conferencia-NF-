import { ExtractedDocument } from "../documents/extraction-schema";
import {
  ComparisonFinding,
  ComparisonSummary,
  ConferenceResult,
} from "../documents/comparison-types";
import { compareCnpj } from "./normalize-cnpj";
import { comparePoReference } from "./normalize-po-reference";
import {
  pairLineItems,
  compareLineItems,
  normalizeText,
} from "./match-line-items";
import { compareMoneyValues, formatBRL } from "./money";

export type CompareDocumentsOptions = {
  priceTolerance?: number | string;
  totalTolerance?: number | string;
};

export function compareDocuments(
  purchaseOrder: ExtractedDocument,
  invoice: ExtractedDocument,
  options: CompareDocumentsOptions = {}
): ConferenceResult {
  const priceTolerance = options.priceTolerance ?? 0.99;
  const totalTolerance = options.totalTolerance ?? 0.99;

  const findings: ComparisonFinding[] = [];

  // 1. CNPJ do Fornecedor / Emitente
  const supplierCnpjComp = compareCnpj(
    purchaseOrder.supplier?.cnpj,
    invoice.supplier?.cnpj,
    "Fornecedor"
  );
  findings.push({
    id: "cnpj-supplier",
    code: `CNPJ_SUPPLIER_${supplierCnpjComp.status.toUpperCase()}`,
    label: "CNPJ do Fornecedor / Emitente",
    status: supplierCnpjComp.status,
    severity: supplierCnpjComp.severity,
    purchaseOrderValue: supplierCnpjComp.poCnpjFormatted,
    invoiceValue: supplierCnpjComp.invCnpjFormatted,
    difference: supplierCnpjComp.status === "match" ? null : "CNPJ divergente",
    explanation: supplierCnpjComp.explanation,
    requiresHumanReview: supplierCnpjComp.status !== "match",
  });

  // 2. CNPJ do Destinatário / Comprador (WLM)
  const recipientCnpjComp = compareCnpj(
    purchaseOrder.recipient?.cnpj,
    invoice.recipient?.cnpj,
    "Destinatário"
  );
  findings.push({
    id: "cnpj-recipient",
    code: `CNPJ_RECIPIENT_${recipientCnpjComp.status.toUpperCase()}`,
    label: "CNPJ do Destinatário",
    status: recipientCnpjComp.status,
    severity: recipientCnpjComp.severity,
    purchaseOrderValue: recipientCnpjComp.poCnpjFormatted,
    invoiceValue: recipientCnpjComp.invCnpjFormatted,
    difference: recipientCnpjComp.status === "match" ? null : "CNPJ divergente",
    explanation: recipientCnpjComp.explanation,
    requiresHumanReview: recipientCnpjComp.status !== "match",
  });

  // 3. Número da OC nas informações complementares da NF
  const poRefComp = comparePoReference(
    purchaseOrder.documentNumber,
    invoice.purchaseOrderReferences
  );
  findings.push({
    id: "po-reference",
    code: `PO_REFERENCE_${poRefComp.status.toUpperCase()}`,
    label: "Número da OC nas Inf. Complementares",
    status: poRefComp.status,
    severity: poRefComp.severity,
    purchaseOrderValue: poRefComp.expectedPoNumber,
    invoiceValue: poRefComp.foundInInvoice || "(Não encontrado)",
    difference: poRefComp.status === "match" ? null : "Referência divergente ou ausente",
    explanation: poRefComp.explanation,
    requiresHumanReview: poRefComp.status !== "match",
  });

  // 4. Comparação de Itens
  const itemPairs = pairLineItems(purchaseOrder.items, invoice.items);
  const itemFindings = compareLineItems(itemPairs, priceTolerance);
  findings.push(...itemFindings);

  // 5. Comparação de Totais da Nota
  if (purchaseOrder.totals && invoice.totals) {
    // Total dos Produtos
    if (purchaseOrder.totals.products && invoice.totals.products) {
      const prodTotalComp = compareMoneyValues(
        purchaseOrder.totals.products,
        invoice.totals.products,
        totalTolerance
      );
      findings.push({
        id: "total-products",
        code: `TOTAL_PRODUCTS_${prodTotalComp.status.toUpperCase()}`,
        label: "Valor Total dos Produtos",
        status: prodTotalComp.status,
        severity: prodTotalComp.status === "match" ? "info" : "high",
        purchaseOrderValue: formatBRL(purchaseOrder.totals.products),
        invoiceValue: formatBRL(invoice.totals.products),
        difference: prodTotalComp.difference,
        explanation: prodTotalComp.explanation,
        requiresHumanReview: prodTotalComp.status !== "match",
      });
    }

    // Total Geral da Nota
    if (purchaseOrder.totals.invoiceTotal && invoice.totals.invoiceTotal) {
      const invTotalComp = compareMoneyValues(
        purchaseOrder.totals.invoiceTotal,
        invoice.totals.invoiceTotal,
        totalTolerance
      );
      findings.push({
        id: "total-invoice",
        code: `TOTAL_INVOICE_${invTotalComp.status.toUpperCase()}`,
        label: "Valor Total da Nota Fiscal",
        status: invTotalComp.status,
        severity: invTotalComp.status === "match" ? "info" : "critical",
        purchaseOrderValue: formatBRL(purchaseOrder.totals.invoiceTotal),
        invoiceValue: formatBRL(invoice.totals.invoiceTotal),
        difference: invTotalComp.difference,
        explanation: invTotalComp.explanation,
        requiresHumanReview: invTotalComp.status !== "match",
      });
    }

    // Frete (se presente em ambos)
    if (purchaseOrder.totals.freight !== null && invoice.totals.freight !== null) {
      const freightComp = compareMoneyValues(
        purchaseOrder.totals.freight,
        invoice.totals.freight,
        totalTolerance
      );
      findings.push({
        id: "total-freight",
        code: `TOTAL_FREIGHT_${freightComp.status.toUpperCase()}`,
        label: "Valor do Frete",
        status: freightComp.status,
        severity: freightComp.status === "match" ? "info" : "medium",
        purchaseOrderValue: formatBRL(purchaseOrder.totals.freight),
        invoiceValue: formatBRL(invoice.totals.freight),
        difference: freightComp.difference,
        explanation: freightComp.explanation,
        requiresHumanReview: freightComp.status !== "match",
      });
    }
  }

  // 6. Condição de Pagamento (RF-035 & 6.7)
  const poPayText = purchaseOrder.paymentTerms?.rawText;
  const invPayText = invoice.paymentTerms?.rawText;
  const poPayDays = purchaseOrder.paymentTerms?.days;
  const invPayDays = invoice.paymentTerms?.days;

  if (poPayText || invPayText) {
    if (!poPayText || !invPayText) {
      findings.push({
        id: "payment-terms",
        code: "PAYMENT_TERMS_NOT_COMPARABLE",
        label: "Condição de Pagamento",
        status: "not_comparable",
        severity: "medium",
        purchaseOrderValue: poPayText || "(Não informado na OC)",
        invoiceValue: invPayText || "(Não informado na NF)",
        difference: "Dados insuficientes",
        explanation: "Condição de pagamento presente em apenas um dos documentos.",
        requiresHumanReview: true,
      });
    } else {
      const normPoPay = normalizeText(poPayText);
      const normInvPay = normalizeText(invPayText);

      // Compara por dias ou por texto normalizado
      const daysMatch = poPayDays && invPayDays && poPayDays === invPayDays;
      const textMatch = normPoPay === normInvPay;

      if (daysMatch || textMatch) {
        findings.push({
          id: "payment-terms",
          code: "PAYMENT_TERMS_MATCH",
          label: "Condição de Pagamento",
          status: "match",
          severity: "info",
          purchaseOrderValue: poPayText,
          invoiceValue: invPayText,
          difference: null,
          explanation: `Condições de pagamento coincidentes (${poPayText}).`,
          requiresHumanReview: false,
        });
      } else {
        findings.push({
          id: "payment-terms",
          code: "PAYMENT_TERMS_MISMATCH",
          label: "Condição de Pagamento",
          status: "mismatch",
          severity: "high",
          purchaseOrderValue: poPayText,
          invoiceValue: invPayText,
          difference: `${poPayText} vs ${invPayText}`,
          explanation: `Divergência nas condições de pagamento: OC prevê "${poPayText}", enquanto a NF prevê "${invPayText}".`,
          requiresHumanReview: true,
        });
      }
    }
  }

  // 7. Sumário Geral
  let matched = 0;
  let mismatched = 0;
  let notComparable = 0;
  let manualReviewRequired = false;

  for (const f of findings) {
    if (f.status === "match") matched++;
    else if (f.status === "mismatch") mismatched++;
    else notComparable++;

    if (f.requiresHumanReview) manualReviewRequired = true;
  }

  let overallStatus: ComparisonSummary["overallStatus"] = "no_divergences_detected";
  let message = "Todos os campos conferidos coincidem dentro das tolerâncias.";

  if (mismatched > 0) {
    overallStatus = "divergences_found";
    message = `Foram identificadas ${mismatched} divergência(s) entre a Ordem de Compra e a Nota Fiscal.`;
  } else if (manualReviewRequired) {
    overallStatus = "manual_review_required";
    message = "Alguns campos exigem verificação e conferência manual do responsável.";
  }

  const summary: ComparisonSummary = {
    totalChecks: findings.length,
    matched,
    mismatched,
    notComparable,
    manualReviewRequired,
    overallStatus,
  };

  return {
    status: overallStatus,
    summary,
    findings,
    extractedPurchaseOrder: purchaseOrder,
    extractedInvoice: invoice,
    message,
  };
}
