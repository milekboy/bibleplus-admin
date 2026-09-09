"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineBookOpen, HiOutlineEllipsisVertical, HiOutlinePlus } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Modal, PageHeader, PageSection, Pagination, SearchField, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { booksApi } from "@/lib/api/books";
import { formatDate } from "@/lib/formatters";
import type { BookRecord } from "@/types/books";
import BookFormModal from "./BookFormModal";

const PAGE_SIZE = 10;

function coverUrl(book: BookRecord) {
  return book.coverImage ?? book.cover ?? book.image ?? book.picture ?? book.thumbnail ?? "";
}

function chapterCount(book: BookRecord) {
  return book.totalChapters ?? book.chapters;
}

function bookDate(book: BookRecord) {
  return book.updatedAt ?? book.publishedAt ?? book.createdAt;
}

export default function BooksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [draftQuery, setDraftQuery] = useState(query);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);
  const [selected, setSelected] = useState<BookRecord | null>(null);
  const [editing, setEditing] = useState<BookRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const request = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const nextQuery = params.toString();
    if (nextQuery === queryString) return;
    router.replace("/dashboard/books" + (nextQuery ? "?" + nextQuery : ""), { scroll: false });
  }, [queryString, router]);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await booksApi.list({ page, limit: PAGE_SIZE, query });
      if (id !== request.current) return;
      const backendTotal = result.pagination?.total ?? result.data.length;
      const pageRows = result.pagination
        ? result.data
        : result.data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      setBooks(pageRows);
      setTotal(backendTotal);
      setTotalPages(result.pagination?.totalPages ?? Math.max(1, Math.ceil(backendTotal / PAGE_SIZE)));
      setError("");
    } catch (reason) {
      if (id !== request.current) return;
      setError(reason instanceof Error ? reason.message : "Books could not be loaded.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      request.current += 1;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const changeQuery = useCallback((value: string) => {
    const next = value.trim();
    if (next === query) return;
    request.current += 1;
    setLoading(true);
    setParams({ q: next || null, page: null });
  }, [query, setParams]);

  const openCanonical = async (book: BookRecord, mode: "view" | "edit") => {
    setRecordLoading(true);
    try {
      const canonical = (await booksApi.get(book._id)).data;
      if (!canonical?._id) throw new Error("The backend did not return a valid book record.");
      setSelected(canonical);
      if (mode === "edit") {
        setEditing(canonical);
        setFormOpen(true);
      } else {
        setDetailOpen(true);
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Book details could not be loaded.");
    } finally {
      setRecordLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await booksApi.remove(deleteTarget._id);
      toast.success("Book deleted.");
      if (selected?._id === deleteTarget._id) { setSelected(null); setDetailOpen(false); }
      setDeleteTarget(null);
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The book could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  const summary = useMemo(() => ({
    shown: books.length,
    covers: books.filter((book) => Boolean(coverUrl(book))).length,
  }), [books]);

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Books" description="Manage the BiblePlus book library and cover artwork." action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><HiOutlinePlus className="h-5 w-5" />Create book</Button>} /></PageSection>

    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-3">
      <StatCard label={query ? "Search results" : "Backend total"} value={total} icon={<HiOutlineBookOpen className="h-5 w-5 text-[var(--color-primary)]" />} />
      <StatCard label="Shown on this page" value={summary.shown} />
      <StatCard label="Covers on this page" value={summary.covers} />
    </PageSection>

    <PageSection delay={.08} className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <SearchField aria-label="Search books" placeholder="Search books..." value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} onDebouncedChange={changeQuery} className="w-full sm:max-w-md" />
        <p className="mt-2 text-xs text-[var(--color-muted)]">{query ? "Showing server search results for \"" + query + "\"." : "Search uses the backend title, author, and metadata index."}</p>
      </div>

      {loading ? <BookSkeleton /> : error ? <ErrorState description={error} onRetry={() => void refresh()} /> : books.length ? <>
        <div className="hidden overflow-visible rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><caption className="sr-only">BiblePlus books</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="px-4 py-3 font-medium">Book</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Audience</th><th className="px-4 py-3 font-medium">Chapters</th><th className="px-4 py-3 font-medium">Updated</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{books.map((book) => <tr key={book._id}><td className="max-w-96 px-4 py-3"><div className="flex items-center gap-3"><BookCover key={coverUrl(book)} book={book} /><div className="min-w-0"><p className="truncate font-medium">{book.title || "Untitled book"}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{book.author || "Unknown author"}</p></div></div></td><td className="px-4 py-3">{book.category || "Not supplied"}</td><td className="px-4 py-3">{book.audience || "Not supplied"}</td><td className="px-4 py-3">{chapterCount(book) ?? "Not supplied"}</td><td className="whitespace-nowrap px-4 py-3">{bookDate(book) ? formatDate(bookDate(book) || "") : "Not supplied"}</td><td className="px-4 py-3 text-right"><Actions book={book} disabled={recordLoading || deleting} onView={() => void openCanonical(book, "view")} onEdit={() => void openCanonical(book, "edit")} onDelete={() => setDeleteTarget(book)} /></td></tr>)}</tbody></table></div></div>
        <div className="grid gap-3 md:hidden">{books.map((book) => <article key={book._id} className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-start gap-3"><BookCover key={coverUrl(book)} book={book} large /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="line-clamp-2 font-semibold">{book.title || "Untitled book"}</h3><p className="mt-1 truncate text-sm text-[var(--color-muted)]">{book.author || "Unknown author"}</p></div><Actions book={book} disabled={recordLoading || deleting} onView={() => void openCanonical(book, "view")} onEdit={() => void openCanonical(book, "edit")} onDelete={() => setDeleteTarget(book)} /></div><div className="mt-3 flex flex-wrap gap-2"><StatusPill>{book.category || "No category"}</StatusPill><StatusPill>{book.audience || "No audience"}</StatusPill>{chapterCount(book) !== undefined && <StatusPill>{String(chapterCount(book)) + " chapters"}</StatusPill>}</div></div></div>{book.description && <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-[var(--color-muted)]">{book.description}</p>}</article>)}</div>
        <Pagination page={page} totalPages={totalPages} onPageChange={(next) => { request.current += 1; setLoading(true); setParams({ page: next === 1 ? null : next }); }} />
      </> : <EmptyState title={query ? "No books match this search" : "No books found"} description={query ? "Try a different title, author, or keyword." : "Create the first book in the library."} action={query ? <Button variant="secondary" onClick={() => { setDraftQuery(""); changeQuery(""); }}>Clear search</Button> : <Button onClick={() => { setEditing(null); setFormOpen(true); }}>Create book</Button>} />}
    </PageSection>

    <BookFormModal open={formOpen} book={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); void refresh(); }} />
    <BookDetail open={detailOpen} book={selected} onClose={() => setDetailOpen(false)} onEdit={() => { setDetailOpen(false); setEditing(selected); setFormOpen(true); }} />
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} pending={deleting} title="Delete book?" description={"Delete \"" + (deleteTarget?.title || "this book") + "\"? This cannot be undone."} confirmLabel="Delete book" />
  </div>;
}

function BookCover({ book, large = false }: { book: BookRecord; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const source = coverUrl(book);
  const dimensions = large ? "h-24 w-16" : "h-16 w-11";
  return source && !broken ? <div className={"relative shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-muted)] " + dimensions}><Image src={source} alt="" fill unoptimized className="object-cover" onError={() => setBroken(true)} /></div> : <div className={"grid shrink-0 place-items-center rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-muted)] " + dimensions}><HiOutlineBookOpen className="h-5 w-5" /></div>;
}

function Actions({ book, disabled, onView, onEdit, onDelete }: { book: BookRecord; disabled: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return <details className="relative inline-block text-left"><summary aria-label={"Actions for " + (book.title || "book")} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-soft)]"><HiOutlineEllipsisVertical className="h-5 w-5" /></summary><div className="absolute right-0 z-30 mt-2 w-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"><button disabled={disabled} onClick={onView} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">View</button><button disabled={disabled} onClick={onEdit} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Edit</button><button disabled={disabled} onClick={onDelete} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed">Delete</button></div></details>;
}

function BookDetail({ open, book, onClose, onEdit }: { open: boolean; book: BookRecord | null; onClose: () => void; onEdit: () => void }) {
  return <Modal open={open} onClose={onClose} title={book?.title || "Book details"} description="Canonical book record from the backend." footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit book</Button></>}>{book && <div className="grid gap-6 sm:grid-cols-[140px_minmax(0,1fr)]"><div><BookCover key={coverUrl(book)} book={book} large /></div><div className="min-w-0 space-y-5"><dl className="grid gap-3 sm:grid-cols-2"><Detail label="Author" value={book.author || "Not supplied"} /><Detail label="Category" value={book.category || "Not supplied"} /><Detail label="Audience" value={book.audience || "Not supplied"} /><Detail label="Total chapters" value={chapterCount(book) !== undefined ? String(chapterCount(book)) : "Not supplied"} /><Detail label="Source" value={book.source || "Not supplied"} /><Detail label="Updated" value={bookDate(book) ? formatDate(bookDate(book) || "", { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"} /></dl><section><h3 className="font-semibold">Description</h3><p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words leading-7 text-[var(--color-muted)]">{book.description || "No description supplied."}</p></section></div></div>}</Modal>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><dt className="text-xs text-[var(--color-muted)]">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>;
}

function BookSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
}