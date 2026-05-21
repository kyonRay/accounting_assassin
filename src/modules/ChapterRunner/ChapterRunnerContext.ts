import { createContext, useContext } from "react";
import type { ChapterRuntime } from "./useChapterRunner";

export const ChapterRunnerContext = createContext<ChapterRuntime | null>(null);

export function useChapterRunnerContext(): ChapterRuntime {
  const ctx = useContext(ChapterRunnerContext);
  if (!ctx) throw new Error("useChapterRunnerContext must be inside <LessonViewer>");
  return ctx;
}

export function useOptionalChapterRunner(): ChapterRuntime | null {
  return useContext(ChapterRunnerContext);
}
