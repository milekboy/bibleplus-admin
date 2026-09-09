import { apiRequest } from "@/lib/api/client";
import { downloadFile } from "@/lib/api/download";
import type { ApiResult, PaginationMeta } from "@/types/api";
import type { AuditFilterOption, AuditFilters, AuditLog, AuditQuery, ExportFormat } from "@/types/audit";

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function number(value: unknown) { const parsed = typeof value === "string" ? Number(value) : value; return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined; }
function logs(value: unknown): AuditLog[] { const source = Array.isArray(value) ? value : record(value) ? [value.logs, value.items, value.results].find(Array.isArray) ?? [] : []; return (source as unknown[]).filter(record).flatMap((entry) => { const id = entry._id ?? entry.id; return typeof id === "string" || typeof id === "number" ? [{ ...entry, _id: String(id) } as AuditLog] : []; }); }
function pagination(value: unknown, fallback: AuditQuery): PaginationMeta | undefined { if (!record(value)) return; const source = record(value.pagination) ? value.pagination : record(value.meta) ? value.meta : value; const total = number(source.total ?? source.count ?? source.totalItems); const pages = number(source.pages ?? source.totalPages); if (total === undefined && pages === undefined) return; const page = number(source.page ?? source.currentPage) ?? fallback.page; const limit = number(source.limit ?? source.pageSize ?? source.perPage) ?? fallback.limit; return { page, limit, total: total ?? pages! * limit, totalPages: pages ?? Math.max(1, Math.ceil(total! / limit)) }; }
function option(value: unknown): AuditFilterOption | null { if (typeof value === "string" || typeof value === "number") return { value: String(value), label: String(value) }; if (!record(value)) return null; const raw = value.value ?? value._id ?? value.id ?? value.username ?? value.name; if (typeof raw !== "string" && typeof raw !== "number") return null; const label = value.label ?? value.username ?? value.name ?? raw; return { value: String(raw), label: String(label) }; }
function optionList(value: unknown) { return Array.isArray(value) ? value.map(option).filter((entry): entry is AuditFilterOption => Boolean(entry)) : []; }
function filters(value: unknown): AuditFilters { const source = record(value) ? value : {}; return { actions: optionList(source.actions), resources: optionList(source.resources), admins: optionList(source.admins) }; }

export const auditApi = {
  async list(query: AuditQuery) { const result = await apiRequest<unknown>("/admin/audit-logs", { params: query }); return { ...result, data: logs(result.data), pagination: result.pagination ?? pagination(result.data, query) } satisfies ApiResult<AuditLog[]>; },
  async filters() { const result = await apiRequest<unknown>("/admin/audit-logs/filters"); return { ...result, data: filters(result.data) } satisfies ApiResult<AuditFilters>; },
  export(format: ExportFormat, filters: Omit<AuditQuery, "page" | "limit">) { const extension = format === "csv" ? "csv" : "xls"; return downloadFile("/admin/audit-logs/export", { format, ...filters }, `bibleplus-audit-logs-${new Date().toISOString().slice(0, 10)}.${extension}`, format === "csv" ? /text\/csv/i : /ms-excel|spreadsheet|octet-stream/i); },
};