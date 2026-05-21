import { create } from "zustand";
import { runHealthCheck, type HealthSnapshot } from "./health-check";

/** Public fields exposed to consumers of useHealthStore / useRealEnv. */
export interface HealthStorePublic {
  snapshot: HealthSnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/** Full internal state — `_inFlight` is a private impl detail, not for consumers. */
interface HealthStoreState extends HealthStorePublic {
  /** Internal dedup handle — not part of the public API. Resets with setState. */
  _inFlight: Promise<void> | null;
}

export const useHealthStore = create<HealthStoreState>((set, get) => ({
  snapshot: null,
  loading: false,
  error: null,
  _inFlight: null,
  refresh: () => {
    const existing = get()._inFlight;
    if (existing) return existing;
    set({ loading: true, error: null });
    const promise = runHealthCheck()
      .then((result) => set({ snapshot: result, loading: false, _inFlight: null }))
      .catch((e) =>
        set({
          error: e instanceof Error ? e : new Error(String(e)),
          loading: false,
          _inFlight: null,
        }),
      );
    set({ _inFlight: promise });
    return promise;
  },
}));
