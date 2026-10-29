import { z } from "zod";

export const ExtractionStatusEnum = z.enum(["found", "not_found", "unclear"]);
export type ExtractionStatus = z.infer<typeof ExtractionStatusEnum>;

export const ExtractedFieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    status: ExtractionStatusEnum,
    rawText: z.string().optional().nullable(),
    sourcePage: z.number().optional().nullable(),
    evidence: z.string().optional().nullable(),
    confidence: z.number().optional().nullable(),
  });

export const ExtractedItemSchema = z.object({
  lineNumber: z.number().optional().nullable(),
  productCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  quantity: z.string().optional().nullable(),
  unitPrice: z.string().optional().nullable(),
  discount: z.string().optional().nullable(),
  lineTotal: z.string().optional().nullable(),
  status: ExtractionStatusEnum.default("found"),
  sourcePage: z.number().optional().nullable(),
});
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

export const ExtractedDocumentSchema = z.object({
  documentType: z.enum(["purchase_order", "invoice"]),
  documentNumber: z.string().optional().nullable(),
  supplier: z
    .object({
      name: z.string().optional().nullable(),
      cnpj: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  recipient: z
    .object({
      name: z.string().optional().nullable(),
      cnpj: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  paymentTerms: z
    .object({
      rawText: z.string().optional().nullable(),
      days: z.number().optional().nullable(),
      status: ExtractionStatusEnum.optional().nullable(),
    })
    .optional()
    .nullable(),
  items: z.array(ExtractedItemSchema).default([]),
  totals: z
    .object({
      products: z.string().optional().nullable(),
      freight: z.string().optional().nullable(),
      insurance: z.string().optional().nullable(),
      discount: z.string().optional().nullable(),
      otherExpenses: z.string().optional().nullable(),
      ipi: z.string().optional().nullable(),
      invoiceTotal: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  purchaseOrderReferences: z.array(z.string()).default([]),
  overallStatus: ExtractionStatusEnum.default("found"),
  warnings: z.array(z.string()).default([]),
});

export type ExtractedDocument = z.infer<typeof ExtractedDocumentSchema>;
