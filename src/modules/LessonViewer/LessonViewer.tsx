import { MDXProvider } from "@mdx-js/react";
import { mdxComponents } from "./mdx-components";
import { useChapter } from "./useChapter";
import { mapErrorToFriendly } from "./error-messages";
import { ChapterContext } from "./ChapterContext";

interface Props { slug: string; }

export function LessonViewer({ slug }: Props) {
  const { Lesson, error } = useChapter(slug);
  if (error) {
    const friendly = mapErrorToFriendly(error);
    return (
      <div role="alert" className="my-6 p-6 rounded-lg border border-realenv/30 bg-realenv/5">
        <div className="text-lg font-bold text-graphite mb-2">⚠️ {friendly.title}</div>
        <p className="text-graphite mb-3">{friendly.nextStep}</p>
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">技术细节</summary>
          <pre className="mt-2 font-mono bg-graphite/5 p-2 rounded whitespace-pre-wrap">
            {friendly.technical}
          </pre>
        </details>
      </div>
    );
  }
  if (!Lesson) return <div className="text-muted">正在加载...</div>;
  return (
    <ChapterContext.Provider value={{ slug }}>
      <MDXProvider components={mdxComponents}>
        <article className="prose prose-zinc max-w-3xl">
          <Lesson />
        </article>
      </MDXProvider>
    </ChapterContext.Provider>
  );
}
