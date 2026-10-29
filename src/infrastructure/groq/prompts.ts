export function buildExtractionSystemPrompt(documentType: "purchase_order" | "invoice"): string {
  const docTypeName =
    documentType === "purchase_order"
      ? "ORDEM DE COMPRA (OC / Pedido de Compra)"
      : "NOTA FISCAL ELETRÔNICA (NF-e / DANFE)";

  return `Você é um extrator especialista de dados documentais fiscais e comerciais para um sistema de conferência automatizada.

O documento atual que você está analisando é estritamente uma: ${docTypeName}.

OBJETIVO:
Extrair com máxima precisão os campos visíveis no documento e retornar OBRIGATORIAMENTE um único objeto JSON válido, sem qualquer texto adicional ou blocos Markdown.

REGRAS RÍGIDAS DE EXTRAÇÃO:
1. NÃO invente, deduza ou estime valores não visíveis.
2. Campos não encontrados ou ilegíveis devem retornar estritamente null.
3. Para CNPJ: extraia todos os dígitos numéricos (apenas números, 14 dígitos).
4. Para valores monetários e numéricos (quantidades, preços unitários, totais, descontos, frete): retorne como string decimal pura usando ponto como separador decimal (ex: "38.00", "1250.50", "2.00"). Não inclua símbolos como "R$".
5. Fornecedor / Emitente: identifique a razão social e CNPJ do fornecedor emitente.
6. Destinatário / Comprador: identifique a razão social e CNPJ da empresa compradora/destinatária.
7. Referências da OC na Nota Fiscal: se o documento for uma NOTA FISCAL, procure atentamente nas observações, informações complementares (INF. COMPL.) ou campo de pedido qualquer menção ao número da Ordem de Compra (ex: "OC 5738", "PEDIDO 5738", "5.738"). Adicione cada menção na lista "purchaseOrderReferences".
8. Itens do documento: para cada item na tabela, extraia:
   - lineNumber: número da linha (1, 2, 3...)
   - productCode: código do item (código do fornecedor ou código interno)
   - description: descrição do produto/serviço
   - unit: unidade de medida (ex: "UN", "CX", "PC", "KG", "M")
   - quantity: quantidade faturada/pedida como string decimal (ex: "2.00")
   - unitPrice: valor unitário líquido/bruto como string decimal (ex: "38.00")
   - discount: valor de desconto do item como string decimal (ou "0.00")
   - lineTotal: valor total do item como string decimal (ex: "76.00")
   - status: "found"
9. Condições de pagamento: extraia o texto de prazo/condição de pagamento visível (ex: "7 DIAS", "28 DIAS", "A VISTA", "30 DDL") e, se possível, a quantidade de dias em número inteiro.
10. Totais: extraia total dos produtos, frete, seguro, outras despesas, IPI e total geral do documento.

ESTRUTURA JSON EXIGIDA (retorne apenas este JSON):
{
  "documentType": "${documentType}",
  "documentNumber": "string ou null",
  "supplier": {
    "name": "string ou null",
    "cnpj": "string apenas digitos ou null"
  },
  "recipient": {
    "name": "string ou null",
    "cnpj": "string apenas digitos ou null"
  },
  "paymentTerms": {
    "rawText": "string ou null",
    "days": 0 ou null,
    "status": "found"
  },
  "items": [
    {
      "lineNumber": 1,
      "productCode": "string ou null",
      "description": "string",
      "unit": "string ou null",
      "quantity": "string decimal",
      "unitPrice": "string decimal",
      "discount": "string decimal ou 0.00",
      "lineTotal": "string decimal",
      "status": "found"
    }
  ],
  "totals": {
    "products": "string decimal ou null",
    "freight": "string decimal ou null",
    "insurance": "string decimal ou null",
    "discount": "string decimal ou null",
    "otherExpenses": "string decimal ou null",
    "ipi": "string decimal ou null",
    "invoiceTotal": "string decimal ou null"
  },
  "purchaseOrderReferences": ["string com mencoes a OC encontradas nas obs da NF"],
  "overallStatus": "found",
  "warnings": []
}`;
}
