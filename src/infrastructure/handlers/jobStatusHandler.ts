import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { GetJobStatusUseCase } from "../../application/GetJobStatusUseCase";
import { Logger, withLatency } from "../logging/Logger";
import { DynamoAuditLogRepository } from "../repositories/DynamoAuditLogRepository";
import { DynamoInvoiceRepository } from "../repositories/DynamoInvoiceRepository";
import { DynamoJobRepository } from "../repositories/DynamoJobRepository";
import { jsonResponse } from "./response";

const logger = new Logger("JobStatusLambda");

export async function handler(event: {
  pathParameters?: { trackingId?: string };
}): Promise<APIGatewayProxyStructuredResultV2> {
  const trackingId = event.pathParameters?.trackingId;
  if (!trackingId) {
    return jsonResponse(400, {
      message: "trackingId is required"
    });
  }

  return withLatency(logger, "JOB_STATUS_REQUEST", { trackingId }, async () => {
    const useCase = new GetJobStatusUseCase(
      new DynamoJobRepository(requiredEnv("JOBS_TABLE_NAME")),
      new DynamoInvoiceRepository(requiredEnv("INVOICES_TABLE_NAME")),
      new DynamoAuditLogRepository(requiredEnv("AUDIT_LOG_TABLE_NAME"))
    );
    const result = await useCase.execute(trackingId);

    if (!result) {
      return jsonResponse(404, {
        message: "Job not found",
        trackingId
      });
    }

    return jsonResponse(200, result as unknown as Record<string, unknown>);
  }).catch((error) => {
    logger.error({
      trackingId,
      event: "JOB_STATUS_REQUEST",
      errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR"
    });
    return jsonResponse(500, {
      message: "Unable to read job status",
      trackingId,
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
