import { JobStatusResponse, Scenario, UploadResult } from "./types";

const demoPdfBase64 =
  "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iago=";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export function isApiMode(): boolean {
  return Boolean(apiBaseUrl);
}

export async function uploadInvoice(input: {
  file?: File;
  scenario: Scenario;
}): Promise<UploadResult> {
  const contentBase64 = input.file ? await fileToBase64(input.file) : demoPdfBase64;
  const response = await fetch(`${apiBaseUrl}/uploads`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fileName: input.file?.name ?? "factura-demo.pdf",
      contentType: "application/pdf",
      contentBase64,
      country: "CO",
      fixture: input.scenario
    })
  });

  if (!response.ok) {
    throw new Error(`Carga fallida con estado ${response.status}`);
  }

  return (await response.json()) as UploadResult;
}

export async function getJobStatus(trackingId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${apiBaseUrl}/jobs/${trackingId}`);
  if (!response.ok) {
    throw new Error(`Consulta de estado fallida con estado ${response.status}`);
  }
  return (await response.json()) as JobStatusResponse;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
