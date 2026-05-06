import { describe, expect, it } from "vitest";
import {
  DistributedFixedWindowRateLimiter,
  FixedWindowCounterStore
} from "../src/application/DistributedRateLimiter";

describe("DistributedFixedWindowRateLimiter", () => {
  it("denies requests above the configured global window limit", async () => {
    const store = new InMemoryCounterStore();
    const limiter = new DistributedFixedWindowRateLimiter(
      store,
      {
        keyPrefix: "ERP_MOCK",
        maxRequests: 5,
        windowMs: 1000,
        ttlSeconds: 120
      },
      () => 100
    );

    const results = [];
    for (let index = 0; index < 6; index += 1) {
      results.push(await limiter.tryAcquire());
    }

    expect(results).toEqual([true, true, true, true, true, false]);
  });
});

class InMemoryCounterStore implements FixedWindowCounterStore {
  private readonly counters = new Map<string, number>();

  async incrementIfBelowLimit(input: {
    windowId: string;
    limit: number;
    expiresAtEpochSeconds: number;
  }): Promise<boolean> {
    const current = this.counters.get(input.windowId) ?? 0;
    if (current >= input.limit) {
      return false;
    }
    this.counters.set(input.windowId, current + 1);
    return true;
  }
}
