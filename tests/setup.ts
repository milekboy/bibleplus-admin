import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
vi.mock("motion/react", () => {
  const components = new Proxy({}, { get: (_target, tag: string) => { const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(({ children, initial, animate, exit, transition, ...props }, ref) => { void initial; void animate; void exit; void transition; return React.createElement(tag, { ...props, ref }, children as React.ReactNode); }); Component.displayName = `Motion(${tag})`; return Component; } });
  return { AnimatePresence: ({ children }: { children: React.ReactNode }) => children, motion: components, useReducedMotion: () => true };
});