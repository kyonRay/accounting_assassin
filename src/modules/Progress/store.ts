import { create } from "zustand";
import { persist } from "zustand/middleware";
import { progressStorage } from "./persistence";

export type ChapterStatus = "locked" | "current" | "in_progress" | "completed";
export type AppMode = "sandbox" | "real";

export interface ChapterProgress {
  status: ChapterStatus;
  completedAt?: string; // ISO date
}

export interface ProgressState {
  // Once true, hide welcome flow forever
  hasCompletedOnboarding: boolean;
  // Current app mode (single-directional sandbox → real)
  mode: AppMode;
  // Per-chapter status map, keyed by slug like "01-ai-tools-vs-chatgpt"
  chapters: Record<string, ChapterProgress>;
  // The chapter slug currently being viewed; null on first run
  currentChapter: string | null;

  // Actions
  completeOnboarding: () => void;
  setCurrentChapter: (slug: string) => void;
  markChapterCompleted: (slug: string) => void;
  setMode: (mode: AppMode) => void;
  resetProgress: () => void; // double-confirm at UI layer, not here
}

const INITIAL_STATE = {
  hasCompletedOnboarding: false,
  mode: "sandbox" as const,
  chapters: {},
  currentChapter: null,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      setCurrentChapter: (slug) => set({ currentChapter: slug }),
      markChapterCompleted: (slug) =>
        set((s) => ({
          chapters: {
            ...s.chapters,
            [slug]: {
              status: "completed",
              completedAt: new Date().toISOString(),
            },
          },
        })),
      setMode: (mode) => set({ mode }),
      resetProgress: () => set(INITIAL_STATE),
    }),
    {
      name: "accounting-assassin-progress",
      storage: progressStorage,
    },
  ),
);
