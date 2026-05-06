import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "../src/application/DispatchToErpUseCase";

describe("FixedWindowRateLimiter", () => {
  it("limits ERP dispatches to five requests per second", async () => {
    let currentTime = 0;
    const waits: number[] = [];
    const limiter = new FixedWindowRateLimiter(
      5,
      1000,
      () => currentTime,
      async (ms) => {
        waits.push(ms);
        currentTime += ms;
      }
    );

    for (let index = 0; index < 6; index += 1) {
      await limiter.wait();
    }

    expect(waits).toEqual([1000]);
  });
});
