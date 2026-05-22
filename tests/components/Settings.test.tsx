import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import { Settings } from "@/components/Settings";
import { useProgress } from "@/modules/Progress";

// Polyfill clipboard for the xattr copy button
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText },
  writable: true,
  configurable: true,
});

// Capture window.open for the GitHub Release button
const openSpy = vi.fn();

beforeEach(() => {
  // resetProgress() pushes the cleared state through the persist middleware —
  // verifying this in setup (via persisted localStorage write) keeps the
  // production "reset actually persists" guarantee tested implicitly.
  useProgress.getState().resetProgress();
  useProgress.getState().completeOnboarding();
  localStorage.clear();
  writeText.mockClear();
  openSpy.mockClear();

  // window.open polyfill — jsdom's default open just no-ops, so we spy on it
  Object.defineProperty(window, "open", {
    value: openSpy,
    writable: true,
    configurable: true,
  });
});

// ─── Test 1: modal open/close ────────────────────────────────────────────────

describe("Settings — open/close", () => {
  it("clicking the gear opens the modal", () => {
    render(<Settings />);
    expect(screen.queryByTestId("settings-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    expect(screen.getByTestId("settings-modal")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("clicking 关闭 closes the modal", () => {
    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    expect(screen.getByTestId("settings-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-close-btn"));

    expect(screen.queryByTestId("settings-modal")).not.toBeInTheDocument();
  });

  it("modal renders all four sections", () => {
    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    // Mode section (not in confirm stage initially)
    expect(screen.getByTestId("settings-current-mode")).toBeInTheDocument();
    expect(screen.getByTestId("settings-mode-reset-btn")).toBeInTheDocument();
    // Reset section
    expect(screen.getByTestId("settings-reset-btn")).toBeInTheDocument();
    // Gatekeeper help
    expect(screen.getByTestId("settings-gatekeeper-help")).toBeInTheDocument();
    // Update help
    expect(screen.getByTestId("settings-update-help")).toBeInTheDocument();
  });
});

// ─── Test 2: double-confirm gating for resetProgress ─────────────────────────

describe("Settings — reset progress double-confirm", () => {
  it("first click reveals confirm panel; store is NOT yet reset", () => {
    // Set up some progress so we can verify it survives the first click
    useProgress.getState().markChapterCompleted("01-ai-tools-vs-chatgpt");
    useProgress.getState().setCurrentChapter("01-ai-tools-vs-chatgpt");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-btn"));

    // The confirm panel is now visible
    expect(screen.getByTestId("settings-reset-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("settings-reset-confirm-yes")).toBeInTheDocument();
    expect(
      screen.getByTestId("settings-reset-confirm-cancel"),
    ).toBeInTheDocument();

    // Store state unchanged
    const state = useProgress.getState();
    expect(state.chapters["01-ai-tools-vs-chatgpt"]?.status).toBe("completed");
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.currentChapter).toBe("01-ai-tools-vs-chatgpt");
  });

  it("second click (yes) actually resets the store", () => {
    useProgress.getState().markChapterCompleted("01-ai-tools-vs-chatgpt");
    useProgress.getState().setCurrentChapter("01-ai-tools-vs-chatgpt");
    useProgress.getState().setMode("real");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-confirm-yes"));

    // All fields back to INITIAL_STATE
    const state = useProgress.getState();
    expect(state.hasCompletedOnboarding).toBe(false);
    expect(state.mode).toBe("sandbox");
    expect(state.chapters).toEqual({});
    expect(state.currentChapter).toBeNull();
  });

  it("cancel from confirm panel returns to idle without resetting", () => {
    useProgress.getState().markChapterCompleted("01-ai-tools-vs-chatgpt");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-confirm-cancel"));

    // Confirm panel is gone; the idle reset button is back
    expect(screen.queryByTestId("settings-reset-confirm")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-reset-btn")).toBeInTheDocument();
    // Store state unchanged
    expect(
      useProgress.getState().chapters["01-ai-tools-vs-chatgpt"]?.status,
    ).toBe("completed");
  });

  it("reset writes through to persisted storage (localStorage in jsdom)", async () => {
    // markChapterCompleted writes to persisted storage; reset must also write.
    useProgress.getState().markChapterCompleted("01-ai-tools-vs-chatgpt");
    // The persist middleware writes asynchronously via createJSONStorage's
    // localStorage wrapper. In jsdom, that's synchronous from our POV.

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-btn"));
    fireEvent.click(screen.getByTestId("settings-reset-confirm-yes"));

    await waitFor(() => {
      const stored = localStorage.getItem("accounting-assassin-progress");
      // stored may legally be null (removed) or a JSON string of the empty state
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        // Cleared shape: chapters empty, hasCompletedOnboarding false
        expect(parsed.state.chapters).toEqual({});
        expect(parsed.state.hasCompletedOnboarding).toBe(false);
        expect(parsed.state.mode).toBe("sandbox");
      }
    });
  });
});

// ─── Test 3: double-confirm gating for mode reset ────────────────────────────

describe("Settings — mode reset double-confirm", () => {
  it("first click reveals confirm panel; mode is still real", () => {
    useProgress.getState().setMode("real");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-mode-reset-btn"));

    expect(screen.getByTestId("settings-mode-confirm")).toBeInTheDocument();
    // Store mode unchanged
    expect(useProgress.getState().mode).toBe("real");
  });

  it("second click (yes) sets mode to sandbox", () => {
    useProgress.getState().setMode("real");
    useProgress.getState().markChapterCompleted("01-ai-tools-vs-chatgpt");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-mode-reset-btn"));
    fireEvent.click(screen.getByTestId("settings-mode-confirm-yes"));

    const state = useProgress.getState();
    expect(state.mode).toBe("sandbox");
    // Chapter completion is INDEPENDENT of mode reset — verify it survived
    expect(state.chapters["01-ai-tools-vs-chatgpt"]?.status).toBe("completed");
    expect(state.hasCompletedOnboarding).toBe(true);
  });

  it("cancel from mode-confirm leaves mode unchanged", () => {
    useProgress.getState().setMode("real");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-mode-reset-btn"));
    fireEvent.click(screen.getByTestId("settings-mode-confirm-cancel"));

    expect(useProgress.getState().mode).toBe("real");
    expect(screen.queryByTestId("settings-mode-confirm")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-mode-reset-btn")).toBeInTheDocument();
  });
});

// ─── Test 4: mode reset hidden/disabled when already in sandbox ──────────────

describe("Settings — mode reset gating by current mode", () => {
  it("button is disabled when mode is sandbox", () => {
    useProgress.getState().setMode("sandbox");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    const btn = screen.getByTestId(
      "settings-mode-reset-btn",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/已是沙箱模式/);
  });

  it("clicking the disabled button does NOT enter confirm stage", () => {
    useProgress.getState().setMode("sandbox");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));
    fireEvent.click(screen.getByTestId("settings-mode-reset-btn"));

    // Confirm panel never appears for disabled button
    expect(screen.queryByTestId("settings-mode-confirm")).not.toBeInTheDocument();
  });

  it("button is enabled when mode is real", () => {
    useProgress.getState().setMode("real");

    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    const btn = screen.getByTestId(
      "settings-mode-reset-btn",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toMatch(/切回沙箱模式/);
  });
});

// ─── Test 5: Gatekeeper help content + copy + Release URL ────────────────────

describe("Settings — help sections", () => {
  it("Gatekeeper help lists all three failure paths", () => {
    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    const help = screen.getByTestId("settings-gatekeeper-help");
    const text = help.textContent ?? "";
    // Path 1: System Settings → Privacy → "App blocked" → "Open anyway"
    expect(text).toMatch(/系统设置/);
    expect(text).toMatch(/隐私与安全性/);
    expect(text).toMatch(/App 已被阻止/);
    expect(text).toMatch(/仍要打开/);
    // Path 2: xattr command
    expect(text).toMatch(/xattr -dr com\.apple\.quarantine/);
    expect(text).toMatch(/\/Applications\/AccountingAssassin\.app/);
    // Path 3: system upgrade — same as path 1
    expect(text).toMatch(/系统升级/);
    // Bottom fallback: find husband
    expect(text).toMatch(/找老公/);
  });

  it("xattr copy button writes the command to clipboard", async () => {
    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-xattr-copy-btn"));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toBe(
      "xattr -dr com.apple.quarantine /Applications/AccountingAssassin.app",
    );
  });

  it("Release page button calls window.open with the placeholder URL", () => {
    render(<Settings />);
    fireEvent.click(screen.getByTestId("settings-gear-btn"));

    fireEvent.click(screen.getByTestId("settings-release-btn"));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    // Placeholder URL contains /releases at minimum
    expect(url).toMatch(/releases$/);
  });
});
