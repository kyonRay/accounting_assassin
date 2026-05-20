import { MDXProvider } from "@mdx-js/react";
import { mdxComponents } from "./mdx-components";
import { useChapter } from "./useChapter";

interface Props { slug: string; }

export function LessonViewer({ slug }: Props) {
  const { Lesson, error } = useChapter(slug);
  if (error) return <div className="text-red-600">课程加载失败:{error.message}</div>;
  if (!Lesson) return <div className="text-muted">正在加载...</div>;
  return (
    <MDXProvider components={mdxComponents}>
      <article className="prose prose-zinc max-w-3xl">
        <Lesson />
      </article>
    </MDXProvider>
  );
}
