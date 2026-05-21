import { useState, useCallback, useRef, useEffect } from "react";
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
  const initializedRef = useRef(false);

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

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void refresh();
  }, [refresh]);

  return { ready, loading, snapshot, mode, refresh };
}
