import { useMemo, useState, useCallback } from "react";
import { createVirtualFs, type VirtualFs } from "@/modules/Sandbox/virtual-fs";

/**
 * Per-chapter runtime context: holds the VirtualFs that SandboxStep markers
 * write to, plus an attempt counter for the checker.
 *
 * Created fresh per chapter slug; resets when slug changes.
 */
export interface ChapterRuntime {
  fs: VirtualFs;
  attempt: number;
  /** Marks one SandboxStep as completed by writing the corresponding marker file */
  markStep: (id: string) => Promise<void>;
  /** Bumps the attempt counter; called after each check-and-fail */
  bumpAttempt: () => void;
}

export function useChapterRunner(slug: string): ChapterRuntime {
  // useMemo re-creates a fresh VirtualFs whenever slug changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fs = useMemo(() => createVirtualFs(), [slug]);

  // Track attempt per slug: { slug, count } — resets derived value when slug changes.
  const [attemptState, setAttemptState] = useState<{ slug: string; count: number }>(
    { slug, count: 1 },
  );
  const attempt = attemptState.slug === slug ? attemptState.count : 1;

  const markStep = useCallback(
    async (id: string) => {
      await fs.write(`.progress/${id}`, "done");
    },
    [fs],
  );

  const bumpAttempt = useCallback(() => {
    setAttemptState((prev) => ({
      slug,
      count: prev.slug === slug ? prev.count + 1 : 2,
    }));
  }, [slug]);

  return { fs, attempt, markStep, bumpAttempt };
}
