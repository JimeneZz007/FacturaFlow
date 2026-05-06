export const SUPPORTED_UPLOAD_FIXTURES = [
  "approved",
  "requires_review",
  "low_confidence",
  "math_error",
  "total_mismatch"
] as const;

export type UploadFixture = (typeof SUPPORTED_UPLOAD_FIXTURES)[number];

export type AiMockScenario = "approved" | "low_confidence" | "total_mismatch";

export function isUploadFixture(value: unknown): value is UploadFixture {
  return typeof value === "string" && SUPPORTED_UPLOAD_FIXTURES.includes(value as UploadFixture);
}

export function normalizeAiMockScenario(fixture: UploadFixture | undefined): AiMockScenario {
  if (fixture === "requires_review" || fixture === "low_confidence") {
    return "low_confidence";
  }

  if (fixture === "math_error" || fixture === "total_mismatch") {
    return "total_mismatch";
  }

  return "approved";
}
