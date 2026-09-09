import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { VersePayload, VerseRecord } from "@/types/verse";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayFrom<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value)) for (const key of keys) if (Array.isArray(value[key])) return value[key] as T[];
  return [];
}

function recordFrom<T>(value: unknown, keys: string[]): T {
  if (isRecord(value)) for (const key of keys) if (isRecord(value[key])) return value[key] as T;
  return value as T;
}

export type VersePreviewResult = ApiResult<VerseRecord | null> & { isSet: boolean };

export const verseApi = {
  async sample() {
    const result = await apiRequest<unknown>("/admin/verse/sample");
    return { ...result, data: recordFrom<VerseRecord>(result.data, ["verse", "sample"]) };
  },
  set: (payload: VersePayload) => apiRequest<VerseRecord>("/admin/verse/set", { method: "POST", data: payload }),
  async preview(date?: string): Promise<VersePreviewResult> {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    const result = await apiRequest<unknown>("/admin/verse/preview" + (params.size ? "?" + params : ""));
    return { ...result, data: result.data === null ? null : recordFrom<VerseRecord>(result.data, ["verse"]), isSet: result.metadata?.isSet === true };
  },
  async history(limit = 10) {
    const result = await apiRequest<unknown>("/admin/verse/history?limit=" + limit);
    return { ...result, data: arrayFrom<VerseRecord>(result.data, ["history", "verses", "results"]) };
  },
};