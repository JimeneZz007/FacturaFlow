import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { InvoiceRepository } from "../../application/Ports";
import { InvoiceRecord } from "../../domain/Invoice";
import { dynamoDocumentClient } from "../aws/clients";

export class DynamoInvoiceRepository implements InvoiceRepository {
  constructor(private readonly tableName: string) {}

  async put(invoice: InvoiceRecord): Promise<void> {
    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: invoice
      })
    );
  }

  async get(invoiceId: string): Promise<InvoiceRecord | undefined> {
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { invoiceId }
      })
    );
    return result.Item as InvoiceRecord | undefined;
  }
}
