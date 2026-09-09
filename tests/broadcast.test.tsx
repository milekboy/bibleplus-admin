import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { broadcast } = vi.hoisted(() => ({ broadcast: vi.fn() }));
vi.mock("@/lib/api/notifications", () => ({ notificationsApi: { broadcast } }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { BroadcastForm } from "@/app/dashboard/notifications/NotificationsPage";

describe("broadcast confirmation", () => {
  it("does not call the API before confirmation", async () => { broadcast.mockResolvedValue({ data: {}, message: "sent" }); const sent = vi.fn().mockResolvedValue(undefined); render(<BroadcastForm onSent={sent} />); fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Notice" } }); fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello everyone" } }); fireEvent.click(screen.getByRole("button", { name: /review broadcast/i })); expect(broadcast).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Send broadcast" })); await waitFor(() => expect(broadcast).toHaveBeenCalledWith({ title: "Notice", message: "Hello everyone", type: "broadcast" })); expect(sent).toHaveBeenCalledTimes(1); });
});