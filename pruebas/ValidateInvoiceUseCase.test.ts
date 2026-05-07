import { describe, expect, it } from "vitest";
import { ValidateInvoiceUseCase } from "../src/application/ValidateInvoiceUseCase";
import { ExtractedInvoice } from "../src/domain/Invoice";
import { JsonTaxRulesProvider } from "../src/infrastructure/config/JsonTaxRulesProvider";

const baseInvoice: ExtractedInvoice = {
  invoiceId: "INV-1",
  issueDate: "2026-05-06",
  supplier: {
    name: "Proveedor Piloto SAS",
    taxId: "900123456-7"
  },
  financial: {
    subtotal: "1000.00",
    taxRate: 19,
    taxAmount: "190.00",
    total: "1190.00"
  },
  confidence: 0.95
};

describe("ValidateInvoiceUseCase", () => {
  const useCase = new ValidateInvoiceUseCase(new JsonTaxRulesProvider());

  it("returns APPROVED when math is valid and confidence is above threshold", () => {
    const result = useCase.execute(baseInvoice, "CO");

    expect(result.status).toBe("APPROVED");
    expect(result.reasons).toEqual([]);
  });

  it("returns REQUIRES_REVIEW when confidence is at or below threshold", () => {
    const result = useCase.execute({ ...baseInvoice, confidence: 0.85 }, "CO");

    expect(result.status).toBe("REQUIRES_REVIEW");
    expect(result.reasons).toContain("CONFIDENCE_TOO_LOW");
  });

  it("returns REQUIRES_REVIEW when subtotal plus tax does not equal total", () => {
    const result = useCase.execute(
      {
        ...baseInvoice,
        financial: {
          ...baseInvoice.financial,
          total: "1189.99"
        }
      },
      "CO"
    );

    expect(result.status).toBe("REQUIRES_REVIEW");
    expect(result.reasons).toContain("TOTAL_MISMATCH");
  });

  it("loads tax rules from JSON catalog rather than domain constants", () => {
    const rules = new JsonTaxRulesProvider().getRules("MX");

    expect(rules.currency).toBe("MXN");
    expect(rules.allowedTaxRates).toContain(16);
  });
});
