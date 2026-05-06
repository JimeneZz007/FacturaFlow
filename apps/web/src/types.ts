export type Scenario =
  | "approved"
  | "requires_review"
  | "low_confidence"
  | "math_error"
  | "total_mismatch";

export type JobStatus =
  | "IDLE"
  | "QUEUED"
  | "PROCESSING"
  | "APPROVED"
  | "REQUIRES_REVIEW"
  | "FAILED";

export interface UploadResult {
  trackingId: string;
}

export interface FlowEvent {
  eventType: string;
  createdAt: string;
  invoiceId?: string;
  details?: Record<string, unknown>;
}

export interface InvoiceView {
  invoiceId: string;
  issueDate: string;
  supplier: {
    name: string;
    taxId: string;
  };
  financial: {
    subtotal: string;
    taxRate: number;
    taxAmount: string;
    total: string;
  };
  confidence: number;
  status: "APPROVED" | "REQUIRES_REVIEW";
  validationReasons: string[];
}

export interface ValidationView {
  subtotalPlusTaxAmount: string;
  total: string;
  isValid: boolean;
  reasons: string[];
}

export interface JobStatusResponse {
  trackingId: string;
  status: JobStatus;
  country: string;
  createdAt: string;
  updatedAt: string;
  errorCode?: string;
  invoice?: InvoiceView;
  validation?: ValidationView;
  events: FlowEvent[];
}
