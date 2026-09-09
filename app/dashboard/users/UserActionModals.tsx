"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { Button, Input, Modal, Select } from "@/components/ui";
import { usersApi } from "@/lib/api/users";
import { isStrongPassword } from "@/lib/validators";
import type { UserRecord } from "@/types/users";

function nameOf(user: UserRecord) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || user.email;
}

export function ResetPasswordModal({ user, onClose }: { user: UserRecord | null; onClose: () => void }) {
  if (!user) return null;
  return <ResetPasswordForm key={user._id} user={user} onClose={onClose} />;
}

function ResetPasswordForm({ user, onClose }: { user: UserRecord; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isStrongPassword(password)) { setError("Use at least 8 characters."); return; }
    if (password !== confirmation) { setError("Password confirmation does not match."); return; }
    setPending(true);
    try {
      await usersApi.resetPassword(user._id, password);
      setPassword("");
      setConfirmation("");
      toast.success("Password reset for " + nameOf(user) + ".");
      onClose();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The password could not be reset.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open onClose={pending ? () => undefined : onClose} closeOnBackdrop={!pending} title="Reset user password?" description={"Set a new password for " + nameOf(user) + ". The existing password is never retrieved or displayed."} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" form="reset-user-password" loading={pending}>Reset password</Button></>}>
    <form id="reset-user-password" onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">New password<Input className="mt-2" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} disabled={pending} /></label>
      <label className="block text-sm font-medium">Confirm new password<Input className="mt-2" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} disabled={pending} /></label>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
    </form>
  </Modal>;
}

export function UserStatusModal({ user, onClose, onChanged }: { user: UserRecord | null; onClose: () => void; onChanged: () => Promise<void> }) {
  if (!user) return null;
  return <StatusForm key={user._id} user={user} onClose={onClose} onChanged={onChanged} />;
}

function StatusForm({ user, onClose, onChanged }: { user: UserRecord; onClose: () => void; onChanged: () => Promise<void> }) {
  const [value, setValue] = useState(user.isActive === false ? "inactive" : "active");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await usersApi.setStatus(user._id, value === "active");
      toast.success("Status updated for " + nameOf(user) + ".");
      await onChanged();
      onClose();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The user status could not be updated.");
    } finally {
      setPending(false);
    }
  };

  return <Modal open onClose={pending ? () => undefined : onClose} closeOnBackdrop={!pending} title="Confirm status change" description={(value === "inactive" ? "Deactivating " : "Activating ") + nameOf(user) + " changes their ability to use the service."} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" form="user-status-form" loading={pending} variant={value === "inactive" ? "danger" : "primary"}>Confirm status change</Button></>}>
    <form id="user-status-form" onSubmit={submit}>
      <label className="block text-sm font-medium">Account status<Select className="mt-2" value={value} onChange={(event) => setValue(event.target.value)} disabled={pending}><option value="active">Active</option><option value="inactive">Inactive</option></Select></label>
    </form>
  </Modal>;
}