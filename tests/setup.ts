import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// ─── jsdom polyfills required by xterm (Terminal component) ───────────────
// Guard with typeof checks so these don't throw in non-browser Vitest workers
// (e.g., pyodide-runner and sqlite-runner run without a DOM).

// xterm uses ResizeObserver internally
if (typeof global !== "undefined" && !global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// xterm's ScreenDprMonitor calls window.matchMedia
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (_query: string) => ({
      matches: false,
      media: _query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
