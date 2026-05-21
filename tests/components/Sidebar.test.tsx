import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { useProgress } from "@/modules/Progress";
import { computeChapterStates } from "@/curriculum";

// Reset progress store to a clean post-onboarding state before each test.
// useProgress is a Zustand store that exposes .setState() directly.
beforeEach(() => {
  useProgress.setState({
    hasCompletedOnboarding: true,
    mode: "sandbox",
    chapters: {},
    currentChapter: null,
  });
  localStorage.clear();
});

// ─── Sidebar component tests ───────────────────────────────────────────────

describe("Sidebar", () => {
  it("renders 5 part headers", () => {
    render(<Sidebar />);
    expect(screen.getByText("Part I · 沙箱里玩 AI")).toBeInTheDocument();
    expect(screen.getByText("Part II · 真实环境的第一步")).toBeInTheDocument();
    expect(screen.getByText("Part III · 把 Claude Code 用熟")).toBeInTheDocument();
    expect(screen.getByText("Part IV · Codex 与 Cursor")).toBeInTheDocument();
    expect(screen.getByText("Part V · 毕业项目")).toBeInTheDocument();
  });

  it("renders all 15 chapter rows", () => {
    render(<Sidebar />);
    // Each chapter row has a number prefix "01", "02", ... "15"
    for (let i = 1; i <= 15; i++) {
      const padded = String(i).padStart(2, "0");
      expect(screen.getByText(padded)).toBeInTheDocument();
    }
  });

  it("locked chapters have disabled buttons", () => {
    // No chapters completed → Ch 2+ are all locked (only Ch 1 is available)
    render(<Sidebar />);
    const buttons = screen.getAllByRole("button");
    // Button 0 is Ch 1 (available) — should NOT be disabled
    expect(buttons[0]).not.toBeDisabled();
    // Buttons 1..14 are Ch 2-15 (locked) — all should be disabled
    for (let i = 1; i < buttons.length; i++) {
      expect(buttons[i]).toBeDisabled();
    }
  });

  it("clicking an unlocked chapter calls setCurrentChapter", () => {
    render(<Sidebar />);
    const buttons = screen.getAllByRole("button");
    // Ch 1 is available (not locked)
    fireEvent.click(buttons[0]);
    expect(useProgress.getState().currentChapter).toBe("01-ai-tools-vs-chatgpt");
  });

  it("completed chapters show ✓ icon", () => {
    useProgress.setState({
      hasCompletedOnboarding: true,
      mode: "sandbox",
      chapters: { "01-ai-tools-vs-chatgpt": { status: "completed", completedAt: "2026-01-01T00:00:00Z" } },
      currentChapter: null,
    });
    render(<Sidebar />);
    // Find the ✓ icons (aria-hidden spans)
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBe(1);
  });

  it("current chapter has aria-current='page'", () => {
    useProgress.setState({
      hasCompletedOnboarding: true,
      mode: "sandbox",
      chapters: { "01-ai-tools-vs-chatgpt": { status: "completed" } },
      currentChapter: "02-show-files-to-ai",
    });
    render(<Sidebar />);
    const currentBtn = screen.getByRole("button", { current: "page" });
    expect(currentBtn).toBeInTheDocument();
    // Ch 2 should be the current one
    expect(currentBtn.textContent).toContain("给 AI 看真实文件");
  });

  it("quiz marker 🎯 appears for exactly 6 chapters (Ch 1/4/6/10/13/15)", () => {
    render(<Sidebar />);
    const quizMarkers = screen.getAllByRole("button").flatMap((btn) =>
      Array.from(btn.querySelectorAll("[aria-label='本章包含小测验']")),
    );
    expect(quizMarkers.length).toBe(6);
  });
});

// ─── computeChapterStates unit tests ──────────────────────────────────────

describe("computeChapterStates", () => {
  it("linear unlock: only Ch 1 available initially; Ch 2 locked", () => {
    const states = computeChapterStates({}, null);
    expect(states[0].display).toBe("available"); // Ch 1 — always unlocked
    expect(states[1].display).toBe("locked");    // Ch 2 — locked
    expect(states[14].display).toBe("locked");   // Ch 15 — locked
  });

  it("after Ch 1 completed, Ch 2 becomes available", () => {
    const states = computeChapterStates(
      { "01-ai-tools-vs-chatgpt": { status: "completed" } },
      null,
    );
    expect(states[0].display).toBe("completed"); // Ch 1 — completed
    expect(states[1].display).toBe("available"); // Ch 2 — now available
    expect(states[2].display).toBe("locked");    // Ch 3 — still locked
  });

  it("currentSlug shows as 'current' when unlocked", () => {
    const states = computeChapterStates(
      { "01-ai-tools-vs-chatgpt": { status: "completed" } },
      "02-show-files-to-ai",
    );
    expect(states[1].display).toBe("current"); // Ch 2 is current
  });

  it("defensive: currentSlug pointing to locked chapter stays locked", () => {
    // Ch 2 is locked (Ch 1 not completed), so even if currentSlug === Ch 2 slug,
    // it must not be promoted to "current".
    const states = computeChapterStates({}, "02-show-files-to-ai");
    expect(states[1].display).toBe("locked");
  });

  it("completed chapter is not overridden by currentSlug", () => {
    const states = computeChapterStates(
      { "01-ai-tools-vs-chatgpt": { status: "completed" } },
      "01-ai-tools-vs-chatgpt", // explicitly set current to a completed chapter
    );
    expect(states[0].display).toBe("completed"); // completed wins over currentSlug
  });
});

// ─── App integration: sidebar hidden until Ch 1 complete ──────────────────

describe("App progressive disclosure", () => {
  it("sidebar is not rendered before Ch 1 is completed", async () => {
    // Dynamically import App to avoid module caching issues
    const { default: App } = await import("@/App");
    render(<App />);
    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  it("sidebar appears after Ch 1 is completed", async () => {
    useProgress.setState({
      hasCompletedOnboarding: true,
      mode: "sandbox",
      chapters: { "01-ai-tools-vs-chatgpt": { status: "completed", completedAt: "2026-01-01T00:00:00Z" } },
      currentChapter: null,
    });
    const { default: App } = await import("@/App");
    render(<App />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });
});
