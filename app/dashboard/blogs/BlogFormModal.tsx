"use client";

import { useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { blogsApi } from "@/lib/api/blogs";
import { isAllowedFileSize, isAllowedFileType, isValidUrl } from "@/lib/validators";
import type { BlogCategory, BlogPayload, BlogRecord } from "@/types/blogs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
type Props = { open: boolean; blog?: BlogRecord | null; categories: BlogCategory[]; onClose: () => void; onSaved: () => void };
type FormState = { title: string; excerpt: string; content: string; category: string; tags: string; author: string; status: "draft" | "published"; coverImage: string };

function authorName(blog?: BlogRecord | null) {
  if (typeof blog?.author === "string") return blog.author;
  return blog?.author?.name ?? blog?.author?.username ?? blog?.author?.email ?? "";
}

function categoryName(blog?: BlogRecord | null) {
  return typeof blog?.category === "string" ? blog.category : blog?.category?.name ?? "";
}

function initial(blog?: BlogRecord | null): FormState {
  const status = blog?.status === "published" || blog?.published || blog?.isPublished ? "published" : "draft";
  return { title: blog?.title ?? "", excerpt: blog?.excerpt ?? blog?.summary ?? "", content: blog?.content ?? "", category: categoryName(blog), tags: Array.isArray(blog?.tags) ? blog.tags.join(", ") : blog?.tags ?? "", author: authorName(blog), status, coverImage: blog?.coverImage ?? blog?.image ?? blog?.thumbnail ?? "" };
}

function collectUrls(value: unknown): string[] {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return [value];
  if (Array.isArray(value)) return value.flatMap(collectUrls);
  if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>).filter(([key]) => /url|file|image|cover/i.test(key)).flatMap(([, child]) => collectUrls(child));
  return [];
}

function validateImage(file: File) {
  if (!isAllowedFileType(file, ["image/jpeg", "image/png", "image/webp", "image/gif"])) return "Use a JPG, PNG, WebP, or GIF image.";
  if (!isAllowedFileSize(file, MAX_IMAGE_BYTES)) return "Images must be 10 MB or smaller.";
}

export default function BlogFormModal(props: Props) {
  if (!props.open) return null;
  return <BlogForm key={props.blog?._id ?? "new"} {...props} />;
}

function BlogForm({ blog, categories, onClose, onSaved }: Props) {
  const listId = useId();
  const [form, setForm] = useState(() => initial(blog));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "content" | null>(null);
  const [progress, setProgress] = useState(0);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial(blog)), [blog, form]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const guardedClose = () => {
    if (!pending && (!dirty || window.confirm("Discard your unsaved blog changes?"))) onClose();
  };

  const upload = async (change: ChangeEvent<HTMLInputElement>, target: "cover" | "content") => {
    const file = change.target.files?.[0];
    if (!file) return;
    const validation = validateImage(file);
    if (validation) {
      setErrors((current) => ({ ...current, coverImage: validation }));
      change.target.value = "";
      return;
    }
    setUploading(target);
    setProgress(0);
    try {
      const body = new FormData();
      body.append("coverImage", file);
      const result = await blogsApi.uploadImage(body, ({ loaded, total }) => setProgress(total ? Math.round(loaded / total * 100) : 0));
      const url = collectUrls(result.data)[0];
      if (!url) throw new Error("The upload completed without returning an image URL.");
      if (target === "cover") update("coverImage", url);
      else update("content", (form.content.trimEnd() + "\n\n<img src=\"" + url + "\" alt=\"\" />").trimStart());
      toast.success(target === "cover" ? "Cover image uploaded." : "Image added to the article content.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Image upload failed. Your draft has been preserved.");
    } finally {
      setUploading(null);
      change.target.value = "";
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.content.trim()) nextErrors.content = "Content is required.";
    if (form.coverImage && !isValidUrl(form.coverImage)) nextErrors.coverImage = "Enter a valid HTTP or HTTPS image URL.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload: BlogPayload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || undefined,
      summary: form.excerpt.trim() || undefined,
      content: form.content,
      category: form.category.trim() || undefined,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      author: form.author.trim() || undefined,
      status: form.status,
      coverImage: form.coverImage || undefined,
    };

    setPending(true);
    try {
      if (blog) await blogsApi.update(blog._id, payload);
      else await blogsApi.create(payload);
      toast.success(blog ? "Blog updated." : "Draft created.");
      onSaved();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The blog could not be saved.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open onClose={guardedClose} closeOnBackdrop={!pending} title={blog ? "Edit blog" : "Create blog draft"} description="Write in plain text or HTML. Publishing remains a separate confirmed action." footer={<><Button variant="secondary" onClick={guardedClose} disabled={pending}>Cancel</Button><Button type="submit" form="blog-form" loading={pending}>{blog ? "Save changes" : "Create draft"}</Button></>}>
    <form id="blog-form" onSubmit={submit} className="space-y-5">
      <Field label="Title" error={errors.title}><Input value={form.title} onChange={(event) => update("title", event.target.value)} disabled={pending} /></Field>
      <Field label="Excerpt or summary"><Textarea className="min-h-24" value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} disabled={pending} /></Field>
      <Field label="Article content" error={errors.content}><Textarea className="min-h-64 font-mono text-[13px] leading-6" value={form.content} onChange={(event) => update("content", event.target.value)} disabled={pending} /><p className="mt-1 text-xs font-normal text-[var(--color-muted)]">Plain text and backend-supported HTML are accepted.</p></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category"><Input list={listId} value={form.category} onChange={(event) => update("category", event.target.value)} disabled={pending} /><datalist id={listId}>{categories.map((category) => <option key={category._id} value={category.name} />)}</datalist></Field>
        <Field label="Tags"><Input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="faith, study, community" disabled={pending} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Author"><Input value={form.author} onChange={(event) => update("author", event.target.value)} placeholder="Optional" disabled={pending} /></Field>
        <Field label="Workflow status"><Input value={form.status === "published" ? "Published" : "Draft"} readOnly disabled /><p className="mt-1 text-xs font-normal text-[var(--color-muted)]">{form.status === "published" ? "This post is already published." : "Publish from the row action after saving."}</p></Field>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Cover image" error={errors.coverImage}><Input type="url" value={form.coverImage} onChange={(event) => update("coverImage", event.target.value)} placeholder="https://..." disabled={pending} /><Input className="mt-2" aria-label="Upload cover image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void upload(event, "cover")} disabled={pending || Boolean(uploading)} />{form.coverImage && <div className="relative mt-3 h-32 overflow-hidden rounded-xl bg-[var(--color-surface-muted)]"><Image src={form.coverImage} alt="Blog cover preview" fill unoptimized className="object-cover" /></div>}{uploading === "cover" && <Progress value={progress} />}</Field>
        <Field label="Content image"><Input aria-label="Upload content image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void upload(event, "content")} disabled={pending || Boolean(uploading)} /><p className="mt-2 text-xs font-normal text-[var(--color-muted)]">Uploads an image and inserts its HTML at the end of the content.</p>{uploading === "content" && <Progress value={progress} />}</Field>
      </div>
    </form>
  </Modal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>;
}

function Progress({ value }: { value: number }) {
  return <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-[var(--color-placeholder-fill)]"><div className="h-full bg-[var(--color-primary)]" style={{ width: String(value || 12) + "%" }} /></div><p className="mt-1 text-xs font-normal text-[var(--color-muted)]">{value ? "Uploading " + value + "%" : "Uploading..."}</p></div>;
}