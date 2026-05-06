import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { ErpDispatchMessage, ErpQueue } from "../../application/Ports";
import { sqsClient } from "../aws/clients";

export class SqsErpQueue implements ErpQueue {
  constructor(private readonly queueUrl: string) {}

  async send(message: ErpDispatchMessage): Promise<void> {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message)
      })
    );
  }
}
