import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { WelcomeFlow } from "@/components/WelcomeFlow";

describe("WelcomeFlow", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("walks splash → welcome → preparing → onComplete via auto-advance fallback", async () => {
    const onComplete = vi.fn();
    render(<WelcomeFlow onComplete={onComplete} durations={{ splash: 50, welcome: 50, preparing: 50 }} />);

    // splash: title visible, NO continue button
    expect(screen.getByText("记账杀手")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /继续/ })).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    // welcome stage
    expect(screen.getByText(/你好,我是记账杀手/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    // preparing stage
    expect(screen.getByText(/正在准备你的沙箱/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("clicking 「继续」 on welcome stage advances immediately to preparing", async () => {
    const onComplete = vi.fn();
    render(<WelcomeFlow onComplete={onComplete} durations={{ splash: 10, welcome: 999999, preparing: 999999 }} />);

    // advance past splash
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByText(/你好,我是记账杀手/)).toBeInTheDocument();

    // click 继续
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /继续/ }));
    });
    // should now be on preparing without waiting for 999999ms
    expect(screen.getByText(/正在准备你的沙箱/)).toBeInTheDocument();
  });

  it("clicking 「继续」 on preparing stage advances + calls onComplete", async () => {
    const onComplete = vi.fn();
    render(<WelcomeFlow onComplete={onComplete} durations={{ splash: 10, welcome: 10, preparing: 999999 }} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(10); }); // splash → welcome
    await act(async () => { await vi.advanceTimersByTimeAsync(10); }); // welcome → preparing
    expect(screen.getByText(/正在准备你的沙箱/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /继续/ }));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does NOT mention real-env terms in any stage", async () => {
    const onComplete = vi.fn();
    render(<WelcomeFlow onComplete={onComplete} durations={{ splash: 10, welcome: 999999, preparing: 999999 }} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    // capture welcome text
    const root = screen.getByTestId("welcome-flow");
    expect(root.textContent ?? "").not.toMatch(/accounting-learner|终端|Homebrew|brew/i);

    // advance to preparing and recheck
    fireEvent.click(screen.getByRole("button", { name: /继续/ }));
    expect(root.textContent ?? "").not.toMatch(/accounting-learner|终端|Homebrew|brew/i);
  });
});
