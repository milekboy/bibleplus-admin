"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineEllipsisVertical, HiOutlinePlus, HiOutlineShieldCheck, HiOutlineUserGroup } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, ConfirmModal, EmptyState, ErrorState, PageHeader, PageSection, SearchField, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { adminAccountsApi } from "@/lib/api/users";
import { formatDate } from "@/lib/formatters";
import type { SafeAdmin } from "@/types/auth";
import type { AdminAccount } from "@/types/users";
import CreateAdminModal from "./CreateAdminModal";

function idOf(admin: AdminAccount) { return admin._id || admin.id || ""; }
function isCurrent(admin: AdminAccount, current: SafeAdmin) {
  if (current.id && idOf(admin) === current.id) return true;
  if (current.email && admin.email && current.email.toLowerCase() === admin.email.toLowerCase()) return true;
  return Boolean(current.username && admin.username && current.username.toLowerCase() === admin.username.toLowerCase());
}

export default function AdminManagementPage({ currentAdmin }: { currentAdmin: SafeAdmin }) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAccountsApi.list();
      setAdmins(result.data);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Administrators could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? admins.filter((admin) => [admin.username, admin.email ?? "", admin.role].some((value) => value.toLowerCase().includes(term))) : admins;
  }, [admins, query]);

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    admins.forEach((admin) => counts.set(admin.role || "unspecified", (counts.get(admin.role || "unspecified") ?? 0) + 1));
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [admins]);

  const remove = async () => {
    if (!deleteTarget || isCurrent(deleteTarget, currentAdmin)) return;
    setDeleting(true);
    try {
      await adminAccountsApi.remove(idOf(deleteTarget));
      toast.success((deleteTarget.username || "Administrator") + " deleted.");
      setDeleteTarget(null);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The administrator could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Admin Management" description="Create and remove privileged BiblePlus accounts." action={<Button onClick={() => setCreateOpen(true)}><HiOutlinePlus className="h-5 w-5" />Create administrator</Button>} /></PageSection>
    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total administrators" value={admins.length} icon={<HiOutlineUserGroup className="h-5 w-5 text-[var(--color-primary)]" />} />{roleCounts.slice(0, 3).map(([role, count]) => <StatCard key={role} label={role + " accounts"} value={count} icon={<HiOutlineShieldCheck className="h-5 w-5 text-[var(--color-muted)]" />} />)}</PageSection>
    <PageSection delay={.08} className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><SearchField aria-label="Search administrators" placeholder="Search administrators..." value={query} onChange={(event) => setQuery(event.target.value)} className="w-full sm:max-w-md" /><p className="mt-2 text-xs text-[var(--color-muted)]">Search applies to the administrator records returned by the management endpoint.</p></div>
      {loading ? <AdminSkeleton /> : error ? <ErrorState description={error} onRetry={() => void load()} /> : visible.length ? <><div className="hidden overflow-visible rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Administrator accounts</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="px-4 py-3 font-medium">Administrator</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{visible.map((admin) => { const current = isCurrent(admin, currentAdmin); return <tr key={idOf(admin)}><td className="px-4 py-3"><p className="font-medium">{admin.username || "Unnamed administrator"}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{admin.email || "Email not supplied"}</p></td><td className="px-4 py-3"><StatusPill tone={admin.role === "superadmin" ? "success" : "neutral"}>{admin.role || "unspecified"}</StatusPill></td><td className="px-4 py-3">{admin.createdAt ? formatDate(admin.createdAt) : "Not supplied"}</td><td className="px-4 py-3 text-right">{current ? <StatusPill tone="success">Current session</StatusPill> : <AdminActions admin={admin} onDelete={() => setDeleteTarget(admin)} />}</td></tr>; })}</tbody></table></div></div><div className="grid gap-3 md:hidden">{visible.map((admin) => { const current = isCurrent(admin, currentAdmin); return <article key={idOf(admin)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{admin.username || "Unnamed administrator"}</h3><p className="mt-1 truncate text-sm text-[var(--color-muted)]">{admin.email || "Email not supplied"}</p></div>{current ? <StatusPill tone="success">Current</StatusPill> : <AdminActions admin={admin} onDelete={() => setDeleteTarget(admin)} />}</div><div className="mt-3 flex items-center justify-between gap-3"><StatusPill tone={admin.role === "superadmin" ? "success" : "neutral"}>{admin.role || "unspecified"}</StatusPill><span className="text-xs text-[var(--color-muted)]">{admin.createdAt ? formatDate(admin.createdAt) : "Date not supplied"}</span></div></article>; })}</div></> : <EmptyState title="No administrators found" description={query ? "Try a different search." : "The management endpoint returned no accounts."} />}
    </PageSection>
    <CreateAdminModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); void load(); }} />
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} pending={deleting} title="Delete administrator?" description={"Delete \"" + (deleteTarget?.username || "this administrator") + "\"? This cannot be undone."} confirmLabel="Delete administrator" />
  </div>;
}

function AdminActions({ admin, onDelete }: { admin: AdminAccount; onDelete: () => void }) {
  return <details className="relative inline-block text-left"><summary aria-label={"Actions for " + admin.username} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"><HiOutlineEllipsisVertical className="h-5 w-5" /></summary><div className="absolute right-0 z-30 mt-2 w-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"><button onClick={onDelete} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]">Delete</button></div></details>;
}

function AdminSkeleton() { return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>; }