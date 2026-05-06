import { InvokeCommand } from "@aws-sdk/client-lambda";
import { AiClient, ProcessingMessage } from "../../application/Ports";
import { ExtractedInvoice } from "../../domain/Invoice";
import { lambdaClient } from "../aws/clients";

export class AiMockLambdaClient implements AiClient {
  constructor(private readonly functionName: string) {}

  async extract(input: ProcessingMessage): Promise<ExtractedInvoice> {
    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: this.functionName,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify(input))
      })
    );

    const payload = response.Payload ? Buffer.from(response.Payload).toString("utf8") : "{}";
    const parsed = JSON.parse(payload) as ExtractedInvoice | { statusCode: number; body: string };

    if ("statusCode" in parsed) {
      if (parsed.statusCode >= 400) {
        throw new Error(`AI mock failed with status ${parsed.statusCode}`);
      }
      return JSON.parse(parsed.body) as ExtractedInvoice;
    }

    return parsed;
  }
}
