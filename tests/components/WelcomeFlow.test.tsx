import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WelcomeFlow } from "@/components/WelcomeFlow";

describe("WelcomeFlow", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("walks through splash → welcome → preparing → calls onComplete", async () => {
    const onComplete = vi.fn();
    render(
      <WelcomeFlow
        onComplete={onComplete}
        durations={{ welcome: 100, preparing: 100, done: 100 }}
      />,
    );

    // Splash state visible initially
    expect(screen.getByText(/记账杀手/)).toBeInTheDocument();

    // After welcome duration → welcome stage
    await vi.advanceTimersByTimeAsync(100);
    expect(screen.getByText(/你好,我是记账杀手/)).toBeInTheDocument();

    // After preparing duration → preparing stage
    await vi.advanceTimersByTimeAsync(100);
    expect(screen.getByText(/正在准备你的沙箱/)).toBeInTheDocument();

    // Final beat → onComplete called
    await vi.advanceTimersByTimeAsync(100);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does NOT mention real-env or installation in copy", () => {
    render(<WelcomeFlow onComplete={vi.fn()} />);
    const root = screen.getByTestId("welcome-flow");
    expect(root.textContent ?? "").not.toMatch(
      /accounting-learner|终端|Homebrew|brew/i,
    );
  });
});
