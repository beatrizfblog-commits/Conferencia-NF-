export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ComparisonStatus =
  | "match"
  | "mismatch"
  | "not_comparable"
  | "ambiguous";

export type ComparisonFinding = {
  id: string;
  code: string;
  label: string;
  status: ComparisonStatus;
  severity: Severity;
  purchaseOrderValue: string | null;
  invoiceValue: string | null;
  difference: string | null;
  explanation: string;
  requiresHumanReview: boolean;
};

export type ComparisonSummary = {
  totalChecks: number;
  matched: number;
  mismatched: number;
  notComparable: number;
  manualReviewRequired: boolean;
  overallStatus:
    | "no_divergences_detected"
    | "divergences_found"
    | "manual_review_required"
    | "processing_failed";
};

export type FinalDecision =
  | "accept_with_reservation"
  | "return_for_correction"
  | "send_for_review";

export type DecisionRecord = {
  decision: FinalDecision;
  comment?: string;
  decidedAt: string;
  decidedBy?: string;
};

export type ConferenceResult = {
  status: ComparisonSummary["overallStatus"];
  summary: ComparisonSummary;
  findings: ComparisonFinding[];
  extractedPurchaseOrder: import("./extraction-schema").ExtractedDocument;
  extractedInvoice: import("./extraction-schema").ExtractedDocument;
  message: string;
};
