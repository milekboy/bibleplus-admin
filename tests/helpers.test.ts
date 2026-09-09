import { describe, expect, it } from "vitest";
import { canAccessRestrictedAdminArea, isRestrictedAdminRoute, normalizeAdminRole } from "@/lib/auth/roles";
import { positivePage, updateQueryString } from "@/lib/url-state";
import { isAllowedFileSize, isAllowedFileType, isStrongPassword, isValidEmail, isValidUrl } from "@/lib/validators";

describe("roles, validators, and query state", () => {
  it("normalizes roles and restricts privileged routes", () => { expect(normalizeAdminRole("super-admin")).toBe("superadmin"); expect(canAccessRestrictedAdminArea("admin")).toBe(false); expect(canAccessRestrictedAdminArea("super_admin")).toBe(true); expect(isRestrictedAdminRoute("/dashboard/exports")).toBe(true); expect(isRestrictedAdminRoute("/dashboard/security")).toBe(false); });
  it("validates form and upload boundaries", () => { expect(isValidEmail("admin@example.com")).toBe(true); expect(isStrongPassword("12345678")).toBe(true); expect(isValidUrl("javascript:alert(1)")).toBe(false); const file = new File(["x"], "x.png", { type: "image/png" }); expect(isAllowedFileType(file, ["image/png"])).toBe(true); expect(isAllowedFileSize(file, 1)).toBe(true); expect(isAllowedFileSize(file, 0)).toBe(false); });
  it("updates query state without losing unrelated filters", () => { expect(updateQueryString("page=3&action=CREATE", { page: null, search: "events" })).toBe("action=CREATE&search=events"); expect(positivePage("0")).toBe(1); expect(positivePage("4")).toBe(4); });
});