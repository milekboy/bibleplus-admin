"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { HiOutlineBookOpen, HiOutlineCalendarDays, HiOutlineSparkles } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Input, PageHeader, PageSection, Skeleton, Textarea } from "@/components/ui";
import { ApiClientError } from "@/lib/api/client";
import { verseApi } from "@/lib/api/verse";
import { formatDate } from "@/lib/formatters";
import type { VersePayload, VerseRecord } from "@/types/verse";

type FormState = { date: string; reference: string; book: string; chapter: string; verse: string; text: string; translation: string };
function today() { const date = new Date(); return new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
const emptyForm = (): FormState => ({ date: today(), reference: "", book: "", chapter: "", verse: "", text: "", translation: "" });

function toForm(record: VerseRecord, date: string): FormState {
  return { date: record.date || date, reference: record.reference ?? "", book: record.book ?? "", chapter: String(record.chapter ?? ""), verse: String(record.verse ?? ""), text: record.text ?? "", translation: record.translation ?? "" };
}

export default function VerseOfDayPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [backendPreview, setBackendPreview] = useState<VerseRecord | null>(null);
  const [isSet, setIsSet] = useState(false);
  const [history, setHistory] = useState<VerseRecord[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replacement, setReplacement] = useState<VersePayload | null>(null);
  const previewRequest = useRef(0);

  const loadPreview = useCallback(async (date: string) => {
    const id = ++previewRequest.current;
    setPreviewLoading(true);
    try {
      const result = await verseApi.preview(date);
      if (id !== previewRequest.current) return;
      setBackendPreview(result.data);
      setIsSet(result.isSet);
      setPreviewError("");
    } catch (reason) {
      if (id !== previewRequest.current) return;
      setPreviewError(reason instanceof Error ? reason.message : "Verse preview could not be loaded.");
    } finally {
      if (id === previewRequest.current) setPreviewLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await verseApi.history(10);
      setHistory(result.data);
      setHistoryError("");
    } catch (reason) {
      setHistoryError(reason instanceof Error ? reason.message : "Verse history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPreview(form.date), 300);
    return () => { window.clearTimeout(timer); previewRequest.current += 1; };
  }, [form.date, loadPreview]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const payloadFromForm = () => {
    const nextErrors: typeof errors = {};
    const chapter = Number(form.chapter);
    const verse = Number(form.verse);
    if (!form.date) nextErrors.date = "Date is required.";
    if (!form.reference.trim()) nextErrors.reference = "Reference is required.";
    if (!form.book.trim()) nextErrors.book = "Book is required.";
    if (!Number.isInteger(chapter) || chapter <= 0) nextErrors.chapter = "Enter a positive chapter number.";
    if (!Number.isInteger(verse) || verse <= 0) nextErrors.verse = "Enter a positive verse number.";
    if (!form.text.trim()) nextErrors.text = "Verse text is required.";
    if (!form.translation.trim()) nextErrors.translation = "Translation is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return null;
    return { date: form.date, reference: form.reference.trim(), book: form.book.trim(), chapter, verse, text: form.text.trim(), translation: form.translation.trim() } satisfies VersePayload;
  };

  const save = async (payload: VersePayload, confirmed = false) => {
    setSaving(true);
    try {
      const result = await verseApi.set(payload);
      toast.success(result.message ?? "Verse of the day saved.");
      setReplacement(null);
      await Promise.all([loadPreview(payload.date), loadHistory()]);
    } catch (reason) {
      if (!confirmed && reason instanceof ApiClientError && reason.status === 409) setReplacement(payload);
      else toast.error(reason instanceof Error ? reason.message : "The verse could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = payloadFromForm();
    if (!payload) return;
    if (isSet && backendPreview) setReplacement(payload);
    else void save(payload);
  };

  const loadSample = async () => {
    setSampleLoading(true);
    try {
      const result = await verseApi.sample();
      if (!result.data?.text) throw new Error("The sample endpoint returned no verse text.");
      setForm(toForm(result.data, form.date || today()));
      setErrors({});
      toast.success("Suggested verse loaded" + (result.data.origin ? " from " + result.data.origin + "." : "."));
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "A suggested verse could not be loaded.");
    } finally {
      setSampleLoading(false);
    }
  };

  const shownPreview: VerseRecord | FormState = isSet && backendPreview ? backendPreview : form;

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Verse of the Day" description="Load a suggestion, review the effective date, and publish a daily verse." action={<Button variant="secondary" onClick={() => void loadSample()} loading={sampleLoading}><HiOutlineSparkles className="h-5 w-5" />Load suggested verse</Button>} /></PageSection>

    <form onSubmit={submit}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <PageSection delay={.04} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Verse details</h3><p className="mt-1 text-sm text-[var(--color-muted)]">All values are sent to the backend as structured JSON.</p></div><Button type="submit" loading={saving}>Set verse</Button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Date" error={errors.date}><Input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} disabled={saving} /></Field>
            <Field label="Reference" error={errors.reference}><Input value={form.reference} onChange={(event) => update("reference", event.target.value)} placeholder="John 3:16" disabled={saving} /></Field>
            <Field label="Book" error={errors.book}><Input value={form.book} onChange={(event) => update("book", event.target.value)} placeholder="John" disabled={saving} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Chapter" error={errors.chapter}><Input type="number" min="1" step="1" inputMode="numeric" value={form.chapter} onChange={(event) => update("chapter", event.target.value)} disabled={saving} /></Field><Field label="Verse" error={errors.verse}><Input type="number" min="1" step="1" inputMode="numeric" value={form.verse} onChange={(event) => update("verse", event.target.value)} disabled={saving} /></Field></div>
            <Field label="Translation" error={errors.translation}><Input value={form.translation} onChange={(event) => update("translation", event.target.value)} placeholder="WEB" disabled={saving} /></Field>
            <div className="sm:col-span-2"><Field label="Verse text" error={errors.text}><Textarea className="min-h-36" value={form.text} onChange={(event) => update("text", event.target.value)} disabled={saving} /></Field></div>
          </div>
        </PageSection>

        <PageSection delay={.08} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Effective preview</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{isSet ? "Saved backend verse for this date" : "No saved verse; showing the unsaved form"}</p></div><Button type="button" variant="secondary" onClick={() => void loadPreview(form.date)} disabled={previewLoading}>Refresh</Button></div>
          {previewLoading ? <Skeleton className="mt-5 h-64 w-full" /> : previewError ? <div role="alert" className="mt-5 rounded-xl bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{previewError}</div> : <div className="mt-5 rounded-2xl bg-[var(--color-primary-soft)] p-5"><div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]"><HiOutlineCalendarDays className="h-4 w-4" />{shownPreview.date || form.date || "Date pending"}</div><blockquote className="mt-5 whitespace-pre-wrap text-xl font-medium leading-8">“{shownPreview.text || "Verse text will appear here."}”</blockquote><p className="mt-5 font-semibold">{shownPreview.reference || "Reference"}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{shownPreview.book || "Book"} {shownPreview.chapter || "—"}:{shownPreview.verse || "—"} · {shownPreview.translation || "Translation"}</p></div>}
        </PageSection>
      </div>
    </form>

    <PageSection delay={.12}>
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-5"><div><h3 className="text-lg font-semibold">Verse history</h3><p className="mt-1 text-sm text-[var(--color-muted)]">The latest records returned by the backend.</p></div><Button variant="secondary" onClick={() => void loadHistory()} disabled={historyLoading}>Refresh</Button></div>{historyLoading ? <div className="space-y-3 p-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : historyError ? <div className="p-5"><ErrorState description={historyError} onRetry={() => void loadHistory()} /></div> : history.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Reference</th><th className="px-5 py-3 font-medium">Translation</th><th className="px-5 py-3 font-medium">Source</th><th className="px-5 py-3 font-medium">Saved</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{history.map((record, index) => <tr key={record._id ?? record.id ?? record.date + String(index)}><td className="px-5 py-3">{record.date ? formatDate(record.date) : "Not supplied"}</td><td className="px-5 py-3 font-medium">{record.reference}</td><td className="px-5 py-3">{record.translation}</td><td className="px-5 py-3">{record.source ?? record.origin ?? "Not supplied"}</td><td className="px-5 py-3">{record.createdAt ? formatDate(record.createdAt, { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"}</td></tr>)}</tbody></table></div><div className="grid gap-3 p-4 md:hidden">{history.map((record, index) => <article key={record._id ?? record.id ?? record.date + String(index)} className="rounded-xl bg-[var(--color-surface-muted)] p-4"><div className="flex items-start gap-3"><HiOutlineBookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" /><div><h4 className="font-semibold">{record.reference}</h4><p className="mt-1 text-sm text-[var(--color-muted)]">{record.text}</p><p className="mt-2 text-xs text-[var(--color-muted)]">{record.date ? formatDate(record.date) : "Date not supplied"} · {record.translation}</p></div></div></article>)}</div></> : <div className="p-5"><EmptyState title="No verse history" description="The backend returned no saved verses." /></div>}</section>
    </PageSection>

    <ConfirmModal open={Boolean(replacement)} onClose={() => setReplacement(null)} onConfirm={() => { if (replacement) void save(replacement, true); }} pending={saving} danger={false} title="Replace the saved verse?" description={"A verse is already configured for " + (replacement?.date ?? form.date) + ". Continue with this replacement?"} confirmLabel="Replace verse" />
  </div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>;
}