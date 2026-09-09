import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { BookPayload, BookRecord } from "@/types/books";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayFrom<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value)) {
    for (const key of keys) if (Array.isArray(value[key])) return value[key] as T[];
  }
  return [];
}

function recordFrom<T>(value: unknown, keys: string[]): T {
  if (isRecord(value)) {
    for (const key of keys) if (isRecord(value[key])) return value[key] as T;
  }
  return value as T;
}

export const booksApi = {
  async list({ page, limit, query, signal }: { page: number; limit: number; query: string; signal?: AbortSignal }): Promise<ApiResult<BookRecord[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const path = query ? "/admin/books/search" : "/admin/books";
    if (query) params.set("q", query);
    const result = await apiRequest<unknown>(path + "?" + params, { signal });
    return { ...result, data: arrayFrom<BookRecord>(result.data, ["books", "results", "items"]) };
  },
  async get(id: string) {
    const result = await apiRequest<unknown>("/admin/books/" + encodeURIComponent(id));
    return { ...result, data: recordFrom<BookRecord>(result.data, ["book"]) };
  },
  async create(data: FormData) {
    const result = await apiRequest<unknown>("/admin/books", { method: "POST", data });
    return { ...result, data: recordFrom<BookRecord>(result.data, ["book"]) };
  },
  async update(id: string, data: BookPayload | FormData) {
    const result = await apiRequest<unknown>("/admin/books/" + encodeURIComponent(id), { method: "PUT", data });
    return { ...result, data: recordFrom<BookRecord>(result.data, ["book"]) };
  },
  remove: (id: string) => apiRequest<void>("/admin/books/" + encodeURIComponent(id), { method: "DELETE" }),
};