import Decimal from "decimal.js";

/**
 * Normaliza strings monetárias vindas de OCR/IA, aceitando padrões brasileiros (1.250,50)
 * ou americanos (1,250.50 ou 1250.50).
 */
export function parseMoneyToDecimal(val: string | number | null | undefined): Decimal | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (isNaN(val)) return null;
    return new Decimal(val);
  }

  let cleaned = val.trim();
  if (!cleaned) return null;

  // Remove símbolos de moeda
  cleaned = cleaned.replace(/R\$\s*/gi, "").trim();

  // Verifica se há vírgula e ponto para detectar padrão
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    // Se o ponto vier antes da vírgula (ex: 1.250,50) -> padrão BR
    if (cleaned.indexOf(".") < cleaned.indexOf(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // Padrão US (ex: 1,250.50)
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Somente vírgula (ex: 1250,50) -> troca por ponto
    cleaned = cleaned.replace(",", ".");
  }

  // Remove caracteres espúrios (exceto dígitos, sinal de menos e ponto decimal)
  cleaned = cleaned.replace(/[^0-9.-]/g, "");

  try {
    const d = new Decimal(cleaned);
    return isNaN(d.toNumber()) ? null : d;
  } catch {
    return null;
  }
}

export function formatBRL(val: Decimal | string | number | null | undefined): string {
  if (val === null || val === undefined) return "R$ 0,00";
  const dec = val instanceof Decimal ? val : parseMoneyToDecimal(val);
  if (!dec) return "R$ 0,00";

  const num = dec.toNumber();
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type MoneyComparisonResult = {
  status: "match" | "mismatch" | "not_comparable";
  difference: string | null;
  differenceValue: Decimal | null;
  isWithinTolerance: boolean;
  explanation: string;
};

/**
 * Compara dois valores monetários considerando tolerância configurável (ex: 0.99)
 */
export function compareMoneyValues(
  poValStr: string | null | undefined,
  invValStr: string | null | undefined,
  tolerance: number | string = 0.99
): MoneyComparisonResult {
  const poDec = parseMoneyToDecimal(poValStr);
  const invDec = parseMoneyToDecimal(invValStr);

  if (!poDec || !invDec) {
    return {
      status: "not_comparable",
      difference: null,
      differenceValue: null,
      isWithinTolerance: false,
      explanation: "Um ou ambos os valores não puderam ser identificados numericamente.",
    };
  }

  const diff = invDec.minus(poDec).abs();
  const tolDec = new Decimal(tolerance);
  const isWithin = diff.lessThanOrEqualTo(tolDec);

  const diffFormatted = formatBRL(diff);

  if (diff.isZero()) {
    return {
      status: "match",
      difference: "R$ 0,00",
      differenceValue: diff,
      isWithinTolerance: true,
      explanation: "Valores rigorosamente idênticos.",
    };
  }

  if (isWithin) {
    return {
      status: "match",
      difference: diffFormatted,
      differenceValue: diff,
      isWithinTolerance: true,
      explanation: `Diferença de ${diffFormatted} está dentro da tolerância permitida (até ${formatBRL(tolDec)}).`,
    };
  }

  return {
    status: "mismatch",
    difference: diffFormatted,
    differenceValue: diff,
    isWithinTolerance: false,
    explanation: `Diferença de ${diffFormatted} excede a tolerância permitida de ${formatBRL(tolDec)}.`,
  };
}
