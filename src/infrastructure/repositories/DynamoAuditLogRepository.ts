import { randomUUID } from "node:crypto";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { AuditLogEvent, AuditLogRepository } from "../../application/Ports";
import { dynamoDocumentClient } from "../aws/clients";

export class DynamoAuditLogRepository implements AuditLogRepository {
  constructor(private readonly tableName: string) {}

  async append(event: {
    trackingId: string;
    invoiceId?: string;
    eventType:
      | "DOCUMENT_INGESTED"
      | "AI_EXTRACTION_STARTED"
      | "AI_EXTRACTION_COMPLETED"
      | "VALIDATION_COMPLETED"
      | "INVOICE_APPROVED"
      | "INVOICE_REQUIRES_REVIEW"
      | "STORED"
      | "ERP_DISPATCHED"
      | "ERP_DISPATCH_FAILED";
    details?: Record<string, unknown>;
  }): Promise<void> {
    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          auditId: randomUUID(),
          createdAt: new Date().toISOString(),
          ...event
        },
        ConditionExpression: "attribute_not_exists(auditId)"
      })
    );
  }

  async listByTrackingId(trackingId: string): Promise<AuditLogEvent[]> {
    const result = await dynamoDocumentClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "TrackingIdIndex",
        KeyConditionExpression: "trackingId = :trackingId",
        ExpressionAttributeValues: {
          ":trackingId": trackingId
        },
        ScanIndexForward: true
      })
    );

    return (result.Items ?? []) as AuditLogEvent[];
  }
}
