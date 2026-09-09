"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineArrowDownTray, HiOutlineFunnel } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Modal, PageHeader, PageSection, Pagination, SearchField, Select, Skeleton, StatusPill } from "@/components/ui";
import { auditApi } from "@/lib/api/audit";
import { saveDownload } from "@/lib/api/download";
import { formatDate } from "@/lib/formatters";
import { safeJson } from "@/lib/security/redact";
import type { PaginationMeta } from "@/types/api";
import type { AuditFilterOption, AuditFilters, AuditLog, ExportFormat } from "@/types/audit";

const PAGE_SIZE = 20;
const EMPTY_FILTERS: AuditFilters = { actions: [], resources: [], admins: [] };
function text(value: string | null) { return value?.trim() || ""; }
function requestError(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }

export default function AuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const action = text(searchParams.get("action"));
  const resource = text(searchParams.get("resource"));
  const admin = text(searchParams.get("admin"));
  const search = text(searchParams.get("search"));
  const [draftSearch, setDraftSearch] = useState(search);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [filtersError, setFiltersError] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exporting, setExporting] = useState(false);
  const request = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const next = params.toString();
    if (next !== queryString) router.replace("/dashboard/audit-logs" + (next ? "?" + next : ""), { scroll: false });
  }, [queryString, router]);

  const loadFilters = useCallback(async () => {
    try { const result = await auditApi.filters(); setFilters(result.data); setFiltersError(""); }
    catch (reason) { setFiltersError(requestError(reason, "Audit filter options could not be loaded.")); }
  }, []);

  const load = useCallback(async () => {
    const id = ++request.current; setLoading(true);
    try { const result = await auditApi.list({ page, limit: PAGE_SIZE, action: action || undefined, resource: resource || undefined, admin: admin || undefined, search: search || undefined }); if (id !== request.current) return; setLogs(result.data); setPagination(result.pagination ?? null); setError(""); }
    catch (reason) { if (id !== request.current) return; setError(requestError(reason, "Audit logs could not be loaded.")); }
    finally { if (id === request.current) setLoading(false); }
  }, [action, admin, page, resource, search]);

  useEffect(() => { const timer = window.setTimeout(() => void loadFilters(), 0); return () => window.clearTimeout(timer); }, [loadFilters]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); request.current += 1; }; }, [load]);

  const changeSearch = useCallback((value: string) => { const next = value.trim(); if (next !== search) setParams({ search: next || null, page: null }); }, [search, setParams]);
  const changeFilter = (key: "action" | "resource" | "admin", value: string) => setParams({ [key]: value || null, page: null });
  const activeScope = [`action=${action || "all"}`, `resource=${resource || "all"}`, `admin=${selectedLabel(filters.admins, admin) || "all"}`, `search=${search || "none"}`].join(", ");

  const download = async () => {
    if (!exportFormat || exporting) return; setExporting(true);
    try { const file = await auditApi.export(exportFormat, { action: action || undefined, resource: resource || undefined, admin: admin || undefined, search: search || undefined }); saveDownload(file); setExportFormat(null); toast.success(`Filtered audit ${exportFormat === "csv" ? "CSV" : "Excel"} downloaded.`); }
    catch (reason) { toast.error(requestError(reason, "The filtered audit export could not be prepared.")); }
    finally { setExporting(false); }
  };

  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  return <div className="min-w-0 space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Audit logs" description="Review administrative actions and export the exact active filter scope." action={<Button variant="secondary" loading={loading} onClick={() => void load()}>Refresh</Button>} /></PageSection>
    <PageSection delay={.04} className="min-w-0 space-y-4">
      {filtersError && <InlineError message={filtersError} onRetry={() => void loadFilters()} />}
      <div className="hidden items-end gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:flex"><Filters filters={filters} action={action} resource={resource} admin={admin} onChange={changeFilter} /><div className="min-w-52 flex-1"><SearchField aria-label="Search audit logs" placeholder="Search audit logs..." value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} onDebouncedChange={changeSearch} /></div></div>
      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:hidden"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold"><HiOutlineFunnel className="h-5 w-5" />Filters</summary><div className="grid gap-4 border-t border-[var(--color-border)] p-4"><div><SearchField aria-label="Search audit logs" placeholder="Search audit logs..." value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} onDebouncedChange={changeSearch} /></div><Filters filters={filters} action={action} resource={resource} admin={admin} onChange={changeFilter} mobile /></div></details>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--color-muted)]">Server filters: {activeScope}</p><div className="flex gap-2"><Button variant="secondary" onClick={() => setExportFormat("csv")}><HiOutlineArrowDownTray className="h-4 w-4" />CSV</Button><Button onClick={() => setExportFormat("excel")}><HiOutlineArrowDownTray className="h-4 w-4" />Excel</Button></div></div>

      {loading ? <LogSkeleton /> : error ? <ErrorState description={error} onRetry={() => void load()} /> : logs.length ? <><DesktopTable logs={logs} onDetail={setDetail} /><MobileLogs logs={logs} onDetail={setDetail} /><Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onPageChange={(next) => setParams({ page: next === 1 ? null : next })} /></> : <EmptyState title="No audit logs found" description="Try changing the server-side filters." />}
    </PageSection>
    <LogDetail log={detail} onClose={() => setDetail(null)} />
    <ConfirmModal open={Boolean(exportFormat)} onClose={() => setExportFormat(null)} onConfirm={() => void download()} pending={exporting} danger={false} title={`Export audit logs as ${exportFormat === "excel" ? "Excel" : "CSV"}?`} description={`The downloaded audit log will use the active server scope: ${activeScope}.`} confirmLabel="Download export" />
  </div>;
}

function Filters({ filters, action, resource, admin, onChange, mobile = false }: { filters: AuditFilters; action: string; resource: string; admin: string; onChange: (key: "action" | "resource" | "admin", value: string) => void; mobile?: boolean }) { return <div className={mobile ? "grid gap-4" : "contents"}><Filter label="Action" value={action} options={filters.actions} onChange={(value) => onChange("action", value)} /><Filter label="Resource" value={resource} options={filters.resources} onChange={(value) => onChange("resource", value)} /><Filter label="Administrator" value={admin} options={filters.admins} onChange={(value) => onChange("admin", value)} /></div>; }
function Filter({ label, value, options, onChange }: { label: string; value: string; options: AuditFilterOption[]; onChange: (value: string) => void }) { return <label className="text-sm font-medium">{label}<Select className="mt-2 min-w-40" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>; }
function DesktopTable({ logs, onDetail }: { logs: AuditLog[]; onDetail: (log: AuditLog) => void }) { return <div className="hidden overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Administrative audit trail</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="px-4 py-3 font-medium">Timestamp</th><th className="px-4 py-3 font-medium">Administrator</th><th className="px-4 py-3 font-medium">Action</th><th className="px-4 py-3 font-medium">Resource</th><th className="px-4 py-3 font-medium">Outcome</th><th className="px-4 py-3 font-medium">Metadata</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{logs.map((log) => <tr key={log._id}><td className="whitespace-nowrap px-4 py-3">{timestamp(log)}</td><td className="px-4 py-3">{adminName(log)}</td><td className="px-4 py-3"><ActionPill value={log.action} /></td><td className="max-w-52 px-4 py-3"><p className="truncate font-medium">{log.resource || log.resourceType || "Not supplied"}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{log.resourceId || "Identifier not supplied"}</p></td><td className="px-4 py-3"><Outcome log={log} /></td><td className="px-4 py-3"><Button variant="secondary" onClick={() => onDetail(log)}>View safely</Button></td></tr>)}</tbody></table></div>; }
function MobileLogs({ logs, onDetail }: { logs: AuditLog[]; onDetail: (log: AuditLog) => void }) { return <div className="grid gap-3 md:hidden">{logs.map((log) => <article key={log._id} className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex flex-wrap gap-2"><ActionPill value={log.action} /><Outcome log={log} /></div><h3 className="mt-3 break-words font-semibold">{log.resource || log.resourceType || "Resource not supplied"}</h3><p className="mt-1 break-words text-xs text-[var(--color-muted)]">{log.resourceId || "Identifier not supplied"}</p><dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-xs text-[var(--color-muted)]">Administrator</dt><dd>{adminName(log)}</dd></div><div><dt className="text-xs text-[var(--color-muted)]">Timestamp</dt><dd>{timestamp(log)}</dd></div></dl><Button className="mt-4 w-full" variant="secondary" onClick={() => onDetail(log)}>View safe metadata</Button></article>)}</div>; }
function LogDetail({ log, onClose }: { log: AuditLog | null; onClose: () => void }) { const metadata = log ? { details: log.details, metadata: log.metadata } : null; return <Modal open={Boolean(log)} onClose={onClose} title="Safe audit metadata" description="Sensitive keys and credential-like values are redacted before display." footer={<Button variant="secondary" onClick={onClose}>Close</Button>}><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--color-surface-muted)] p-4 text-xs leading-5">{safeJson(metadata)}</pre></Modal>; }
function ActionPill({ value }: { value?: string }) { const upper = value?.toUpperCase() || "UNKNOWN"; return <StatusPill tone={upper === "DELETE" ? "danger" : upper === "CREATE" ? "success" : upper === "UPDATE" ? "warning" : "neutral"}>{upper}</StatusPill>; }
function Outcome({ log }: { log: AuditLog }) { const value = log.outcome || log.status || (typeof log.success === "boolean" ? log.success ? "Success" : "Failed" : "Not supplied"); const failed = /fail|error|denied/i.test(value); return <StatusPill tone={failed ? "danger" : /success|complete/i.test(value) ? "success" : "neutral"}>{value}</StatusPill>; }
function adminName(log: AuditLog) { const admin = log.admin; return log.adminUsername || admin?.username || admin?.name || [admin?.firstName, admin?.lastName].filter(Boolean).join(" ").trim() || (log.adminId ? `Admin …${log.adminId.slice(-6)}` : "Not supplied"); }
function timestamp(log: AuditLog) { const value = log.timestamp || log.createdAt; return value ? formatDate(value, { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"; }
function selectedLabel(options: AuditFilterOption[], value: string) { return options.find((option) => option.value === value)?.label || value; }
function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm"><span>{message}</span><Button variant="secondary" onClick={onRetry}>Retry</Button></div>; }
function LogSkeleton() { return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>; }