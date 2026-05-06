import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

export const uploadLatency = new Trend("UploadLatencyMs");

export const options = {
  vus: Number(__ENV.VUS || 25),
  duration: __ENV.DURATION || "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    UploadLatencyMs: ["p(95)<2000"]
  }
};

const apiBaseUrl = __ENV.API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("API_BASE_URL is required. Example: API_BASE_URL=https://abc.execute-api.us-east-1.amazonaws.com k6 run load-tests/upload-load-test.js");
}

const pdfBase64 = "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iago=";

export default function () {
  const startedAt = Date.now();
  const response = http.post(
    `${apiBaseUrl}/uploads`,
    JSON.stringify({
      fileName: `load-test-${__VU}-${__ITER}.pdf`,
      contentType: "application/pdf",
      contentBase64: pdfBase64,
      country: "CO",
      fixture: __ITER % 3 === 0 ? "requires_review" : "approved"
    }),
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );

  uploadLatency.add(Date.now() - startedAt);

  check(response, {
    "POST /uploads returns 202": (res) => res.status === 202,
    "body contains trackingId": (res) => Boolean(res.json("trackingId"))
  });

  sleep(1);
}

// Evidencias sugeridas:
// 1. Guardar salida de consola: API_BASE_URL=... k6 run load-tests/upload-load-test.js > evidence/k6-upload.txt
// 2. Capturar p95 de http_req_duration y UploadLatencyMs.
// 3. Capturar ApproximateNumberOfMessagesVisible de ProcessingQueue durante la prueba para demostrar encolamiento.
// 4. Capturar logs de ErpMockLambda agrupados por segundo para demostrar <= 5 requests/s.
