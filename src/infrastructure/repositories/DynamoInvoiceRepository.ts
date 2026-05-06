import { PutCommand } from "@aws-sdk/lib-dynamodb";
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
}
