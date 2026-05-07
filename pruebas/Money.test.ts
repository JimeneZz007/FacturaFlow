import { describe, expect, it } from "vitest";
import { Money } from "../src/domain/Money";

describe("Money", () => {
  it("parses decimal values into integer cents", () => {
    expect(Money.fromDecimal("123.45", "COP").cents).toBe(12345);
    expect(Money.fromDecimal("123", "COP").toDecimalString()).toBe("123.00");
  });

  it("adds and compares values without floating point drift", () => {
    const subtotal = Money.fromDecimal("0.10", "COP");
    const tax = Money.fromDecimal("0.20", "COP");
    const total = Money.fromDecimal("0.30", "COP");

    expect(subtotal.add(tax).equals(total)).toBe(true);
  });
});
