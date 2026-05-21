import { createContext, useContext } from "react";

export interface ChapterContextValue {
  slug: string;
}

export const ChapterContext = createContext<ChapterContextValue | null>(null);

export function useChapterContext(): ChapterContextValue {
  const ctx = useContext(ChapterContext);
  if (!ctx) {
    throw new Error("useChapterContext must be used inside <LessonViewer>");
  }
  return ctx;
}
