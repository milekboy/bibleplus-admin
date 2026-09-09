"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineEllipsisVertical, HiOutlineUser, HiOutlineUsers } from "react-icons/hi2";
import { toast } from "react-toastify";
import { Button, Checkbox, ConfirmModal, EmptyState, ErrorState, Modal, PageHeader, PageSection, Pagination, SearchField, Select, Skeleton, StatCard, StatusPill } from "@/components/ui";
import { deleteUsersBounded, usersApi } from "@/lib/api/users";
import { formatDate } from "@/lib/formatters";
import type { UserRecord, UserStats } from "@/types/users";
import { ResetPasswordModal, UserStatusModal } from "./UserActionModals";

const PAGE_SIZE = 10;
type VerifiedFilter = "all" | "true" | "false";
type StatusFilter = "all" | "active" | "inactive";
type DeletedFilter = "active" | "all" | "deleted";

function verifiedFilter(value: string | null): VerifiedFilter { return value === "true" || value === "false" ? value : "all"; }
function statusFilter(value: string | null): StatusFilter { return value === "active" || value === "inactive" ? value : "all"; }
function deletedFilter(value: string | null): DeletedFilter { return value === "all" || value === "deleted" ? value : "active"; }
function userName(user: UserRecord) { return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || user.email || "Unknown user"; }
function avatarUrl(user: UserRecord) { return user.avatar || user.avatarUrl || user.profilePicture || ""; }
function accountStatus(user: UserRecord) { return user.isDeleted ? "Deleted" : user.isActive === false ? "Inactive" : "Active"; }

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const query = searchParams.get("search") ?? "";
  const verified = verifiedFilter(searchParams.get("verified"));
  const status = statusFilter(searchParams.get("status"));
  const deleted = deletedFilter(searchParams.get("deleted"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [draftQuery, setDraftQuery] = useState(query);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<UserStats>({});
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReport, setBulkReport] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const request = useRef(0);

  const setParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => value === null || value === "" ? params.delete(key) : params.set(key, String(value)));
    const next = params.toString();
    if (next === queryString) return;
    router.replace("/dashboard/users" + (next ? "?" + next : ""), { scroll: false });
  }, [queryString, router]);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await usersApi.list({ page, limit: PAGE_SIZE, search: query, verified, includeDeleted: deleted !== "active" });
      if (id !== request.current) return;
      setUsers(result.data);
      setStats(result.stats ?? {});
      setPagination(result.pagination ? { total: result.pagination.total, totalPages: result.pagination.totalPages } : null);
      setError("");
    } catch (reason) {
      if (id !== request.current) return;
      setError(reason instanceof Error ? reason.message : "Users could not be loaded.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [deleted, page, query, verified]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); request.current += 1; };
  }, [load]);

  const locallyFiltered = useMemo(() => users.filter((user) => {
    if (status === "active" && (user.isActive === false || user.isDeleted)) return false;
    if (status === "inactive" && user.isActive !== false) return false;
    if (deleted === "deleted" && !user.isDeleted) return false;
    return true;
  }), [deleted, status, users]);

  const visibleUsers = useMemo(() => pagination ? locallyFiltered : locallyFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [locallyFiltered, page, pagination]);
  const total = pagination?.total ?? locallyFiltered.length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(locallyFiltered.length / PAGE_SIZE));
  const selectableIds = visibleUsers.filter((user) => !user.isDeleted).map((user) => user._id);
  const allCurrentSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const changeSearch = useCallback((value: string) => {
    const next = value.trim();
    if (next === query) return;
    request.current += 1;
    setSelectedIds([]);
    setLoading(true);
    setParams({ search: next || null, page: null });
  }, [query, setParams]);

  const changeFilter = (key: "verified" | "status" | "deleted", value: string, defaultValue: string) => {
    request.current += 1;
    setSelectedIds([]);
    setLoading(true);
    setParams({ [key]: value === defaultValue ? null : value, page: null });
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const openDetail = async (user: UserRecord) => {
    setDetailLoading(true);
    try {
      const canonical = (await usersApi.get(user._id)).data;
      if (!canonical?._id) throw new Error("The backend did not return a valid user record.");
      setSelectedUser(canonical);
      setDetailOpen(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "User details could not be loaded.");
    } finally {
      setDetailLoading(false);
    }
  };

  const activate = async (user: UserRecord) => {
    setBusy(user._id);
    try {
      await usersApi.activate(user._id);
      toast.success(userName(user) + " activated.");
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The user could not be activated.");
    } finally {
      setBusy("");
    }
  };

  const deactivate = async () => {
    if (!deactivateTarget) return;
    setBusy("deactivate");
    try {
      await usersApi.deactivate(deactivateTarget._id);
      toast.success(userName(deactivateTarget) + " deactivated.");
      setDeactivateTarget(null);
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The user could not be deactivated.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy("delete");
    try {
      await usersApi.remove(deleteTarget._id);
      setSelectedIds((current) => current.filter((id) => id !== deleteTarget._id));
      toast.success(userName(deleteTarget) + " soft-deleted.");
      setDeleteTarget(null);
      if (selectedUser?._id === deleteTarget._id) setDetailOpen(false);
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The user could not be deleted.");
    } finally {
      setBusy("");
    }
  };

  const restore = async () => {
    if (!restoreTarget) return;
    setBusy("restore");
    try {
      await usersApi.restore(restoreTarget._id);
      toast.success(userName(restoreTarget) + " restored.");
      setRestoreTarget(null);
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "The user could not be restored.");
    } finally {
      setBusy("");
    }
  };

  const removeBulk = async () => {
    if (!selectedIds.length) return;
    setBusy("bulk");
    const names = new Map(users.map((user) => [user._id, userName(user)]));
    try {
      const result = await deleteUsersBounded(selectedIds, 3);
      setSelectedIds(result.failed.map((failure) => failure.id));
      const successText = String(result.succeeded.length) + " user" + (result.succeeded.length === 1 ? "" : "s") + " deleted.";
      const failureText = result.failed.length ? " Failed: " + result.failed.map((failure) => (names.get(failure.id) ?? failure.id) + " (" + failure.message + ")").join("; ") : "";
      setBulkReport(successText + failureText);
      if (result.succeeded.length) toast.success(successText);
      if (result.failed.length) toast.error(String(result.failed.length) + " user deletion" + (result.failed.length === 1 ? "" : "s") + " failed.");
      setBulkDeleteOpen(false);
      await refresh();
    } finally {
      setBusy("");
    }
  };

  const toggleCurrent = () => {
    setSelectedIds((current) => allCurrentSelected ? current.filter((id) => !selectableIds.includes(id)) : [...new Set([...current, ...selectableIds])]);
  };

  return <div className="space-y-6 text-[var(--color-text)]">
    <PageSection><PageHeader title="Users" description="Search accounts, review profiles, and manage access safely." /></PageSection>
    <PageSection delay={.04} className="grid gap-4 sm:grid-cols-3"><StatCard label="Backend total" value={stats.total ?? total} icon={<HiOutlineUsers className="h-5 w-5 text-[var(--color-primary)]" />} /><StatCard label="Verified users" value={stats.verified ?? "Not supplied"} /><StatCard label="Active users" value={stats.active ?? "Not supplied"} /></PageSection>

    <PageSection delay={.08} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="w-full lg:max-w-sm"><SearchField aria-label="Search users" placeholder="Search users..." value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} onDebouncedChange={changeSearch} /></div>
        <Filter label="Verified" value={verified} onChange={(value) => changeFilter("verified", value, "all")} options={[["all", "All"], ["true", "Verified"], ["false", "Unverified"]]} />
        <Filter label="Status" value={status} onChange={(value) => changeFilter("status", value, "all")} options={[["all", "All"], ["active", "Active"], ["inactive", "Inactive"]]} />
        <Filter label="Deleted" value={deleted} onChange={(value) => changeFilter("deleted", value, "active")} options={[["active", "Exclude deleted"], ["all", "Include deleted"], ["deleted", "Deleted only"]]} />
        <div className="ml-auto flex flex-wrap items-center gap-3"><span className="text-sm text-[var(--color-muted)]">{selectedIds.length} selected</span><Button variant="danger" disabled={!selectedIds.length} onClick={() => setBulkDeleteOpen(true)}>Delete selected</Button></div>
      </div>
      {(status !== "all" || deleted === "deleted") && <p className="text-xs text-[var(--color-muted)]">Status and “deleted only” filtering apply to the records returned on the current backend page. Search, verification, and include-deleted scope are server-side.</p>}
      {bulkReport && <div role="status" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{bulkReport}</div>}

      {loading ? <UserSkeleton /> : error ? <ErrorState description={error} onRetry={() => void refresh()} /> : visibleUsers.length ? <>
        <div className="hidden overflow-visible rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block"><div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><caption className="sr-only">BiblePlus users</caption><thead className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]"><tr><th className="w-12 px-4 py-3"><Checkbox aria-label="Select all users on this page" checked={allCurrentSelected} onChange={toggleCurrent} /></th><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Verified</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Joined</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{visibleUsers.map((user) => <tr key={user._id}><td className="px-4 py-3"><Checkbox aria-label={"Select " + userName(user)} disabled={user.isDeleted} checked={selectedIds.includes(user._id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...new Set([...current, user._id])] : current.filter((id) => id !== user._id))} /></td><td className="max-w-72 px-4 py-3"><div className="flex items-center gap-3"><UserAvatar key={avatarUrl(user)} user={user} /><div className="min-w-0"><p className="truncate font-medium">{userName(user)}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{user.email}</p></div></div></td><td className="px-4 py-3">{user.role || "user"}</td><td className="px-4 py-3"><StatusPill tone={user.verified ? "success" : "neutral"}>{user.verified ? "Verified" : "Unverified"}</StatusPill></td><td className="px-4 py-3"><UserStatus user={user} /></td><td className="whitespace-nowrap px-4 py-3">{user.createdAt ? formatDate(user.createdAt) : "Not supplied"}</td><td className="px-4 py-3 text-right"><UserActions user={user} disabled={detailLoading || busy === user._id} onView={() => void openDetail(user)} onActivate={() => void activate(user)} onDeactivate={() => setDeactivateTarget(user)} onStatus={() => setStatusTarget(user)} onReset={() => setResetTarget(user)} onDelete={() => setDeleteTarget(user)} onRestore={() => setRestoreTarget(user)} /></td></tr>)}</tbody></table></div></div>
        <div className="grid gap-3 md:hidden">{visibleUsers.map((user) => <article key={user._id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-start gap-3"><Checkbox aria-label={"Select " + userName(user)} disabled={user.isDeleted} checked={selectedIds.includes(user._id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...new Set([...current, user._id])] : current.filter((id) => id !== user._id))} /><UserAvatar key={avatarUrl(user)} user={user} large /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold">{userName(user)}</h3><p className="mt-1 truncate text-sm text-[var(--color-muted)]">{user.email}</p></div><UserActions user={user} disabled={detailLoading || busy === user._id} onView={() => void openDetail(user)} onActivate={() => void activate(user)} onDeactivate={() => setDeactivateTarget(user)} onStatus={() => setStatusTarget(user)} onReset={() => setResetTarget(user)} onDelete={() => setDeleteTarget(user)} onRestore={() => setRestoreTarget(user)} /></div><div className="mt-3 flex flex-wrap gap-2"><UserStatus user={user} /><StatusPill tone={user.verified ? "success" : "neutral"}>{user.verified ? "Verified" : "Unverified"}</StatusPill><StatusPill>{user.role || "user"}</StatusPill></div></div></div></article>)}</div>
        <Pagination page={page} totalPages={totalPages} onPageChange={(next) => { request.current += 1; setSelectedIds([]); setLoading(true); setParams({ page: next === 1 ? null : next }); }} />
      </> : <EmptyState title="No users found" description="Try changing the search or account filters." />}
    </PageSection>

    <UserDetail open={detailOpen} user={selectedUser} onClose={() => setDetailOpen(false)} />
    <UserStatusModal user={statusTarget} onClose={() => setStatusTarget(null)} onChanged={refresh} />
    <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />
    <ConfirmModal open={Boolean(deactivateTarget)} onClose={() => setDeactivateTarget(null)} onConfirm={deactivate} pending={busy === "deactivate"} title="Deactivate user?" description={"Deactivate " + (deactivateTarget ? userName(deactivateTarget) : "this user") + "? They may lose access until reactivated."} confirmLabel="Deactivate user" />
    <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} pending={busy === "delete"} title="Soft-delete user?" description={"Soft-delete " + (deleteTarget ? userName(deleteTarget) : "this user") + "? The account can be restored later."} confirmLabel="Delete user" />
    <ConfirmModal open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} onConfirm={restore} pending={busy === "restore"} danger={false} title="Restore user?" description={"Restore " + (restoreTarget ? userName(restoreTarget) : "this user") + " and reactivate their account?"} confirmLabel="Restore user" />
    <ConfirmModal open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={removeBulk} pending={busy === "bulk"} title="Delete selected users?" description={"Soft-delete " + selectedIds.length + " selected user" + (selectedIds.length === 1 ? "" : "s") + " with at most three requests running at once?"} confirmLabel="Delete selected" />
  </div>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="text-sm font-medium">{label}<Select className="mt-2 min-w-40" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</Select></label>;
}

function UserAvatar({ user, large = false }: { user: UserRecord; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const source = avatarUrl(user);
  const size = large ? "h-14 w-14" : "h-11 w-11";
  return source && !broken ? <div className={"relative shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-muted)] " + size}><Image src={source} alt="" fill unoptimized className="object-cover" onError={() => setBroken(true)} /></div> : <div className={"grid shrink-0 place-items-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-muted)] " + size}><HiOutlineUser className="h-5 w-5" /></div>;
}

function UserStatus({ user }: { user: UserRecord }) {
  const status = accountStatus(user);
  return <StatusPill tone={status === "Active" ? "success" : status === "Deleted" ? "danger" : "warning"}>{status}</StatusPill>;
}

function UserActions({ user, disabled, onView, onActivate, onDeactivate, onStatus, onReset, onDelete, onRestore }: { user: UserRecord; disabled: boolean; onView: () => void; onActivate: () => void; onDeactivate: () => void; onStatus: () => void; onReset: () => void; onDelete: () => void; onRestore: () => void }) {
  return <details className="relative inline-block text-left"><summary aria-label={"Actions for " + userName(user)} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"><HiOutlineEllipsisVertical className="h-5 w-5" /></summary><div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"><button disabled={disabled} onClick={onView} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">View details</button>{user.isDeleted ? <button disabled={disabled} onClick={onRestore} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed text-[var(--color-primary)]">Restore</button> : <>{user.isActive === false ? <button disabled={disabled} onClick={onActivate} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Activate</button> : <button disabled={disabled} onClick={onDeactivate} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Deactivate</button>}<button disabled={disabled} onClick={onStatus} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Set explicit status</button><button disabled={disabled} onClick={onReset} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed">Reset password</button><button disabled={disabled} onClick={onDelete} className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed text-[var(--color-danger)]">Delete</button></>}</div></details>;
}

function UserDetail({ open, user, onClose }: { open: boolean; user: UserRecord | null; onClose: () => void }) {
  return <Modal open={open} onClose={onClose} title={user ? userName(user) : "User details"} description="Canonical user profile from the backend." footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>{user && <div className="space-y-5"><div className="flex items-center gap-4"><UserAvatar key={avatarUrl(user)} user={user} large /><div className="min-w-0"><h3 className="truncate text-lg font-semibold">{userName(user)}</h3><p className="truncate text-sm text-[var(--color-muted)]">{user.email}</p></div></div><dl className="grid gap-3 sm:grid-cols-2"><Detail label="Username" value={user.username || "Not supplied"} /><Detail label="Role" value={user.role || "user"} /><Detail label="Status" value={accountStatus(user)} /><Detail label="Verified" value={user.verified ? "Yes" : "No"} /><Detail label="Location" value={user.location || "Not supplied"} /><Detail label="Joined" value={user.createdAt ? formatDate(user.createdAt, { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"} /><Detail label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt, { dateStyle: "medium", timeStyle: "short" }) : "Not supplied"} /><Detail label="Deactivated" value={user.deactivatedAt ? formatDate(user.deactivatedAt, { dateStyle: "medium", timeStyle: "short" }) : "No"} /><Detail label="Push notifications" value={user.notificationSettings?.push === undefined ? "Not supplied" : user.notificationSettings.push ? "Enabled" : "Disabled"} /><Detail label="Email notifications" value={user.notificationSettings?.email === undefined ? "Not supplied" : user.notificationSettings.email ? "Enabled" : "Disabled"} />{user.prayerCount !== undefined && <Detail label="Prayers" value={String(user.prayerCount)} />}{user.commentCount !== undefined && <Detail label="Comments" value={String(user.commentCount)} />}{user.eventsAttended !== undefined && <Detail label="Events attended" value={String(user.eventsAttended)} />}</dl>{user.bio && <section><h3 className="font-semibold">Bio</h3><p className="mt-2 whitespace-pre-wrap break-words text-[var(--color-muted)]">{user.bio}</p></section>}</div>}</Modal>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><dt className="text-xs text-[var(--color-muted)]">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>; }
function UserSkeleton() { return <div className="space-y-3"><Skeleton className="h-14 w-full" />{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>; }