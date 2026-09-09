import { apiRequest } from "@/lib/api/client";
import type { ApiResult, PaginationMeta } from "@/types/api";
import type { AdminAccount, AdminAccountPayload, UserRecord, UserStats } from "@/types/users";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayFrom<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value)) for (const key of keys) if (Array.isArray(value[key])) return value[key] as T[];
  return [];
}

function recordFrom<T>(value: unknown, keys: string[]): T {
  if (isRecord(value)) for (const key of keys) if (isRecord(value[key])) return value[key] as T;
  return value as T;
}

function numberValue(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function paginationFrom(value: unknown, fallbackPage: number, fallbackLimit: number): PaginationMeta | undefined {
  if (!isRecord(value)) return undefined;
  const total = numberValue(value.total);
  const page = numberValue(value.page) ?? fallbackPage;
  const limit = numberValue(value.limit) ?? fallbackLimit;
  const totalPages = numberValue(value.pages ?? value.totalPages);
  if (total === undefined) return undefined;
  return { page, limit, total, totalPages: totalPages ?? Math.max(1, Math.ceil(total / limit)) };
}

export type UserListResult = ApiResult<UserRecord[]> & { stats?: UserStats };

export const usersApi = {
  async list({ page, limit, search, verified, includeDeleted }: { page: number; limit: number; search: string; verified: "all" | "true" | "false"; includeDeleted: boolean }): Promise<UserListResult> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), includeDeleted: String(includeDeleted) });
    if (search) params.set("search", search);
    if (verified !== "all") params.set("verified", verified);
    const result = await apiRequest<unknown>("/admin/users?" + params);
    const source = isRecord(result.data) ? result.data : {};
    return {
      ...result,
      data: arrayFrom<UserRecord>(result.data, ["users", "results", "items"]),
      pagination: result.pagination ?? paginationFrom(source, page, limit),
      stats: isRecord(source.stats) ? source.stats as UserStats : undefined,
    };
  },
  async get(id: string) {
    const result = await apiRequest<unknown>("/admin/users/" + encodeURIComponent(id));
    return { ...result, data: recordFrom<UserRecord>(result.data, ["user"]) };
  },
  activate: (id: string) => apiRequest<UserRecord>("/admin/users/" + encodeURIComponent(id) + "/activate", { method: "PATCH" }),
  deactivate: (id: string) => apiRequest<UserRecord>("/admin/users/" + encodeURIComponent(id) + "/deactivate", { method: "PATCH" }),
  setStatus: (id: string, isActive: boolean) => apiRequest<UserRecord>("/admin/users/" + encodeURIComponent(id) + "/status", { method: "PATCH", data: { isActive } }),
  remove: (id: string) => apiRequest<UserRecord>("/admin/users/" + encodeURIComponent(id), { method: "DELETE" }),
  restore: (id: string) => apiRequest<UserRecord>("/admin/users/" + encodeURIComponent(id) + "/restore", { method: "PATCH" }),
  resetPassword: (id: string, newPassword: string) => apiRequest<void>("/admin/users/" + encodeURIComponent(id) + "/reset-password", { method: "PUT", data: { newPassword } }),
};

export type BulkDeleteResult = { succeeded: string[]; failed: { id: string; message: string }[] };

export async function deleteUsersBounded(ids: string[], concurrency = 3): Promise<BulkDeleteResult> {
  const succeeded: string[] = [];
  const failed: { id: string; message: string }[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try { await usersApi.remove(id); succeeded.push(id); }
      catch (reason) { failed.push({ id, message: reason instanceof Error ? reason.message : "Deletion failed." }); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, () => worker()));
  return { succeeded, failed };
}

export const adminAccountsApi = {
  async list() {
    const result = await apiRequest<unknown>("/admin/management");
    return { ...result, data: arrayFrom<AdminAccount>(result.data, ["admins", "users", "results"]) };
  },
  async create(payload: AdminAccountPayload) {
    const result = await apiRequest<unknown>("/admin/management", { method: "POST", data: payload });
    return { ...result, data: recordFrom<AdminAccount>(result.data, ["admin", "user"]) };
  },
  remove: (id: string) => apiRequest<void>("/admin/management/" + encodeURIComponent(id), { method: "DELETE" }),
};