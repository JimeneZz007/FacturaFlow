export interface StructuredLog {
  trackingId?: string;
  invoiceId?: string;
  component: string;
  event: string;
  status: "STARTED" | "SUCCEEDED" | "FAILED";
  latencyMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}

export class Logger {
  constructor(private readonly component: string) {}

  info(log: Omit<StructuredLog, "component" | "status"> & { status?: StructuredLog["status"] }): void {
    console.log(
      JSON.stringify({
        component: this.component,
        status: "SUCCEEDED",
        timestamp: new Date().toISOString(),
        ...log
      })
    );
  }

  error(log: Omit<StructuredLog, "component" | "status"> & { status?: StructuredLog["status"] }): void {
    console.error(
      JSON.stringify({
        component: this.component,
        status: "FAILED",
        timestamp: new Date().toISOString(),
        ...log
      })
    );
  }
}

export async function withLatency<T>(
  logger: Logger,
  event: string,
  input: { trackingId?: string; invoiceId?: string },
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  logger.info({ ...input, event, status: "STARTED" });
  try {
    const result = await operation();
    logger.info({ ...input, event, latencyMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logger.error({
      ...input,
      event,
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR"
    });
    throw error;
  }
}
