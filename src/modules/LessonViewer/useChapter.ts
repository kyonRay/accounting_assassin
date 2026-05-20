import { useEffect, useReducer } from "react";
import type { ComponentType } from "react";

type LessonModule = { default: ComponentType };

// Codex review fix #2: Vite's dynamic import() can't statically analyze
// alias + template literal. Use import.meta.glob to build a static chapter
// manifest at build time. All matching lesson.mdx files get bundled.
const chapterLoaders = import.meta.glob<LessonModule>(
  "/content/chapters/*/lesson.mdx",
);

type State =
  | { status: "loading" }
  | { status: "ready"; Lesson: ComponentType }
  | { status: "error"; error: Error };

type Action =
  | { type: "loaded"; Lesson: ComponentType }
  | { type: "failed"; error: Error };

function reducer(_prev: State, action: Action): State {
  if (action.type === "loaded") return { status: "ready", Lesson: action.Lesson };
  return { status: "error", error: action.error };
}

export function useChapter(slug: string) {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const key = `/content/chapters/${slug}/lesson.mdx`;
    const loader = chapterLoaders[key];
    if (!loader) {
      dispatch({ type: "failed", error: new Error(`Chapter not found: ${slug}`) });
      return;
    }

    loader()
      .then((mod: LessonModule) => {
        if (!cancelled) dispatch({ type: "loaded", Lesson: mod.default });
      })
      .catch((err: Error) => {
        if (!cancelled) dispatch({ type: "failed", error: err });
      });

    return () => { cancelled = true; };
  }, [slug]);

  const Lesson = state.status === "ready" ? state.Lesson : null;
  const error = state.status === "error" ? state.error : null;

  return { Lesson, error };
}
