import { AuditLogRepository, InvoiceRepository, JobRepository } from "./Ports";

export class GetJobStatusUseCase {
  constructor(
    private readonly jobs: JobRepository,
    private readonly invoices: InvoiceRepository,
    private readonly audit: AuditLogRepository
  ) {}

  async execute(trackingId: string): Promise<JobStatusReadModel | undefined> {
    const job = await this.jobs.get(trackingId);
    if (!job) {
      return undefined;
    }

    const [invoice, events] = await Promise.all([
      job.invoiceId ? this.invoices.get(job.invoiceId) : Promise.resolve(undefined),
      this.audit.listByTrackingId(trackingId)
    ]);

    return {
      trackingId: job.trackingId,
      status: job.status,
      country: job.country,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      errorCode: job.errorCode,
      invoice: invoice
        ? {
            invoiceId: invoice.invoiceId,
            issueDate: invoice.issueDate,
            supplier: {
              name: invoice.supplierName,
              taxId: invoice.supplierTaxId
            },
            financial: {
              subtotal: centsToDecimal(invoice.subtotalCents),
              taxRate: invoice.taxRate,
              taxAmount: centsToDecimal(invoice.taxAmountCents),
              total: centsToDecimal(invoice.totalCents)
            },
            confidence: invoice.confidence,
            status: invoice.status,
            validationReasons: invoice.validationReasons
          }
        : undefined,
      validation: invoice
        ? {
            subtotalPlusTaxAmount: centsToDecimal(invoice.subtotalCents + invoice.taxAmountCents),
            total: centsToDecimal(invoice.totalCents),
            isValid: invoice.subtotalCents + invoice.taxAmountCents === invoice.totalCents,
            reasons: invoice.validationReasons
          }
        : undefined,
      events: events.map((event) => ({
        eventType: event.eventType,
        createdAt: event.createdAt,
        invoiceId: event.invoiceId,
        details: event.details
      }))
    };
  }
}

export interface JobStatusReadModel {
  trackingId: string;
  status: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  errorCode?: string;
  invoice?: {
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
    status: string;
    validationReasons: string[];
  };
  validation?: {
    subtotalPlusTaxAmount: string;
    total: string;
    isValid: boolean;
    reasons: string[];
  };
  events: Array<{
    eventType: string;
    createdAt: string;
    invoiceId?: string;
    details?: Record<string, unknown>;
  }>;
}

function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}
