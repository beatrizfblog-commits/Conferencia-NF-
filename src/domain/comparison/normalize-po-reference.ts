/**
 * Normaliza referências a Ordens de Compra (OC).
 * Trata prefixos como "OC", "O.C.", "PEDIDO", "REF", "Nº", espaços, pontos e zeros à esquerda.
 */
export function normalizePoIdentifier(input: string | null | undefined): string | null {
  if (!input) return null;

  // 1. Tenta extrair número após palavras-chave como OC, PEDIDO, ORDEM, REF, etc.
  const regexKeyword = /(?:(?:OC|O\.C\.|PEDIDO|ORDEM(?:\s+DE\s+COMPRA)?|REF(?:ER[EÊ]NCIA)?|N[º°\.]*|NUMERO)\s*[:#.]*\s*)([0-9.\-]+)/i;
  const match = input.match(regexKeyword);

  const rawCandidate = match ? match[1] : input;

  // Remove pontos, traços, espaços e letras
  const digitsOnly = rawCandidate.replace(/\D/g, "");
  // Remove zeros à esquerda
  const withoutZeros = digitsOnly.replace(/^0+/, "");

  return withoutZeros.length > 0 ? withoutZeros : null;
}

export type PoReferenceComparisonResult = {
  status: "match" | "mismatch" | "not_comparable" | "ambiguous";
  severity: "critical" | "high" | "info";
  expectedPoNumber: string | null;
  foundInInvoice: string | null;
  explanation: string;
};

/**
 * Compara o número da OC com as referências encontradas na NF
 */
export function comparePoReference(
  expectedPo: string | null | undefined,
  invoiceReferences: string[] = []
): PoReferenceComparisonResult {
  const normExpected = normalizePoIdentifier(expectedPo);

  if (!normExpected) {
    return {
      status: "not_comparable",
      severity: "high",
      expectedPoNumber: expectedPo ?? null,
      foundInInvoice: null,
      explanation: "Número da Ordem de Compra não foi identificado na OC para realizar o cruzamento.",
    };
  }

  if (!invoiceReferences || invoiceReferences.length === 0) {
    return {
      status: "mismatch",
      severity: "critical",
      expectedPoNumber: expectedPo ?? normExpected,
      foundInInvoice: null,
      explanation: `O número da OC (${normExpected}) NÃO foi localizado nas informações complementares da Nota Fiscal.`,
    };
  }

  // Normaliza e busca match em cada referência/observação da NF
  const matchingRefs: string[] = [];

  for (const ref of invoiceReferences) {
    // Verifica tanto pelo extractor de keyword quanto se o número puro está contido
    const norm = normalizePoIdentifier(ref);
    if (norm === normExpected) {
      matchingRefs.push(ref);
      continue;
    }

    // Busca se o número exato com pontuação ou dígitos está explicitamente no texto
    const rawDigits = ref.replace(/\D/g, "");
    if (rawDigits.includes(normExpected)) {
      // Confirmação de boundary (não confundir 5738 com 157380)
      const boundaryRegex = new RegExp(`(?:^|\\D)${normExpected}(?:\\D|$)`);
      if (boundaryRegex.test(ref)) {
        matchingRefs.push(ref);
      }
    }
  }

  if (matchingRefs.length >= 1) {
    // Se encontrou pelo menos uma referência válida da OC
    return {
      status: "match",
      severity: "info",
      expectedPoNumber: expectedPo ?? normExpected,
      foundInInvoice: matchingRefs[0],
      explanation: `Referência da OC identificada com sucesso na NF: "${matchingRefs[0]}".`,
    };
  }

  // Nenhuma das referências coincide
  return {
    status: "mismatch",
    severity: "critical",
    expectedPoNumber: expectedPo ?? normExpected,
    foundInInvoice: invoiceReferences.join("; "),
    explanation: `Divergência: Esperava-se OC ${normExpected}, mas a NF cita: "${invoiceReferences.join("; ")}".`,
  };
}
