import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { replace, toastError } = vi.hoisted(() => ({ replace: vi.fn(), toastError: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("react-toastify", () => ({ toast: { error: toastError, success: vi.fn() } }));
import Home from "@/app/page";

describe("login failure", () => {
  beforeEach(() => { replace.mockReset(); toastError.mockReset(); });
  it("shows an associated error and does not navigate", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Invalid credentials" }) })); render(<Home />); fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "admin@example.com" } }); fireEvent.change(screen.getByLabelText("Password"), { target: { value: "incorrect" } }); fireEvent.click(screen.getByRole("button", { name: "Sign in" })); expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Invalid credentials"); expect(toastError).toHaveBeenCalledWith("Invalid credentials"); expect(replace).not.toHaveBeenCalled(); });
});