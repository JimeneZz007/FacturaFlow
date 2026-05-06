import { SQSEvent, SQSBatchResponse } from "aws-lambda";
import {
  DispatchToErpUseCase,
  FixedWindowRateLimiter
} from "../../application/DispatchToErpUseCase";
import { ErpDispatchMessage } from "../../application/Ports";
import { ErpMockLambdaClient } from "../http/ErpMockLambdaClient";
import { DynamoAuditLogRepository } from "../repositories/DynamoAuditLogRepository";
import { Logger, withLatency } from "../logging/Logger";

const logger = new Logger("ErpDispatcherLambda");
const limiter = new FixedWindowRateLimiter(5, 1000);

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failures: { itemIdentifier: string }[] = [];
  const useCase = new DispatchToErpUseCase(
    new ErpMockLambdaClient(requiredEnv("ERP_MOCK_FUNCTION_NAME")),
    new DynamoAuditLogRepository(requiredEnv("AUDIT_LOG_TABLE_NAME")),
    limiter
  );

  for (const record of event.Records) {
    const message = JSON.parse(record.body) as ErpDispatchMessage;
    try {
      await withLatency(
        logger,
        "ERP_DISPATCH",
        { trackingId: message.trackingId, invoiceId: message.invoiceId },
        () => useCase.execute(message)
      );
    } catch (error) {
      failures.push({ itemIdentifier: record.messageId });
      logger.error({
        trackingId: message.trackingId,
        invoiceId: message.invoiceId,
        event: "ERP_DISPATCH",
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR"
      });
    }
  }

  return { batchItemFailures: failures };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}
