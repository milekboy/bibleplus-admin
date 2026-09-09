"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineBell, HiOutlineEnvelope, HiOutlineMegaphone, HiOutlinePaperAirplane } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Input, PageHeader, PageSection, Pagination, SearchField, Select, Skeleton, StatCard, StatusPill, Textarea } from "@/components/ui";
import { notificationsApi } from "@/lib/api/notifications";
import { formatDate } from "@/lib/formatters";
import type { PaginationMeta } from "@/types/api";
import type { NotificationRecord } from "@/types/notifications";

type Tab = "history" | "direct" | "broadcast";
type HistoryFilter = "all" | "direct" | "broadcast" | "failed";
type HistoryAction = { type: "resend" | "delete"; notification: NotificationRecord };
const PAGE_SIZE = 10;

function tabValue(value: string | null): Tab { return value === "direct" || value === "broadcast" ? value : "history"; }
function message(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const tab = tabValue(searchParams.get("tab"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [action, setAction] = useState<HistoryAction | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const request = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const next = params.toString();
    if (next !== queryString) router.replace("/dashboard/notifications" + (next ? "?" + next : ""), { scroll: false });
  }, [queryString, router]);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const result = await notificationsApi.list({ page, limit: PAGE_SIZE });
      if (id !== request.current) return;
      setItems(result.data);
      setPagination(result.pagination ?? null);
      setError("");
    } catch (reason) {
      if (id !== request.current) return;
      setError(message(reason, "Notification history could not be loaded."));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); request.current += 1; };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "broadcast" && !isBroadcast(item)) return false;
      if (filter === "direct" && isBroadcast(item)) return false;
      if (filter === "failed" && !isFailed(item)) return false;
      return !needle || [item.title, item.message, item.type, item.channel, item.status, item.deliveryStatus, audience(item)].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [filter, items, search]);

  const broadcastCount = items.filter(isBroadcast).length;
  const failedCount = items.filter(isFailed).length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleItems = pagination ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const completeAction = async () => {
    if (!action) return;
    setActionPending(true);
    try {
      const result = action.type === "resend" ? await notificationsApi.resend(action.notification._id) : await notificationsApi.remove(action.notification._id);
      toast.success(result.message || (action.type === "resend" ? "Notification resent." : "Notification history deleted."));
      setAction(null);
      await load();
    } catch (reason) {
      toast.error(message(reason, action.type === "resend" ? "The notification could not be resent." : "The notification history could not be deleted."));
    } finally {
      setActionPending(false);
    }
  };

  const afterSend = async () => { await load(); };

  return <div className="min-w-0 space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Notifications" description="Review delivery history, notify one user, or broadcast to everyone." action={<Button variant="secondary" loading={loading} onClick={() => void load()}>Refresh history</Button>} /></PageSection>

    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-3">
      {loading ? <><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></> : <>
        <StatCard label={pagination ? "Backend history total" : "Loaded history"} value={pagination?.total ?? items.length} icon={<HiOutlineBell className="h-5 w-5 text-[var(--color-primary)]" />} />
        <StatCard label="Broadcasts on loaded page" value={broadcastCount} icon={<HiOutlineMegaphone className="h-5 w-5 text-[var(--color-primary)]" />} />
        <StatCard label="Failed on loaded page" value={failedCount} icon={<HiOutlineEnvelope className="h-5 w-5 text-[var(--color-danger)]" />} />
      </>}
    </PageSection>

    <PageSection delay={.08} className="min-w-0 space-y-5">
      <Tabs value={tab} onChange={(next) => setParams({ tab: next === "history" ? null : next, page: null })} />
      {tab === "history" ? <History items={visibleItems} rawCount={items.length} page={page} totalPages={totalPages} loading={loading} error={error} search={search} filter={filter} onSearch={(value) => { setSearch(value); if (page !== 1) setParams({ page: null }); }} onFilter={(value) => { setFilter(value); if (page !== 1) setParams({ page: null }); }} onRetry={() => void load()} onPage={(next) => setParams({ page: next === 1 ? null : next })} onAction={setAction} /> : tab === "direct" ? <DirectForm onSent={afterSend} /> : <BroadcastForm onSent={afterSend} />}
    </PageSection>

    <ConfirmModal open={Boolean(action)} onClose={() => setAction(null)} onConfirm={() => void completeAction()} pending={actionPending} danger={action?.type === "delete"} title={action?.type === "delete" ? "Delete notification history?" : "Resend notification?"} description={action ? actionDescription(action) : "Confirm this action."} confirmLabel={action?.type === "delete" ? "Delete history" : "Resend notification"} />
  </div>;
}

function Tabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const tabs: [Tab, string][] = [["history", "History"], ["direct", "Direct send"], ["broadcast", "Broadcast"]];
  return <div className="flex max-w-full overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1" role="tablist" aria-label="Notification workspace">{tabs.map(([tab, label]) => <button key={tab} role="tab" aria-selected={value === tab} onClick={() => onChange(tab)} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${value === tab ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]"}`}>{label}</button>)}</div>;
}

function History({ items, rawCount, page, totalPages, loading, error, search, filter, onSearch, onFilter, onRetry, onPage, onAction }: { items: NotificationRecord[]; rawCount: number; page: number; totalPages: number; loading: boolean; error: string; search: string; filter: HistoryFilter; onSearch: (value: string) => void; onFilter: (value: HistoryFilter) => void; onRetry: () => void; onPage: (page: number) => void; onAction: (action: HistoryAction) => void }) {
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1"><SearchField aria-label="Search loaded notification history" placeholder="Search this loaded page..." value={search} onChange={(event) => onSearch(event.target.value)} /></div>
      <label className="text-sm font-medium">Filter loaded page<Select className="mt-2 sm:w-48" value={filter} onChange={(event) => onFilter(event.target.value as HistoryFilter)}><option value="all">All</option><option value="direct">Direct</option><option value="broadcast">Broadcast</option><option value="failed">Failed</option></Select></label>
    </div>
    <p className="text-xs text-[var(--color-muted)]">Search and delivery filters apply only to the {rawCount} record{rawCount === 1 ? "" : "s"} loaded on this backend page.</p>
    {loading ? <HistorySkeleton /> : error ? <ErrorState description={error} onRetry={onRetry} /> : items.length ? <><div className="grid min-w-0 gap-4">{items.map((item) => <NotificationCard key={item._id} item={item} onAction={onAction} />)}</div>{totalPages > 1 && <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onPageChange={onPage} />}</> : <EmptyState title="No notifications found" description={rawCount ? "Try changing the loaded-page filters." : "Notification history is empty."} />}
  </div>;
}

function NotificationCard({ item, onAction }: { item: NotificationRecord; onAction: (action: HistoryAction) => void }) {
  const state = deliveryState(item);
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><StatusPill tone={deliveryTone(state)}>{state || "Delivery not supplied"}</StatusPill><StatusPill>{item.channel || item.type || "Type not supplied"}</StatusPill><StatusPill tone={isBroadcast(item) ? "warning" : "neutral"}>{audience(item)}</StatusPill></div><h3 className="mt-3 break-words font-semibold">{item.title || "Untitled notification"}</h3><p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-muted)]">{item.message || "No message supplied."}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--color-muted)]"><span>Created: {created(item)}</span>{deliveryCounts(item).map((value) => <span key={value}>{value}</span>)}</div></div>
      <div className="flex shrink-0 flex-nowrap gap-2"><Button variant="secondary" onClick={() => onAction({ type: "resend", notification: item })}>Resend</Button><Button variant="danger" onClick={() => onAction({ type: "delete", notification: item })}>Delete</Button></div>
    </div>
  </article>;
}

function DirectForm({ onSent }: { onSent: () => Promise<void> }) {
  const [form, setForm] = useState({ userId: "", title: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); const next: Record<string, string> = {}; if (!form.userId.trim()) next.userId = "A recipient user ID is required."; if (!form.title.trim()) next.title = "A title is required."; if (!form.message.trim()) next.message = "A message is required."; setErrors(next); if (Object.keys(next).length) return; setPending(true); try { const result = await notificationsApi.send({ userId: form.userId.trim(), title: form.title.trim(), message: form.message.trim(), type: "admin" }); setForm({ userId: "", title: "", message: "" }); toast.success(result.message || "Notification sent to one user."); await onSent(); } catch (reason) { toast.error(message(reason, "The direct notification could not be sent.")); } finally { setPending(false); } };
  return <ComposeLayout title="Direct notification" description="This message will be sent to one user identified by their backend user ID." preview={<Preview audience="One user" title={form.title} message={form.message} />}><form onSubmit={submit} className="space-y-4"><Field label="Recipient user ID" error={errors.userId}><Input value={form.userId} onChange={(event) => { setForm((current) => ({ ...current, userId: event.target.value })); setErrors((current) => ({ ...current, userId: "" })); }} disabled={pending} /></Field><Field label="Title" error={errors.title}><Input value={form.title} onChange={(event) => { setForm((current) => ({ ...current, title: event.target.value })); setErrors((current) => ({ ...current, title: "" })); }} disabled={pending} /></Field><Field label="Message" error={errors.message}><Textarea value={form.message} onChange={(event) => { setForm((current) => ({ ...current, message: event.target.value })); setErrors((current) => ({ ...current, message: "" })); }} disabled={pending} /></Field><Button type="submit" loading={pending}><HiOutlinePaperAirplane className="h-4 w-4" />Send to one user</Button></form></ComposeLayout>;
}

export function BroadcastForm({ onSent }: { onSent: () => Promise<void> }) {
  const [form, setForm] = useState({ title: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const requestBroadcast = (event: FormEvent) => { event.preventDefault(); const next: Record<string, string> = {}; if (!form.title.trim()) next.title = "A title is required."; if (!form.message.trim()) next.message = "A message is required."; setErrors(next); if (!Object.keys(next).length) setConfirming(true); };
  const send = async () => { if (pending) return; setPending(true); try { const result = await notificationsApi.broadcast({ title: form.title.trim(), message: form.message.trim(), type: "broadcast" }); setForm({ title: "", message: "" }); setConfirming(false); toast.success(result.message || "Broadcast sent to all users."); await onSent(); } catch (reason) { toast.error(message(reason, "The broadcast could not be sent.")); } finally { setPending(false); } };
  return <><ComposeLayout title="Broadcast to all users" description="This is an all-user broadcast, not a direct notification or a filtered segment." preview={<Preview audience="All users" title={form.title} message={form.message} />}><form onSubmit={requestBroadcast} className="space-y-4"><Field label="Title" error={errors.title}><Input value={form.title} onChange={(event) => { setForm((current) => ({ ...current, title: event.target.value })); setErrors((current) => ({ ...current, title: "" })); }} disabled={pending} /></Field><Field label="Message" error={errors.message}><Textarea value={form.message} onChange={(event) => { setForm((current) => ({ ...current, message: event.target.value })); setErrors((current) => ({ ...current, message: "" })); }} disabled={pending} /></Field><Button type="submit" loading={pending}><HiOutlineMegaphone className="h-4 w-4" />Review broadcast</Button></form></ComposeLayout><ConfirmModal open={confirming} onClose={() => setConfirming(false)} onConfirm={() => void send()} pending={pending} danger title="Broadcast to all users?" description={`Send “${form.title.trim() || "Untitled"}” to all users? Check the preview before confirming; this request cannot be repeated while it is pending.`} confirmLabel="Send broadcast" /></>;
}

function ComposeLayout({ title, description, preview, children }: { title: string; description: string; preview: React.ReactNode; children: React.ReactNode }) { return <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.75fr)]"><section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p><div className="mt-5">{children}</div></section><section className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h3 className="font-semibold">Message preview</h3><div className="mt-4">{preview}</div></section></div>; }
function Preview({ audience: label, title, message: body }: { audience: string; title: string; message: string }) { return <div className="min-w-0 rounded-2xl bg-[var(--color-surface-muted)] p-4"><StatusPill>{label}</StatusPill><h4 className="mt-3 break-words font-semibold">{title.trim() || "Your notification title"}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-muted)]">{body.trim() || "Your message preview will appear here."}</p></div>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>; }
function HistorySkeleton() { return <div className="space-y-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-44 w-full" />)}</div>; }
function isBroadcast(item: NotificationRecord) { return item.target?.toUpperCase() === "ALL" || item.type?.toLowerCase() === "broadcast" || item.audience?.toLowerCase().includes("all") === true; }
function isFailed(item: NotificationRecord) { return deliveryState(item).toLowerCase().includes("fail") || item.pushDelivered === false; }
function deliveryState(item: NotificationRecord) { return item.deliveryStatus || item.status || (item.pushDelivered === true ? "Delivered" : item.pushDelivered === false ? "Push not delivered" : ""); }
function deliveryTone(state: string): "neutral" | "success" | "warning" | "danger" { const value = state.toLowerCase(); return value.includes("fail") || value.includes("not delivered") ? "danger" : value.includes("deliver") || value.includes("sent") ? "success" : value.includes("pending") ? "warning" : "neutral"; }
function identity(value: NotificationRecord["userId"] | NotificationRecord["recipient"]) { if (!value) return ""; if (typeof value === "string") return `User …${value.slice(-6)}`; return value.username || [value.firstName, value.lastName].filter(Boolean).join(" ").trim() || (value._id ? `User …${value._id.slice(-6)}` : ""); }
function audience(item: NotificationRecord) { if (isBroadcast(item)) return "All users"; return identity(item.recipient) || identity(item.userId) || item.audience || item.target || "Recipient not supplied"; }
function created(item: NotificationRecord) { const value = item.createdAt || item.sentAt; return value ? formatDate(value, { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"; }
function deliveryCounts(item: NotificationRecord) { const values: [string, number | undefined][] = [["Recipients", item.recipientCount], ["Sent", item.sentCount], ["Delivered", item.deliveredCount], ["Failed", item.failedCount], ["Resends", item.resendCount]]; return values.flatMap(([label, value]) => typeof value === "number" ? [`${label}: ${value}`] : []); }
function actionDescription(action: HistoryAction) { const name = action.notification.title || "Untitled notification"; const recipient = audience(action.notification); return action.type === "resend" ? `Resend “${name}” to its original audience: ${recipient}?` : `Delete the history record for “${name}” (${recipient})? This does not retract a notification that was already delivered.`; }