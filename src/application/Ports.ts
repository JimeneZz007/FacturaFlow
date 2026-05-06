import { ExtractedInvoice, InvoiceRecord, ProcessingJob } from "../domain/Invoice";

export interface IngestDocumentCommand {
  fileName: string;
  contentBase64: string;
  contentType: string;
  country: string;
  fixture?: "approved" | "requires_review" | "math_error";
}

export interface ProcessingMessage {
  trackingId: string;
  bucket: string;
  key: string;
  country: string;
  fixture?: "approved" | "requires_review" | "math_error";
}

export interface ErpDispatchMessage {
  trackingId: string;
  invoiceId: string;
}

export interface DocumentStorage {
  putDocument(input: {
    trackingId: string;
    fileName: string;
    contentBase64: string;
    contentType: string;
  }): Promise<{ bucket: string; key: string }>;
}

export interface JobRepository {
  create(job: ProcessingJob): Promise<void>;
  get(trackingId: string): Promise<ProcessingJob | undefined>;
  markProcessing(trackingId: string): Promise<void>;
  markCompleted(trackingId: string, status: "APPROVED" | "REQUIRES_REVIEW", invoiceId: string): Promise<void>;
  markFailed(trackingId: string, errorCode: string): Promise<void>;
}

export interface InvoiceRepository {
  put(invoice: InvoiceRecord): Promise<void>;
  get(invoiceId: string): Promise<InvoiceRecord | undefined>;
}

export type AuditEventType =
  | "DOCUMENT_INGESTED"
  | "AI_EXTRACTION_STARTED"
  | "AI_EXTRACTION_COMPLETED"
  | "VALIDATION_COMPLETED"
  | "INVOICE_APPROVED"
  | "INVOICE_REQUIRES_REVIEW"
  | "STORED"
  | "ERP_DISPATCHED"
  | "ERP_DISPATCH_FAILED";

export interface AuditLogEvent {
  auditId: string;
  trackingId: string;
  invoiceId?: string;
  eventType: AuditEventType;
  createdAt: string;
  details?: Record<string, unknown>;
}

export interface AuditLogRepository {
  append(event: {
    trackingId: string;
    invoiceId?: string;
    eventType: AuditEventType;
    details?: Record<string, unknown>;
  }): Promise<void>;
  listByTrackingId(trackingId: string): Promise<AuditLogEvent[]>;
}

export interface ProcessingQueue {
  send(message: ProcessingMessage): Promise<void>;
}

export interface ErpQueue {
  send(message: ErpDispatchMessage): Promise<void>;
}

export interface AiClient {
  extract(input: ProcessingMessage): Promise<ExtractedInvoice>;
}

export interface ErpClient {
  dispatch(message: ErpDispatchMessage): Promise<void>;
}
