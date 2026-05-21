import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/modules/RealEnvBridge/health-check", () => ({
  runHealthCheck: vi.fn(),
}));

import * as healthCheckMod from "@/modules/RealEnvBridge/health-check";
import { useHealthStore } from "@/modules/RealEnvBridge/healthStore";
import type { HealthSnapshot } from "@/modules/RealEnvBridge/health-check";

const mockRunHealthCheck = vi.mocked(healthCheckMod.runHealthCheck);

const EMPTY_SNAPSHOT: HealthSnapshot = { present: [], missing: [] };
const GIT_SNAPSHOT: HealthSnapshot = {
  present: [{ cmd: "Git", version: "2.x", path: "/usr/bin/git" }],
  missing: ["Python3", "Claude", "Brew", "Codex", "Cursor"],
};

beforeEach(() => {
  mockRunHealthCheck.mockReset();
  // Reset the shared store to a blank slate between tests.
  // _inFlight must also be cleared so the dedup guard doesn't carry over.
  useHealthStore.setState({ snapshot: null, loading: false, error: null, _inFlight: null });
});

describe("useHealthStore", () => {
  it("refresh populates snapshot on success", async () => {
    mockRunHealthCheck.mockResolvedValue(GIT_SNAPSHOT);

    const { refresh } = useHealthStore.getState();
    await refresh();

    const state = useHealthStore.getState();
    expect(state.snapshot).toEqual(GIT_SNAPSHOT);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets loading:true while refresh is in flight", async () => {
    let resolve!: (v: HealthSnapshot) => void;
    const pending = new Promise<HealthSnapshot>((res) => {
      resolve = res;
    });
    mockRunHealthCheck.mockReturnValue(pending);

    // Start the refresh but don't await it yet
    const refreshPromise = useHealthStore.getState().refresh();
    expect(useHealthStore.getState().loading).toBe(true);

    // Now let it finish
    resolve(EMPTY_SNAPSHOT);
    await refreshPromise;

    expect(useHealthStore.getState().loading).toBe(false);
  });

  it("error path sets error and clears loading", async () => {
    mockRunHealthCheck.mockRejectedValue(new Error("IPC unavailable"));

    const { refresh } = useHealthStore.getState();
    await refresh();

    const state = useHealthStore.getState();
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error?.message).toBe("IPC unavailable");
    expect(state.loading).toBe(false);
    expect(state.snapshot).toBeNull();
  });

  it("error is cleared on next successful refresh", async () => {
    mockRunHealthCheck
      .mockRejectedValueOnce(new Error("IPC unavailable"))
      .mockResolvedValueOnce(EMPTY_SNAPSHOT);

    const { refresh } = useHealthStore.getState();
    await refresh();
    expect(useHealthStore.getState().error).not.toBeNull();

    await useHealthStore.getState().refresh();

    const state = useHealthStore.getState();
    expect(state.error).toBeNull();
    expect(state.snapshot).toEqual(EMPTY_SNAPSHOT);
  });

  it("concurrent refresh() calls dedupe to a single runHealthCheck invocation", async () => {
    let resolve!: (v: HealthSnapshot) => void;
    const pending = new Promise<HealthSnapshot>((res) => {
      resolve = res;
    });
    mockRunHealthCheck.mockReturnValue(pending);

    const { refresh } = useHealthStore.getState();
    const p1 = refresh();
    const p2 = refresh();
    const p3 = refresh();

    resolve(GIT_SNAPSHOT);
    await Promise.all([p1, p2, p3]);

    // All three calls share the same inFlight promise — only one IPC call made
    expect(mockRunHealthCheck).toHaveBeenCalledTimes(1);
    expect(useHealthStore.getState().snapshot).toEqual(GIT_SNAPSHOT);
  });
});
