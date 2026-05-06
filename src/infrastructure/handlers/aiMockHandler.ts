import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { ExtractedInvoice } from "../../domain/Invoice";
import { Logger, withLatency } from "../logging/Logger";
import { jsonResponse } from "./response";

const logger = new Logger("AiMockLambda");

export async function handler(event: { body?: string | null; fixture?: string }): Promise<ExtractedInvoice | APIGatewayProxyStructuredResultV2> {
  const payload = event.body ? JSON.parse(event.body) : event;
  const fixture = payload.fixture ?? "approved";
  const trackingId = payload.trackingId;

  return withLatency(logger, "AI_EXTRACTION", { trackingId }, async () => {
    const delayMs = 3000 + Math.floor(Math.random() * 2001);
    await sleep(delayMs);
    const response = buildFixture(fixture);

    logger.info({
      trackingId,
      invoiceId: response.invoiceId,
      event: "AI_EXTRACTION_COMPLETED",
      latencyMs: delayMs
    });

    return event.body ? jsonResponse(200, response as unknown as Record<string, unknown>) : response;
  });
}

function buildFixture(fixture: string): ExtractedInvoice {
  const base = {
    invoiceId: `INV-${randomUUID().slice(0, 8)}`,
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
    confidence: 0.94
  };

  if (fixture === "requires_review") {
    return { ...base, confidence: 0.72 };
  }

  if (fixture === "math_error") {
    return {
      ...base,
      financial: {
        ...base.financial,
        total: "1189.00"
      }
    };
  }

  return base;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
