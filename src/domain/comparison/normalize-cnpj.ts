/**
 * Normaliza CNPJ removendo qualquer caractere não numérico.
 */
export function normalizeCnpj(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function formatCnpj(cnpjDigits: string | null | undefined): string {
  if (!cnpjDigits) return "Não informado";
  const digits = cnpjDigits.replace(/\D/g, "");
  if (digits.length !== 14) return digits; // Retorna como está se não tiver 14 dígitos
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export type CnpjComparisonResult = {
  status: "match" | "mismatch" | "not_comparable" | "ambiguous";
  severity: "critical" | "info";
  explanation: string;
  poCnpjFormatted: string;
  invCnpjFormatted: string;
};

/**
 * Compara dois CNPJs conforme RF-030 e Seção 6.1 do PRD.
 */
export function compareCnpj(
  poCnpj: string | null | undefined,
  invCnpj: string | null | undefined,
  entityLabel: "Fornecedor" | "Destinatário" = "Fornecedor"
): CnpjComparisonResult {
  const normPo = normalizeCnpj(poCnpj);
  const normInv = normalizeCnpj(invCnpj);

  const poFormatted = formatCnpj(normPo);
  const invFormatted = formatCnpj(normInv);

  if (!normPo || !normInv) {
    return {
      status: "not_comparable",
      severity: "critical",
      explanation: `CNPJ do ${entityLabel} não pôde ser comparado porque está ausente ou ilegível em um dos documentos.`,
      poCnpjFormatted: poFormatted,
      invCnpjFormatted: invFormatted,
    };
  }

  if (normPo.length !== 14 || normInv.length !== 14) {
    return {
      status: "ambiguous",
      severity: "critical",
      explanation: `CNPJ do ${entityLabel} encontrado com tamanho inválido (esperado 14 dígitos).`,
      poCnpjFormatted: poFormatted,
      invCnpjFormatted: invFormatted,
    };
  }

  if (normPo === normInv) {
    return {
      status: "match",
      severity: "info",
      explanation: `CNPJ do ${entityLabel} coincidente nos dois documentos (${poFormatted}).`,
      poCnpjFormatted: poFormatted,
      invCnpjFormatted: invFormatted,
    };
  }

  return {
    status: "mismatch",
    severity: "critical",
    explanation: `Divergência CRÍTICA no CNPJ do ${entityLabel}: OC apresenta ${poFormatted} enquanto a NF apresenta ${invFormatted}.`,
    poCnpjFormatted: poFormatted,
    invCnpjFormatted: invFormatted,
  };
}
