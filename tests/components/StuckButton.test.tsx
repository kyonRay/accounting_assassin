import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock @tauri-apps/api/core so collectDiagnostics doesn't need a real Tauri host
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock collectDiagnostics from RealEnvBridge so we control the response
vi.mock("@/modules/RealEnvBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/RealEnvBridge")>();
  return {
    ...actual,
    collectDiagnostics: vi.fn(),
  };
});

import * as RealEnvBridge from "@/modules/RealEnvBridge";
import { StuckButton, formatDiagnosticMarkdown } from "@/components/StuckButton";
import type { DiagnosticReport } from "@/modules/RealEnvBridge";
import { useProgress } from "@/modules/Progress";

const mockCollectDiagnostics = vi.mocked(RealEnvBridge.collectDiagnostics);

// Minimal fixture that satisfies the allowlist (no file content, no paths outside workspace)
const FIXTURE: DiagnosticReport = {
  appVersion: "0.1.0",
  osVersion: "14.5",
  arch: "aarch64",
  workspaceExists: true,
  workspaceTopLevel: [
    { name: "README.md", kind: "File", sizeBytes: 423 },
    { name: "invoices", kind: "Directory", sizeBytes: null },
  ],
  tools: [
    { cmd: "Python3", found: true, version: "Python 3.13.0" },
    { cmd: "Claude", found: true, version: "1.0.42" },
    { cmd: "Brew", found: true, version: "Homebrew 4.2.0" },
    { cmd: "Git", found: true, version: "git version 2.43.0" },
    { cmd: "Codex", found: false, version: null },
    { cmd: "Cursor", found: false, version: null },
  ],
  timestampUtc: "2026-05-21T10:30:00Z",
};

// Polyfill clipboard API in jsdom
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText },
  writable: true,
  configurable: true,
});

// URL object polyfills for save-to-file
const revokeObjectURL = vi.fn();
const createObjectURL = vi.fn(() => "blob:mock-url");
Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });

beforeEach(() => {
  mockCollectDiagnostics.mockReset();
  writeText.mockClear();
  revokeObjectURL.mockClear();
  createObjectURL.mockClear();
  useProgress.getState().resetProgress();
  localStorage.clear();
});

// ─── Test 1: button renders; sandbox → gray styles, real → amber styles ──────

describe("StuckButton — appearance", () => {
  it("renders in sandbox mode with gray styles", () => {
    useProgress.getState().setMode("sandbox");
    render(<StuckButton />);

    const btn = screen.getByTestId("stuck-button");
    expect(btn).toBeInTheDocument();
    // Gray border class for sandbox
    expect(btn.className).toContain("border-graphite/20");
    expect(btn.className).not.toContain("border-realenv");
  });

  it("renders in real-env mode with amber styles", () => {
    useProgress.getState().setMode("real");
    render(<StuckButton />);

    const btn = screen.getByTestId("stuck-button");
    expect(btn).toBeInTheDocument();
    // Amber border class for real
    expect(btn.className).toContain("border-realenv/50");
    expect(btn.className).not.toContain("border-graphite/20");
  });
});

// ─── Test 2: click opens modal; collectDiagnostics is called ─────────────────

describe("StuckButton — modal open", () => {
  it("clicking the button opens modal and shows loading state", async () => {
    // Never resolves — hold in loading state
    mockCollectDiagnostics.mockReturnValue(new Promise(() => {}));

    render(<StuckButton />);
    expect(screen.queryByTestId("stuck-modal")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-button"));
    });

    expect(screen.getByTestId("stuck-modal")).toBeInTheDocument();
    expect(screen.getByText(/正在收集诊断信息/)).toBeInTheDocument();
    expect(mockCollectDiagnostics).toHaveBeenCalledTimes(1);
  });

  it("modal shows markdown content after collectDiagnostics resolves", async () => {
    mockCollectDiagnostics.mockResolvedValueOnce(FIXTURE);

    render(<StuckButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stuck-markdown-preview")).toBeInTheDocument();
    });

    const preview = screen.getByTestId("stuck-markdown-preview");
    // Check some key parts of the formatted markdown
    expect(preview.textContent).toContain("学习诊断报告");
    expect(preview.textContent).toContain("0.1.0");
    expect(preview.textContent).toContain("2026-05-21T10:30:00Z");
  });
});

// ─── Test 3: 复制到剪贴板 calls navigator.clipboard.writeText ─────────────────

describe("StuckButton — copy to clipboard", () => {
  it("calls navigator.clipboard.writeText with the markdown", async () => {
    mockCollectDiagnostics.mockResolvedValueOnce(FIXTURE);

    render(<StuckButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stuck-copy-btn")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-copy-btn"));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const writtenText = writeText.mock.calls[0][0] as string;
    expect(writtenText).toContain("学习诊断报告");
  });
});

// ─── Test 4: 保存为文件 triggers download ────────────────────────────────────

describe("StuckButton — save to file", () => {
  it("calls URL.createObjectURL and triggers a download anchor click", async () => {
    mockCollectDiagnostics.mockResolvedValueOnce(FIXTURE);

    // Spy on document.body.appendChild to capture anchor clicks
    const anchorClickSpy = vi.fn();
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          anchorClickSpy(node);
          node.click = vi.fn(); // prevent real navigation
        }
        return originalAppendChild(node);
      });

    render(<StuckButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stuck-save-btn")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-save-btn"));
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    const anchor = anchorClickSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/诊断报告.*\.md/);

    appendChildSpy.mockRestore();
  });
});

// ─── Test 5: 关闭 closes the modal ───────────────────────────────────────────

describe("StuckButton — close modal", () => {
  it("关闭 button closes the modal", async () => {
    mockCollectDiagnostics.mockResolvedValueOnce(FIXTURE);

    render(<StuckButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-button"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stuck-close-btn")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stuck-close-btn"));
    });

    expect(screen.queryByTestId("stuck-modal")).not.toBeInTheDocument();
  });
});

// ─── Test 6: allowlist check — formatter never includes file content ──────────

describe("formatDiagnosticMarkdown — allowlist", () => {
  it("does not include file content from workspaceTopLevel entries", () => {
    // Construct a fixture where the workspace entries have names that could
    // hypothetically contain content — verify only names appear, not content.
    const report: DiagnosticReport = {
      ...FIXTURE,
      workspaceTopLevel: [
        { name: "secret_salaries.csv", kind: "File", sizeBytes: 9999 },
        { name: "invoices", kind: "Directory", sizeBytes: null },
      ],
    };

    const md = formatDiagnosticMarkdown({
      report,
      chapterSlug: "01-ai-tools-vs-chatgpt",
      mode: "sandbox",
      sandboxFiles: [],
    });

    // Filename appears (allowed — it's just a name)
    expect(md).toContain("secret_salaries.csv");

    // No content field would appear (the struct has none — this is a soft check)
    expect(md).not.toContain('"content"');

    // The size appears as bytes, not content
    expect(md).toContain("9999 bytes");
  });

  it("does not leak credentials or paths in tool reports", () => {
    const md = formatDiagnosticMarkdown({
      report: FIXTURE,
      chapterSlug: null,
      mode: "real",
      sandboxFiles: [],
    });

    // Tool section uses cmd name and version — no paths
    expect(md).toContain("python3");
    expect(md).toContain("Python 3.13.0");
    // No home directory paths
    expect(md).not.toMatch(/\/Users\//);
    expect(md).not.toMatch(/\/home\//);
  });

  it("sandbox file list shows filenames only, no content", () => {
    const md = formatDiagnosticMarkdown({
      report: FIXTURE,
      chapterSlug: "01-ai-tools-vs-chatgpt",
      mode: "sandbox",
      sandboxFiles: [".progress/first-step-completed", ".progress/comparison-viewed"],
    });

    expect(md).toContain("沙箱虚拟文件系统");
    expect(md).toContain(".progress/first-step-completed");
    // No file content leaked (VirtualFs.list() returns paths, not content)
    // This is enforced by passing only sandboxFiles (paths), not file content
    expect(md).not.toContain('"content"');
  });

  it("includes the message template for sending to husband", () => {
    const md = formatDiagnosticMarkdown({
      report: FIXTURE,
      chapterSlug: "01-ai-tools-vs-chatgpt",
      mode: "sandbox",
      sandboxFiles: [],
    });

    expect(md).toContain("发给老公");
    expect(md).toContain("记账杀手");
    expect(md).toContain("卡住了");
  });
});
