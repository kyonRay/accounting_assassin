import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock @tauri-apps/api/core so initializeRealEnv doesn't need a real Tauri host
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock the RealEnvBridge module so we can control initializeRealEnv
vi.mock("@/modules/RealEnvBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/RealEnvBridge")>();
  return {
    ...actual,
    initializeRealEnv: vi.fn(),
  };
});

import * as RealEnvBridge from "@/modules/RealEnvBridge";
import { ModeTransition } from "@/components/ModeTransition";
import { useProgress } from "@/modules/Progress";

const mockInitializeRealEnv = vi.mocked(RealEnvBridge.initializeRealEnv);

beforeEach(() => {
  mockInitializeRealEnv.mockReset();
  useProgress.getState().resetProgress();
  localStorage.clear();
});

describe("ModeTransition", () => {
  it("renders idle state on mount", () => {
    render(<ModeTransition onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("你准备从沙箱进入真实环境了")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "准备好了,开始" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再回沙箱看看" })).toBeInTheDocument();
  });

  it("clicking '再回沙箱看看' calls onCancel", () => {
    const onCancel = vi.fn();
    render(<ModeTransition onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "再回沙箱看看" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clicking '准备好了,开始' calls initializeRealEnv", async () => {
    // Never resolve so we can inspect the initializing state
    mockInitializeRealEnv.mockReturnValue(new Promise(() => {}));

    render(<ModeTransition onConfirm={vi.fn()} onCancel={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "准备好了,开始" }));
    });

    expect(mockInitializeRealEnv).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/正在准备你的作业本/)).toBeInTheDocument();
  });

  it("shows success state with workspace and tool lists after initializeRealEnv resolves", async () => {
    const report = {
      workspace: "/Users/test/accounting-learner",
      present: ["Git", "Brew"] as import("@/modules/RealEnvBridge").AllowedCommand[],
      missing: ["Python3", "Claude"] as import("@/modules/RealEnvBridge").AllowedCommand[],
    };
    mockInitializeRealEnv.mockResolvedValueOnce(report);

    render(<ModeTransition onConfirm={vi.fn()} onCancel={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "准备好了,开始" }));
    });

    await waitFor(() => {
      expect(screen.getByText("你的作业本已经准备好了。")).toBeInTheDocument();
    });

    expect(screen.getByText("/Users/test/accounting-learner")).toBeInTheDocument();
    expect(screen.getByText("Git")).toBeInTheDocument();
    expect(screen.getByText("Brew")).toBeInTheDocument();
    expect(screen.getByText("Python3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入真实环境" })).toBeInTheDocument();
  });

  it("shows failure state and 重试 button when initializeRealEnv rejects", async () => {
    mockInitializeRealEnv.mockRejectedValueOnce(new Error("Permission denied"));

    render(<ModeTransition onConfirm={vi.fn()} onCancel={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "准备好了,开始" }));
    });

    await waitFor(() => {
      expect(screen.getByText("初始化遇到了问题")).toBeInTheDocument();
    });

    expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再回沙箱" })).toBeInTheDocument();
  });

  it("重试 button retries initializeRealEnv from failure state", async () => {
    const report = {
      workspace: "/Users/test/accounting-learner",
      present: [] as import("@/modules/RealEnvBridge").AllowedCommand[],
      missing: [] as import("@/modules/RealEnvBridge").AllowedCommand[],
    };
    mockInitializeRealEnv
      .mockRejectedValueOnce(new Error("first failure"))
      .mockResolvedValueOnce(report);

    render(<ModeTransition onConfirm={vi.fn()} onCancel={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "准备好了,开始" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "重试" }));
    });

    await waitFor(() => {
      expect(screen.getByText("你的作业本已经准备好了。")).toBeInTheDocument();
    });
  });

  it("'进入真实环境' calls setMode('real') and onConfirm", async () => {
    const onConfirm = vi.fn();
    const report = {
      workspace: "/Users/test/accounting-learner",
      present: [] as import("@/modules/RealEnvBridge").AllowedCommand[],
      missing: [] as import("@/modules/RealEnvBridge").AllowedCommand[],
    };
    mockInitializeRealEnv.mockResolvedValueOnce(report);

    render(<ModeTransition onConfirm={onConfirm} onCancel={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "准备好了,开始" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "进入真实环境" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "进入真实环境" }));
    });

    expect(useProgress.getState().mode).toBe("real");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
