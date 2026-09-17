"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { HiOutlineArrowRight, HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

export type DashboardSearchPage = { label: string; href: string; icon: IconType; group: string; keywords?: string[] };
type SearchScope = { label: string; href: string; parameter: "q" | "search"; description: string };
type SearchResult = { id: string; label: string; description: string; href: string; icon: IconType; kind: "page" | "search" };

const SEARCH_SCOPES: SearchScope[] = [
  { label: "Events", href: "/dashboard/events", parameter: "q", description: "Search event names and details" },
  { label: "Books", href: "/dashboard/books", parameter: "q", description: "Search titles, authors, and metadata" },
  { label: "Users", href: "/dashboard/users", parameter: "search", description: "Search names, usernames, and email" },
  { label: "Audit Logs", href: "/dashboard/audit-logs", parameter: "search", description: "Search recorded admin activity" },
];
const QUICK_LINKS = ["/dashboard", "/dashboard/users", "/dashboard/events", "/dashboard/blogs", "/dashboard/books"];

function normalized(value: string) { return value.trim().toLocaleLowerCase(); }

function pageScore(page: DashboardSearchPage, query: string) {
  const label = normalized(page.label);
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 2;
  const words = [page.group, ...(page.keywords ?? [])].map(normalized);
  if (words.some((word) => word.startsWith(query))) return 3;
  if (words.some((word) => word.includes(query))) return 4;
  return Number.POSITIVE_INFINITY;
}

export function dashboardSearchResults(pages: DashboardSearchPage[], rawQuery: string): SearchResult[] {
  const query = normalized(rawQuery);
  if (!query) return QUICK_LINKS.flatMap((href) => {
    const page = pages.find((candidate) => candidate.href === href);
    return page ? [{ id: `page:${page.href}`, label: page.label, description: page.group, href: page.href, icon: page.icon, kind: "page" as const }] : [];
  });
  const pageResults = pages.map((page) => ({ page, score: pageScore(page, query) })).filter(({ score }) => Number.isFinite(score)).sort((a, b) => a.score - b.score || a.page.label.localeCompare(b.page.label)).slice(0, 6).map(({ page }) => ({ id: `page:${page.href}`, label: page.label, description: `Go to ${page.group.toLocaleLowerCase()}`, href: page.href, icon: page.icon, kind: "page" as const }));
  const searchablePages = new Map(pages.map((page) => [page.href, page]));
  const scopedResults = SEARCH_SCOPES.flatMap((scope) => {
    const page = searchablePages.get(scope.href);
    if (!page) return [];
    const params = new URLSearchParams({ [scope.parameter]: rawQuery.trim() });
    return [{ id: `search:${scope.href}`, label: `Search ${scope.label} for "${rawQuery.trim()}"`, description: scope.description, href: `${scope.href}?${params.toString()}`, icon: page.icon, kind: "search" as const }];
  });
  return [...pageResults, ...scopedResults];
}
export default function GlobalDashboardSearch({ pages }: { pages: DashboardSearchPage[] }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => dashboardSearchResults(pages, query), [pages, query]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); setOpen(true); inputRef.current?.focus(); }
      if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); inputRef.current?.blur(); }
    };
    const onPointerDown = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [open]);


  const select = (result: SearchResult) => { setOpen(false); setQuery(""); setActiveIndex(0); router.push(result.href); };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.min(current + 1, results.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.max(current - 1, 0)); }
    else if (event.key === "Enter" && open && results[activeIndex]) { event.preventDefault(); select(results[activeIndex]); }
  };
  const pageResults = results.filter((result) => result.kind === "page");
  const searchResults = results.filter((result) => result.kind === "search");
  let resultIndex = 0;

  return (
    <div ref={rootRef} className="relative order-3 w-full sm:order-none sm:ml-8 sm:flex-1 sm:max-w-[30rem] lg:ml-16 xl:ml-24">
      <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-placeholder)]" />
      <input ref={inputRef} type="search" role="combobox" aria-label="Search dashboard" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={open && results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined} aria-autocomplete="list" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown} placeholder="Go to a page or search records..." className="h-11 w-full rounded-full border border-transparent bg-[var(--color-surface-muted)] py-2 pl-11 pr-20 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-placeholder)] hover:bg-[var(--color-placeholder-fill)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary-soft)]" />
      {query ? <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setActiveIndex(0); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-placeholder-fill)] hover:text-[var(--color-foreground)]"><HiOutlineXMark className="h-4 w-4" /></button> : <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-sans text-[11px] font-medium text-[var(--color-muted)] md:block">Ctrl K</kbd>}
      {open && <div className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_22px_60px_rgba(11,33,74,0.18)]">
        <div id={listboxId} role="listbox" aria-label="Dashboard search results" className="dashboard-scrollbar max-h-[min(32rem,65vh)] overflow-y-auto p-2">
          {pageResults.length > 0 && <SearchGroup label={query.trim() ? "Pages" : "Quick links"}>{pageResults.map((result) => { const index = resultIndex++; return <SearchOption key={result.id} result={result} active={index === activeIndex} optionId={`${listboxId}-${result.id}`} onMouseEnter={() => setActiveIndex(index)} onSelect={() => select(result)} />; })}</SearchGroup>}
          {query.trim() && <SearchGroup label="Search records" separated={pageResults.length > 0}>{searchResults.map((result) => { const index = resultIndex++; return <SearchOption key={result.id} result={result} active={index === activeIndex} optionId={`${listboxId}-${result.id}`} onMouseEnter={() => setActiveIndex(index)} onSelect={() => select(result)} />; })}</SearchGroup>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-[11px] text-[var(--color-muted)]"><span>{query.trim() ? "Choose where to search" : "Start typing to search records"}</span><span className="hidden sm:inline">Up/Down Navigate | Enter Open | Esc Close</span></div>
      </div>}
    </div>
  );
}

function SearchGroup({ label, separated = false, children }: { label: string; separated?: boolean; children: ReactNode }) {
  return <section className={separated ? "mt-2 border-t border-[var(--color-border)] pt-2" : ""}><h2 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{label}</h2><div>{children}</div></section>;
}

function SearchOption({ result, active, optionId, onMouseEnter, onSelect }: { result: SearchResult; active: boolean; optionId: string; onMouseEnter: () => void; onSelect: () => void }) {
  const Icon = result.icon;
  return <button id={optionId} type="button" role="option" aria-selected={active} onMouseEnter={onMouseEnter} onClick={onSelect} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${active ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-surface-muted)]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${result.kind === "search" ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--color-foreground)]">{result.label}</span><span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{result.description}</span></span><HiOutlineArrowRight className={`h-4 w-4 shrink-0 ${active ? "text-[var(--color-primary)]" : "text-[var(--color-placeholder)]"}`} aria-hidden="true" /></button>;
}
