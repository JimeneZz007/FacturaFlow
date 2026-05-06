import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const dynamoDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const s3Client = new S3Client({});
export const sqsClient = new SQSClient({});
export const lambdaClient = new LambdaClient({});
