import { AuditLogRepository, ErpClient, ErpDispatchMessage } from "./Ports";

export interface RateLimiter {
  wait(): Promise<void>;
}

export class FixedWindowRateLimiter implements RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms))
  ) {}

  async wait(): Promise<void> {
    const current = this.now();
    this.timestamps = this.timestamps.filter((timestamp) => current - timestamp < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitMs = Math.max(0, this.windowMs - (current - oldest));
      await this.sleep(waitMs);
      return this.wait();
    }

    this.timestamps.push(current);
  }
}

export class DispatchToErpUseCase {
  constructor(
    private readonly erp: ErpClient,
    private readonly audit: AuditLogRepository,
    private readonly rateLimiter: RateLimiter
  ) {}

  async execute(message: ErpDispatchMessage): Promise<void> {
    await this.rateLimiter.wait();

    try {
      await this.erp.dispatch(message);
      await this.audit.append({
        trackingId: message.trackingId,
        invoiceId: message.invoiceId,
        eventType: "ERP_DISPATCHED"
      });
    } catch (error) {
      await this.audit.append({
        trackingId: message.trackingId,
        invoiceId: message.invoiceId,
        eventType: "ERP_DISPATCH_FAILED",
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
      throw error;
    }
  }
}
