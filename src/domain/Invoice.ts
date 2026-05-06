import { UploadFixture } from "./Fixture";

export type InvoiceStatus = "APPROVED" | "REQUIRES_REVIEW";

export interface ExtractedInvoice {
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
}

export interface InvoiceRecord {
  trackingId: string;
  invoiceId: string;
  country: string;
  status: InvoiceStatus;
  issueDate: string;
  supplierName: string;
  supplierTaxId: string;
  subtotalCents: number;
  taxAmountCents: number;
  totalCents: number;
  taxRate: number;
  confidence: number;
  validationReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingJob {
  trackingId: string;
  status: "QUEUED" | "PROCESSING" | "APPROVED" | "REQUIRES_REVIEW" | "FAILED";
  country: string;
  documentBucket: string;
  documentKey: string;
  fixture?: UploadFixture;
  createdAt: string;
  updatedAt: string;
  invoiceId?: string;
  errorCode?: string;
}
