"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineArrowPath, HiOutlineDocumentText, HiOutlineEllipsisVertical, HiOutlinePlus } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, Modal, PageHeader, PageSection, Pagination, SearchField, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { blogsApi } from "@/lib/api/blogs";
import { formatDate } from "@/lib/formatters";
import type { BlogCategory, BlogComment, BlogRecord, BlogStatus } from "@/types/blogs";
import BlogCategoriesModal from "./BlogCategoriesModal";
import BlogFormModal from "./BlogFormModal";

const PAGE_SIZE = 10;

function validStatus(value: string | null): BlogStatus {
  return value === "draft" || value === "published" ? value : "all";
}

function workflowStatus(blog: BlogRecord) {
  return blog.status === "published" || blog.published || blog.isPublished ? "published" : blog.status || "draft";
}

function categoryName(blog: BlogRecord) {
  return typeof blog.category === "string" ? blog.category : blog.category?.name || "Uncategorized";
}

function authorName(blog: BlogRecord) {
  if (typeof blog.author === "string") return blog.author;
  return blog.author?.name ?? blog.author?.username ?? blog.author?.email ?? "Not supplied";
}

function coverImage(blog: BlogRecord) {
  return blog.coverImage || blog.image || blog.thumbnail || "";
}

function commentId(comment: BlogComment) {
  return comment._id ?? comment.id ?? "";
}

function commentAuthor(comment: BlogComment) {
  const author = comment.author ?? comment.user;
  if (typeof author === "string") return author;
  return author?.name ?? author?.username ?? author?.email ?? "Unknown author";
}

function commentText(comment: BlogComment) {
  return comment.content ?? comment.text ?? comment.body ?? "No comment text supplied.";
}

export default function BlogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const status = validStatus(searchParams.get("status"));
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [draftQuery, setDraftQuery] = useState(query);
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [counts, setCounts] = useState<{ total?: number; draft?: number; published?: number }>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<BlogRecord | null>(null);
  const [editing, setEditing] = useState<BlogRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [sessionCategories, setSessionCategories] = useState<BlogCategory[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BlogRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<BlogRecord | null>(null);
  const [commentTarget, setCommentTarget] = useState<BlogComment | null>(null);
  const [mutationPending, setMutationPending] = useState(false);
  const request = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const nextQuery = params.toString();
    if (nextQuery === queryString) return;
    router.replace("/dashboard/blogs" + (nextQuery ? "?" + nextQuery : ""), { scroll: false });
  }, [queryString, router]);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await blogsApi.list({ status, page, limit: PAGE_SIZE });
      if (id !== request.current) return;
      setBlogs(result.data);
      setCounts(result.counts ?? {});
      const backendTotal = result.pagination?.total ?? result.counts?.total ?? result.data.length;
      setTotal(backendTotal);
      setTotalPages(result.pagination?.totalPages ?? Math.max(1, Math.ceil(backendTotal / PAGE_SIZE)));
      setError("");
    } catch (reason) {
      if (id !== request.current) return;
      setError(reason instanceof Error ? reason.message : "Blogs could not be loaded.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const changeStatus = (next: BlogStatus) => {
    setLoading(true);
    setParams({ status: next === "all" ? null : next, page: null });
  };

  const changeQuery = useCallback((value: string) => {
    const next = value.trim();
    if (next === query) return;
    setParams({ q: next || null });
  }, [query, setParams]);

  const visibleBlogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return blogs;
    return blogs.filter((blog) => [blog.title, authorName(blog), categoryName(blog), Array.isArray(blog.tags) ? blog.tags.join(" ") : blog.tags ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [blogs, query]);

  const categories = useMemo(() => {
    const found = new Map<string, BlogCategory>();
    for (const blog of blogs) if (blog.category && typeof blog.category === "object" && blog.category._id) found.set(blog.category._id, blog.category);
    for (const category of sessionCategories) if (category._id) found.set(category._id, category);
    return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [blogs, sessionCategories]);

  const openCanonical = async (blog: BlogRecord, mode: "view" | "edit") => {
    setRecordLoading(true);
    try {
      const canonical = (await blogsApi.get(blog._id)).data;
      if (!canonical?._id) throw new Error("The backend did not return a valid blog record.");
      setSelected(canonical);
      if (mode === "edit") {
        setEditing(canonical);
        setFormOpen(true);
      } else {
        setDetailOpen(true);
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Blog details could not be loaded.");
    } finally {
      setRecordLoading(false);
    }
  };

  const publish = async () => {
    if (!publishTarget) return;
    setMutationPending(true);
    try {
      const result = await blogsApi.publish(publishTarget._id);
      toast.success(result.message ?? "Blog published.");
      setPublishTarget(null);
      await refreshList();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The blog could not be published.");
    } finally {
      setMutationPending(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setMutationPending(true);
    try {
      await blogsApi.remove(deleteTarget._id);
      toast.success("Blog deleted.");
      setDeleteTarget(null);
      if (selected?._id === deleteTarget._id) { setDetailOpen(false); setSelected(null); }
      await refreshList();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The blog could not be deleted.");
    } finally {
      setMutationPending(false);
    }
  };

  const removeComment = async () => {
    const id = commentTarget ? commentId(commentTarget) : "";
    if (!id) return;
    setMutationPending(true);
    try {
      await blogsApi.deleteComment(id);
      setSelected((current) => current ? { ...current, comments: current.comments?.filter((comment) => commentId(comment) !== id) } : current);
      toast.success("Comment deleted.");
      setCommentTarget(null);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The comment could not be deleted.");
    } finally {
      setMutationPending(false);
    }
  };

  const refreshExternal = async () => {
    setRefreshing(true);
    try {
      const result = await blogsApi.refresh();
      toast.success(result.message ?? "External blogs refreshed.");
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "External blogs could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  const publishedOnPage = blogs.filter((blog) => workflowStatus(blog) === "published").length;
  const draftsOnPage = blogs.filter((blog) => workflowStatus(blog) === "draft").length;

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Blogs" description="Create, publish, and manage BiblePlus articles and their returned comments." action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setCategoriesOpen(true)}>Categories</Button><Button variant="secondary" onClick={() => void refreshExternal()} loading={refreshing}><HiOutlineArrowPath className="h-5 w-5" />Refresh feed</Button><Button onClick={() => { setEditing(null); setFormOpen(true); }}><HiOutlinePlus className="h-5 w-5" />Create blog</Button></div>} /></PageSection>

    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-3">
      <StatCard label={status === "all" ? "Backend total" : "Matching posts"} value={total} icon={<HiOutlineDocumentText className="h-5 w-5 text-[var(--color-primary)]" />} />
      <StatCard label={counts.published !== undefined ? "Published total" : "Published on this page"} value={counts.published ?? publishedOnPage} />
      <StatCard label={counts.draft !== undefined ? "Draft total" : "Drafts on this page"} value={counts.draft ?? draftsOnPage} />
    </PageSection>

    <PageSection delay={.08} className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 rounded-xl bg-[var(--color-surface-muted)] p-1">{(["draft", "published", "all"] as BlogStatus[]).map((item) => <button key={item} type="button" onClick={() => changeStatus(item)} className={"min-h-11 cursor-pointer rounded-lg px-4 text-sm font-medium capitalize " + (status === item ? "bg-[var(--color-surface)] text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>{item}</button>)}</div>
        <div><SearchField aria-label="Search blogs on this page" placeholder="Search this page..." value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} onDebouncedChange={changeQuery} className="lg:w-80" /></div>
      </div>

      {loading ? <BlogSkeleton /> : error ? <ErrorState description={error} onRetry={() => void refreshList()} /> : visibleBlogs.length ? <>
        <div className="hidden overflow-visible rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">BiblePlus blogs</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="px-4 py-3 font-medium">Article</th><th className="px-4 py-3 font-medium">Author</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Updated</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{visibleBlogs.map((blog) => <tr key={blog._id}><td className="max-w-80 px-4 py-3"><div className="flex items-center gap-3"><Cover blog={blog} /><div className="min-w-0"><p className="truncate font-medium">{blog.title}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{blog.excerpt || blog.summary || "No excerpt supplied"}</p></div></div></td><td className="max-w-44 truncate px-4 py-3">{authorName(blog)}</td><td className="px-4 py-3">{categoryName(blog)}</td><td className="px-4 py-3"><StatusPill tone={workflowStatus(blog) === "published" ? "success" : "warning"}>{workflowStatus(blog)}</StatusPill></td><td className="whitespace-nowrap px-4 py-3">{blog.updatedAt || blog.createdAt ? formatDate(blog.updatedAt || blog.createdAt || "") : "Not supplied"}</td><td className="px-4 py-3 text-right"><Actions blog={blog} disabled={recordLoading || mutationPending} onView={() => void openCanonical(blog, "view")} onEdit={() => void openCanonical(blog, "edit")} onPublish={() => setPublishTarget(blog)} onDelete={() => setDeleteTarget(blog)} /></td></tr>)}</tbody></table></div></div>
        <div className="grid gap-3 md:hidden">{visibleBlogs.map((blog) => <article key={blog._id} className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-start gap-3"><Cover blog={blog} large /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 font-semibold">{blog.title}</h3><Actions blog={blog} disabled={recordLoading || mutationPending} onView={() => void openCanonical(blog, "view")} onEdit={() => void openCanonical(blog, "edit")} onPublish={() => setPublishTarget(blog)} onDelete={() => setDeleteTarget(blog)} /></div><p className="mt-1 truncate text-sm text-[var(--color-muted)]">{authorName(blog)}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusPill tone={workflowStatus(blog) === "published" ? "success" : "warning"}>{workflowStatus(blog)}</StatusPill><StatusPill>{categoryName(blog)}</StatusPill></div><p className="mt-3 text-sm text-[var(--color-muted)]">{blog.updatedAt || blog.createdAt ? formatDate(blog.updatedAt || blog.createdAt || "") : "Date not supplied"}</p></article>)}</div>
        <Pagination page={page} totalPages={totalPages} onPageChange={(next) => { setLoading(true); setParams({ page: next === 1 ? null : next }); }} />
      </> : <EmptyState title={query ? "No posts match this page search" : "No blogs found"} description={query ? "Clear the search or load another page." : "There are no posts in this status yet."} action={query ? <Button variant="secondary" onClick={() => { setDraftQuery(""); setParams({ q: null }); }}>Clear search</Button> : <Button onClick={() => { setEditing(null); setFormOpen(true); }}>Create blog</Button>} />}
    </PageSection>

    <BlogFormModal open={formOpen} blog={editing} categories={categories} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); void refreshList(); }} />
    <BlogCategoriesModal open={categoriesOpen} categories={categories} onClose={() => setCategoriesOpen(false)} onSaved={(category) => setSessionCategories((current) => [...current.filter((item) => item._id !== category._id), category])} onDeleted={(id) => setSessionCategories((current) => current.filter((item) => item._id !== id))} />
    <BlogDetail open={detailOpen} blog={selected} onClose={() => setDetailOpen(false)} onEdit={() => { setDetailOpen(false); setEditing(selected); setFormOpen(true); }} onDeleteComment={setCommentTarget} />
    <ConfirmModal open={Boolean(publishTarget)} onClose={() => setPublishTarget(null)} onConfirm={publish} pending={mutationPending} danger={false} title="Publish blog?" description={"Publish \"" + (publishTarget?.title ?? "this blog") + "\"? It will become available through the backend's published feed."} confirmLabel="Publish blog" />
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} pending={mutationPending} title="Delete blog?" description={"Delete \"" + (deleteTarget?.title ?? "this blog") + "\"? This cannot be undone."} confirmLabel="Delete blog" />
    <ConfirmModal open={Boolean(commentTarget)} onClose={() => setCommentTarget(null)} onConfirm={removeComment} pending={mutationPending} title="Delete comment?" description={"Delete the comment from " + commentAuthor(commentTarget ?? {}) + "? This cannot be undone."} confirmLabel="Delete comment" />
  </div>;
}

function Cover({ blog, large = false }: { blog: BlogRecord; large?: boolean }) {
  const source = coverImage(blog);
  const size = large ? "h-16 w-16" : "h-11 w-11";
  return source ? <div className={"relative shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-muted)] " + size}><Image src={source} alt="" fill unoptimized className="object-cover" /></div> : <div className={"grid shrink-0 place-items-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-muted)] " + size}><HiOutlineDocumentText className="h-5 w-5" /></div>;
}

function Actions({ blog, disabled, onView, onEdit, onPublish, onDelete }: { blog: BlogRecord; disabled: boolean; onView: () => void; onEdit: () => void; onPublish: () => void; onDelete: () => void }) {
  return <details className="relative inline-block text-left"><summary aria-label={"Actions for " + blog.title} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-soft)]"><HiOutlineEllipsisVertical className="h-5 w-5" /></summary><div className="absolute right-0 z-30 mt-2 w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"><button disabled={disabled} onClick={onView} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">View</button><button disabled={disabled} onClick={onEdit} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Edit</button>{workflowStatus(blog) !== "published" && <button disabled={disabled} onClick={onPublish} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed">Publish</button>}<button disabled={disabled} onClick={onDelete} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed">Delete</button></div></details>;
}

function BlogDetail({ open, blog, onClose, onEdit, onDeleteComment }: { open: boolean; blog: BlogRecord | null; onClose: () => void; onEdit: () => void; onDeleteComment: (comment: BlogComment) => void }) {
  return <Modal open={open} onClose={onClose} title={blog?.title || "Blog details"} description="Canonical blog record from the backend." footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit blog</Button></>}>{blog && <div className="space-y-6">
    {coverImage(blog) && <div className="relative h-52 overflow-hidden rounded-xl bg-[var(--color-surface-muted)]"><Image src={coverImage(blog)} alt="" fill unoptimized className="object-cover" /></div>}
    <dl className="grid gap-3 sm:grid-cols-2"><Detail label="Author" value={authorName(blog)} /><Detail label="Category" value={categoryName(blog)} /><Detail label="Status" value={workflowStatus(blog)} /><Detail label="Updated" value={blog.updatedAt || blog.createdAt ? formatDate(blog.updatedAt || blog.createdAt || "", { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"} /></dl>
    {(blog.excerpt || blog.summary) && <section><h3 className="font-semibold">Summary</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-[var(--color-muted)]">{blog.excerpt || blog.summary}</p></section>}
    <section><h3 className="font-semibold">Content</h3><p className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--color-surface-muted)] p-4 leading-7">{blog.content || "No content supplied."}</p></section>
    {Array.isArray(blog.comments) && <section><h3 className="font-semibold">Comments ({blog.comments.length})</h3><div className="mt-3 space-y-2">{blog.comments.length ? blog.comments.map((comment, index) => { const id = commentId(comment); return <article key={id || String(index)} className="rounded-xl border border-[var(--color-border)] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium">{commentAuthor(comment)}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--color-muted)]">{commentText(comment)}</p>{comment.createdAt && <p className="mt-2 text-xs text-[var(--color-muted)]">{formatDate(comment.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>}</div>{id && <Button variant="danger" className="min-h-9 shrink-0 px-3" onClick={() => onDeleteComment(comment)}>Delete</Button>}</div></article>; }) : <p className="text-sm text-[var(--color-muted)]">No comments were returned for this blog.</p>}</div></section>}
  </div>}</Modal>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><dt className="text-xs text-[var(--color-muted)]">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function BlogSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
}