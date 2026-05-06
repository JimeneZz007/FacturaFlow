const apiBaseUrl = process.env.API_BASE_URL;

if (!apiBaseUrl) {
  console.error("API_BASE_URL is required. Example: API_BASE_URL=https://... npm run smoke:test");
  process.exit(1);
}

const payload = {
  fileName: "smoke-test.pdf",
  contentType: "application/pdf",
  contentBase64: "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iago=",
  country: "CO",
  fixture: "approved"
};

async function main() {
  const response = await fetch(`${apiBaseUrl}/uploads`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (response.status !== 202 || !body.trackingId) {
    console.error("Smoke test failed", { status: response.status, body });
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, trackingId: body.trackingId }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
