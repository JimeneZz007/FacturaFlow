import { describe, expect, it, vi } from "vitest";
import { ProcessInvoiceUseCase } from "../src/application/ProcessInvoiceUseCase";
import { ValidateInvoiceUseCase } from "../src/application/ValidateInvoiceUseCase";
import {
  AiClient,
  AuditLogRepository,
  ErpQueue,
  InvoiceRepository,
  JobRepository
} from "../src/application/Ports";
import { ExtractedInvoice, InvoiceRecord } from "../src/domain/Invoice";
import { JsonTaxRulesProvider } from "../src/infrastructure/config/JsonTaxRulesProvider";

const approvedInvoice: ExtractedInvoice = {
  invoiceId: "INV-APPROVED",
  issueDate: "2026-05-06",
  supplier: {
    name: "Proveedor Piloto SAS",
    taxId: "900123456-7"
  },
  financial: {
    subtotal: "1000.00",
    taxRate: 19,
    taxAmount: "190.00",
    total: "1190.00"
  },
  confidence: 0.93
};

describe("ProcessInvoiceUseCase", () => {
  it("stores approved invoices and enqueues ERP dispatch", async () => {
    const savedInvoices: InvoiceRecord[] = [];
    const erpMessages: unknown[] = [];
    const useCase = createUseCase(approvedInvoice, savedInvoices, erpMessages);

    await useCase.execute({
      trackingId: "trk-1",
      bucket: "bucket",
      key: "key",
      country: "CO"
    });

    expect(savedInvoices[0].status).toBe("APPROVED");
    expect(erpMessages).toEqual([{ trackingId: "trk-1", invoiceId: "INV-APPROVED" }]);
  });

  it("does not enqueue ERP dispatch when review is required", async () => {
    const savedInvoices: InvoiceRecord[] = [];
    const erpMessages: unknown[] = [];
    const useCase = createUseCase(
      {
        ...approvedInvoice,
        confidence: 0.5
      },
      savedInvoices,
      erpMessages
    );

    await useCase.execute({
      trackingId: "trk-2",
      bucket: "bucket",
      key: "key",
      country: "CO"
    });

    expect(savedInvoices[0].status).toBe("REQUIRES_REVIEW");
    expect(erpMessages).toEqual([]);
  });
});

function createUseCase(
  extracted: ExtractedInvoice,
  savedInvoices: InvoiceRecord[],
  erpMessages: unknown[]
): ProcessInvoiceUseCase {
  const ai: AiClient = {
    extract: vi.fn().mockResolvedValue(extracted)
  };
  const invoices: InvoiceRepository = {
    put: vi.fn(async (invoice) => {
      savedInvoices.push(invoice);
    })
  };
  const jobs: JobRepository = {
    create: vi.fn(),
    markProcessing: vi.fn(),
    markCompleted: vi.fn(),
    markFailed: vi.fn()
  };
  const erpQueue: ErpQueue = {
    send: vi.fn(async (message) => {
      erpMessages.push(message);
    })
  };
  const audit: AuditLogRepository = {
    append: vi.fn()
  };

  return new ProcessInvoiceUseCase(
    ai,
    new ValidateInvoiceUseCase(new JsonTaxRulesProvider()),
    invoices,
    jobs,
    erpQueue,
    audit
  );
}
