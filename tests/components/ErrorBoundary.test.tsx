import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Bomb(): never {
  throw new Error("test render explosion");
}

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
});
