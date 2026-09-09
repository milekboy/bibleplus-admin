"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { Button, ConfirmModal, Input, Modal, Textarea } from "@/components/ui";
import { blogsApi } from "@/lib/api/blogs";
import type { BlogCategory } from "@/types/blogs";

type Props = {
  open: boolean;
  categories: BlogCategory[];
  onClose: () => void;
  onSaved: (category: BlogCategory) => void;
  onDeleted: (id: string) => void;
};

export default function BlogCategoriesModal({ open, categories, onClose, onSaved, onDeleted }: Props) {
  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  const reset = () => { setEditing(null); setName(""); setDescription(""); };
  const beginEdit = (category: BlogCategory) => { setEditing(category); setName(category.name); setDescription(category.description ?? ""); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      const result = editing
        ? await blogsApi.updateCategory(editing._id, { name: name.trim(), description: description.trim() || undefined })
        : await blogsApi.createCategory({ name: name.trim(), description: description.trim() || undefined });
      if (result.data?._id && result.data.name) onSaved(result.data);
      else if (editing) onSaved({ ...editing, name: name.trim(), description: description.trim() || undefined });
      toast.success(editing ? "Blog category updated." : "Blog category created.");
      reset();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The category could not be saved.");
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await blogsApi.deleteCategory(deleteTarget._id);
      onDeleted(deleteTarget._id);
      toast.success("Blog category deleted.");
      setDeleteTarget(null);
      if (editing?._id === deleteTarget._id) reset();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The category could not be deleted.");
    } finally {
      setPending(false);
    }
  };

  return <>
    <Modal open={open} onClose={pending ? () => undefined : onClose} closeOnBackdrop={!pending} title="Blog categories" description="The API does not provide a category-list route, so this shows categories returned by loaded blog records and categories created during this session.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.85fr)]">
        <div className="space-y-2">
          {categories.length ? categories.map((category) => <div key={category._id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3">
            <div className="min-w-0"><p className="truncate font-medium">{category.name}</p>{category.description && <p className="mt-1 text-sm text-[var(--color-muted)]">{category.description}</p>}</div>
            <div className="flex shrink-0 gap-2"><Button variant="secondary" className="min-h-9 px-3" onClick={() => beginEdit(category)} disabled={pending}>Edit</Button><Button variant="danger" className="min-h-9 px-3" onClick={() => setDeleteTarget(category)} disabled={pending}>Delete</Button></div>
          </div>) : <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">No category records with identifiers were returned by the loaded blogs. You can still create one.</p>}
        </div>
        <form onSubmit={save} className="space-y-3 rounded-xl bg-[var(--color-surface-muted)] p-4">
          <h3 className="font-semibold">{editing ? "Edit category" : "Create category"}</h3>
          <Input aria-label="Category name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required disabled={pending} />
          <Textarea aria-label="Category description" className="min-h-24" placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} disabled={pending} />
          <div className="flex flex-wrap gap-2"><Button type="submit" loading={pending}>{editing ? "Save category" : "Create category"}</Button>{editing && <Button type="button" variant="secondary" onClick={reset} disabled={pending}>Cancel edit</Button>}</div>
        </form>
      </div>
    </Modal>
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} pending={pending} title="Delete blog category?" description={"Delete \"" + (deleteTarget?.name ?? "this category") + "\"? Existing blogs may still reference it."} confirmLabel="Delete category" />
  </>;
}