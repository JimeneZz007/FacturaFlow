import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { FixedWindowCounterStore } from "../../application/DistributedRateLimiter";
import { dynamoDocumentClient } from "../aws/clients";

export class DynamoRateLimitCounterStore implements FixedWindowCounterStore {
  constructor(private readonly tableName: string) {}

  async incrementIfBelowLimit(input: {
    windowId: string;
    limit: number;
    expiresAtEpochSeconds: number;
  }): Promise<boolean> {
    try {
      await dynamoDocumentClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { windowId: input.windowId },
          UpdateExpression:
            "ADD requestCount :one SET expiresAt = :expiresAt, updatedAt = :updatedAt",
          ConditionExpression: "attribute_not_exists(requestCount) OR requestCount < :limit",
          ExpressionAttributeValues: {
            ":one": 1,
            ":limit": input.limit,
            ":expiresAt": input.expiresAtEpochSeconds,
            ":updatedAt": new Date().toISOString()
          }
        })
      );
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }
      throw error;
    }
  }
}
