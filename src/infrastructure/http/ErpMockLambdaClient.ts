import { InvokeCommand } from "@aws-sdk/client-lambda";
import { ErpClient, ErpDispatchMessage } from "../../application/Ports";
import { lambdaClient } from "../aws/clients";

export class ErpMockLambdaClient implements ErpClient {
  constructor(private readonly functionName: string) {}

  async dispatch(message: ErpDispatchMessage): Promise<void> {
    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: this.functionName,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify(message))
      })
    );

    const payload = response.Payload ? Buffer.from(response.Payload).toString("utf8") : "{}";
    const parsed = JSON.parse(payload) as { statusCode?: number; body?: string };
    if (parsed.statusCode && parsed.statusCode >= 400) {
      throw new Error(parsed.body ?? "ERP mock failed");
    }
  }
}
