import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { DistributedFixedWindowRateLimiter } from "../../application/DistributedRateLimiter";
import { Logger, withLatency } from "../logging/Logger";
import { DynamoRateLimitCounterStore } from "../repositories/DynamoRateLimitCounterStore";
import { jsonResponse } from "./response";

const logger = new Logger("ErpMockLambda");

export async function handler(event: {
  body?: string | null;
  trackingId?: string;
  invoiceId?: string;
}): Promise<APIGatewayProxyStructuredResultV2> {
  const payload = event.body ? JSON.parse(event.body) : event;

  return withLatency(
    logger,
    "ERP_RECEIVED",
    { trackingId: payload.trackingId, invoiceId: payload.invoiceId },
    async () => {
      const limiter = new DistributedFixedWindowRateLimiter(
        new DynamoRateLimitCounterStore(requiredEnv("ERP_RATE_LIMIT_TABLE_NAME")),
        {
          keyPrefix: "ERP_MOCK",
          maxRequests: 5,
          windowMs: 1000,
          ttlSeconds: 120
        }
      );
      const allowed = await limiter.tryAcquire();

      if (!allowed) {
        logger.error({
          trackingId: payload.trackingId,
          invoiceId: payload.invoiceId,
          event: "ERP_RATE_LIMITED",
          errorCode: "ERP_RATE_LIMIT_EXCEEDED"
        });
        return jsonResponse(429, {
          received: false,
          errorCode: "ERP_RATE_LIMIT_EXCEEDED"
        });
      }

      return jsonResponse(200, {
        received: true,
        trackingId: payload.trackingId,
        invoiceId: payload.invoiceId,
        receivedAt: new Date().toISOString()
      });
    }
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}
