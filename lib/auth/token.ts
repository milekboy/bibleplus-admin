import { normalizeAdminRole } from "@/lib/auth/roles";
import type { SafeAdmin } from "@/types/auth";
export const ACCESS_TOKEN_COOKIE = "bibleplus_admin_session";
export const ADMIN_PROFILE_COOKIE = "bibleplus_admin_profile";
type JwtClaims = Record<string, unknown> & { exp?: number };
export function decodeJwtClaims(token: string): JwtClaims | null { try { const payload = token.split(".")[1]; if (!payload) return null; const normalized = payload.replace(/-/g, "+").replace(/_/g, "/"); const claims = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")); return claims && typeof claims === "object" ? claims : null; } catch { return null; } }
export function getTokenExpiry(token: string) { const exp = decodeJwtClaims(token)?.exp; return typeof exp === "number" && Number.isFinite(exp) ? exp : undefined; }
export function isTokenExpired(token: string, now = Date.now()) { const exp = getTokenExpiry(token); return exp !== undefined && exp * 1000 <= now; }
export function toSafeAdmin(value: unknown): SafeAdmin | null { if (!value || typeof value !== "object") return null; const item = value as Record<string, unknown>; const role = normalizeAdminRole(item.role); if (!role) return null; const read = (...keys: string[]) => keys.map((key) => item[key]).find((v): v is string => typeof v === "string" && Boolean(v)); return { id: read("id", "_id", "adminId", "sub"), username: read("username", "name"), email: read("email"), role }; }
export function encodeSafeAdmin(user: SafeAdmin) { return Buffer.from(JSON.stringify(user), "utf8").toString("base64url"); }
export function decodeSafeAdmin(value?: string): SafeAdmin | null { try { return value ? toSafeAdmin(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))) : null; } catch { return null; } }
export function sessionCookieOptions(expiresAt?: number) { return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", priority: "high" as const, ...(expiresAt ? { expires: new Date(expiresAt * 1000) } : {}) }; }
