import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { ModerationItem, ModerationKind, ModerationQueueCounts, ModerationStatus } from "@/types/moderation";

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toItem(value: Record<string, unknown>): ModerationItem | null {
  const rawId = value._id ?? value.id;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  return { ...value, _id: String(rawId) } as ModerationItem;
}

function itemArray(value: unknown, kind: ModerationKind): ModerationItem[] {
  if (Array.isArray(value)) return value.filter(record).map(toItem).filter((item): item is ModerationItem => Boolean(item));
  if (!record(value)) return [];
  const candidates = [value[kind], value.items, value.results, value.queue];
  const found = candidates.find(Array.isArray);
  return Array.isArray(found) ? found.filter(record).map(toItem).filter((item): item is ModerationItem => Boolean(item)) : [];
}

function counts(value: unknown): ModerationQueueCounts {
  if (!record(value)) return {};
  const source = record(value.counts) ? value.counts : value;
  const number = (entry: unknown) => {
    const parsed = typeof entry === "string" ? Number(entry) : entry;
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    pendingPrayers: number(source.pendingPrayers),
    flaggedPrayers: number(source.flaggedPrayers),
    pendingComments: number(source.pendingComments),
    flaggedComments: number(source.flaggedComments),
    total: number(source.total),
  };
}

function number(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function listPagination(value: unknown, fallback: { page: number; limit: number }) {
  if (!record(value)) return undefined;
  const nested = record(value.pagination) ? value.pagination : record(value.meta) ? value.meta : value;
  const page = number(nested.page ?? nested.currentPage) ?? fallback.page;
  const limit = number(nested.limit ?? nested.pageSize ?? nested.perPage) ?? fallback.limit;
  const total = number(nested.total ?? nested.totalItems ?? nested.count);
  const totalPages = number(nested.totalPages ?? nested.pages);
  if (total === undefined && totalPages === undefined) return undefined;
  return { page, limit, total: total ?? totalPages! * limit, totalPages: totalPages ?? Math.max(1, Math.ceil(total! / limit)) };
}

export const moderationApi = {
  async queue() {
    const result = await apiRequest<unknown>("/admin/moderation/queue");
    return { ...result, data: counts(result.data) } satisfies ApiResult<ModerationQueueCounts>;
  },
  async list(kind: ModerationKind, params: { status: ModerationStatus; page: number; limit: number }) {
    const result = await apiRequest<unknown>(`/admin/moderation/${kind}`, { params });
    return { ...result, data: itemArray(result.data, kind), pagination: result.pagination ?? listPagination(result.data, params) } satisfies ApiResult<ModerationItem[]>;
  },
  approve(kind: ModerationKind, id: string) {
    return apiRequest<void>(`/admin/moderation/${kind}/${encodeURIComponent(id)}/approve`, { method: "PUT" });
  },
  flag(kind: ModerationKind, id: string) {
    return apiRequest<void>(`/admin/moderation/${kind}/${encodeURIComponent(id)}/flag`, { method: "PUT" });
  },
  reject(kind: ModerationKind, id: string) {
    return apiRequest<void>(`/admin/moderation/${kind}/${encodeURIComponent(id)}/reject`, { method: "DELETE" });
  },
};