export class Money {
  private constructor(
    public readonly cents: number,
    public readonly currency: string
  ) {
    if (!Number.isInteger(cents)) {
      throw new Error("Money cents must be an integer");
    }
  }

  static fromCents(cents: number, currency = "USD"): Money {
    return new Money(cents, currency);
  }

  static fromDecimal(value: number | string, currency = "USD"): Money {
    const raw = String(value).trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
      throw new Error(`Invalid money value: ${raw}`);
    }

    const sign = raw.startsWith("-") ? -1 : 1;
    const normalized = raw.replace("-", "");
    const [units, decimals = ""] = normalized.split(".");
    const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
    return new Money(sign * cents, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.cents === other.cents;
  }

  toJSON(): { cents: number; currency: string; decimal: string } {
    return {
      cents: this.cents,
      currency: this.currency,
      decimal: this.toDecimalString()
    };
  }

  toDecimalString(): string {
    const sign = this.cents < 0 ? "-" : "";
    const absolute = Math.abs(this.cents);
    const units = Math.floor(absolute / 100);
    const cents = String(absolute % 100).padStart(2, "0");
    return `${sign}${units}.${cents}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} != ${other.currency}`);
    }
  }
}
