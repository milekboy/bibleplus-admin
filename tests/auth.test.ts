import { describe, expect, it } from "vitest";
import { safeDashboardReturnTo } from "@/lib/auth/return-to";
import { decodeSafeAdmin, encodeSafeAdmin, isTokenExpired, sessionCookieOptions, toSafeAdmin } from "@/lib/auth/token";
import { POST as logout } from "@/app/api/auth/logout/route";

function token(exp: number) { const payload = Buffer.from(JSON.stringify({ exp }), "utf8").toString("base64url"); return `header.${payload}.signature`; }
describe("session and navigation safety", () => {
  it("accepts only local dashboard return paths", () => { expect(safeDashboardReturnTo("/dashboard/users?page=2")).toBe("/dashboard/users?page=2"); expect(safeDashboardReturnTo("//evil.example/dashboard")).toBe("/dashboard"); expect(safeDashboardReturnTo("https://evil.example")).toBe("/dashboard"); });
  it("detects expiry and stores only a safe admin profile", () => { expect(isTokenExpired(token(1), 2_000)).toBe(true); expect(isTokenExpired(token(3), 2_000)).toBe(false); const safe = toSafeAdmin({ _id: "a1", username: "root", role: "super-admin", accessToken: "secret" }); expect(safe).toEqual({ id: "a1", username: "root", email: undefined, role: "superadmin" }); expect(decodeSafeAdmin(encodeSafeAdmin(safe!))).toEqual(safe); expect(sessionCookieOptions().httpOnly).toBe(true); });
  it("always clears the local logout cookies", async () => { const response = await logout(new Request("http://localhost/api/auth/logout", { method: "POST" })); expect(response.status).toBe(200); const cookies = response.headers.get("set-cookie") || ""; expect(cookies).toContain("bibleplus_admin_session="); expect(cookies).toContain("Max-Age=0"); });
});