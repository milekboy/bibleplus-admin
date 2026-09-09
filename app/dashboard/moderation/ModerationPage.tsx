"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineChatBubbleLeftRight, HiOutlineFlag, HiOutlineHeart, HiOutlineShieldCheck } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Modal, PageHeader, PageSection, Pagination, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { moderationApi } from "@/lib/api/moderation";
import { formatDate } from "@/lib/formatters";
import type { PaginationMeta } from "@/types/api";
import type { ModerationAuthor, ModerationItem, ModerationKind, ModerationQueueCounts, ModerationStatus } from "@/types/moderation";

const PAGE_SIZE = 10;
type Lists = Record<ModerationKind, ModerationItem[]>;
type ListErrors = Record<ModerationKind, string>;
type Pagination = Record<ModerationKind, PaginationMeta | null>;
type Action = "approve" | "flag" | "reject";
type ActionTarget = { action: Action; kind: ModerationKind; item: ModerationItem };

function selectedKind(value: string | null): ModerationKind { return value === "comments" ? "comments" : "prayers"; }
function selectedStatus(value: string | null): ModerationStatus { return value === "flagged" ? "flagged" : "pending"; }
function plural(kind: ModerationKind) { return kind === "prayers" ? "prayers" : "comments"; }
function singular(kind: ModerationKind) { return kind === "prayers" ? "prayer" : "comment"; }
function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }

export default function ModerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const kind = selectedKind(searchParams.get("type"));
  const status = selectedStatus(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [counts, setCounts] = useState<ModerationQueueCounts>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState("");
  const [lists, setLists] = useState<Lists>({ prayers: [], comments: [] });
  const [listErrors, setListErrors] = useState<ListErrors>({ prayers: "", comments: "" });
  const [pagination, setPagination] = useState<Pagination>({ prayers: null, comments: null });
  const [listsLoading, setListsLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [detail, setDetail] = useState<{ kind: ModerationKind; item: ModerationItem } | null>(null);
  const [busy, setBusy] = useState(false);
  const countsRequest = useRef(0);
  const listsRequest = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const next = params.toString();
    if (next !== queryString) router.replace("/dashboard/moderation" + (next ? "?" + next : ""), { scroll: false });
  }, [queryString, router]);

  const loadCounts = useCallback(async () => {
    const requestId = ++countsRequest.current;
    setCountsLoading(true);
    try {
      const result = await moderationApi.queue();
      if (requestId !== countsRequest.current) return;
      setCounts(result.data);
      setCountsError("");
    } catch (reason) {
      if (requestId !== countsRequest.current) return;
      setCountsError(errorMessage(reason, "Queue counts could not be loaded."));
    } finally {
      if (requestId === countsRequest.current) setCountsLoading(false);
    }
  }, []);

  const loadLists = useCallback(async () => {
    const requestId = ++listsRequest.current;
    setListsLoading(true);
    const results = await Promise.allSettled([
      moderationApi.list("prayers", { status, page, limit: PAGE_SIZE }),
      moderationApi.list("comments", { status, page, limit: PAGE_SIZE }),
    ]);
    if (requestId !== listsRequest.current) return;
    const kinds: ModerationKind[] = ["prayers", "comments"];
    const nextErrors: ListErrors = { prayers: "", comments: "" };
    results.forEach((result, index) => {
      const listKind = kinds[index];
      if (result.status === "fulfilled") {
        setLists((current) => ({ ...current, [listKind]: result.value.data }));
        setPagination((current) => ({ ...current, [listKind]: result.value.pagination ?? null }));
      } else {
        nextErrors[listKind] = errorMessage(result.reason, `${plural(listKind)} could not be loaded.`);
      }
    });
    setListErrors(nextErrors);
    setListsLoading(false);
  }, [page, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCounts(), 0);
    return () => { window.clearTimeout(timer); countsRequest.current += 1; };
  }, [loadCounts]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLists(), 0);
    return () => { window.clearTimeout(timer); listsRequest.current += 1; };
  }, [loadLists]);

  const refresh = useCallback(async () => {
    await Promise.all([loadCounts(), loadLists()]);
  }, [loadCounts, loadLists]);

  const activeItems = lists[kind];
  const activePagination = pagination[kind];
  const visibleItems = useMemo(() => activePagination ? activeItems : activeItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [activeItems, activePagination, page]);
  const totalPages = activePagination?.totalPages ?? Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE));

  const moderate = async () => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      const result = actionTarget.action === "approve"
        ? await moderationApi.approve(actionTarget.kind, actionTarget.item._id)
        : actionTarget.action === "flag"
          ? await moderationApi.flag(actionTarget.kind, actionTarget.item._id)
          : await moderationApi.reject(actionTarget.kind, actionTarget.item._id);
      toast.success(result.message || `${pastTense(actionTarget.action)} ${singular(actionTarget.kind)} successfully.`);
      setActionTarget(null);
      await refresh();
    } catch (reason) {
      toast.error(errorMessage(reason, `The ${singular(actionTarget.kind)} could not be ${pastTense(actionTarget.action).toLowerCase()}.`));
    } finally {
      setBusy(false);
    }
  };

  const changeKind = (next: ModerationKind) => setParams({ type: next === "prayers" ? null : next, page: null });
  const changeStatus = (next: ModerationStatus) => setParams({ status: next === "pending" ? null : next, page: null });

  return <div className="min-w-0 space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Moderation" description="Review pending and flagged prayers and comments from one queue." action={<Button variant="secondary" loading={countsLoading || listsLoading} onClick={() => void refresh()}>Refresh</Button>} /></PageSection>

    <PageSection delay={.04} className="space-y-3">
      {countsError && <InlineError message={countsError} onRetry={() => void loadCounts()} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QueueCard loading={countsLoading} label="Pending prayers" value={counts.pendingPrayers} icon={<HiOutlineHeart className="h-5 w-5 text-[var(--color-primary)]" />} />
        <QueueCard loading={countsLoading} label="Flagged prayers" value={counts.flaggedPrayers} icon={<HiOutlineFlag className="h-5 w-5 text-[var(--color-warning)]" />} />
        <QueueCard loading={countsLoading} label="Pending comments" value={counts.pendingComments} icon={<HiOutlineChatBubbleLeftRight className="h-5 w-5 text-[var(--color-primary)]" />} />
        <QueueCard loading={countsLoading} label="Flagged comments" value={counts.flaggedComments} icon={<HiOutlineShieldCheck className="h-5 w-5 text-[var(--color-warning)]" />} />
      </div>
    </PageSection>

    <PageSection delay={.08} className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Content type" options={[["prayers", "Prayers"], ["comments", "Comments"]]} value={kind} onChange={(value) => changeKind(value as ModerationKind)} />
        <Segmented label="Moderation status" options={[["pending", "Pending"], ["flagged", "Flagged"]]} value={status} onChange={(value) => changeStatus(value as ModerationStatus)} />
      </div>
      <p className="text-xs text-[var(--color-muted)]">The status, page, and 10-item limit are sent to the backend. When pagination metadata is omitted, paging applies only to the records returned by that response.</p>

      {listErrors[kind] ? <ErrorState description={listErrors[kind]} onRetry={() => void loadLists()} /> : listsLoading ? <ListSkeleton /> : visibleItems.length ? <>
        <div className="grid min-w-0 gap-4">
          {visibleItems.map((item) => <ModerationCard key={item._id} item={item} kind={kind} disabled={busy} onView={() => setDetail({ kind, item })} onAction={(action) => setActionTarget({ action, kind, item })} />)}
        </div>
        <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onPageChange={(next) => setParams({ page: next === 1 ? null : next })} />
      </> : <EmptyState title={`No ${status} ${plural(kind)}`} description="This moderation queue is currently clear." />}

      {listErrors[kind === "prayers" ? "comments" : "prayers"] && <InlineError message={`The other queue could not be prepared: ${listErrors[kind === "prayers" ? "comments" : "prayers"]}`} onRetry={() => void loadLists()} />}
    </PageSection>

    <ModerationDetail detail={detail} onClose={() => setDetail(null)} />
    <ConfirmModal open={Boolean(actionTarget)} onClose={() => setActionTarget(null)} onConfirm={() => void moderate()} pending={busy} danger={actionTarget?.action === "reject"} title={confirmationTitle(actionTarget)} description={confirmationDescription(actionTarget)} confirmLabel={actionTarget ? `${capitalize(actionTarget.action)} ${singular(actionTarget.kind)}` : "Confirm"} />
  </div>;
}

function QueueCard({ loading, label, value, icon }: { loading: boolean; label: string; value?: number; icon: React.ReactNode }) {
  return loading ? <Skeleton className="h-32 w-full" /> : <StatCard label={label} value={value ?? "Not supplied"} icon={icon} />;
}

function Segmented({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (value: string) => void }) {
  return <div><p className="mb-2 text-xs font-medium text-[var(--color-muted)]">{label}</p><div className="inline-flex max-w-full rounded-xl bg-[var(--color-surface-muted)] p-1" role="group" aria-label={label}>{options.map(([option, text]) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition ${value === option ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"}`}>{text}</button>)}</div></div>;
}

function ModerationCard({ item, kind, disabled, onView, onAction }: { item: ModerationItem; kind: ModerationKind; disabled: boolean; onView: () => void; onAction: (action: Action) => void }) {
  const content = itemContent(item, kind);
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><StatusPill tone={statusTone(item.status)}>{item.status || "Status not supplied"}</StatusPill><StatusPill>{contentType(item, kind)}</StatusPill>{item.visibility && <StatusPill>{item.visibility}</StatusPill>}</div>
        {kind === "prayers" && <h3 className="mt-3 break-words font-semibold">{item.title || "Untitled prayer"}</h3>}
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-muted)]">{content || "No content supplied."}</p>
        <dl className="mt-4 grid gap-2 text-xs text-[var(--color-muted)] sm:grid-cols-3">
          <Meta label="Author" value={authorLabel(item)} />
          <Meta label="Submitted" value={submittedDate(item)} />
          <Meta label="Reason / flags" value={reasonLabel(item)} />
        </dl>
      </div>
      <div className="flex w-full max-w-full shrink-0 flex-nowrap gap-1.5 overflow-x-auto pb-1 sm:justify-end xl:w-auto xl:overflow-visible">
        <Button className="shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm" variant="secondary" disabled={disabled} onClick={onView}>View</Button>
        <Button className="shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm" disabled={disabled} onClick={() => onAction("approve")}>Approve</Button>
        <Button className="shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm" variant="secondary" disabled={disabled} onClick={() => onAction("flag")}>Flag</Button>
        <Button className="shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm" variant="danger" disabled={disabled} onClick={() => onAction("reject")}>Reject</Button>
      </div>
    </div>
  </article>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[var(--color-surface-muted)] p-3"><dt>{label}</dt><dd className="mt-1 break-words font-medium text-[var(--color-text)]">{value}</dd></div>; }

function ModerationDetail({ detail, onClose }: { detail: { kind: ModerationKind; item: ModerationItem } | null; onClose: () => void }) {
  const item = detail?.item;
  return <Modal open={Boolean(detail)} onClose={onClose} title={item?.title || `${detail ? capitalize(singular(detail.kind)) : "Moderation"} details`} description="Content and moderation metadata supplied by the backend." footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
    {detail && item && <div className="min-w-0 space-y-5"><div className="flex flex-wrap gap-2"><StatusPill tone={statusTone(item.status)}>{item.status || "Status not supplied"}</StatusPill><StatusPill>{contentType(item, detail.kind)}</StatusPill></div><section><h3 className="font-semibold">Content</h3><p className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words leading-7 text-[var(--color-muted)]">{itemContent(item, detail.kind) || "No content supplied."}</p></section><dl className="grid gap-3 sm:grid-cols-2"><Meta label="Author" value={authorLabel(item)} /><Meta label="Submitted" value={submittedDate(item)} /><Meta label="Reason / flags" value={reasonLabel(item)} /><Meta label="Visibility" value={item.visibility || "Not supplied"} /></dl></div>}
  </Modal>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm"><span>{message}</span><Button variant="secondary" onClick={onRetry}>Retry</Button></div>; }
function ListSkeleton() { return <div className="space-y-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-48 w-full" />)}</div>; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function pastTense(action: Action) { return action === "approve" ? "Approved" : action === "flag" ? "Flagged" : "Rejected"; }
function itemContent(item: ModerationItem, kind: ModerationKind) { return kind === "prayers" ? item.description || item.content || item.text || item.message || item.body || "" : item.content || item.text || item.message || item.body || item.description || ""; }
function contentType(item: ModerationItem, kind: ModerationKind) { return item.resourceType || item.type || singular(kind); }
function submittedDate(item: ModerationItem) { const value = item.submittedAt || item.createdAt; return value ? formatDate(value, { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"; }
function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" { const value = status?.toLowerCase(); return value === "approved" ? "success" : value === "flagged" ? "warning" : value === "rejected" ? "danger" : "neutral"; }
function personName(person?: ModerationAuthor) { if (!person) return ""; return person.name || [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || person.username || ""; }
function authorLabel(item: ModerationItem) { const nested = personName(item.author) || personName(item.user) || (typeof item.userId === "object" ? personName(item.userId) : ""); if (nested) return nested; if (typeof item.userId === "string" && item.userId) return `User …${item.userId.slice(-6)}`; return "Not supplied"; }
function reasonLabel(item: ModerationItem) { const reason = item.flagReason || item.moderationReason || item.reason; if (reason) return reason; const count = (Array.isArray(item.flags) ? item.flags.length : 0) + (Array.isArray(item.reports) ? item.reports.length : 0); return count ? `${count} flag${count === 1 ? "" : "s"}` : "Not supplied"; }
function confirmationTitle(target: ActionTarget | null) { return target ? `${capitalize(target.action)} this ${singular(target.kind)}?` : "Confirm moderation action"; }
function confirmationDescription(target: ActionTarget | null) { if (!target) return "Confirm this moderation action."; if (target.action === "approve") return `Approve this ${singular(target.kind)}? No documented reversal endpoint is available.`; if (target.action === "flag") return `Flag this ${singular(target.kind)} for review? The queue will reload after the backend confirms the change.`; return `Reject and delete this ${singular(target.kind)}? This cannot be undone.`; }