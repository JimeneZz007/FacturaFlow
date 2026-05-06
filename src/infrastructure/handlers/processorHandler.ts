import { SQSEvent, SQSBatchResponse } from "aws-lambda";
import { ProcessInvoiceUseCase } from "../../application/ProcessInvoiceUseCase";
import { ProcessingMessage } from "../../application/Ports";
import { ValidateInvoiceUseCase } from "../../application/ValidateInvoiceUseCase";
import { JsonTaxRulesProvider } from "../config/JsonTaxRulesProvider";
import { AiMockLambdaClient } from "../http/AiMockLambdaClient";
import { DynamoAuditLogRepository } from "../repositories/DynamoAuditLogRepository";
import { DynamoInvoiceRepository } from "../repositories/DynamoInvoiceRepository";
import { DynamoJobRepository } from "../repositories/DynamoJobRepository";
import { SqsErpQueue } from "../queues/SqsErpQueue";
import { Logger, withLatency } from "../logging/Logger";

const logger = new Logger("ProcessorLambda");

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const message = JSON.parse(record.body) as ProcessingMessage;
    try {
      await withLatency(
        logger,
        "PROCESSING_MESSAGE",
        { trackingId: message.trackingId },
        async () => {
          const jobs = new DynamoJobRepository(requiredEnv("JOBS_TABLE_NAME"));
          const useCase = new ProcessInvoiceUseCase(
            new AiMockLambdaClient(requiredEnv("AI_MOCK_FUNCTION_NAME")),
            new ValidateInvoiceUseCase(new JsonTaxRulesProvider()),
            new DynamoInvoiceRepository(requiredEnv("INVOICES_TABLE_NAME")),
            jobs,
            new SqsErpQueue(requiredEnv("ERP_QUEUE_URL")),
            new DynamoAuditLogRepository(requiredEnv("AUDIT_LOG_TABLE_NAME"))
          );
          await useCase.execute(message);
        }
      );
    } catch (error) {
      failures.push({ itemIdentifier: record.messageId });
      await new DynamoJobRepository(requiredEnv("JOBS_TABLE_NAME")).markFailed(
        message.trackingId,
        error instanceof Error ? error.name : "UNKNOWN_ERROR"
      );
      logger.error({
        trackingId: message.trackingId,
        event: "PROCESSING_MESSAGE",
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
