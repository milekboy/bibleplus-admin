import { apiRequest } from "@/lib/api/client";
import type { ApiResult, PaginationMeta } from "@/types/api";
import type { DirectNotificationPayload, NotificationPayload, NotificationRecord } from "@/types/notifications";

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function number(value: unknown) { const parsed = typeof value === "string" ? Number(value) : value; return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined; }
function toNotification(value: Record<string, unknown>): NotificationRecord | null { const id = value._id ?? value.id; return typeof id === "string" || typeof id === "number" ? { ...value, _id: String(id) } as NotificationRecord : null; }
function notificationArray(value: unknown) { if (Array.isArray(value)) return value.filter(record).map(toNotification).filter((item): item is NotificationRecord => Boolean(item)); if (!record(value)) return []; const found = [value.notifications, value.items, value.results, value.data].find(Array.isArray); return Array.isArray(found) ? found.filter(record).map(toNotification).filter((item): item is NotificationRecord => Boolean(item)) : []; }
function pagination(value: unknown, fallback: { page: number; limit: number }): PaginationMeta | undefined { if (!record(value)) return; const source = record(value.pagination) ? value.pagination : record(value.meta) ? value.meta : value; const total = number(source.total ?? source.count ?? source.totalItems); const pages = number(source.totalPages ?? source.pages); if (total === undefined && pages === undefined) return; const page = number(source.page ?? source.currentPage) ?? fallback.page; const limit = number(source.limit ?? source.pageSize ?? source.perPage) ?? fallback.limit; return { page, limit, total: total ?? pages! * limit, totalPages: pages ?? Math.max(1, Math.ceil(total! / limit)) }; }

export const notificationsApi = {
  async list(params: { page: number; limit: number }) {
    const result = await apiRequest<unknown>("/admin/notifications/all", { params });
    return { ...result, data: notificationArray(result.data), pagination: result.pagination ?? pagination(result.data, params) ?? pagination(result.metadata, params) } satisfies ApiResult<NotificationRecord[]>;
  },
  send(payload: DirectNotificationPayload) { return apiRequest<NotificationRecord>("/admin/notifications/send", { method: "POST", data: payload }); },
  broadcast(payload: NotificationPayload) { return apiRequest<NotificationRecord>("/admin/notifications/broadcast", { method: "POST", data: payload }); },
  resend(id: string) { return apiRequest<NotificationRecord>(`/admin/notifications/${encodeURIComponent(id)}/resend`, { method: "POST" }); },
  remove(id: string) { return apiRequest<void>(`/admin/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }); },
};