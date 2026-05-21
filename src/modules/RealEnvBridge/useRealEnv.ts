import { useEffect } from "react";
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
  const snapshot = useHealthStore((s) => s.snapshot);
  const loading = useHealthStore((s) => s.loading);
  const error = useHealthStore((s) => s.error);
  const refresh = useHealthStore((s) => s.refresh);
  const mode = useProgress((s) => s.mode);

  useEffect(() => {
    if (snapshot === null && !loading && !error) {
      void refresh();
    }
  }, [snapshot, loading, error, refresh]);

  return { snapshot, loading, error, mode, refresh };
}
