"use client";

import { useState } from "react";
import { HiOutlineArrowDownTray, HiOutlineDocumentText, HiOutlineUsers } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, PageHeader, PageSection, Select, Skeleton, StatusPill } from "@/components/ui";
import { saveDownload } from "@/lib/api/download";
import { exportsApi } from "@/lib/api/exports";
import { safeJson } from "@/lib/security/redact";
import type { ExportFormat } from "@/types/audit";
import type { ExportDataset, ExportPreview } from "@/types/exports";

const CONFIG: Record<ExportDataset, { title: string; description: string; icon: React.ReactNode }> = {
  users: { title: "Users", description: "Account and profile records supplied by the backend export.", icon: <HiOutlineUsers className="h-6 w-6" /> },
  prayers: { title: "Prayers", description: "Prayer content, status, authorship, and related export fields.", icon: <HiOutlineDocumentText className="h-6 w-6" /> },
};
function requestError(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }

export default function ExportsPage() {
  return <div className="min-w-0 space-y-6 text-[var(--color-text)]"><PageSection><PageHeader title="Data exports" description="Preview the backend scope before downloading sensitive administrative datasets." /></PageSection><PageSection delay={.05} className="grid min-w-0 gap-5 xl:grid-cols-2"><ExportCard dataset="users" /><ExportCard dataset="prayers" /></PageSection></div>;
}

function ExportCard({ dataset }: { dataset: ExportDataset }) {
  const config = CONFIG[dataset];
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadPreview = async () => { setPreviewing(true); setPreviewError(""); try { const result = await exportsApi.preview(dataset); setPreview(result.data); } catch (reason) { setPreviewError(requestError(reason, `The ${dataset} preview could not be loaded.`)); } finally { setPreviewing(false); } };
  const download = async () => { if (downloading) return; setDownloading(true); try { const file = await exportsApi.download(dataset, format); saveDownload(file); setConfirming(false); toast.success(`${config.title} ${format === "csv" ? "CSV" : "Excel"} downloaded.`); } catch (reason) { toast.error(requestError(reason, `The ${dataset} export could not be prepared.`)); } finally { setDownloading(false); } };
  const scope = preview?.scope || "the complete backend-authorized dataset";

  return <section className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-primary)]">{config.icon}</span><div className="min-w-0"><h2 className="text-xl font-semibold">{config.title}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">{config.description}</p></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="text-sm font-medium">File format<Select className="mt-2" value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)} disabled={downloading}><option value="csv">CSV (.csv)</option>{dataset === "users" && <option value="excel">Excel (.xls)</option>}</Select></label><Button variant="secondary" loading={previewing} onClick={() => void loadPreview()}>Load preview</Button></div>
    <div className="mt-5 min-w-0 rounded-xl border border-[var(--color-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Preview</h3>{preview?.total !== undefined && <StatusPill>{preview.total} total rows</StatusPill>}</div>{previewing ? <div className="mt-4 space-y-2"><Skeleton className="h-8 w-32" /><Skeleton className="h-24 w-full" /></div> : previewError ? <div role="alert" className="mt-4 rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{previewError}</div> : preview ? <PreviewContent preview={preview} /> : <div className="mt-4"><EmptyState title="Preview not loaded" description="Review a sample, row count, columns, and scope when supplied." /></div>}</div>
    <div className="mt-5"><Button className="w-full" loading={downloading} onClick={() => setConfirming(true)}><HiOutlineArrowDownTray className="h-4 w-4" />Download {format === "csv" ? "CSV" : "Excel"}</Button>{downloading && <p role="status" className="mt-2 text-center text-xs text-[var(--color-muted)]">Preparing the {dataset} download…</p>}</div>
    <ConfirmModal open={confirming} onClose={() => setConfirming(false)} onConfirm={() => void download()} pending={downloading} title={`Export sensitive ${dataset} data?`} description={`Download ${config.title} as ${format === "csv" ? "CSV" : "Excel"}. Scope: ${scope}. The backend will record this export in the audit trail.`} confirmLabel="Download data" />
  </section>;
}

function PreviewContent({ preview }: { preview: ExportPreview }) { return <div className="mt-4 min-w-0 space-y-4"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><dt className="text-xs text-[var(--color-muted)]">Dataset</dt><dd className="mt-1 font-medium">{preview.dataset}</dd></div>{preview.scope && <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><dt className="text-xs text-[var(--color-muted)]">Scope</dt><dd className="mt-1 break-words font-medium">{preview.scope}</dd></div>}</dl>{preview.columns?.length ? <div><h4 className="text-sm font-medium">Included columns</h4><div className="mt-2 flex flex-wrap gap-2">{preview.columns.map((column) => <StatusPill key={column}>{column}</StatusPill>)}</div></div> : null}<div><h4 className="text-sm font-medium">Sample rows ({preview.rows.length})</h4>{preview.rows.length ? <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--color-surface-muted)] p-3 text-xs leading-5">{safeJson(preview.rows.slice(0, 10))}</pre> : <p className="mt-2 text-sm text-[var(--color-muted)]">The backend returned no sample rows.</p>}</div></div>; }