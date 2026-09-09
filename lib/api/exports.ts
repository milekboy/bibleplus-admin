import { apiRequest } from "@/lib/api/client";
import { downloadFile } from "@/lib/api/download";
import type { ExportDataset, ExportPreview } from "@/types/exports";
import type { ExportFormat } from "@/types/audit";

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function number(value: unknown) { const parsed = typeof value === "string" ? Number(value) : value; return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined; }
function preview(dataset: ExportDataset, data: unknown, metadata?: Record<string, unknown>): ExportPreview { const rows = Array.isArray(data) ? data.filter(record) : record(data) && Array.isArray(data.rows) ? data.rows.filter(record) : []; const source = record(data) ? data : metadata ?? {}; const columns = Array.isArray(source.columns) ? source.columns.filter((item): item is string => typeof item === "string") : undefined; return { dataset: (source.dataset === "users" || source.dataset === "prayers") ? source.dataset : dataset, rows, total: number(source.total ?? source.count), columns, scope: typeof source.scope === "string" ? source.scope : undefined }; }

export const exportsApi = {
  async preview(dataset: ExportDataset) { const result = await apiRequest<unknown>("/admin/exports/preview", { params: { dataset, limit: 10 } }); return { ...result, data: preview(dataset, result.data, result.metadata) }; },
  download(dataset: ExportDataset, format: ExportFormat) { const extension = format === "csv" ? "csv" : "xls"; return downloadFile(`/admin/exports/${dataset}`, { format }, `bibleplus-${dataset}-${new Date().toISOString().slice(0, 10)}.${extension}`, format === "csv" ? /text\/csv/i : /ms-excel|spreadsheet|octet-stream/i); },
};