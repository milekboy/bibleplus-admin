import { describe, expect, it, vi } from "vitest";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get } }));
import { downloadFile, saveDownload } from "@/lib/api/download";

describe("binary downloads", () => {
  it("preserves a safe backend filename and revokes the object URL", async () => { get.mockResolvedValue({ data: new Blob(["a,b\n1,2"], { type: "text/csv" }), headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="report.csv"' } }); const file = await downloadFile("/export", { format: "csv" }, "fallback.csv", /text\/csv/); expect(file.filename).toBe("report.csv"); const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test"); const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {}); vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {}); saveDownload(file); await new Promise((resolve) => setTimeout(resolve, 0)); expect(create).toHaveBeenCalledWith(file.blob); expect(revoke).toHaveBeenCalledWith("blob:test"); });
  it("surfaces a JSON body instead of treating it as a file", async () => { get.mockResolvedValue({ data: { type: "application/json", size: 20, text: async () => JSON.stringify({ message: "Export denied" }) }, headers: { "content-type": "application/json" } }); await expect(downloadFile("/export", {}, "fallback.csv", /text\/csv/)).rejects.toThrow("Export denied"); });
});