import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, ADMIN_PROFILE_COOKIE, decodeJwtClaims, decodeSafeAdmin, getTokenExpiry, isTokenExpired, toSafeAdmin } from "@/lib/auth/token";
import type { AdminSession } from "@/types/auth";
export async function getAdminSession(): Promise<AdminSession | null> { const store = await cookies(); const token = store.get(ACCESS_TOKEN_COOKIE)?.value; if (!token || isTokenExpired(token)) return null; const user = decodeSafeAdmin(store.get(ADMIN_PROFILE_COOKIE)?.value) ?? toSafeAdmin(decodeJwtClaims(token)); return user ? { user, expiresAt: getTokenExpiry(token) } : null; }
