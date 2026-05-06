import { ExtractedInvoice } from "../domain/Invoice";
import { Money } from "../domain/Money";
import { ValidationResult } from "../domain/ValidationResult";
import {
  AiClient,
  AuditLogRepository,
  ErpQueue,
  InvoiceRepository,
  JobRepository,
  ProcessingMessage
} from "./Ports";
import { ValidateInvoiceUseCase } from "./ValidateInvoiceUseCase";

export class ProcessInvoiceUseCase {
  constructor(
    private readonly ai: AiClient,
    private readonly validator: ValidateInvoiceUseCase,
    private readonly invoices: InvoiceRepository,
    private readonly jobs: JobRepository,
    private readonly erpQueue: ErpQueue,
    private readonly audit: AuditLogRepository
  ) {}

  async execute(message: ProcessingMessage): Promise<void> {
    await this.jobs.markProcessing(message.trackingId);

    const extracted = await this.runAiExtractionStage(message);
    const validation = await this.runValidationStage(message, extracted);
    await this.runPersistenceStage(message, extracted, validation);
    await this.runErpRoutingStage(message, extracted.invoiceId, validation);
  }

  private async runAiExtractionStage(message: ProcessingMessage): Promise<ExtractedInvoice> {
    const extracted = await this.ai.extract(message);
    await this.audit.append({
      trackingId: message.trackingId,
      invoiceId: extracted.invoiceId,
      eventType: "AI_EXTRACTION_COMPLETED",
      details: {
        confidence: extracted.confidence
      }
    });
    return extracted;
  }

  private async runValidationStage(
    message: ProcessingMessage,
    extracted: ExtractedInvoice
  ): Promise<ValidationResult> {
    const validation = this.validator.execute(extracted, message.country);
    await this.audit.append({
      trackingId: message.trackingId,
      invoiceId: extracted.invoiceId,
      eventType: "VALIDATION_COMPLETED",
      details: {
        status: validation.status,
        reasons: validation.reasons
      }
    });
    return validation;
  }

  private async runPersistenceStage(
    message: ProcessingMessage,
    extracted: ExtractedInvoice,
    validation: ValidationResult
  ): Promise<void> {
    const now = new Date().toISOString();
    const currency = this.validator.currencyFor(message.country);
    const subtotal = Money.fromDecimal(extracted.financial.subtotal, currency);
    const taxAmount = Money.fromDecimal(extracted.financial.taxAmount, currency);
    const total = Money.fromDecimal(extracted.financial.total, currency);

    await this.invoices.put({
      trackingId: message.trackingId,
      invoiceId: extracted.invoiceId,
      country: message.country,
      status: validation.status,
      issueDate: extracted.issueDate,
      supplierName: extracted.supplier.name,
      supplierTaxId: extracted.supplier.taxId,
      subtotalCents: subtotal.cents,
      taxAmountCents: taxAmount.cents,
      totalCents: total.cents,
      taxRate: extracted.financial.taxRate,
      confidence: extracted.confidence,
      validationReasons: validation.reasons,
      createdAt: now,
      updatedAt: now
    });

    await this.jobs.markCompleted(message.trackingId, validation.status, extracted.invoiceId);
  }

  private async runErpRoutingStage(
    message: ProcessingMessage,
    invoiceId: string,
    validation: ValidationResult
  ): Promise<void> {
    const eventType =
      validation.status === "APPROVED" ? "INVOICE_APPROVED" : "INVOICE_REQUIRES_REVIEW";
    await this.audit.append({
      trackingId: message.trackingId,
      invoiceId,
      eventType
    });

    if (validation.status === "APPROVED") {
      await this.erpQueue.send({
        trackingId: message.trackingId,
        invoiceId
      });
    }
  }
}
