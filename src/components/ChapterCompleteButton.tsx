import { useState } from "react";
import { runChecker } from "@/modules/Checker";
import { useProgress } from "@/modules/Progress";
import { useChapterContext } from "@/modules/LessonViewer";
import { useChapterRunnerContext } from "@/modules/ChapterRunner";
import { CHAPTERS } from "@/curriculum";
import type { CheckerFn } from "@/modules/Checker";

// Dynamic chapter checker loaders (Vite static glob, like quiz/lesson)
const checkerLoaders = import.meta.glob<{ check: CheckerFn }>(
  "/content/chapters/*/checker.ts",
);

interface FeedbackState {
  kind: "idle" | "checking" | "passed" | "failed";
  hint?: string;
  showAnswerButton?: boolean;
}

export function ChapterCompleteButton() {
  const { slug } = useChapterContext();
  const runtime = useChapterRunnerContext();
  const markChapterCompleted = useProgress((s) => s.markChapterCompleted);
  const setCurrentChapter = useProgress((s) => s.setCurrentChapter);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });

  const finishChapter = () => {
    markChapterCompleted(slug);
    const idx = CHAPTERS.findIndex((c) => c.slug === slug);
    const next = CHAPTERS[idx + 1];
    if (next) setCurrentChapter(next.slug);
  };

  const handleCheck = async () => {
    setFeedback({ kind: "checking" });
    const loader = checkerLoaders[`/content/chapters/${slug}/checker.ts`];
    if (!loader) {
      // No checker for this chapter — treat as passed
      setFeedback({ kind: "passed" });
      finishChapter();
      return;
    }
    const mod = await loader();
    const result = await runChecker(
      mod.check,
      { mode: "sandbox", fs: runtime.fs },
      runtime.attempt,
    );
    if (result.passed) {
      setFeedback({ kind: "passed" });
      finishChapter();
    } else {
      setFeedback({
        kind: "failed",
        hint: result.hint,
        showAnswerButton: result.showAnswerButton,
      });
      runtime.bumpAttempt();
    }
  };

  if (feedback.kind === "passed") {
    return (
      <div role="status" className="mt-8 p-4 rounded-lg bg-done/10 border border-done/30">
        <p className="text-done font-medium">✓ 本章完成 —— 已自动进入下一章。</p>
      </div>
    );
  }

  return (
    <div className="mt-10 p-5 rounded-xl bg-cream border border-graphite/10">
      <button
        type="button"
        onClick={handleCheck}
        disabled={feedback.kind === "checking"}
        className="px-4 py-2 rounded-lg bg-sandbox text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {feedback.kind === "checking" ? "检查中…" : "看看我学完了吗"}
      </button>
      {feedback.kind === "failed" && feedback.hint && (
        <p className="mt-3 text-sm text-realenv">{feedback.hint}</p>
      )}
      {feedback.showAnswerButton && (
        <button
          type="button"
          onClick={finishChapter}
          className="mt-3 text-xs underline text-muted"
        >
          直接看参考答案(不推荐)
        </button>
      )}
    </div>
  );
}
