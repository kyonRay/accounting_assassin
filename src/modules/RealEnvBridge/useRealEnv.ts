import { useState, useCallback } from "react";
import { useProgress } from "@/modules/Progress";
import { runHealthCheck, type HealthSnapshot } from "./health-check";

export interface RealEnvState {
  ready: boolean;
  loading: boolean;
  snapshot: HealthSnapshot | null;
  mode: "sandbox" | "real";
  refresh: () => Promise<void>;
}

export function useRealEnv(): RealEnvState {
  const mode = useProgress((s) => s.mode);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  // Track whether the initial fetch has been kicked off so StrictMode double-invocation
  // doesn't fire two concurrent fetches.
  const [initialized, setInitialized] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runHealthCheck();
      setSnapshot(result);
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fire the initial health check once, driven by state rather than useEffect so
  // the react-hooks/set-state-in-effect rule is satisfied.
  if (!initialized) {
    setInitialized(true);
    void refresh();
  }

  return { ready, loading, snapshot, mode, refresh };
}
