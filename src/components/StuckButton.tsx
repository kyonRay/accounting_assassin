/**
 * StuckButton — "我卡住了" floating button + diagnostic modal.
 *
 * Universally present on every screen (mounted once at App root level).
 * Gray in sandbox mode, amber in real-env mode.
 *
 * Click → collects the diagnostic report from Rust, formats it as markdown,
 * then lets the user copy to clipboard or save to a file.
 *
 * Privacy guarantees (enforced Rust-side, verified TS-side):
 * - No user file content in the report.
 * - No paths outside ~/accounting-learner/.
 * - No credentials of any kind.
 * - No `path` field on ToolReport (would leak the real user home dir name).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useProgress, useCrashStore } from "@/modules/Progress";
import type { CrashRecord } from "@/modules/Progress";
import { collectDiagnostics } from "@/modules/RealEnvBridge";
import type { DiagnosticReport } from "@/modules/RealEnvBridge";
import { useOptionalChapterRunner } from "@/modules/ChapterRunner";
import { CHAPTERS } from "@/curriculum";
import type { AppMode } from "@/modules/Progress/store";
import { STUCK_EVENT } from "@/components/ErrorBoundary";

// ─── Markdown formatter ───────────────────────────────────────────────────────

export interface FormatArgs {
  report: DiagnosticReport;
  chapterSlug: string | null;
  mode: AppMode;
  sandboxFiles: string[];
  /** Most recent in-memory crash, if any. Appended as a final section. */
  lastCrash?: CrashRecord | null;
}

/**
 * Pure function: formats a DiagnosticReport into a user-friendly markdown string.
 *
 * Allowlist self-check: uses only DiagnosticReport fields (appVersion, osVersion,
 * arch, workspaceExists, workspaceTopLevel[name/kind/sizeBytes], tools[cmd/found/version],
 * timestampUtc) plus chapterSlug, mode, sandboxFiles (virtual fs filenames, no content).
 * NO file content. NO full paths. NO credentials.
 */
export function formatDiagnosticMarkdown({
  report,
  chapterSlug,
  mode,
  sandboxFiles,
  lastCrash = null,
}: FormatArgs): string {
  const chapterMeta = chapterSlug ? CHAPTERS.find((c) => c.slug === chapterSlug) : null;
  const chapterLabel = chapterMeta
    ? `${chapterMeta.num.toString().padStart(2, "0")}. ${chapterMeta.title} (${chapterSlug})`
    : chapterSlug ?? "未知";
  const modeLabel = mode === "real" ? "真实环境" : "沙箱模式";

  // Tool table
  const toolRows = report.tools
    .map((t) => {
      const statusIcon = t.found ? "✅" : "❌ 未安装";
      const version = t.version ?? "—";
      return `| ${t.cmd.toLowerCase().padEnd(8)} | ${statusIcon} | ${version} |`;
    })
    .join("\n");

  // Workspace section
  let workspaceSection: string;
  if (!report.workspaceExists) {
    workspaceSection = "存在: 否（尚未初始化真实环境）";
  } else if (report.workspaceTopLevel.length === 0) {
    workspaceSection = "存在: 是\n顶层内容: （空）";
  } else {
    const entries = report.workspaceTopLevel
      .map((e) => {
        if (e.kind === "File") {
          const size = e.sizeBytes !== null ? `${e.sizeBytes} bytes` : "?";
          return `- ${e.name} (file, ${size})`;
        }
        return `- ${e.name}/ (directory)`;
      })
      .join("\n");
    workspaceSection = `存在: 是\n顶层内容:\n${entries}`;
  }

  // Sandbox vfs section (optional — only shown when in a sandbox chapter with files)
  let sandboxSection = "";
  if (sandboxFiles.length > 0) {
    const fileList = sandboxFiles.map((f) => `- ${f}`).join("\n");
    sandboxSection = `\n## 沙箱虚拟文件系统\n文件:\n${fileList}\n`;
  }

  // Crash section (optional — only shown when a crash was recorded since
  // App start). Per spec § 8.5 the stack is already sanitized at record
  // time inside the crash store, so we can render it verbatim here.
  let crashSection = "";
  if (lastCrash) {
    const stackBlock = lastCrash.stack
      ? `\n\`\`\`\n${lastCrash.stack}\n\`\`\`\n`
      : "";
    crashSection = `\n## 最近一次崩溃
- 时间: ${lastCrash.timestampUtc}
- 错误类型: ${lastCrash.name}
- 错误信息: ${lastCrash.message}
${stackBlock}`;
  }

  return `# 📋 学习诊断报告

**生成时间**: ${report.timestampUtc}
**App 版本**: ${report.appVersion}
**系统**: macOS ${report.osVersion} (${report.arch})

## 当前进度
- 章节: ${chapterLabel}
- 模式: ${modeLabel}

## 工具状态
| 工具 | 状态 | 版本 |
|---|---|---|
${toolRows}

## 工作区 (~/accounting-learner/)
${workspaceSection}
${sandboxSection}${crashSection}
---

下面是要发给老公的消息模板:

> 嗨，我在「记账杀手」的「${chapterMeta?.title ?? chapterSlug ?? "某"}」章节卡住了。这是 App 给我整理的状况:
>
> [把上面的报告复制到这里]
`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface StuckButtonProps {
  /** Reserved for future use — currently always bottom-right */
  placement?: "bottom-right";
}

type ModalState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "ready"; markdown: string }
  | { stage: "error"; message: string };

export function StuckButton({ placement: _placement = "bottom-right" }: StuckButtonProps) {
  const mode = useProgress((s) => s.mode);
  const currentChapter = useProgress((s) => s.currentChapter);
  const [modal, setModal] = useState<ModalState>({ stage: "idle" });
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Optional sandbox VFS — only available when inside a LessonViewer context
  const runner = useOptionalChapterRunner();

  const isReal = mode === "real";

  async function handleOpen() {
    setModal({ stage: "loading" });
    try {
      const report = await collectDiagnostics();

      // Collect sandbox vfs file list (filenames only, no content — fs.list() returns paths)
      let sandboxFiles: string[] = [];
      if (runner) {
        sandboxFiles = await runner.fs.list();
      }

      // Read the most recent in-memory crash (if any) so the report can
      // tell the user's helper what went wrong, automatically.
      const lastCrash = useCrashStore.getState().lastCrash;

      const markdown = formatDiagnosticMarkdown({
        report,
        chapterSlug: currentChapter,
        mode,
        sandboxFiles,
        lastCrash,
      });
      setModal({ stage: "ready", markdown });
    } catch (e) {
      setModal({
        stage: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Listen for the global "open stuck" event so the ErrorBoundary's
  // fallback (and anything else needing an escape hatch) can summon us
  // without holding a direct reference.
  useEffect(() => {
    const onOpen = () => {
      // Avoid re-triggering if already open.
      if (modal.stage === "idle") {
        void handleOpen();
      }
    };
    window.addEventListener(STUCK_EVENT, onOpen);
    return () => window.removeEventListener(STUCK_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.stage]);

  function handleClose() {
    setModal({ stage: "idle" });
    setCopyFeedback(false);
  }

  async function handleCopy() {
    if (modal.stage !== "ready") return;
    try {
      await navigator.clipboard.writeText(modal.markdown);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g., insecure context in tests). Silently ignore.
    }
  }

  function handleSave() {
    if (modal.stage !== "ready") return;
    const blob = new Blob([modal.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `诊断报告-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Button styles: gray in sandbox, amber in real ──────────────────────────
  const buttonClass = isReal
    ? "bg-realenv/20 text-realenv border border-realenv/50 hover:bg-realenv/30"
    : "bg-muted/20 text-graphite border border-graphite/20 hover:bg-muted/30";

  const button = (
    <button
      type="button"
      aria-label="我卡住了 — 打开诊断报告"
      data-testid="stuck-button"
      onClick={handleOpen}
      className={[
        "fixed bottom-6 right-6 z-50",
        "w-14 h-14 rounded-full",
        "flex items-center justify-center",
        "text-sm font-medium leading-tight text-center",
        "shadow-md transition-colors",
        buttonClass,
      ].join(" ")}
    >
      卡住了
    </button>
  );

  if (modal.stage === "idle") {
    return button;
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="诊断报告"
      data-testid="stuck-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-2xl border border-graphite/10 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-graphite/10 flex-shrink-0">
          <h2 className="text-lg font-bold text-graphite">
            卡住了？我来帮你整理一下情况。
          </h2>
          <p className="text-xs text-muted mt-1">
            下面是 App 收集到的状态信息。你可以复制后发给老公，让他帮你排查。
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {modal.stage === "loading" && (
            <div className="flex items-center gap-3 text-muted text-sm">
              <span
                className="w-4 h-4 border-2 border-graphite/40 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              正在收集诊断信息…
            </div>
          )}

          {modal.stage === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-graphite font-medium">收集信息时遇到了问题：</p>
              <pre className="text-xs text-muted bg-graphite/5 rounded p-3 whitespace-pre-wrap font-mono">
                {modal.message}
              </pre>
            </div>
          )}

          {modal.stage === "ready" && (
            <pre
              data-testid="stuck-markdown-preview"
              className="text-xs text-graphite font-mono whitespace-pre-wrap leading-relaxed"
            >
              {modal.markdown}
            </pre>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-graphite/10 flex-shrink-0 flex gap-3 justify-end">
          {modal.stage === "ready" && (
            <>
              <button
                type="button"
                data-testid="stuck-copy-btn"
                onClick={handleCopy}
                className="px-4 py-2 text-sm font-medium bg-graphite/5 text-graphite rounded-lg hover:bg-graphite/10 transition-colors"
              >
                {copyFeedback ? "已复制 ✓" : "复制到剪贴板"}
              </button>
              <button
                type="button"
                data-testid="stuck-save-btn"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium bg-graphite/5 text-graphite rounded-lg hover:bg-graphite/10 transition-colors"
              >
                保存为文件
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="stuck-close-btn"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium border border-graphite/20 text-graphite rounded-lg hover:bg-graphite/5 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {button}
      {createPortal(overlay, document.body)}
    </>
  );
}
