import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { ChapterCompleteButton } from "@/components/ChapterCompleteButton";
import { ChapterContext } from "@/modules/LessonViewer/ChapterContext";
import { ChapterRunnerContext } from "@/modules/ChapterRunner/ChapterRunnerContext";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { useProgress } from "@/modules/Progress";
import type { ChapterRuntime } from "@/modules/ChapterRunner";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// Mock import.meta.glob so it returns a controlled set of checker loaders.
// The glob key must match what ChapterCompleteButton uses:
//   /content/chapters/${slug}/checker.ts
vi.mock("@/components/ChapterCompleteButton", async (importOriginal) => {
  // We need to intercept the module-level glob. The simplest approach is to
  // re-export the real component but replace the glob with a vi.fn()-controlled
  // module map. We do this by mocking the whole module and delegating to the
  // real implementation, but injecting our controlled glob via the test's
  // `setCheckerLoader` helper below.
  //
  // However, because ChapterCompleteButton uses a module-level const
  // `checkerLoaders`, we cannot patch it after import. Instead, we mock the
  // entire module to re-export a version that accepts a testable hook.
  //
  // Actually — the cleanest way is: DON'T mock the module at all, and instead
  // mock just `import.meta.glob` via Vitest's importMeta support. But Vitest
  // does not yet support patching import.meta.glob per-test.
  //
  // Therefore we restructure the test to import the REAL component (not the
  // mock path) and pass a fake checker through the ChapterRunnerContext's fs.
  // The checker reads from the VirtualFs, so we control pass/fail by
  // pre-writing or not writing the marker files. The glob itself will resolve
  // the REAL content/chapters checker in the test environment.
  return importOriginal();
});

// Reset progress store before each test
beforeEach(() => {
  useProgress.setState({
    hasCompletedOnboarding: true,
    mode: "sandbox",
    chapters: {},
    currentChapter: null,
  });
});

/**
 * Build a test wrapper that provides both ChapterContext and
 * ChapterRunnerContext with the given slug and VirtualFs.
 */
function makeWrapper(slug: string, fs: VirtualFs, overrideRuntime?: Partial<ChapterRuntime>) {
  const bumpAttempt = vi.fn();
  const markStep = vi.fn(async (id: string) => {
    await fs.write(`.progress/${id}`, "done");
  });
  const runtime: ChapterRuntime = {
    fs,
    attempt: 1,
    markStep,
    bumpAttempt,
    ...overrideRuntime,
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ChapterContext.Provider value={{ slug }}>
        <ChapterRunnerContext.Provider value={runtime}>
          {children}
        </ChapterRunnerContext.Provider>
      </ChapterContext.Provider>
    );
  }
  return { Wrapper, runtime };
}

describe("ChapterCompleteButton", () => {
  it("renders the check button in idle state", () => {
    const fs = createVirtualFs();
    const { Wrapper } = makeWrapper("01-ai-tools-vs-chatgpt", fs);
    render(<ChapterCompleteButton />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: "看看我学完了吗" })).toBeInTheDocument();
  });

  it("click → checker fails when no markers are written → shows hint", async () => {
    const fs = createVirtualFs();
    // Do NOT pre-write any marker — checker should fail
    const { Wrapper } = makeWrapper("01-ai-tools-vs-chatgpt", fs);
    render(<ChapterCompleteButton />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "看看我学完了吗" }));
    });

    await waitFor(() => {
      // Checker should have returned a hint about missing steps
      expect(screen.queryByRole("button", { name: "看看我学完了吗" })).toBeInTheDocument();
    });
    // The hint paragraph should be rendered (some non-empty text)
    const hint = screen.getByText(/跳过|SandboxStep|已经看过/);
    expect(hint).toBeInTheDocument();
  });

  it("click → checker passes when both markers are pre-written → shows completion", async () => {
    const fs = createVirtualFs();
    // Pre-write both Ch 1 marker files to simulate completed steps
    await fs.write(".progress/comparison-viewed", "done");
    await fs.write(".progress/first-step-completed", "done");

    const { Wrapper } = makeWrapper("01-ai-tools-vs-chatgpt", fs);
    render(<ChapterCompleteButton />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "看看我学完了吗" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/本章完成/)).toBeInTheDocument();
    });
  });

  it("on pass: calls markChapterCompleted + setCurrentChapter to next chapter", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/comparison-viewed", "done");
    await fs.write(".progress/first-step-completed", "done");

    const { Wrapper } = makeWrapper("01-ai-tools-vs-chatgpt", fs);
    render(<ChapterCompleteButton />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "看看我学完了吗" }));
    });

    await waitFor(() => {
      expect(screen.getByText(/本章完成/)).toBeInTheDocument();
    });

    const state = useProgress.getState();
    expect(state.chapters["01-ai-tools-vs-chatgpt"]?.status).toBe("completed");
    // Ch 2 should now be the current chapter
    expect(state.currentChapter).toBe("02-show-files-to-ai");
  });

  it("chapter without checker auto-passes and marks complete", async () => {
    // Use a slug that has no checker.ts file to test the fallback
    const fs = createVirtualFs();
    const { Wrapper } = makeWrapper("00-hello", fs);
    render(<ChapterCompleteButton />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "看看我学完了吗" }));
    });

    await waitFor(() => {
      expect(screen.getByText(/本章完成/)).toBeInTheDocument();
    });

    const state = useProgress.getState();
    expect(state.chapters["00-hello"]?.status).toBe("completed");
  });
});
