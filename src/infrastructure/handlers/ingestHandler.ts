import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { z } from "zod";
import { IngestDocumentUseCase } from "../../application/IngestDocumentUseCase";
import { DynamoAuditLogRepository } from "../repositories/DynamoAuditLogRepository";
import { DynamoJobRepository } from "../repositories/DynamoJobRepository";
import { S3DocumentStorage } from "../repositories/S3DocumentStorage";
import { SqsProcessingQueue } from "../queues/SqsProcessingQueue";
import { Logger, withLatency } from "../logging/Logger";
import { jsonResponse } from "./response";
import { SUPPORTED_UPLOAD_FIXTURES } from "../../domain/Fixture";

const schema = z.object({
  fileName: z.string().min(1).max(180).regex(/\.pdf$/i),
  contentType: z.literal("application/pdf"),
  contentBase64: z.string().min(1),
  country: z.enum(["CO", "MX", "CL"]).default("CO"),
  fixture: z.enum(SUPPORTED_UPLOAD_FIXTURES).optional()
}).strict();

type UploadCommand = z.infer<typeof schema>;

const logger = new Logger("IngestLambda");

export async function handler(event: { body?: string | null }): Promise<APIGatewayProxyStructuredResultV2> {
  return withLatency(logger, "UPLOAD_REQUEST", {}, async () => {
    const command = parseUploadCommand(event.body);

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
      errorCode: errorCodeFor(error)
    });
    return invalidUploadResponse(error);
  });
}

export function parseUploadCommand(body?: string | null): UploadCommand {
  const rawBody = body ? JSON.parse(body) : {};
  return schema.parse(rawBody);
}

function invalidUploadResponse(error: unknown): APIGatewayProxyStructuredResultV2 {
  if (error instanceof z.ZodError) {
    return jsonResponse(400, {
      message: "Invalid upload request",
      errorCode: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  return jsonResponse(400, {
    message: "Invalid upload request",
    errorCode: errorCodeFor(error)
  });
}

function errorCodeFor(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "VALIDATION_ERROR";
  }
  return error instanceof Error ? error.name : "UNKNOWN_ERROR";
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}
