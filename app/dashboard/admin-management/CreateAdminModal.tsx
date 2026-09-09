"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { Button, Input, Modal, Select } from "@/components/ui";
import { adminAccountsApi } from "@/lib/api/users";
import { isStrongPassword, isValidEmail } from "@/lib/validators";

const ALLOWED_ROLES = ["editor", "admin", "superadmin"] as const;
type Props = { open: boolean; onClose: () => void; onSaved: () => void };

export default function CreateAdminModal(props: Props) {
  if (!props.open) return null;
  return <CreateAdminForm {...props} />;
}

function CreateAdminForm({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "editor" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.username.trim()) nextErrors.username = "Username is required.";
    if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email address.";
    if (!isStrongPassword(form.password)) nextErrors.password = "Use at least 8 characters.";
    if (!ALLOWED_ROLES.includes(form.role as (typeof ALLOWED_ROLES)[number])) nextErrors.role = "Choose a permitted role.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    try {
      const result = await adminAccountsApi.create({ username: form.username.trim(), email: form.email.trim(), password: form.password, role: form.role });
      setForm({ username: "", email: "", password: "", role: "editor" });
      toast.success(result.message ?? "Administrator created.");
      onSaved();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The administrator could not be created.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open onClose={pending ? () => undefined : onClose} closeOnBackdrop={!pending} title="Create administrator" description="Create a backend administrator account with an explicitly permitted role." footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" form="create-admin-form" loading={pending}>Create administrator</Button></>}>
    <form id="create-admin-form" onSubmit={submit} className="space-y-4">
      <Field label="Username" error={errors.username}><Input value={form.username} onChange={(event) => { setForm((current) => ({ ...current, username: event.target.value })); setErrors((current) => ({ ...current, username: undefined })); }} disabled={pending} /></Field>
      <Field label="Email" error={errors.email}><Input type="email" autoComplete="off" value={form.email} onChange={(event) => { setForm((current) => ({ ...current, email: event.target.value })); setErrors((current) => ({ ...current, email: undefined })); }} disabled={pending} /></Field>
      <Field label="Temporary password" error={errors.password}><Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => { setForm((current) => ({ ...current, password: event.target.value })); setErrors((current) => ({ ...current, password: undefined })); }} disabled={pending} /></Field>
      <Field label="Role" error={errors.role}><Select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} disabled={pending}>{ALLOWED_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</Select></Field>
    </form>
  </Modal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-sm text-[var(--color-danger)]">{error}</span>}</label>;
}