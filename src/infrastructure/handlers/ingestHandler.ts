import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { z } from "zod";
import { IngestDocumentUseCase } from "../../application/IngestDocumentUseCase";
import { DynamoAuditLogRepository } from "../repositories/DynamoAuditLogRepository";
import { DynamoJobRepository } from "../repositories/DynamoJobRepository";
import { S3DocumentStorage } from "../repositories/S3DocumentStorage";
import { SqsProcessingQueue } from "../queues/SqsProcessingQueue";
import { Logger, withLatency } from "../logging/Logger";
import { jsonResponse } from "./response";

const schema = z.object({
  fileName: z.string().min(1).max(180).regex(/\.pdf$/i),
  contentType: z.literal("application/pdf"),
  contentBase64: z.string().min(1),
  country: z.enum(["CO", "MX", "CL"]).default("CO"),
  fixture: z.enum(["approved", "requires_review", "math_error"]).optional()
});

const logger = new Logger("IngestLambda");

export async function handler(event: { body?: string | null }): Promise<APIGatewayProxyStructuredResultV2> {
  return withLatency(logger, "UPLOAD_REQUEST", {}, async () => {
    const rawBody = event.body ? JSON.parse(event.body) : {};
    const command = schema.parse(rawBody);

    const useCase = new IngestDocumentUseCase(
      new S3DocumentStorage(requiredEnv("DOCUMENT_BUCKET_NAME")),
      new DynamoJobRepository(requiredEnv("JOBS_TABLE_NAME")),
      new SqsProcessingQueue(requiredEnv("PROCESSING_QUEUE_URL")),
      new DynamoAuditLogRepository(requiredEnv("AUDIT_LOG_TABLE_NAME"))
    );

    const result = await useCase.execute(command);
    logger.info({
      trackingId: result.trackingId,
      event: "DOCUMENT_INGESTED"
    });

    return jsonResponse(202, result);
  }).catch((error) => {
    logger.error({
      event: "UPLOAD_REQUEST",
      errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR"
    });
    return jsonResponse(400, {
      message: "Invalid upload request",
      errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR"
    });
  });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}
