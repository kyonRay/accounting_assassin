import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary, STUCK_EVENT } from "@/components/ErrorBoundary";
import { useCrashStore } from "@/modules/Progress";

function Bomb(): never {
  throw new Error("test render explosion");
}

beforeEach(() => {
  useCrashStore.getState().clearCrash();
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>hello</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("catches render errors and shows Chinese fallback", () => {
    // suppress expected error logs
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("App 出了点问题")).toBeInTheDocument();
    expect(screen.getByText(/test render explosion/)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("reset button clears the error and re-renders children", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Maybe() {
      if (shouldThrow) throw new Error("first render fails");
      return <p>recovered</p>;
    }
    render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("App 出了点问题")).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByText("重试"));
    expect(screen.getByText("recovered")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("componentDidCatch records the crash into useCrashStore", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(useCrashStore.getState().lastCrash).toBeNull();

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    const got = useCrashStore.getState().lastCrash;
    expect(got).not.toBeNull();
    expect(got!.message).toBe("test render explosion");
    expect(got!.name).toBe("Error");
    expect(typeof got!.timestampUtc).toBe("string");
    consoleError.mockRestore();
  });

  it("crash store stack is sanitized — no /Users/<name>/ paths", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    function BombWithFakePath(): never {
      const err = new Error("explosion with path");
      err.stack = `Error: explosion with path
    at BombWithFakePath (/Users/alice/workspace/app/src/Bomb.tsx:42:10)
    at render (/Users/alice/workspace/app/src/main.tsx:1:1)`;
      throw err;
    }

    render(
      <ErrorBoundary>
        <BombWithFakePath />
      </ErrorBoundary>,
    );

    const got = useCrashStore.getState().lastCrash;
    expect(got).not.toBeNull();
    expect(got!.stack).not.toMatch(/\/Users\/alice\//);
    // The replaced form should still contain the path tail.
    expect(got!.stack).toContain("~/workspace/app/src/");
    consoleError.mockRestore();
  });

  it("renders the 求助 / 卡住了 button alongside 重试", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("error-boundary-stuck-btn")).toBeInTheDocument();
    expect(screen.getByText("求助 / 卡住了")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("clicking 求助 / 卡住了 dispatches the aa:open-stuck CustomEvent", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const listener = vi.fn();
    window.addEventListener(STUCK_EVENT, listener);

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByTestId("error-boundary-stuck-btn"));
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(STUCK_EVENT, listener);
    consoleError.mockRestore();
  });
});
