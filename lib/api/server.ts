const DEFAULT_API_ORIGIN = "https://bibleplus-backend-nhyo.onrender.com";
export const API_REQUEST_TIMEOUT_MS = 60_000;
export function getBackendOrigin() { return (process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_ORIGIN).replace(/\/+$/, "").replace(/\/api$/i, ""); }
export function buildBackendUrl(path: string, search = "") { const clean = path.replace(/^\/+/, "").replace(/^api\//i, ""); return `${getBackendOrigin()}/api/${clean}${search}`; }
export function fetchWithTimeout(input: string | URL | Request, init: RequestInit = {}, timeoutMs = API_REQUEST_TIMEOUT_MS) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs); return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout)); }
