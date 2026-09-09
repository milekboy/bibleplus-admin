import { beforeEach, describe, expect, it, vi } from "vitest";
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest }));
import { eventsApi } from "@/lib/api/events";
import { moderationApi } from "@/lib/api/moderation";

beforeEach(() => apiRequest.mockReset().mockResolvedValue({ data: {}, message: "ok" }));
describe("mutation API contracts", () => {
  it("uses the documented event CRUD methods", async () => { const payload = { title: "QA", description: "Safe", startDate: "2026-01-01", endDate: "2026-01-02", isOnline: false }; await eventsApi.create(payload); await eventsApi.update("event/1", payload); await eventsApi.remove("event/1"); expect(apiRequest.mock.calls).toEqual([["/admin/events", { method: "POST", data: payload }], ["/admin/events/event%2F1", { method: "PUT", data: payload }], ["/admin/events/event%2F1", { method: "DELETE" }]]); });
  it("uses only documented moderation action routes", async () => { await moderationApi.approve("prayers", "p/1"); await moderationApi.flag("comments", "c/1"); await moderationApi.reject("comments", "c/1"); expect(apiRequest.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([["/admin/moderation/prayers/p%2F1/approve", "PUT"], ["/admin/moderation/comments/c%2F1/flag", "PUT"], ["/admin/moderation/comments/c%2F1/reject", "DELETE"]]); });
});