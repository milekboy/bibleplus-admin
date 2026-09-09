import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "@/components/ui";

describe("destructive confirmation", () => {
  it("names the effect and runs only after explicit confirmation", () => { const confirm = vi.fn(); const close = vi.fn(); render(<ConfirmModal open onClose={close} onConfirm={confirm} title="Delete record?" description="This cannot be undone." confirmLabel="Delete record" />); expect(screen.getByRole("dialog")).toBeTruthy(); expect(confirm).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Delete record" })); expect(confirm).toHaveBeenCalledTimes(1); });
  it("supports Escape and locks destructive actions while pending", () => { const close = vi.fn(); render(<ConfirmModal open pending onClose={close} onConfirm={vi.fn()} title="Delete?" description="Permanent." confirmLabel="Delete" />); expect((screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(true); fireEvent.keyDown(document, { key: "Escape" }); expect(close).not.toHaveBeenCalled(); });
});