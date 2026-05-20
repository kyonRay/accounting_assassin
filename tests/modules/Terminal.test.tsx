import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { Terminal, type TerminalApi } from "@/modules/Sandbox/Terminal";

beforeAll(() => {
  // xterm uses ResizeObserver internally; polyfill for jsdom
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  // xterm's ScreenDprMonitor calls window.matchMedia; polyfill for jsdom
  if (!window.matchMedia) {
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
});

describe("Terminal", () => {
  it("renders without crashing and exposes api via onReady", () => {
    let api: TerminalApi | null = null;
    const { container } = render(
      <Terminal
        onInput={() => {}}
        onReady={(a) => {
          api = a;
        }}
      />
    );
    expect(container.querySelector(".xterm")).toBeTruthy();
    // onReady fires synchronously after mount
    expect(api).not.toBeNull();
    // api is narrowed by the expect above; use non-null assertion for property access
    expect(typeof api!.write).toBe("function");
    expect(typeof api!.writeln).toBe("function");
    expect(typeof api!.clear).toBe("function");
    expect(typeof api!.focus).toBe("function");
  });
});
