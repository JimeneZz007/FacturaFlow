import { ExtractedInvoice } from "../domain/Invoice";
import { Money } from "../domain/Money";
import { TaxRulesProvider } from "../domain/TaxRules";
import { ValidationResult } from "../domain/ValidationResult";

export class ValidateInvoiceUseCase {
  constructor(private readonly taxRulesProvider: TaxRulesProvider) {}

  currencyFor(country: string): string {
    return this.taxRulesProvider.getRules(country).currency;
  }

  execute(invoice: ExtractedInvoice, country: string): ValidationResult {
    const rules = this.taxRulesProvider.getRules(country);
    const reasons: string[] = [];

    if (invoice.confidence <= 0.85) {
      reasons.push("CONFIDENCE_TOO_LOW");
    }

    if (!rules.allowedTaxRates.includes(invoice.financial.taxRate)) {
      reasons.push("UNSUPPORTED_TAX_RATE");
    }

    const subtotal = Money.fromDecimal(invoice.financial.subtotal, rules.currency);
    const taxAmount = Money.fromDecimal(invoice.financial.taxAmount, rules.currency);
    const total = Money.fromDecimal(invoice.financial.total, rules.currency);

    if (!subtotal.add(taxAmount).equals(total)) {
      reasons.push("TOTAL_MISMATCH");
    }

    return {
      status: reasons.length === 0 ? "APPROVED" : "REQUIRES_REVIEW",
      reasons
    };
  }
}
