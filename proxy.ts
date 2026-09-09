import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, ADMIN_PROFILE_COOKIE, isTokenExpired } from "@/lib/auth/token";
import { safeDashboardReturnTo } from "@/lib/auth/return-to";
export function proxy(request: NextRequest) { const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value, authenticated = Boolean(token && !isTokenExpired(token)), dashboard = request.nextUrl.pathname.startsWith("/dashboard"); if (dashboard && !authenticated) { const url = new URL("/", request.url); url.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`); const response = NextResponse.redirect(url); if (token) { response.cookies.delete(ACCESS_TOKEN_COOKIE); response.cookies.delete(ADMIN_PROFILE_COOKIE); } return response; } if (request.nextUrl.pathname === "/" && authenticated) { const returnTo = request.nextUrl.searchParams.get("returnTo"); const destination = safeDashboardReturnTo(returnTo); return NextResponse.redirect(new URL(destination, request.url)); } return NextResponse.next(); }
export const config = { matcher: ["/", "/dashboard/:path*"] };
