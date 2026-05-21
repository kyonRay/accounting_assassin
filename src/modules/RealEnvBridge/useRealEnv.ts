import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProgress, type AppMode } from "@/modules/Progress";
import { useHealthStore } from "./healthStore";
import type { HealthSnapshot } from "./health-check";

export interface RealEnvState {
  /** Non-null after first completed check; may be stale during a refresh (use `loading`). */
  snapshot: HealthSnapshot | null;
  loading: boolean;
  error: Error | null;
  mode: AppMode;
  refresh: () => Promise<void>;
}

export function useRealEnv(): RealEnvState {
  const { snapshot, loading, error, refresh } = useHealthStore(
    useShallow((s) => ({
      snapshot: s.snapshot,
      loading: s.loading,
      error: s.error,
      refresh: s.refresh,
    })),
  );
  const mode = useProgress((s) => s.mode);

  useEffect(() => {
    if (snapshot === null && !loading && !error) {
      void refresh();
    }
  }, [snapshot, loading, error, refresh]);

  return { snapshot, loading, error, mode, refresh };
}
