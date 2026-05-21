import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// vi.mock is hoisted to the top of the file by Vitest's transformer, so the
// factory runs before any variable initialisation. We use vi.fn() inline and
// retrieve the mocked module with vi.mocked() below.
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
  BaseDirectory: { AppLocalData: 99 },
}));

// Import mocked module AFTER vi.mock declaration so Vitest resolves the mock.
import * as pluginFs from "@tauri-apps/plugin-fs";

// Import the test-only export of the internal tauriStorage adapter.
// This bypasses the isTauri guard so we can unit-test Tauri behaviour in jsdom.
import { __tauriStorageForTests as tauriStorage } from "@/modules/Progress/persistence";
import { useProgress } from "@/modules/Progress";

const mockExists = vi.mocked(pluginFs.exists);
const mockReadTextFile = vi.mocked(pluginFs.readTextFile);
const mockWriteTextFile = vi.mocked(pluginFs.writeTextFile);
const mockRemove = vi.mocked(pluginFs.remove);

// ─── tauriStorage adapter unit tests ─────────────────────────────────────────

describe("tauriStorage", () => {
  beforeEach(() => {
    mockExists.mockReset();
    mockReadTextFile.mockReset();
    mockWriteTextFile.mockReset();
    mockRemove.mockReset();
  });

  it("main file valid → returns main content", async () => {
    mockExists.mockResolvedValueOnce(true); // main exists
    mockReadTextFile.mockResolvedValueOnce('{"v":1}');
    const result = await tauriStorage.getItem("p");
    expect(result).toBe('{"v":1}');
  });

  it("main file corrupt JSON → falls back to .bak", async () => {
    mockExists.mockResolvedValueOnce(true); // main exists
    mockReadTextFile.mockResolvedValueOnce("garbage{{{");
    mockExists.mockResolvedValueOnce(true); // .bak exists
    mockReadTextFile.mockResolvedValueOnce('{"v":1}');
    const result = await tauriStorage.getItem("p");
    expect(result).toBe('{"v":1}');
  });

  it("main missing + .bak valid → returns .bak content", async () => {
    mockExists.mockResolvedValueOnce(false); // main missing
    mockExists.mockResolvedValueOnce(true); // .bak exists
    mockReadTextFile.mockResolvedValueOnce('{"v":1}');
    const result = await tauriStorage.getItem("p");
    expect(result).toBe('{"v":1}');
  });

  it("both missing → returns null", async () => {
    mockExists.mockResolvedValueOnce(false);
    mockExists.mockResolvedValueOnce(false);
    const result = await tauriStorage.getItem("p");
    expect(result).toBeNull();
  });

  it("setItem writes main then .bak", async () => {
    await tauriStorage.setItem("p", '{"v":2}');
    expect(mockWriteTextFile).toHaveBeenNthCalledWith(
      1,
      "p.json",
      '{"v":2}',
      expect.any(Object),
    );
    expect(mockWriteTextFile).toHaveBeenNthCalledWith(
      2,
      "p.json.bak",
      '{"v":2}',
      expect.any(Object),
    );
  });
});

// ─── useProgress store smoke tests ───────────────────────────────────────────

describe("useProgress store", () => {
  beforeEach(() => {
    // Reset to initial state before each test
    useProgress.getState().resetProgress();
  });

  afterEach(() => {
    // Clean up localStorage entries created by the store's localStorage fallback
    localStorage.clear();
  });

  it("completeOnboarding flips hasCompletedOnboarding to true", () => {
    expect(useProgress.getState().hasCompletedOnboarding).toBe(false);
    useProgress.getState().completeOnboarding();
    expect(useProgress.getState().hasCompletedOnboarding).toBe(true);
  });

  it("resetProgress restores initial state", () => {
    useProgress.getState().completeOnboarding();
    useProgress.getState().setCurrentChapter("01-test");
    useProgress.getState().resetProgress();
    const state = useProgress.getState();
    expect(state.hasCompletedOnboarding).toBe(false);
    expect(state.currentChapter).toBeNull();
  });

  it("markChapterCompleted records status and timestamp", () => {
    useProgress.getState().markChapterCompleted("01-intro");
    const chapter = useProgress.getState().chapters["01-intro"];
    expect(chapter.status).toBe("completed");
    expect(chapter.completedAt).toBeTruthy();
  });

  it("mode defaults to sandbox", () => {
    expect(useProgress.getState().mode).toBe("sandbox");
  });
});
