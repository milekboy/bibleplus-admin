"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { Button, Checkbox, Input, Modal, Select, Textarea } from "@/components/ui";
import { eventsApi } from "@/lib/api/events";
import { isAllowedFileSize, isAllowedFileType, isValidUrl } from "@/lib/validators";
import type { EventCategory, EventPayload, EventRecord, EventSpeaker } from "@/types/events";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
type Props = { open: boolean; event?: EventRecord | null; categories: EventCategory[]; speakers: EventSpeaker[]; onClose: () => void; onSaved: () => void };
type FormState = { title: string; description: string; category: string; location: string; startDate: string; endDate: string; speakerIds: string[]; coverImage: string; gallery: string[]; isOnline: boolean; platform: string; liveUrl: string; thumbnail: string };

function localDate(value?: string) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.valueOf())) return ""; return new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function initial(event?: EventRecord | null): FormState { return { title: event?.title ?? event?.name ?? "", description: event?.description ?? "", category: typeof event?.category === "string" ? event.category : event?.category?.name ?? "", location: event?.location ?? event?.venue ?? "", startDate: localDate(event?.startDate ?? event?.date), endDate: localDate(event?.endDate), speakerIds: event?.speakers?.map((speaker) => typeof speaker === "string" ? speaker : speaker._id) ?? [], coverImage: event?.coverImage ?? event?.banner ?? "", gallery: event?.gallery?.flatMap((media) => typeof media === "string" ? [media] : media.url ? [media.url] : []) ?? [], isOnline: Boolean(event?.isOnline || event?.isLive || event?.liveStream?.url || event?.livestreamUrl), platform: event?.liveStream?.platform ?? "youtube", liveUrl: event?.liveStream?.url ?? event?.livestreamUrl ?? "", thumbnail: event?.liveStream?.thumbnail ?? "" }; }
function collectUrls(value: unknown): string[] { if (typeof value === "string" && /^https?:\/\//i.test(value)) return [value]; if (Array.isArray(value)) return value.flatMap(collectUrls); if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>).filter(([key]) => /url|file|image|banner/i.test(key)).flatMap(([, child]) => collectUrls(child)); return []; }
function validateImage(file: File) { if (!isAllowedFileType(file, ["image/jpeg", "image/png", "image/webp", "image/gif"])) return "Use a JPG, PNG, WebP, or GIF image."; if (!isAllowedFileSize(file, MAX_IMAGE_BYTES)) return "Images must be 10 MB or smaller."; }

export default function EventFormModal(props: Props) { if (!props.open) return null; return <EventForm key={props.event?._id ?? "new"} {...props} />; }

function EventForm({ event, categories, speakers, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => initial(event));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState<"banner" | "gallery" | null>(null);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(form.coverImage);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial(event)), [event, form]);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); };
  const guardedClose = () => { if (!pending && (!dirty || window.confirm("Discard your unsaved event changes?"))) onClose(); };

  const uploadBanner = async (change: ChangeEvent<HTMLInputElement>) => {
    const file = change.target.files?.[0]; if (!file) return; const validation = validateImage(file); if (validation) { setErrors((current) => ({ ...current, coverImage: validation })); return; }
    const objectUrl = URL.createObjectURL(file); setPreview(objectUrl); setUploading("banner"); setProgress(0);
    try { const body = new FormData(); body.append("banner", file); const result = await eventsApi.uploadBanner(body, ({ loaded, total }) => setProgress(total ? Math.round(loaded / total * 100) : 0)); const url = collectUrls(result.data)[0]; if (!url) throw new Error("The upload completed without returning an image URL."); update("coverImage", url); setPreview(url); toast.success("Event banner uploaded."); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Banner upload failed."); }
    finally { setUploading(null); change.target.value = ""; }
  };

  const uploadGallery = async (change: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(change.target.files ?? []); if (!files.length) return; const validation = files.map(validateImage).find(Boolean); if (validation) { setErrors((current) => ({ ...current, gallery: validation })); return; }
    setUploading("gallery"); setProgress(0);
    try { const body = new FormData(); files.forEach((file) => body.append("images", file)); const result = await eventsApi.uploadGallery(body, ({ loaded, total }) => setProgress(total ? Math.round(loaded / total * 100) : 0)); const urls = collectUrls(result.data); if (!urls.length) throw new Error("The upload completed without returning gallery URLs."); update("gallery", [...form.gallery, ...urls]); toast.success(`${urls.length} gallery image${urls.length === 1 ? "" : "s"} uploaded.`); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Gallery upload failed."); }
    finally { setUploading(null); change.target.value = ""; }
  };

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault(); const nextErrors: typeof errors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.description.trim()) nextErrors.description = "Description is required.";
    if (!form.startDate) nextErrors.startDate = "Start date and time are required.";
    if (!form.endDate) nextErrors.endDate = "End date and time are required.";
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) nextErrors.endDate = "End time must be after the start time.";
    if (form.liveUrl && !isValidUrl(form.liveUrl)) nextErrors.liveUrl = "Enter a valid HTTP or HTTPS URL.";
    if (form.thumbnail && !isValidUrl(form.thumbnail)) nextErrors.thumbnail = "Enter a valid HTTP or HTTPS URL.";
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    const payload: EventPayload = { title: form.title.trim(), description: form.description.trim(), category: form.category || undefined, location: form.location.trim() || undefined, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString(), speakers: form.speakerIds.length ? form.speakerIds : undefined, coverImage: form.coverImage || undefined, gallery: form.gallery.length ? form.gallery : undefined, isOnline: form.isOnline, liveStream: form.isOnline && form.liveUrl ? { platform: form.platform, url: form.liveUrl, thumbnail: form.thumbnail || undefined } : undefined };
    setPending(true);
    try { if (event) { await eventsApi.update(event._id, payload); if (form.isOnline && form.liveUrl) await eventsApi.updateLive(event._id, { platform: form.platform, url: form.liveUrl, thumbnail: form.thumbnail || undefined }); } else await eventsApi.create(payload); toast.success(event ? "Event updated." : "Event created."); onSaved(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "The event could not be saved."); }
    finally { setPending(false); }
  };

  return <Modal open onClose={guardedClose} closeOnBackdrop={!pending} title={event ? "Edit event" : "Create event"} description="Event details are saved directly to BiblePlus." footer={<><Button variant="secondary" onClick={guardedClose} disabled={pending}>Cancel</Button><Button type="submit" form="event-form" loading={pending}>{event ? "Save changes" : "Create event"}</Button></>}>
    <form id="event-form" onSubmit={submit} className="space-y-5">
      <Field label="Title" error={errors.title}><Input value={form.title} onChange={(e) => update("title", e.target.value)} disabled={pending} /></Field>
      <Field label="Description" error={errors.description}><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} disabled={pending} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><Select value={form.category} onChange={(e) => update("category", e.target.value)} disabled={pending}><option value="">No category</option>{categories.map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</Select></Field><Field label="Venue or location"><Input value={form.location} onChange={(e) => update("location", e.target.value)} disabled={pending} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts" error={errors.startDate}><Input type="datetime-local" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} disabled={pending} /></Field><Field label="Ends" error={errors.endDate}><Input type="datetime-local" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} disabled={pending} /></Field></div>
      <fieldset><legend className="text-sm font-medium">Speakers</legend><div className="mt-2 grid max-h-36 gap-2 overflow-y-auto rounded-xl border border-[var(--color-border)] p-3 sm:grid-cols-2">{speakers.length ? speakers.map((speaker) => <label key={speaker._id} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={form.speakerIds.includes(speaker._id)} onChange={(e) => update("speakerIds", e.target.checked ? [...form.speakerIds, speaker._id] : form.speakerIds.filter((id) => id !== speaker._id))} />{speaker.name}</label>) : <p className="text-sm text-[var(--color-muted)]">No speakers available.</p>}</div></fieldset>
      <div className="grid gap-4 lg:grid-cols-2"><Field label="Event banner" error={errors.coverImage}><Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadBanner} disabled={Boolean(uploading) || pending} />{preview && <div className="relative mt-3 h-32 overflow-hidden rounded-xl bg-[var(--color-surface-muted)]"><Image src={preview} alt="Event banner preview" fill unoptimized className="object-cover" /></div>}{uploading === "banner" && <Progress value={progress} />}</Field><Field label="Gallery images" error={errors.gallery}><Input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadGallery} disabled={Boolean(uploading) || pending} />{uploading === "gallery" && <Progress value={progress} />}{form.gallery.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{form.gallery.map((url, index) => <button key={`${url}-${index}`} type="button" onClick={() => update("gallery", form.gallery.filter((_, item) => item !== index))} className="cursor-pointer rounded-lg bg-[var(--color-surface-muted)] px-2 py-1 text-xs">Image {index + 1} ×</button>)}</div>}</Field></div>
      <fieldset className="rounded-xl border border-[var(--color-border)] p-4"><label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium"><Checkbox checked={form.isOnline} onChange={(e) => update("isOnline", e.target.checked)} />Enable livestream</label>{form.isOnline && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Platform"><Select value={form.platform} onChange={(e) => update("platform", e.target.value)}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="other">Other</option></Select></Field><Field label="Livestream URL" error={errors.liveUrl}><Input type="url" value={form.liveUrl} onChange={(e) => update("liveUrl", e.target.value)} /></Field><Field label="Thumbnail URL" error={errors.thumbnail}><Input type="url" value={form.thumbnail} onChange={(e) => update("thumbnail", e.target.value)} /></Field></div>}</fieldset>
    </form>
  </Modal>;
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>; }
function Progress({ value }: { value: number }) { return <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-[var(--color-placeholder-fill)]"><div className="h-full bg-[var(--color-primary)]" style={{ width: `${value || 12}%` }} /></div><p className="mt-1 text-xs text-[var(--color-muted)]">Uploading{value ? ` ${value}%` : "..."}</p></div>; }