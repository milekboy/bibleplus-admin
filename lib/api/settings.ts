import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { CreateSettingPayload, PasswordChangePayload, SystemSetting } from "@/types/settings";

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function toSetting(value: Record<string, unknown>): SystemSetting | null { const key = value.key; if (typeof key !== "string" || !key) return null; return value as SystemSetting; }
function settingArray(value: unknown) { const source = Array.isArray(value) ? value : record(value) ? [value.settings, value.configs, value.items, value.results].find(Array.isArray) ?? [] : []; return (source as unknown[]).filter(record).map(toSetting).filter((item): item is SystemSetting => Boolean(item)); }
function setting(value: unknown): SystemSetting { if (record(value)) { for (const key of ["setting", "config"]) if (record(value[key])) return value[key] as SystemSetting; } return value as SystemSetting; }

export const settingsApi = {
  async list() { const result = await apiRequest<unknown>("/admin/system-config"); return { ...result, data: settingArray(result.data) } satisfies ApiResult<SystemSetting[]>; },
  async get(key: string) { const result = await apiRequest<unknown>(`/admin/system-config/${encodeURIComponent(key)}`); return { ...result, data: setting(result.data) } satisfies ApiResult<SystemSetting>; },
  async create(payload: CreateSettingPayload) { const result = await apiRequest<unknown>("/admin/system-config", { method: "POST", data: payload }); return { ...result, data: setting(result.data) } satisfies ApiResult<SystemSetting>; },
  async update(key: string, value: SystemSetting["value"]) { const result = await apiRequest<unknown>(`/admin/system-config/${encodeURIComponent(key)}`, { method: "PUT", data: { value } }); return { ...result, data: setting(result.data) } satisfies ApiResult<SystemSetting>; },
};

export const passwordSecurityApi = {
  requestOtp: () => apiRequest<unknown>("/admin/settings/password/request-otp", { method: "POST" }),
  change: (payload: PasswordChangePayload) => apiRequest<unknown>("/admin/settings/password", { method: "PUT", data: payload }),
};