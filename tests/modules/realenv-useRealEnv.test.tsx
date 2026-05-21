import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// health-check is mocked at module level so the hook doesn't call real invoke.
vi.mock("@/modules/RealEnvBridge/health-check", () => ({
  runHealthCheck: vi.fn(),
}));

import * as core from "@tauri-apps/api/core";
import * as healthCheckMod from "@/modules/RealEnvBridge/health-check";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRealEnv } from "@/modules/RealEnvBridge/useRealEnv";
import { useProgress } from "@/modules/Progress";
import type { AllowedCommand } from "@/modules/RealEnvBridge/invoke";
import type { HealthSnapshot } from "@/modules/RealEnvBridge/health-check";

const mockInvoke = vi.mocked(core.invoke);
const mockRunHealthCheck = vi.mocked(healthCheckMod.runHealthCheck);

const EMPTY_SNAPSHOT: HealthSnapshot = { present: [], missing: [] };

beforeEach(() => {
  mockInvoke.mockReset();
  mockRunHealthCheck.mockReset();
  // Reset progress store to sandbox default
  useProgress.getState().resetProgress();
  localStorage.clear();
});

describe("useRealEnv", () => {
  it("starts with loading:true and snapshot:null before health check resolves", () => {
    // Never resolve so we can observe the initial state
    mockRunHealthCheck.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRealEnv());

    expect(result.current.loading).toBe(true);
    expect(result.current.snapshot).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions to snapshot non-null, loading:false after mount", async () => {
    const snapshot: HealthSnapshot = {
      present: [{ cmd: "Git", version: "2.x", path: "/usr/bin/git" }],
      missing: ["Python3", "Claude", "Brew", "Codex", "Cursor"] as AllowedCommand[],
    };
    mockRunHealthCheck.mockResolvedValue(snapshot);

    const { result } = renderHook(() => useRealEnv());

    await waitFor(() => expect(result.current.snapshot).not.toBeNull());

    expect(result.current.loading).toBe(false);
    expect(result.current.snapshot).toEqual(snapshot);
    expect(result.current.error).toBeNull();
  });

  it("mirrors mode from useProgress store", async () => {
    mockRunHealthCheck.mockResolvedValue(EMPTY_SNAPSHOT);
    const { result } = renderHook(() => useRealEnv());
    // Assert on the synchronously available mode before the async health check resolves
    expect(result.current.mode).toBe("sandbox");
    // Drain the health-check promise so it doesn't leak into the next test
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
  });

  it("refresh re-runs the health check", async () => {
    const first: HealthSnapshot = { present: [], missing: ["Git"] };
    const second: HealthSnapshot = {
      present: [{ cmd: "Git", version: "2.x", path: "/usr/bin/git" }],
      missing: [],
    };
    mockRunHealthCheck.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const { result } = renderHook(() => useRealEnv());

    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    expect(result.current.snapshot).toEqual(first);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.snapshot).toEqual(second);
    expect(mockRunHealthCheck).toHaveBeenCalledTimes(2);
  });

  it("loading is true while refresh is in flight", async () => {
    let resolveSecond!: (v: HealthSnapshot) => void;
    const secondPromise = new Promise<HealthSnapshot>((res) => {
      resolveSecond = res;
    });

    mockRunHealthCheck
      .mockResolvedValueOnce(EMPTY_SNAPSHOT)
      .mockReturnValueOnce(secondPromise);

    const { result } = renderHook(() => useRealEnv());
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());

    act(() => {
      void result.current.refresh();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecond(EMPTY_SNAPSHOT);
    });

    expect(result.current.loading).toBe(false);
  });

  it("sets error and leaves snapshot null when runHealthCheck rejects", async () => {
    mockRunHealthCheck.mockRejectedValue(new Error("IPC unavailable"));

    const { result } = renderHook(() => useRealEnv());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("IPC unavailable");
    expect(result.current.snapshot).toBeNull();
  });

  it("clears error on a subsequent successful refresh", async () => {
    mockRunHealthCheck
      .mockRejectedValueOnce(new Error("IPC unavailable"))
      .mockResolvedValueOnce(EMPTY_SNAPSHOT);

    const { result } = renderHook(() => useRealEnv());

    // Wait for initial failed check
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();

    // Now do a successful refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.snapshot).toEqual(EMPTY_SNAPSHOT);
  });
});
