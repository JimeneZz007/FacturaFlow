import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeAiMockScenario,
  SUPPORTED_UPLOAD_FIXTURES,
  UploadFixture
} from "../src/domain/Fixture";
import { ValidateInvoiceUseCase } from "../src/application/ValidateInvoiceUseCase";
import { buildFixture } from "../src/infrastructure/handlers/aiMockHandler";
import { handler as ingestHandler, parseUploadCommand } from "../src/infrastructure/handlers/ingestHandler";
import { JsonTaxRulesProvider } from "../src/infrastructure/config/JsonTaxRulesProvider";

const baseUpload = {
  fileName: "factura.pdf",
  contentType: "application/pdf",
  contentBase64: "JVBERi0xLjQK",
  country: "CO"
};

describe("fixture normalization", () => {
  it.each(SUPPORTED_UPLOAD_FIXTURES)("%s is accepted by upload validation", (fixture) => {
    const command = parseUploadCommand(JSON.stringify({ ...baseUpload, fixture }));

    expect(command.fixture).toBe(fixture);
  });

  it("invalid fixture returns 400 instead of leaking a 503", async () => {
    const response = await ingestHandler({
      body: JSON.stringify({ ...baseUpload, fixture: "unsupported_fixture" })
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body ?? "{}")).toMatchObject({
      message: "Invalid upload request",
      errorCode: "VALIDATION_ERROR"
    });
  });

  it.each<{
    fixture: UploadFixture;
    expectedScenario: ReturnType<typeof normalizeAiMockScenario>;
  }>([
    { fixture: "approved", expectedScenario: "approved" },
    { fixture: "requires_review", expectedScenario: "low_confidence" },
    { fixture: "low_confidence", expectedScenario: "low_confidence" },
    { fixture: "math_error", expectedScenario: "total_mismatch" },
    { fixture: "total_mismatch", expectedScenario: "total_mismatch" }
  ])("$fixture maps to $expectedScenario", ({ fixture, expectedScenario }) => {
    expect(normalizeAiMockScenario(fixture)).toBe(expectedScenario);
  });

  it.each<{
    fixture: UploadFixture;
    expectedStatus: "APPROVED" | "REQUIRES_REVIEW";
    expectedReason?: string;
  }>([
    { fixture: "approved", expectedStatus: "APPROVED" },
    {
      fixture: "requires_review",
      expectedStatus: "REQUIRES_REVIEW",
      expectedReason: "CONFIDENCE_TOO_LOW"
    },
    {
      fixture: "low_confidence",
      expectedStatus: "REQUIRES_REVIEW",
      expectedReason: "CONFIDENCE_TOO_LOW"
    },
    {
      fixture: "math_error",
      expectedStatus: "REQUIRES_REVIEW",
      expectedReason: "TOTAL_MISMATCH"
    },
    {
      fixture: "total_mismatch",
      expectedStatus: "REQUIRES_REVIEW",
      expectedReason: "TOTAL_MISMATCH"
    }
  ])("$fixture produces $expectedStatus", ({ fixture, expectedStatus, expectedReason }) => {
    const validator = new ValidateInvoiceUseCase(new JsonTaxRulesProvider());
    const result = validator.execute(buildFixture(fixture), "CO");

    expect(result.status).toBe(expectedStatus);
    if (expectedReason) {
      expect(result.reasons).toContain(expectedReason);
    }
  });

  it("load test sends only supported fixtures", () => {
    const script = readFileSync("load-tests/upload-load-test.js", "utf8");
    const fixtureMatches = [...script.matchAll(/"([a-z_]+)"/g)]
      .map((match) => match[1])
      .filter((value) => value.includes("_") || value === "approved");

    const referencedFixtures = fixtureMatches.filter((value) =>
      SUPPORTED_UPLOAD_FIXTURES.includes(value as UploadFixture)
    );

    expect(new Set(referencedFixtures)).toEqual(new Set(SUPPORTED_UPLOAD_FIXTURES));
  });
});
