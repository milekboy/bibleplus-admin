"use client";
import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { normalizeApiError, normalizeApiResponse } from "@/lib/api/normalize";
import type { ApiErrorPayload, ApiResult } from "@/types/api";
export class ApiClientError extends Error { status: number; code?: string; validationErrors?: ApiErrorPayload["validationErrors"]; constructor(payload: ApiErrorPayload) { super(payload.message); this.name = "ApiClientError"; this.status = payload.status; this.code = payload.code; this.validationErrors = payload.validationErrors; } }
export const apiClient = axios.create({ baseURL: "/api/backend", timeout: 60_000, headers: { Accept: "application/json" } });
let redirecting = false;
apiClient.interceptors.response.use((response) => response, async (error: AxiosError) => { const status = error.response?.status ?? (error.code === "ECONNABORTED" ? 408 : 0); const normalized = normalizeApiError(error.response?.data ?? (status === 408 ? { message: "The request timed out. Please try again." } : null), status); if (status === 401 && typeof window !== "undefined" && !redirecting) { redirecting = true; const returnTo = `${window.location.pathname}${window.location.search}`; try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } finally { window.location.replace(`/?returnTo=${encodeURIComponent(returnTo)}`); } } return Promise.reject(new ApiClientError(normalized)); });
export async function apiRequest<T>(url: string, config: AxiosRequestConfig = {}): Promise<ApiResult<T>> { const response = await apiClient.request({ ...config, url }); return normalizeApiResponse<T>(response.data); }
