import { FlowEvent, InvoiceView, JobStatusResponse, Scenario, UploadResult } from "./types";

const jobs = new Map<string, JobStatusResponse>();

export async function uploadDemoInvoice(input: { scenario: Scenario }): Promise<UploadResult> {
  const trackingId = createId();
  const now = new Date().toISOString();

  jobs.set(trackingId, {
    trackingId,
    status: "QUEUED",
    country: "CO",
    createdAt: now,
    updatedAt: now,
    events: [event("DOCUMENT_INGESTED")]
  });

  scheduleDemoProcessing(trackingId, input.scenario);
  return { trackingId };
}

export async function getDemoJobStatus(trackingId: string): Promise<JobStatusResponse> {
  const job = jobs.get(trackingId);
  if (!job) {
    throw new Error("Demo job not found");
  }
  return structuredClone(job);
}

function scheduleDemoProcessing(trackingId: string, scenario: Scenario): void {
  setTimeout(() => {
    update(trackingId, (job) => ({
      ...job,
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
      events: [...job.events, event("AI_EXTRACTION_STARTED")]
    }));
  }, 600);

  setTimeout(() => {
    update(trackingId, (job) => ({
      ...job,
      updatedAt: new Date().toISOString(),
      events: [...job.events, event("AI_EXTRACTION_COMPLETED")]
    }));
  }, 3200);

  setTimeout(() => {
    const invoice = buildInvoice(scenario);
    const validation = {
      subtotalPlusTaxAmount: sumMoney(invoice.financial.subtotal, invoice.financial.taxAmount),
      total: invoice.financial.total,
      isValid: sumMoney(invoice.financial.subtotal, invoice.financial.taxAmount) === invoice.financial.total,
      reasons: invoice.validationReasons
    };
    update(trackingId, (job) => ({
      ...job,
      status: invoice.status,
      updatedAt: new Date().toISOString(),
      invoice,
      validation,
      events: [
        ...job.events,
        event("VALIDATION_COMPLETED", invoice.invoiceId),
        event(
          invoice.status === "APPROVED" ? "INVOICE_APPROVED" : "INVOICE_REQUIRES_REVIEW",
          invoice.invoiceId
        ),
        event("STORED", invoice.invoiceId)
      ]
    }));
  }, 4700);
}

function update(
  trackingId: string,
  mapper: (current: JobStatusResponse) => JobStatusResponse
): void {
  const current = jobs.get(trackingId);
  if (current) {
    jobs.set(trackingId, mapper(current));
  }
}

function buildInvoice(scenario: Scenario): InvoiceView {
  const base = {
    invoiceId: `INV-${Math.floor(Math.random() * 900000 + 100000)}`,
    issueDate: "2026-05-06",
    supplier: {
      name: "Proveedor Piloto SAS",
      taxId: "900123456-7"
    },
    financial: {
      subtotal: "1000.00",
      taxRate: 19,
      taxAmount: "190.00",
      total: scenario === "math_error" ? "1189.00" : "1190.00"
    },
    confidence: scenario === "requires_review" ? 0.72 : 0.94,
    status: "APPROVED" as const,
    validationReasons: [] as string[]
  };

  const reasons = [];
  if (base.confidence <= 0.85) {
    reasons.push("CONFIDENCE_TOO_LOW");
  }
  if (sumMoney(base.financial.subtotal, base.financial.taxAmount) !== base.financial.total) {
    reasons.push("TOTAL_MISMATCH");
  }

  return {
    ...base,
    status: reasons.length === 0 ? "APPROVED" : "REQUIRES_REVIEW",
    validationReasons: reasons
  };
}

function event(eventType: string, invoiceId?: string): FlowEvent {
  return {
    eventType,
    invoiceId,
    createdAt: new Date().toISOString()
  };
}

function createId(): string {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function sumMoney(left: string, right: string): string {
  const cents = toCents(left) + toCents(right);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function toCents(value: string): number {
  const [units, cents = ""] = value.split(".");
  return Number(units) * 100 + Number(cents.padEnd(2, "0"));
}
