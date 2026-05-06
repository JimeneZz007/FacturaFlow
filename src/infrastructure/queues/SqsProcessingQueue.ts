import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { ProcessingMessage, ProcessingQueue } from "../../application/Ports";
import { sqsClient } from "../aws/clients";

export class SqsProcessingQueue implements ProcessingQueue {
  constructor(private readonly queueUrl: string) {}

  async send(message: ProcessingMessage): Promise<void> {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message)
      })
    );
  }
}
