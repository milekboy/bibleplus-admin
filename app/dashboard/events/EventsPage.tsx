"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineCalendarDays, HiOutlineEllipsisVertical, HiOutlineMapPin, HiOutlinePlus } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Modal, PageHeader, PageSection, Pagination, SearchField, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { eventsApi } from "@/lib/api/events";
import { formatDate } from "@/lib/formatters";
import type { EventCategory, EventRecord, EventSpeaker, EventView } from "@/types/events";
import EventFormModal from "./EventFormModal";
import RelatedManagers from "./RelatedManagers";

const PAGE_SIZE = 10;
function validView(value: string | null): EventView { return value === "upcoming" || value === "past" ? value : "all"; }
function recordStatus(event: EventRecord) { return event.status || "unknown"; }
function tone(status: string): "neutral" | "success" | "warning" { return status === "upcoming" ? "success" : status === "ongoing" ? "warning" : "neutral"; }
function categoryName(event: EventRecord) { return typeof event.category === "string" ? event.category : event.category?.name || "Uncategorized"; }
function speakerCount(event: EventRecord) { return event.speakers?.length ?? 0; }
function eventDate(event: EventRecord) { return event.startDate || event.date; }
function liveState(event: EventRecord) { return event.isLive ? "Live now" : event.liveStream?.url || event.livestreamUrl || event.isOnline ? "Configured" : "Not configured"; }

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const view = validView(searchParams.get("view"));
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [draftQuery, setDraftQuery] = useState(query);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const request = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const nextQuery = params.toString();
    if (nextQuery === queryString) return;
    router.replace(`/dashboard/events${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
  }, [queryString, router]);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await eventsApi.list({ view, page, limit: PAGE_SIZE, query });
      if (id !== request.current) return;
      setEvents(result.data);
      setTotal(result.pagination?.total ?? result.data.length);
      setTotalPages(result.pagination?.totalPages ?? Math.max(1, Math.ceil((result.pagination?.total ?? result.data.length) / PAGE_SIZE)));
      setError("");
    } catch (reason) {
      if (id !== request.current) return;
      setError(reason instanceof Error ? reason.message : "Events could not be loaded.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [page, query, view]);

  const loadRelations = useCallback(async () => {
    const [speakerResult, categoryResult] = await Promise.allSettled([eventsApi.speakers(), eventsApi.categories()]);
    if (speakerResult.status === "fulfilled") setSpeakers(speakerResult.value);
    if (categoryResult.status === "fulfilled") setCategories(categoryResult.value);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { const timer = window.setTimeout(() => void loadRelations(), 0); return () => window.clearTimeout(timer); }, [loadRelations]);

  const changeView = (next: EventView) => { setLoading(true); setParams({ view: next === "all" ? null : next, page: null }); };
  const changeQuery = useCallback((value: string) => { const next = value.trim(); if (next === query) return; setLoading(true); setParams({ q: next || null, page: null }); }, [query, setParams]);
  const refresh = useCallback(async () => { setLoading(true); await load(); }, [load]);

  const openCanonical = async (event: EventRecord, mode: "view" | "edit") => {
    setRecordLoading(true);
    try {
      const canonical = (await eventsApi.get(event._id)).data;
      setSelected(canonical);
      if (mode === "edit") { setEditing(canonical); setFormOpen(true); }
      else setDetailOpen(true);
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Event details could not be loaded."); }
    finally { setRecordLoading(false); }
  };

  const remove = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await eventsApi.remove(deleteTarget._id); toast.success("Event deleted."); setDeleteTarget(null); await refresh(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Event could not be deleted."); }
    finally { setDeleting(false); }
  };

  const dateRange = (event: EventRecord) => {
    const start = eventDate(event); if (!start) return "Date pending";
    const first = formatDate(start, { dateStyle: "medium", timeStyle: "short" });
    return event.endDate ? `${first} - ${formatDate(event.endDate, { timeStyle: "short" })}` : first;
  };

  const summary = useMemo(() => ({ visible: events.length, total, upcoming: view === "upcoming" ? total : events.filter((event) => event.status === "upcoming").length }), [events, total, view]);

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Events" description="Create, schedule, and manage BiblePlus events." action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setRelationsOpen(true)}>Speakers & categories</Button><Button onClick={() => { setEditing(null); setFormOpen(true); }}><HiOutlinePlus className="h-5 w-5" />Create event</Button></div>} /></PageSection>
    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-3"><StatCard label="Matching events" value={summary.total} icon={<HiOutlineCalendarDays className="h-5 w-5 text-[var(--color-primary)]" />} /><StatCard label="Shown on page" value={summary.visible} /><StatCard label="Upcoming in view" value={summary.upcoming} /></PageSection>
    <PageSection delay={.08} className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 rounded-xl bg-[var(--color-surface-muted)] p-1">{(["all", "upcoming", "past"] as EventView[]).map((item) => <button key={item} type="button" onClick={() => changeView(item)} className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-medium capitalize ${view === item ? "bg-[var(--color-surface)] text-[var(--color-primary)]" : "text-[var(--color-muted)]"}`}>{item}</button>)}</div>
        <SearchField aria-label="Search events" placeholder="Search events..." value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} onDebouncedChange={changeQuery} className="lg:w-80" />
      </div>

      {loading ? <EventSkeleton /> : error ? <ErrorState description={error} onRetry={() => void refresh()} /> : events.length ? <><div className="hidden overflow-visible rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><caption className="sr-only">BiblePlus events</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="px-4 py-3 font-medium">Event</th><th className="px-4 py-3 font-medium">Schedule</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Speakers</th><th className="px-4 py-3 font-medium">Livestream</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{events.map((event) => <tr key={event._id}><td className="max-w-64 px-4 py-3"><p className="truncate font-medium">{event.title || event.name}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]"><HiOutlineMapPin className="mr-1 inline h-3.5 w-3.5" />{event.location || event.venue || "Location pending"}</p></td><td className="whitespace-nowrap px-4 py-3">{dateRange(event)}</td><td className="px-4 py-3">{categoryName(event)}</td><td className="px-4 py-3">{speakerCount(event)}</td><td className="px-4 py-3">{liveState(event)}</td><td className="px-4 py-3"><StatusPill tone={tone(recordStatus(event))}>{recordStatus(event)}</StatusPill></td><td className="px-4 py-3 text-right"><Actions event={event} disabled={recordLoading} onView={() => void openCanonical(event, "view")} onEdit={() => void openCanonical(event, "edit")} onDelete={() => setDeleteTarget(event)} /></td></tr>)}</tbody></table></div></div>
      <div className="grid gap-3 md:hidden">{events.map((event) => <article key={event._id} className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{event.title || event.name}</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{dateRange(event)}</p></div><Actions event={event} disabled={recordLoading} onView={() => void openCanonical(event, "view")} onEdit={() => void openCanonical(event, "edit")} onDelete={() => setDeleteTarget(event)} /></div><div className="mt-4 flex flex-wrap gap-2"><StatusPill tone={tone(recordStatus(event))}>{recordStatus(event)}</StatusPill><StatusPill>{categoryName(event)}</StatusPill><StatusPill>{speakerCount(event)} speaker{speakerCount(event) === 1 ? "" : "s"}</StatusPill></div><p className="mt-3 truncate text-sm text-[var(--color-muted)]"><HiOutlineMapPin className="mr-1 inline h-4 w-4" />{event.location || event.venue || "Location pending"}</p></article>)}</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={(next) => { setLoading(true); setParams({ page: next === 1 ? null : next }); }} /></> : <EmptyState title="No events found" description={query ? "Try a different search." : `There are no ${view === "all" ? "" : `${view} `}events yet.`} action={!query && <Button onClick={() => setFormOpen(true)}>Create event</Button>} />}
    </PageSection>

    <EventFormModal open={formOpen} event={editing} speakers={speakers} categories={categories} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); void refresh(); }} />
    <RelatedManagers open={relationsOpen} onClose={() => setRelationsOpen(false)} speakers={speakers} categories={categories} onChanged={loadRelations} />
    <EventDetail open={detailOpen} event={selected} onClose={() => setDetailOpen(false)} onEdit={() => { setDetailOpen(false); setEditing(selected); setFormOpen(true); }} />
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} pending={deleting} title="Delete event?" description={`Delete “${deleteTarget?.title || deleteTarget?.name || "this event"}”? This cannot be undone.`} confirmLabel="Delete event" />
  </div>;
}

function Actions({ event, disabled, onView, onEdit, onDelete }: { event: EventRecord; disabled: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) { return <details className="relative inline-block text-left"><summary aria-label={`Actions for ${event.title || event.name}`} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-soft)]"><HiOutlineEllipsisVertical className="h-5 w-5" /></summary><div className="absolute right-0 z-30 mt-2 w-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"><button disabled={disabled} onClick={onView} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">View</button><button disabled={disabled} onClick={onEdit} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Edit</button><button disabled={disabled} onClick={onDelete} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed">Delete</button></div></details>; }
function EventDetail({ open, event, onClose, onEdit }: { open: boolean; event: EventRecord | null; onClose: () => void; onEdit: () => void }) { return <Modal open={open} onClose={onClose} title={event?.title || event?.name || "Event details"} description="Canonical event record from the backend." footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit event</Button></>}>{event && <div className="space-y-5"><p className="whitespace-pre-wrap leading-7 text-[var(--color-muted)]">{event.description || "No description."}</p><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Schedule" value={`${event.startDate || event.date ? formatDate(event.startDate || event.date || "", { dateStyle: "medium", timeStyle: "short" }) : "Date pending"}${event.endDate ? ` - ${formatDate(event.endDate, { dateStyle: "medium", timeStyle: "short" })}` : ""}`} /><Detail label="Location" value={event.location || event.venue || "Location pending"} /><Detail label="Category" value={categoryName(event)} /><Detail label="Speakers" value={String(speakerCount(event))} /><Detail label="Livestream" value={liveState(event)} /><Detail label="Status" value={recordStatus(event)} /></dl></div>}</Modal>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><dt className="text-xs text-[var(--color-muted)]">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
function EventSkeleton() { return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>; }