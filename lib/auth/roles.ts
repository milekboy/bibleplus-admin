import type { AdminRole } from "@/types/auth";
const ROLE_ALIASES: Record<string, AdminRole> = { admin: "admin", administrator: "admin", superadmin: "superadmin", "super-admin": "superadmin", super_admin: "superadmin" };
export function normalizeAdminRole(role: unknown): AdminRole | null { return typeof role === "string" ? ROLE_ALIASES[role.trim().toLowerCase()] ?? null : null; }
export function isSuperAdmin(role: unknown) { return normalizeAdminRole(role) === "superadmin"; }
export function canAccessRestrictedAdminArea(role: unknown) { return isSuperAdmin(role); }
export const RESTRICTED_ADMIN_ROUTES = ["/dashboard/admin-management", "/dashboard/admins", "/dashboard/audit-logs", "/dashboard/exports", "/dashboard/system-configuration", "/dashboard/system-config"] as const;
export function isRestrictedAdminRoute(pathname: string) { return RESTRICTED_ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)); }
