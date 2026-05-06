import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Trend } from "k6/metrics";

export const uploadLatency = new Trend("UploadLatencyMs");
export const uploadStatusCodes = new Counter("UploadStatusCodes");

const trackedStatusCodes = [200, 202, 400, 401, 403, 404, 409, 413, 429, 500, 502, 503, 504];

export const options = {
  vus: Number(__ENV.K6_VUS || __ENV.VUS || 25),
  duration: __ENV.K6_DURATION || __ENV.DURATION || "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    UploadLatencyMs: ["p(95)<2000"],
    ...Object.fromEntries(trackedStatusCodes.map((status) => [`UploadStatusCodes{status:${status}}`, ["count>=0"]])),
    "UploadStatusCodes{status:other}": ["count>=0"]
  }
};

const apiBaseUrl = __ENV.API_BASE_URL;
const debugFailures = String(__ENV.DEBUG_FAILURES || "false").toLowerCase() === "true";
let printedFailureForVu = false;

if (!apiBaseUrl) {
  throw new Error("API_BASE_URL is required. Example: API_BASE_URL=https://abc.execute-api.us-east-1.amazonaws.com k6 run load-tests/upload-load-test.js");
}

const pdfBase64 = "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iago=";
const uploadUrl = `${apiBaseUrl.replace(/\/$/, "")}/uploads`;
const supportedFixtures = [
  "approved",
  "requires_review",
  "low_confidence",
  "math_error",
  "total_mismatch"
];

function statusTag(status) {
  return trackedStatusCodes.includes(status) ? String(status) : "other";
}

function shouldPrintFailure(response) {
  return debugFailures && response.status !== 202 && __VU <= 10 && !printedFailureForVu;
}

function printFailure(response, payload) {
  printedFailureForVu = true;
  console.error(
    JSON.stringify({
      event: "UPLOAD_FAILURE_SAMPLE",
      statusCode: response.status,
      body: response.body,
      url: uploadUrl,
      payload: {
        fileName: payload.fileName,
        contentType: payload.contentType,
        country: payload.country,
        fixture: payload.fixture,
        contentBase64Bytes: payload.contentBase64.length
      },
      vu: __VU,
      iterationInTest: exec.scenario.iterationInTest
    })
  );
}

export default function () {
  const startedAt = Date.now();
  const payload = {
    fileName: `load-test-${__VU}-${__ITER}.pdf`,
    contentType: "application/pdf",
    contentBase64: pdfBase64,
    country: "CO",
    fixture: supportedFixtures[__ITER % supportedFixtures.length]
  };
  const response = http.post(uploadUrl, JSON.stringify(payload), {
    headers: {
      "content-type": "application/json"
    }
  });

  uploadLatency.add(Date.now() - startedAt);
  uploadStatusCodes.add(1, { status: statusTag(response.status) });

  if (shouldPrintFailure(response)) {
    printFailure(response, payload);
  }

  check(response, {
    "POST /uploads returns 202": (res) => res.status === 202,
    "body contains trackingId": (res) => Boolean(res.json("trackingId"))
  });

  sleep(1);
}

// Evidencias sugeridas:
// 1. Guardar salida de consola: API_BASE_URL=... DEBUG_FAILURES=true K6_VUS=25 K6_DURATION=1m k6 run load-tests/upload-load-test.js > evidence/k6-upload.txt
// 2. Capturar p95 de http_req_duration y UploadLatencyMs.
// 3. Capturar ApproximateNumberOfMessagesVisible de ProcessingQueue durante la prueba para demostrar encolamiento.
// 4. Capturar logs de ErpMockLambda agrupados por segundo para demostrar <= 5 requests/s.
