import { apiClient } from "@/lib/api/client";
import { safeDownloadFilename } from "@/lib/formatters";

export type DownloadedFile = { blob: Blob; filename: string; contentType: string };

function filenameFromDisposition(value: string | undefined, fallback: string) {
  if (!value) return safeDownloadFilename(fallback);
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quoted = value.match(/filename="([^"]+)"/i)?.[1];
  const plain = value.match(/filename=([^;]+)/i)?.[1]?.trim();
  let candidate = encoded || quoted || plain;
  if (encoded) { try { candidate = decodeURIComponent(encoded); } catch { /* retain encoded value */ } }
  return safeDownloadFilename(candidate?.replace(/^['"]|['"]$/g, "") || fallback);
}

export async function downloadFile(url: string, params: Record<string, string | undefined>, fallbackName: string, expectedType?: RegExp): Promise<DownloadedFile> {
  const response = await apiClient.get<Blob>(url, { params, responseType: "blob" });
  const blob = response.data;
  const contentType = String(response.headers["content-type"] || blob.type || "application/octet-stream").toLowerCase();
  if (contentType.includes("json")) {
    let errorMessage = "The backend returned JSON instead of a downloadable file.";
    try { const payload = JSON.parse(await blob.text()) as { message?: string; error?: string }; errorMessage = payload.message || payload.error || errorMessage; } catch { /* use safe fallback */ }
    throw new Error(errorMessage);
  }
  if (!blob.size) throw new Error("The backend returned an empty download.");
  if (expectedType && !expectedType.test(contentType)) throw new Error(`The backend returned an unexpected file type (${contentType || "unknown"}).`);
  return { blob, contentType, filename: filenameFromDisposition(response.headers["content-disposition"], fallbackName) };
}

export function saveDownload(file: DownloadedFile) {
  const url = URL.createObjectURL(file.blob);
  try { const link = document.createElement("a"); link.href = url; link.download = file.filename; document.body.appendChild(link); link.click(); link.remove(); }
  finally { window.setTimeout(() => URL.revokeObjectURL(url), 0); }
}