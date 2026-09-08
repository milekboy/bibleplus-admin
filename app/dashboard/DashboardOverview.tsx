"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineArrowPath, HiOutlineBell, HiOutlineBookOpen, HiOutlineCalendarDays, HiOutlineCircleStack, HiOutlineHeart, HiOutlineUsers } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ErrorState, PageHeader, PageSection, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import { formatDate, formatNumber, formatRelativeTime } from "@/lib/formatters";
import type { AnalyticsActivityDay, AnalyticsOverview, AnalyticsTrending, SystemHealth, TrendingBlog, UpcomingEvent } from "@/types/analytics";

type Section = "overview" | "activity" | "trending" | "system" | "upcoming";
type DashboardState = {
  metrics: AnalyticsOverview | null;
  activity: AnalyticsActivityDay[];
  trending: AnalyticsTrending | null;
  system: SystemHealth | null;
  upcoming: UpcomingEvent[];
  errors: Partial<Record<Section, string>>;
  updatedAt?: Date;
};
const emptyState: DashboardState = { metrics: null, activity: [], trending: null, system: null, upcoming: [], errors: {} };

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isOverview(value: unknown): value is AnalyticsOverview { return isRecord(value) && ["totalUsers", "totalBlogs", "totalEvents", "totalPrayers", "totalNotifications"].every((key) => finite(value[key])); }
function isActivity(value: unknown): value is AnalyticsActivityDay[] { return Array.isArray(value) && value.every((day) => isRecord(day) && typeof day.date === "string" && ["users", "blogs", "prayers", "events"].every((key) => finite(day[key]))); }
function isTrending(value: unknown): value is AnalyticsTrending { return isRecord(value) && (value.trendingBlogs === undefined || (Array.isArray(value.trendingBlogs) && value.trendingBlogs.every((blog) => isRecord(blog) && typeof blog.title === "string"))); }
function isSystemHealth(value: unknown): value is SystemHealth { if (!isRecord(value) || typeof value.mongoStatus !== "string" || !finite(value.uptime) || !isRecord(value.memory)) return false; const memory = value.memory; return ["rss", "heapTotal", "heapUsed", "external"].every((key) => finite(memory[key])); }
function isEventArray(value: unknown): value is UpcomingEvent[] { return Array.isArray(value) && value.every(isRecord); }
function isUpcomingResponse(value: unknown): value is UpcomingEvent[] | { events?: UpcomingEvent[]; results?: UpcomingEvent[] } { return isEventArray(value) || (isRecord(value) && (isEventArray(value.events) || isEventArray(value.results))); }
function invalidShape(section: Section) { return `The ${section} endpoint returned an unexpected response format.`; }
function formatMetric(value: number | undefined) { return value === undefined ? "\u2014" : formatNumber(value); }
function message(reason: unknown) { return reason instanceof ApiClientError || reason instanceof Error ? reason.message : "This dashboard section could not be loaded."; }
function stripHtml(value?: string) { return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&[#\w]+;/g, " ").replace(/\s+/g, " ").trim(); }
function eventList(value: UpcomingEvent[] | { events?: UpcomingEvent[]; results?: UpcomingEvent[] } | undefined) { if (Array.isArray(value)) return value; return value?.events ?? value?.results ?? []; }
function formatBytes(value = 0) { const units = ["B", "KB", "MB", "GB"]; let size = value, index = 0; while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; } return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`; }
function formatUptime(seconds = 0) { const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60); return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`; }
function developmentShape(name: Section, value: unknown) { if (process.env.NODE_ENV !== "development") return; const keys = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : undefined; const rows = Array.isArray(value) ? value.length : undefined; console.info(`[Dashboard] ${name} loaded`, { keys, rows }); }

export default function DashboardOverview() {
  const [state, setState] = useState<DashboardState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const results = await Promise.allSettled([
      apiRequest<AnalyticsOverview>(apiEndpoints.analytics.overview),
      apiRequest<AnalyticsActivityDay[]>(apiEndpoints.analytics.activity),
      apiRequest<AnalyticsTrending>(apiEndpoints.analytics.trending),
      apiRequest<SystemHealth>(apiEndpoints.analytics.system),
      apiRequest<UpcomingEvent[] | { events?: UpcomingEvent[]; results?: UpcomingEvent[] }>("/events/upcoming"),
    ]);
    if (!mounted.current) return;

    const errors: DashboardState["errors"] = {};
    const names: Section[] = ["overview", "activity", "trending", "system", "upcoming"];
    results.forEach((result, index) => {
      if (result.status === "rejected") errors[names[index]] = message(result.reason);
      else developmentShape(names[index], result.value.data);
    });
    const [overview, activity, trending, system, upcoming] = results;
    const overviewData = overview.status === "fulfilled" && isOverview(overview.value.data) ? overview.value.data : null;
    const activityData = activity.status === "fulfilled" && isActivity(activity.value.data) ? activity.value.data : [];
    const trendingData = trending.status === "fulfilled" && isTrending(trending.value.data) ? trending.value.data : null;
    const systemData = system.status === "fulfilled" && isSystemHealth(system.value.data) ? system.value.data : null;
    const upcomingData = upcoming.status === "fulfilled" && isUpcomingResponse(upcoming.value.data) ? eventList(upcoming.value.data) : [];
    if (overview.status === "fulfilled" && !overviewData) errors.overview = invalidShape("overview");
    if (activity.status === "fulfilled" && !isActivity(activity.value.data)) errors.activity = invalidShape("activity");
    if (trending.status === "fulfilled" && !trendingData) errors.trending = invalidShape("trending");
    if (system.status === "fulfilled" && !systemData) errors.system = invalidShape("system");
    if (upcoming.status === "fulfilled" && !isUpcomingResponse(upcoming.value.data)) errors.upcoming = invalidShape("upcoming");
    const next: DashboardState = { metrics: overviewData, activity: activityData, trending: trendingData, system: systemData, upcoming: upcomingData, errors, updatedAt: new Date() };
    setState(next);
    setLoading(false);
    setRefreshing(false);
    if (manual) {
      const failures = Object.keys(errors).length;
      if (failures) toast.warning(`Dashboard refreshed with ${failures} unavailable section${failures === 1 ? "" : "s"}.`);
      else toast.success("Dashboard refreshed.");
    }
  }, []);

  useEffect(() => { mounted.current = true; const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); mounted.current = false; }; }, [load]);

  const activityTotals = useMemo(() => state.activity.reduce((totals, day) => ({ users: totals.users + (day.users || 0), blogs: totals.blogs + (day.blogs || 0), prayers: totals.prayers + (day.prayers || 0), events: totals.events + (day.events || 0) }), { users: 0, blogs: 0, prayers: 0, events: 0 }), [state.activity]);
  if (loading) return <DashboardSkeleton />;
  if (!state.metrics && !state.activity.length && !state.trending && !state.system && !state.upcoming.length) return <ErrorState description="None of the dashboard endpoints returned usable data." onRetry={() => void load()} />;
  const failures = Object.keys(state.errors).length;

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Platform overview" description="Live activity and operational health across BiblePlus." action={<div className="text-right"><Button variant="secondary" loading={refreshing} onClick={() => void load(true)}><HiOutlineArrowPath className="h-5 w-5" />Refresh</Button>{state.updatedAt && <p className="mt-2 text-xs text-[var(--color-muted)]">Updated {formatRelativeTime(state.updatedAt)}</p>}</div>} /></PageSection>
    {failures > 0 && <div role="status" className="rounded-2xl border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-4 text-sm">{failures} dashboard request{failures === 1 ? "" : "s"} failed. Successful sections remain visible.</div>}

    <PageSection delay={.05} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Users" value={formatMetric(state.metrics?.totalUsers)} icon={<HiOutlineUsers className="h-5 w-5 text-[var(--color-primary)]" />} />
      <StatCard label="Blogs" value={formatMetric(state.metrics?.totalBlogs)} icon={<HiOutlineBookOpen className="h-5 w-5 text-[var(--color-primary)]" />} />
      <StatCard label="Events" value={formatMetric(state.metrics?.totalEvents)} icon={<HiOutlineCalendarDays className="h-5 w-5 text-[var(--color-primary)]" />} />
      <StatCard label="Prayers" value={formatMetric(state.metrics?.totalPrayers)} icon={<HiOutlineHeart className="h-5 w-5 text-[var(--color-primary)]" />} />
    </PageSection>
    {state.errors.overview && <InlineError title="Overview unavailable" message={state.errors.overview} retry={() => void load(true)} />}

    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
      <PageSection delay={.1} className="min-w-0"><Panel title="Recent activity" description="Seven-day totals from the analytics activity endpoint.">{state.errors.activity ? <InlineError message={state.errors.activity} retry={() => void load(true)} /> : state.activity.length ? <><div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><SmallStat label="Users" value={activityTotals.users} /><SmallStat label="Blogs" value={activityTotals.blogs} /><SmallStat label="Prayers" value={activityTotals.prayers} /><SmallStat label="Events" value={activityTotals.events} /></div><ActivityChart items={state.activity} /></> : <Empty message="No activity data returned yet." />}</Panel></PageSection>
      <PageSection delay={.15} className="min-w-0"><Panel title="Operational signals"><div className="space-y-3"><Signal icon={<HiOutlineCircleStack />} label="Database" value={state.system?.mongoStatus ?? "Unavailable"} good={state.system?.mongoStatus === "connected"} /><Signal icon={<HiOutlineCalendarDays />} label="Upcoming events" value={formatNumber(state.upcoming.length)} /><Signal icon={<HiOutlineBell />} label="Notifications" value={formatMetric(state.metrics?.totalNotifications)} /></div></Panel></PageSection>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <PageSection delay={.2}><Panel title="Upcoming events" description="Next events from the public upcoming-events endpoint." action={<Link href="/dashboard/events" className="cursor-pointer text-sm font-medium text-[var(--color-primary)]">Manage</Link>}>{state.errors.upcoming ? <InlineError message={state.errors.upcoming} retry={() => void load(true)} /> : state.upcoming.length ? <div className="divide-y divide-[var(--color-border)]">{state.upcoming.slice(0, 4).map((event, index) => <article key={event._id || index} className="py-3 first:pt-0 last:pb-0"><p className="font-medium">{event.title || event.name || "Untitled event"}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{event.date || event.startDate ? formatDate(event.date || event.startDate || "") : "Date pending"}{event.location ? ` / ${event.location}` : ""}</p></article>)}</div> : <Empty message="No upcoming events returned yet." />}</Panel></PageSection>
      <PageSection delay={.25}><Panel title="Trending blogs" description="Popular content from trending analytics." action={<Link href="/dashboard/blogs" className="cursor-pointer text-sm font-medium text-[var(--color-primary)]">Manage</Link>}>{state.errors.trending ? <InlineError message={state.errors.trending} retry={() => void load(true)} /> : state.trending?.trendingBlogs?.length ? <div className="space-y-3">{state.trending.trendingBlogs.slice(0, 4).map((blog, index) => <TrendingCard key={blog._id || index} blog={blog} rank={index + 1} />)}</div> : <Empty message="No trending blogs returned yet." />}</Panel></PageSection>
    </div>

    <PageSection delay={.3}><Panel title="System health" description="Backend availability, uptime, and memory usage.">{state.errors.system ? <InlineError message={state.errors.system} retry={() => void load(true)} /> : state.system ? <SystemPanel system={state.system} /> : <Empty message="No system-health data returned yet." />}</Panel></PageSection>
  </div>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="h-full w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><header className="mb-5 flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{title}</h3>{description && <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>}</div>{action}</header>{children}</section>; }
function SmallStat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><p className="text-xs text-[var(--color-muted)]">{label}</p><p className="mt-1 text-xl font-semibold">{formatNumber(value)}</p></div>; }
function Signal({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good?: boolean }) { return <div className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-muted)] p-4"><span className="text-xl text-[var(--color-primary)]">{icon}</span><div className="min-w-0 flex-1"><p className="text-sm text-[var(--color-muted)]">{label}</p><p className="truncate font-semibold capitalize">{value}</p></div>{good !== undefined && <StatusPill tone={good ? "success" : "warning"}>{good ? "Healthy" : "Check"}</StatusPill>}</div>; }
function ActivityChart({ items }: { items: AnalyticsActivityDay[] }) { const maximum = Math.max(1, ...items.map((day) => day.users + day.blogs + day.prayers + day.events)); return <div className="grid h-56 w-full min-w-0 grid-cols-7 items-end gap-1 sm:gap-2" role="img" aria-label={`Seven-day activity: ${items.map((day) => `${day.date}, ${day.users} users, ${day.blogs} blogs, ${day.prayers} prayers, ${day.events} events`).join("; ")}`}>{items.map((day) => { const total = day.users + day.blogs + day.prayers + day.events; return <div key={day.date} className="flex h-full min-w-0 flex-col justify-end gap-2 overflow-hidden"><span className="truncate text-center text-[10px] font-medium sm:text-xs">{formatNumber(total)}</span><div className="min-h-1 rounded-t-lg bg-[var(--color-primary)]" style={{ height: `${Math.max(3, total / maximum * 100)}%` }} title={`${day.users} users, ${day.blogs} blogs, ${day.prayers} prayers, ${day.events} events`} /><span className="truncate text-center text-[9px] text-[var(--color-muted)] sm:text-xs">{day.date}</span></div>; })}</div>; }
function TrendingCard({ blog, rank }: { blog: TrendingBlog; rank: number }) { const summary = stripHtml(blog.content) || blog.slug; return <article className="rounded-xl border border-[var(--color-border)] p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold">{blog.title}</p><StatusPill>#{rank}</StatusPill></div>{summary && <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{summary}</p>}<div className="mt-2 flex gap-4 text-xs text-[var(--color-muted)]">{typeof blog.views === "number" && <span>{formatNumber(blog.views)} views</span>}{typeof blog.likes === "number" && <span>{formatNumber(blog.likes)} likes</span>}</div></article>; }
function SystemPanel({ system }: { system: SystemHealth }) { const memoryTotal = system.memory?.heapTotal ?? 0, memoryUsed = system.memory?.heapUsed ?? 0, percent = memoryTotal ? Math.min(100, Math.round(memoryUsed / memoryTotal * 100)) : 0; return <div className="grid gap-4 lg:grid-cols-[minmax(260px,.7fr)_minmax(0,1.3fr)]"><div className="rounded-xl bg-[var(--color-surface-muted)] p-4"><p className="text-sm text-[var(--color-muted)]">MongoDB</p><div className="mt-2"><StatusPill tone={system.mongoStatus === "connected" ? "success" : "warning"}>{system.mongoStatus}</StatusPill></div><p className="mt-5 text-sm text-[var(--color-muted)]">Uptime</p><p className="mt-1 text-xl font-semibold">{formatUptime(system.uptime)}</p></div><div className="rounded-xl bg-[var(--color-surface-muted)] p-4"><div className="flex justify-between gap-3"><div><p className="text-sm text-[var(--color-muted)]">Heap memory</p><p className="mt-1 font-semibold">{formatBytes(memoryUsed)} of {formatBytes(memoryTotal)}</p></div><span className="font-semibold">{percent}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-placeholder-fill)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${percent}%` }} /></div><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[var(--color-muted)]">RSS</dt><dd className="font-medium">{formatBytes(system.memory?.rss)}</dd></div><div><dt className="text-[var(--color-muted)]">External</dt><dd className="font-medium">{formatBytes(system.memory?.external)}</dd></div></dl></div></div>; }
function InlineError({ title, message, retry }: { title?: string; message: string; retry: () => void }) { return <div role="alert" className="rounded-xl bg-[var(--color-danger-soft)] p-4"><p className="font-semibold">{title}</p><p className="text-sm text-[var(--color-danger)]">{message}</p><Button variant="secondary" className="mt-3" onClick={retry}>Retry all</Button></div>; }
function Empty({ message }: { message: string }) { return <p className="grid min-h-28 place-items-center rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center text-sm text-[var(--color-muted)]">{message}</p>; }
function DashboardSkeleton() { return <div className="space-y-6"><Skeleton className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 w-full" />)}</div><div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-80 w-full" /><Skeleton className="h-80 w-full" /></div></div>; }