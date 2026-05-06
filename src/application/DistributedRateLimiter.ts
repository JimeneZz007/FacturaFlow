export interface FixedWindowCounterStore {
  incrementIfBelowLimit(input: {
    windowId: string;
    limit: number;
    expiresAtEpochSeconds: number;
  }): Promise<boolean>;
}

export class DistributedFixedWindowRateLimiter {
  constructor(
    private readonly store: FixedWindowCounterStore,
    private readonly options: {
      keyPrefix: string;
      maxRequests: number;
      windowMs: number;
      ttlSeconds: number;
    },
    private readonly now: () => number = () => Date.now()
  ) {}

  async tryAcquire(): Promise<boolean> {
    const windowStart = Math.floor(this.now() / this.options.windowMs) * this.options.windowMs;
    const windowId = `${this.options.keyPrefix}#${windowStart}`;
    const expiresAtEpochSeconds = Math.floor(windowStart / 1000) + this.options.ttlSeconds;

    return this.store.incrementIfBelowLimit({
      windowId,
      limit: this.options.maxRequests,
      expiresAtEpochSeconds
    });
  }
}
