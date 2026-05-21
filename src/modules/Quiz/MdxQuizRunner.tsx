/**
 * MDX-facing wrapper for <QuizRunner src="./quiz.yaml" />.
 *
 * Chapter authors write:
 *   <QuizRunner src="./quiz.yaml" />
 *
 * This wrapper reads the current chapter slug from ChapterContext,
 * resolves the quiz.yaml via import.meta.glob, validates it with
 * parseQuiz, then renders the real <QuizRunner>.
 */
import { useEffect, useState } from "react";
import { useChapterContext } from "../LessonViewer/ChapterContext";
import { parseQuiz } from "./quiz-loader";
import { QuizRunner } from "./QuizRunner";
import type { Quiz } from "./index";

// Static glob of ALL quiz.yaml files bundled at build time.
// Vite requires the pattern to be a literal string.
const quizLoaders = import.meta.glob<{ default: unknown }>(
  "/content/chapters/*/quiz.yaml",
);

export interface MdxQuizRunnerProps {
  /** e.g. "./quiz.yaml" — src is ignored beyond signalling intent; the
   *  chapter slug from context is used to resolve the actual file. */
  src?: string;
}

export function MdxQuizRunner(_props: MdxQuizRunnerProps) {
  const { slug } = useChapterContext();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `/content/chapters/${slug}/quiz.yaml`;
    const loader = quizLoaders[key];

    const load = loader
      ? loader()
      : Promise.reject(new Error(`找不到测验文件: ${key}`));

    load
      .then((mod) => {
        if (cancelled) return;
        try {
          setQuiz(parseQuiz(mod.default));
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div role="alert" className="my-4 rounded-lg border border-realenv/30 bg-realenv/5 p-4 text-sm text-realenv">
        ⚠️ 测验加载失败: {error}
      </div>
    );
  }

  if (!quiz) {
    return <div className="my-4 text-muted text-sm">正在加载测验...</div>;
  }

  return <QuizRunner quiz={quiz} />;
}
