import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ProcessingJob } from "../../domain/Invoice";
import { JobRepository } from "../../application/Ports";
import { dynamoDocumentClient } from "../aws/clients";

export class DynamoJobRepository implements JobRepository {
  constructor(private readonly tableName: string) {}

  async create(job: ProcessingJob): Promise<void> {
    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: job,
        ConditionExpression: "attribute_not_exists(trackingId)"
      })
    );
  }

  async markProcessing(trackingId: string): Promise<void> {
    await this.updateStatus(trackingId, "PROCESSING");
  }

  async markCompleted(
    trackingId: string,
    status: "APPROVED" | "REQUIRES_REVIEW",
    invoiceId: string
  ): Promise<void> {
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { trackingId },
        UpdateExpression: "SET #status = :status, invoiceId = :invoiceId, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": status,
          ":invoiceId": invoiceId,
          ":updatedAt": new Date().toISOString()
        }
      })
    );
  }

  async markFailed(trackingId: string, errorCode: string): Promise<void> {
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { trackingId },
        UpdateExpression: "SET #status = :status, errorCode = :errorCode, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "FAILED",
          ":errorCode": errorCode,
          ":updatedAt": new Date().toISOString()
        }
      })
    );
  }

  private async updateStatus(trackingId: string, status: ProcessingJob["status"]): Promise<void> {
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { trackingId },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": status,
          ":updatedAt": new Date().toISOString()
        }
      })
    );
  }
}
