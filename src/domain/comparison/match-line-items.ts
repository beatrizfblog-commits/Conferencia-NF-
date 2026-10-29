import { ExtractedItem } from "../documents/extraction-schema";
import { ComparisonFinding } from "../documents/comparison-types";
import { compareMoneyValues, formatBRL, parseMoneyToDecimal } from "./money";

export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ItemMatchPair = {
  poItem: ExtractedItem;
  invoiceItem: ExtractedItem | null;
  matchType: "exact_code" | "description_match" | "unmatched" | "ambiguous";
  confidence: number;
};

/**
 * Pareia itens da OC com itens da NF seguindo a ordem:
 * 1. Código exato do produto (se presente em ambos)
 * 2. Descrição normalizada + unidade
 */
export function pairLineItems(
  poItems: ExtractedItem[],
  invoiceItems: ExtractedItem[]
): ItemMatchPair[] {
  const availableInvoiceItems = [...invoiceItems];
  const pairs: ItemMatchPair[] = [];

  for (const poItem of poItems) {
    const poCode = poItem.productCode ? normalizeText(poItem.productCode) : null;
    const poDesc = normalizeText(poItem.description);
    const poUnit = normalizeText(poItem.unit);

    let matchedIdx = -1;
    let matchType: ItemMatchPair["matchType"] = "unmatched";
    let confidence = 0;

    // 1. Tenta correspondência por código
    if (poCode) {
      matchedIdx = availableInvoiceItems.findIndex((inv) => {
        const invCode = inv.productCode ? normalizeText(inv.productCode) : null;
        return invCode && invCode === poCode;
      });

      if (matchedIdx !== -1) {
        matchType = "exact_code";
        confidence = 1.0;
      }
    }

    // 2. Se não casou por código, tenta por descrição
    if (matchedIdx === -1 && poDesc) {
      const candidates = availableInvoiceItems
        .map((inv, idx) => ({
          idx,
          inv,
          invDesc: normalizeText(inv.description),
          invUnit: normalizeText(inv.unit),
        }))
        .filter((c) => {
          // Casamento se uma descrição contiver a outra ou forem idênticas
          return (
            c.invDesc === poDesc ||
            (c.invDesc.length > 5 && poDesc.includes(c.invDesc)) ||
            (poDesc.length > 5 && c.invDesc.includes(poDesc))
          );
        });

      if (candidates.length === 1) {
        matchedIdx = candidates[0].idx;
        matchType = "description_match";
        confidence = candidates[0].invUnit === poUnit ? 0.9 : 0.75;
      } else if (candidates.length > 1) {
        // Ambiguidade: mais de um item compatível
        matchType = "ambiguous";
        confidence = 0.4;
      }
    }

    if (matchedIdx !== -1) {
      const matchedInvoice = availableInvoiceItems.splice(matchedIdx, 1)[0];
      pairs.push({
        poItem,
        invoiceItem: matchedInvoice,
        matchType,
        confidence,
      });
    } else {
      pairs.push({
        poItem,
        invoiceItem: null,
        matchType,
        confidence,
      });
    }
  }

  // Itens da NF que sobraram (não estavam na OC)
  for (const extraInv of availableInvoiceItems) {
    pairs.push({
      poItem: {
        productCode: null,
        description: "(Item não previsto na OC)",
        quantity: null,
        unit: null,
        unitPrice: null,
        lineTotal: null,
        status: "not_found",
      },
      invoiceItem: extraInv,
      matchType: "unmatched",
      confidence: 0,
    });
  }

  return pairs;
}

/**
 * Gera os findings de comparação de cada item
 */
export function compareLineItems(
  pairs: ItemMatchPair[],
  priceTolerance: number | string = 0.99
): ComparisonFinding[] {
  const findings: ComparisonFinding[] = [];

  pairs.forEach((pair, index) => {
    const itemNum = index + 1;
    const poDesc = pair.poItem.description || `Item OC #${itemNum}`;
    const invDesc = pair.invoiceItem?.description || "(Item não localizado na NF)";

    // Se o item não foi localizado na NF
    if (!pair.invoiceItem) {
      findings.push({
        id: `item-${itemNum}-missing`,
        code: `ITEM_${itemNum}_NOT_FOUND`,
        label: `Item #${itemNum}: ${poDesc}`,
        status: "mismatch",
        severity: "critical",
        purchaseOrderValue: `${poDesc} (${pair.poItem.quantity || "?"} ${pair.poItem.unit || ""})`,
        invoiceValue: "Não encontrado na NF",
        difference: "Item ausente na NF",
        explanation: `O item previsto na OC não foi localizado nos itens da Nota Fiscal.`,
        requiresHumanReview: true,
      });
      return;
    }

    // Se é um item extra na NF que não existia na OC
    if (pair.poItem.status === "not_found") {
      findings.push({
        id: `item-${itemNum}-extra-invoice`,
        code: `ITEM_${itemNum}_EXTRA_INVOICE`,
        label: `Item #${itemNum} extra na NF: ${invDesc}`,
        status: "mismatch",
        severity: "critical",
        purchaseOrderValue: "Não consta na Ordem de Compra",
        invoiceValue: `${invDesc} (Qtd: ${pair.invoiceItem.quantity || "?"} ${pair.invoiceItem.unit || ""})`,
        difference: "Item adicional na NF",
        explanation: `A Nota Fiscal faturou um item que não consta na Ordem de Compra autorizada.`,
        requiresHumanReview: true,
      });
      return;
    }

    // Ambiguidade no pareamento
    if (pair.matchType === "ambiguous") {
      findings.push({
        id: `item-${itemNum}-ambiguous`,
        code: `ITEM_${itemNum}_AMBIGUOUS_MATCH`,
        label: `Item #${itemNum}: Correspondência duvidosa`,
        status: "ambiguous",
        severity: "high",
        purchaseOrderValue: poDesc,
        invoiceValue: invDesc,
        difference: "Correspondência incerta",
        explanation: `Existem múltiplos itens semelhantes. É necessária a confirmação manual do comprador.`,
        requiresHumanReview: true,
      });
    }

    // 1. Comparação de Unidade de Medida
    const poUnit = normalizeText(pair.poItem.unit);
    const invUnit = normalizeText(pair.invoiceItem.unit);
    if (poUnit && invUnit && poUnit !== invUnit) {
      findings.push({
        id: `item-${itemNum}-unit`,
        code: `ITEM_${itemNum}_UNIT_MISMATCH`,
        label: `Unidade de Medida - ${poDesc}`,
        status: "mismatch",
        severity: "high",
        purchaseOrderValue: pair.poItem.unit || null,
        invoiceValue: pair.invoiceItem.unit || null,
        difference: `${pair.poItem.unit} vs ${pair.invoiceItem.unit}`,
        explanation: `Unidades divergentes: OC (${pair.poItem.unit}) vs NF (${pair.invoiceItem.unit}). Sem fator de conversão automático.`,
        requiresHumanReview: true,
      });
    }

    // 2. Comparação de Quantidade
    const poQtyDec = parseMoneyToDecimal(pair.poItem.quantity);
    const invQtyDec = parseMoneyToDecimal(pair.invoiceItem.quantity);
    if (poQtyDec && invQtyDec) {
      if (!poQtyDec.equals(invQtyDec)) {
        findings.push({
          id: `item-${itemNum}-qty`,
          code: `ITEM_${itemNum}_QTY_MISMATCH`,
          label: `Quantidade - ${poDesc}`,
          status: "mismatch",
          severity: "high",
          purchaseOrderValue: poQtyDec.toString(),
          invoiceValue: invQtyDec.toString(),
          difference: invQtyDec.minus(poQtyDec).toString(),
          explanation: `Quantidade divergente: OC solicitou ${poQtyDec.toString()}, mas a NF faturou ${invQtyDec.toString()}.`,
          requiresHumanReview: true,
        });
      } else {
        findings.push({
          id: `item-${itemNum}-qty`,
          code: `ITEM_${itemNum}_QTY_MATCH`,
          label: `Quantidade - ${poDesc}`,
          status: "match",
          severity: "info",
          purchaseOrderValue: poQtyDec.toString(),
          invoiceValue: invQtyDec.toString(),
          difference: "0",
          explanation: `Quantidades idênticas (${poQtyDec.toString()} ${pair.poItem.unit || ""}).`,
          requiresHumanReview: false,
        });
      }
    }

    // 3. Comparação de Valor Unitário (com tolerância)
    if (pair.poItem.unitPrice && pair.invoiceItem.unitPrice) {
      const priceComp = compareMoneyValues(
        pair.poItem.unitPrice,
        pair.invoiceItem.unitPrice,
        priceTolerance
      );

      findings.push({
        id: `item-${itemNum}-unit-price`,
        code: `ITEM_${itemNum}_UNIT_PRICE_${priceComp.status.toUpperCase()}`,
        label: `Preço Unitário - ${poDesc}`,
        status: priceComp.status,
        severity: priceComp.status === "match" ? "info" : "high",
        purchaseOrderValue: formatBRL(pair.poItem.unitPrice),
        invoiceValue: formatBRL(pair.invoiceItem.unitPrice),
        difference: priceComp.difference,
        explanation: priceComp.explanation,
        requiresHumanReview: priceComp.status !== "match",
      });
    }

    // 4. Comparação de Total do Item (com tolerância)
    if (pair.poItem.lineTotal && pair.invoiceItem.lineTotal) {
      const totalComp = compareMoneyValues(
        pair.poItem.lineTotal,
        pair.invoiceItem.lineTotal,
        priceTolerance
      );

      findings.push({
        id: `item-${itemNum}-line-total`,
        code: `ITEM_${itemNum}_LINE_TOTAL_${totalComp.status.toUpperCase()}`,
        label: `Total do Item - ${poDesc}`,
        status: totalComp.status,
        severity: totalComp.status === "match" ? "info" : "high",
        purchaseOrderValue: formatBRL(pair.poItem.lineTotal),
        invoiceValue: formatBRL(pair.invoiceItem.lineTotal),
        difference: totalComp.difference,
        explanation: totalComp.explanation,
        requiresHumanReview: totalComp.status !== "match",
      });
    }
  });

  return findings;
}
