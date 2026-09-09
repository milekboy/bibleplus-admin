import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { EventCategory, EventPayload, EventRecord, EventSpeaker, EventView } from "@/types/events";

function arrayFrom<T>(value: unknown, keys: string[]): T[] { if (Array.isArray(value)) return value as T[]; if (value && typeof value === "object") { const record = value as Record<string, unknown>; for (const key of keys) if (Array.isArray(record[key])) return record[key] as T[]; } return []; }
function recordFrom<T>(value: unknown, keys: string[]): T { if (value && typeof value === "object") { const record = value as Record<string, unknown>; for (const key of keys) if (record[key] && typeof record[key] === "object") return record[key] as T; } return value as T; }

export const eventsApi = {
  async list({ view, page, limit, query, signal }: { view: EventView; page: number; limit: number; query: string; signal?: AbortSignal }): Promise<ApiResult<EventRecord[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    let path = "/admin/events";
    if (query) { path += "/search"; params.set("q", query); }
    else if (view !== "all") path += `/${view}`;
    const result = await apiRequest<unknown>(`${path}?${params}`, { signal });
    return { ...result, data: arrayFrom<EventRecord>(result.data, ["events", "results"]) };
  },
  async get(id: string) { const result = await apiRequest<unknown>(`/admin/events/${encodeURIComponent(id)}`); return { ...result, data: recordFrom<EventRecord>(result.data, ["event"]) }; },
  create: (payload: EventPayload) => apiRequest<EventRecord>("/admin/events", { method: "POST", data: payload }),
  update: (id: string, payload: EventPayload) => apiRequest<EventRecord>(`/admin/events/${encodeURIComponent(id)}`, { method: "PUT", data: payload }),
  remove: (id: string) => apiRequest<void>(`/admin/events/${encodeURIComponent(id)}`, { method: "DELETE" }),
  updateLive: (id: string, payload: { platform: string; url: string; thumbnail?: string }) => apiRequest<EventRecord>(`/admin/events/${encodeURIComponent(id)}/live`, { method: "PUT", data: payload }),
  uploadBanner: (data: FormData, onUploadProgress?: (event: { loaded: number; total?: number }) => void) => apiRequest<Record<string, unknown>>("/admin/events/upload-banner", { method: "POST", data, onUploadProgress }),
  uploadGallery: (data: FormData, onUploadProgress?: (event: { loaded: number; total?: number }) => void) => apiRequest<Record<string, unknown>>("/admin/events/gallery/upload", { method: "POST", data, onUploadProgress }),
  async speakers() { const result = await apiRequest<unknown>("/speakers"); return arrayFrom<EventSpeaker>(result.data, ["speakers", "results"]); },
  async categories() { const result = await apiRequest<unknown>("/event-categories"); return arrayFrom<EventCategory>(result.data, ["categories", "results"]); },
  createSpeaker: (payload: Pick<EventSpeaker, "name" | "bio" | "title">) => apiRequest<EventSpeaker>("/admin/speakers", { method: "POST", data: payload }),
  updateSpeaker: (id: string, payload: Partial<EventSpeaker>) => apiRequest<EventSpeaker>(`/admin/speakers/${encodeURIComponent(id)}`, { method: "PUT", data: payload }),
  deleteSpeaker: (id: string) => apiRequest<void>(`/admin/speakers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createCategory: (name: string) => apiRequest<EventCategory>("/admin/event-categories", { method: "POST", data: { name } }),
  updateCategory: (id: string, name: string) => apiRequest<EventCategory>(`/admin/event-categories/${encodeURIComponent(id)}`, { method: "PUT", data: { name } }),
  deleteCategory: (id: string) => apiRequest<void>(`/admin/event-categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
};