"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { HiOutlineBookOpen } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { booksApi } from "@/lib/api/books";
import { isAllowedFileSize, isAllowedFileType } from "@/lib/validators";
import type { BookRecord } from "@/types/books";

const MAX_COVER_BYTES = 10 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

type Props = { open: boolean; book?: BookRecord | null; onClose: () => void; onSaved: () => void };
type FormState = { title: string; author: string; description: string; category: string; audience: string; totalChapters: string };

function coverUrl(book?: BookRecord | null) {
  return book?.coverImage ?? book?.cover ?? book?.image ?? book?.picture ?? book?.thumbnail ?? "";
}

function initial(book?: BookRecord | null): FormState {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    description: book?.description ?? "",
    category: book?.category ?? "",
    audience: book?.audience ?? "",
    totalChapters: book?.totalChapters !== undefined ? String(book.totalChapters) : book?.chapters !== undefined ? String(book.chapters) : "",
  };
}

function validateCover(file: File) {
  if (!isAllowedFileType(file, COVER_TYPES)) return "Use a JPG, PNG, WebP, or GIF image.";
  if (!isAllowedFileSize(file, MAX_COVER_BYTES)) return "Cover images must be 10 MB or smaller.";
}

export default function BookFormModal(props: Props) {
  if (!props.open) return null;
  return <BookForm key={props.book?._id ?? "new"} {...props} />;
}

function BookForm({ book, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => initial(book));
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState(() => coverUrl(book));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "cover", string>>>({});
  const [pending, setPending] = useState(false);
  const dirty = useMemo(() => Boolean(cover) || JSON.stringify(form) !== JSON.stringify(initial(book)), [book, cover, form]);

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

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

  const chooseCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateCover(file);
    if (validation) {
      setErrors((current) => ({ ...current, cover: validation }));
      event.target.value = "";
      return;
    }
    setCover(file);
    setPreview(URL.createObjectURL(file));
    setErrors((current) => ({ ...current, cover: undefined }));
  };

  const guardedClose = () => {
    if (!pending && (!dirty || window.confirm("Discard your unsaved book changes?"))) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.author.trim()) nextErrors.author = "Author is required.";
    const chapterCount = form.totalChapters.trim() ? Number(form.totalChapters) : undefined;
    if (chapterCount !== undefined && (!Number.isInteger(chapterCount) || chapterCount <= 0)) nextErrors.totalChapters = "Enter a positive whole number.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("author", form.author.trim());
    if (form.description.trim()) data.append("description", form.description.trim());
    if (form.category.trim()) data.append("category", form.category.trim());
    if (form.audience.trim()) data.append("audience", form.audience.trim());
    if (chapterCount !== undefined) data.append("totalChapters", String(chapterCount));
    if (cover) data.append("coverImage", cover);

    setPending(true);
    try {
      if (book) await booksApi.update(book._id, data);
      else await booksApi.create(data);
      toast.success(book ? "Book updated." : "Book created.");
      onSaved();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The book could not be saved.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open onClose={guardedClose} closeOnBackdrop={!pending} title={book ? "Edit book" : "Create book"} description="Book metadata and an optional cover are saved directly to BiblePlus." footer={<><Button variant="secondary" onClick={guardedClose} disabled={pending}>Cancel</Button><Button type="submit" form="book-form" loading={pending}>{book ? "Save changes" : "Create book"}</Button></>}>
    <form id="book-form" onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Title" error={errors.title}><Input value={form.title} onChange={(event) => update("title", event.target.value)} disabled={pending} /></Field><Field label="Author" error={errors.author}><Input value={form.author} onChange={(event) => update("author", event.target.value)} disabled={pending} /></Field></div>
      <Field label="Description"><Textarea className="min-h-36" value={form.description} onChange={(event) => update("description", event.target.value)} disabled={pending} /></Field>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Category"><Input value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="Optional" disabled={pending} /></Field><Field label="Audience"><Input value={form.audience} onChange={(event) => update("audience", event.target.value)} placeholder="e.g. adults" disabled={pending} /></Field><Field label="Total chapters" error={errors.totalChapters}><Input type="number" min="1" step="1" inputMode="numeric" value={form.totalChapters} onChange={(event) => update("totalChapters", event.target.value)} placeholder="Optional" disabled={pending} /></Field></div>
      <Field label={book ? "Replace cover image" : "Cover image"} error={errors.cover}><Input type="file" accept={COVER_TYPES.join(",")} onChange={chooseCover} disabled={pending} /><p className="mt-1 text-xs font-normal text-[var(--color-muted)]">JPG, PNG, WebP, or GIF; maximum 10 MB. Multipart key: coverImage.</p>{preview && <CoverPreview key={preview} src={preview} title={form.title} />}{cover && <p className="mt-2 text-xs font-normal text-[var(--color-muted)]">Selected: {cover.name}</p>}</Field>
    </form>
  </Modal>;
}

function CoverPreview({ src, title }: { src: string; title: string }) {
  const [broken, setBroken] = useState(false);
  return <div className="mt-3 grid min-h-48 place-items-center overflow-hidden rounded-xl bg-[var(--color-surface-muted)]">{broken ? <div className="text-center text-[var(--color-muted)]"><HiOutlineBookOpen className="mx-auto h-8 w-8" /><p className="mt-2 text-sm">Cover preview unavailable</p></div> : <div className="relative h-56 w-36"><Image src={src} alt={(title || "Book") + " cover preview"} fill unoptimized className="object-cover" onError={() => setBroken(true)} /></div>}</div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>;
}