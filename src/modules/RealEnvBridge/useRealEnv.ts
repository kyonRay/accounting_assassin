import { useState, useCallback, useRef, useEffect } from "react";
import { useProgress } from "@/modules/Progress";
import { runHealthCheck, type HealthSnapshot } from "./health-check";

export interface RealEnvState {
  loading: boolean;
  error: Error | null;
  /**
   * Non-null after the first completed check.
   * May be stale while a refresh is in flight — use `loading` to detect that.
   */
  snapshot: HealthSnapshot | null;
  mode: "sandbox" | "real";
  refresh: () => Promise<void>;
}

export function useRealEnv(): RealEnvState {
  const mode = useProgress((s) => s.mode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const initializedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const result = await runHealthCheck();
      setSnapshot(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void refresh();
  }, [refresh]);

  return { loading, error, snapshot, mode, refresh };
}
