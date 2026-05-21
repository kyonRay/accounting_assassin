import { create } from "zustand";
import { runHealthCheck, type HealthSnapshot } from "./health-check";

interface HealthStoreState {
  snapshot: HealthSnapshot | null;
  loading: boolean;
  error: Error | null;
  /** Internal dedup handle — not part of the public API. Resets with setState. */
  _inFlight: Promise<void> | null;
  refresh: () => Promise<void>;
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
