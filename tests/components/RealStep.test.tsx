import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// Mock Tauri IPC so health-check doesn't fail on a non-Tauri host
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock the health-check module so useRealEnv doesn't call real invoke
vi.mock("@/modules/RealEnvBridge/health-check", () => ({
  runHealthCheck: vi.fn(),
}));

import * as healthCheckMod from "@/modules/RealEnvBridge/health-check";
import { RealStep } from "@/components/RealStep";
import { ChapterRunnerContext } from "@/modules/ChapterRunner/ChapterRunnerContext";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { useProgress } from "@/modules/Progress";
import type { ChapterRuntime } from "@/modules/ChapterRunner";
import type { HealthSnapshot } from "@/modules/RealEnvBridge/health-check";

const mockRunHealthCheck = vi.mocked(healthCheckMod.runHealthCheck);

const FULL_SNAPSHOT: HealthSnapshot = {
  present: [
    { cmd: "Git", version: "2.x", path: "/usr/bin/git" },
    { cmd: "Brew", version: "4.x", path: "/opt/homebrew/bin/brew" },
  ],
  missing: ["Python3", "Claude", "Codex", "Cursor"],
};

beforeEach(() => {
  mockRunHealthCheck.mockReset();
  mockRunHealthCheck.mockResolvedValue(FULL_SNAPSHOT);
  useProgress.getState().resetProgress();
  localStorage.clear();
  // RealStep's useRealEnv calls runHealthCheck when using Progress mode.
  // Default progress store mode is "sandbox" which still calls the health check.
});

function makeWrapper(overrideRuntime?: Partial<ChapterRuntime>) {
  const fs = createVirtualFs();
  const markStep = vi.fn(async (id: string) => {
    await fs.write(`.progress/${id}`, "done");
  });
  const runtime: ChapterRuntime = {
    fs,
    attempt: 1,
    markStep,
    bumpAttempt: vi.fn(),
    ...overrideRuntime,
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ChapterRunnerContext.Provider value={runtime}>
        {children}
      </ChapterRunnerContext.Provider>
    );
  }
  return { Wrapper, runtime, markStep, fs };
}

describe("RealStep", () => {
  it("renders children text", async () => {
    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="step-1">请在终端中运行以下命令</RealStep>
      </Wrapper>,
    );
    // Wait for health check to settle so no act() warning on unmount
    await waitFor(() => expect(screen.getByText("请在终端中运行以下命令")).toBeInTheDocument());
  });

  it("renders command in a code block when provided", async () => {
    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="step-1" command="brew install python3">
          安装 Python
        </RealStep>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByText("brew install python3")).toBeInTheDocument());
  });

  it("shows 复制 button when command is provided", async () => {
    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="step-1" command="echo hello">说你好</RealStep>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "复制" })).toBeInTheDocument());
  });

  it("复制 button calls navigator.clipboard.writeText with the command", async () => {
    const { Wrapper } = makeWrapper();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <Wrapper>
        <RealStep id="step-1" command="git status">检查状态</RealStep>
      </Wrapper>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制" }));
    });

    expect(writeText).toHaveBeenCalledWith("git status");
  });

  it("我跑完了 calls markStep with the step id", async () => {
    const { Wrapper, markStep } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="run-brew">运行 brew</RealStep>
      </Wrapper>,
    );

    // Wait for health check to resolve
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "我跑完了" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "我跑完了" }));
    });

    expect(markStep).toHaveBeenCalledWith("run-brew");
  });

  it("我跑完了 calls onComplete callback", async () => {
    const onComplete = vi.fn();
    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="step-x" onComplete={onComplete}>说明</RealStep>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "我跑完了" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "我跑完了" }));
    });

    expect(onComplete).toHaveBeenCalledWith("step-x");
  });

  it("shows ✓ 已完成 after clicking 我跑完了", async () => {
    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="step-done">步骤</RealStep>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "我跑完了" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "我跑完了" }));
    });

    expect(screen.getByText("✓ 已完成")).toBeInTheDocument();
  });

  it("shows downgrade banner and disables button when expectsCli is in snapshot.missing", async () => {
    const snapshotWithMissingPython: HealthSnapshot = {
      present: [{ cmd: "Git", version: "2.x", path: "/usr/bin/git" }],
      missing: ["Python3", "Claude", "Codex", "Cursor", "Brew"],
    };
    mockRunHealthCheck.mockResolvedValue(snapshotWithMissingPython);

    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="py-step" expectsCli="Python3">
          运行 Python 脚本
        </RealStep>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/没在你的电脑上找到/)).toBeInTheDocument();
    });

    // The button should be disabled
    const btn = screen.getByRole("button", { name: "我跑完了" });
    expect(btn).toBeDisabled();
  });

  it("does NOT show downgrade banner when expectsCli is present in snapshot", async () => {
    const snapshotWithGit: HealthSnapshot = {
      present: [{ cmd: "Git", version: "2.x", path: "/usr/bin/git" }],
      missing: ["Python3", "Claude", "Codex", "Cursor", "Brew"],
    };
    mockRunHealthCheck.mockResolvedValue(snapshotWithGit);

    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="git-step" expectsCli="Git">
          运行 git status
        </RealStep>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "我跑完了" })).toBeInTheDocument();
    });

    expect(screen.queryByText(/没在你的电脑上找到/)).toBeNull();
    expect(screen.getByRole("button", { name: "我跑完了" })).not.toBeDisabled();
  });

  it("shows '检查环境中…' button text while snapshot is null (loading)", () => {
    // Never resolve the health check to keep snapshot null
    mockRunHealthCheck.mockReturnValue(new Promise(() => {}));

    const { Wrapper } = makeWrapper();
    render(
      <Wrapper>
        <RealStep id="loading-step" expectsCli="Python3">
          等待中
        </RealStep>
      </Wrapper>,
    );

    expect(screen.getByRole("button", { name: "检查环境中…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "检查环境中…" })).toBeDisabled();
  });
});
