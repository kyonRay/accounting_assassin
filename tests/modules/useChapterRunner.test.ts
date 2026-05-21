import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChapterRunner } from "@/modules/ChapterRunner/useChapterRunner";

describe("useChapterRunner", () => {
  it("markStep writes .progress/<id> to the VirtualFs", async () => {
    const { result } = renderHook(() => useChapterRunner("01-ai-tools-vs-chatgpt"));

    await act(async () => {
      await result.current.markStep("comparison-viewed");
    });

    const exists = await result.current.fs.exists(".progress/comparison-viewed");
    expect(exists).toBe(true);

    const content = await result.current.fs.read(".progress/comparison-viewed");
    expect(content).toBe("done");
  });

  it("bumpAttempt increments the attempt counter", () => {
    const { result } = renderHook(() => useChapterRunner("01-ai-tools-vs-chatgpt"));

    expect(result.current.attempt).toBe(1);

    act(() => {
      result.current.bumpAttempt();
    });
    expect(result.current.attempt).toBe(2);

    act(() => {
      result.current.bumpAttempt();
    });
    expect(result.current.attempt).toBe(3);
  });

  it("changing slug resets the fs and attempt counter", async () => {
    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useChapterRunner(slug),
      { initialProps: { slug: "01-ai-tools-vs-chatgpt" } },
    );

    // Write a marker and bump attempt on chapter 1
    await act(async () => {
      await result.current.markStep("comparison-viewed");
    });
    act(() => {
      result.current.bumpAttempt();
    });

    expect(result.current.attempt).toBe(2);
    expect(await result.current.fs.exists(".progress/comparison-viewed")).toBe(true);

    // Switch to chapter 2 — should reset
    rerender({ slug: "02-show-files-to-ai" });

    // Allow effect to run
    await act(async () => {});

    expect(result.current.attempt).toBe(1);
    expect(await result.current.fs.exists(".progress/comparison-viewed")).toBe(false);
  });
});
