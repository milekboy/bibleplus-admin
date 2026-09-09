import { describe, expect, it } from "vitest";
import { normalizeApiError, normalizeApiResponse } from "@/lib/api/normalize";

describe("API normalization", () => {
  it("retains data, metadata, and nested pagination", () => { const result = normalizeApiResponse<{ rows: unknown[] }>({ success: true, data: { rows: [], meta: { page: "2", limit: 10, total: 31 } }, dataset: "users" }); expect(result.data.rows).toEqual([]); expect(result.pagination).toEqual({ page: 2, limit: 10, total: 31, totalPages: 4 }); expect(result.metadata?.dataset).toBe("users"); });
  it("normalizes validation and session failures", () => { expect(normalizeApiError({ data: { message: "Invalid", errors: { email: ["Required"] } } }, 422)).toMatchObject({ message: "Invalid", status: 422, validationErrors: [{ field: "email", message: "Required" }] }); expect(normalizeApiError(null, 401).message).toMatch(/session has expired/i); });
});