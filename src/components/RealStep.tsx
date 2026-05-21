import { useState } from "react";
import type { ReactNode } from "react";
import { useOptionalChapterRunner } from "@/modules/ChapterRunner";
import { useRealEnv } from "@/modules/RealEnvBridge";
import type { AllowedCommand } from "@/modules/RealEnvBridge";

export interface RealStepProps {
  /** Unique step id within the chapter, used as the vfs marker key */
  id: string;
  /** Shell command shown to user, rendered as a code block with a copy button */
  command?: string;
  /**
   * If set, gate the "我跑完了" button on this CLI being present in the
   * health-check snapshot.
   */
  expectsCli?: AllowedCommand;
  /** Explanatory content displayed before the action area */
  children: ReactNode;
  /** Called after the vfs marker is written */
  onComplete?: (id: string) => void;
}

export function RealStep({
  id,
  command,
  expectsCli,
  children,
  onComplete,
}: RealStepProps) {
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const runtime = useOptionalChapterRunner();
  const { snapshot, error, refresh } = useRealEnv();

  // Resolve CLI gate state:
  // - null snapshot + no error → still loading
  // - null snapshot + error    → health check failed (show retry banner)
  // - expectsCli in missing    → blocked (show downgrade banner)
  // - otherwise                → allowed
  const cliMissing =
    expectsCli !== undefined &&
    snapshot !== null &&
    snapshot.missing.includes(expectsCli);

  const stillLoading = expectsCli !== undefined && snapshot === null && !error;
  const healthCheckFailed = expectsCli !== undefined && snapshot === null && error !== null;

  async function handleComplete() {
    if (runtime) {
      await runtime.markStep(id);
    }
    onComplete?.(id);
    setDone(true);
  }

  async function handleCopy() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be unavailable in some contexts — fail silently
    }
  }

  const buttonDisabled = done || cliMissing || stillLoading || healthCheckFailed;

  return (
    <div className="border border-realenv/30 rounded-lg p-4 my-4 bg-realenv/5">
      <div className="text-graphite text-sm leading-relaxed">{children}</div>

      {command && (
        <div className="mt-3 relative">
          <pre className="bg-graphite/95 text-cream rounded-lg p-3 font-mono text-sm whitespace-pre-wrap pr-20">
            {command}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2 right-2 text-xs bg-graphite/60 hover:bg-graphite/80 text-cream px-2 py-1 rounded transition-colors"
          >
            {copied ? "已复制 ✓" : "复制"}
          </button>
        </div>
      )}

      {cliMissing && (
        <div className="mt-3 text-xs text-realenv/80 bg-realenv/10 border border-realenv/20 rounded p-2">
          ⚠️ 我没在你的电脑上找到{" "}
          <code className="font-mono">{expectsCli}</code>
          ，请先回到第 5 章安装
        </div>
      )}

      {healthCheckFailed && (
        <div className="mt-3 text-xs text-realenv bg-realenv/10 border border-realenv/30 rounded p-2 flex items-center justify-between gap-3">
          <span>⚠️ 检查你电脑上的工具时出错。</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 bg-realenv text-white text-xs font-medium px-3 py-1 rounded hover:bg-realenv/90 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      <div className="mt-4">
        {done ? (
          <span className="inline-flex items-center gap-1 text-done font-semibold text-sm">
            ✓ 已完成
          </span>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={buttonDisabled}
            className="bg-realenv text-white text-sm font-medium px-4 py-2 rounded hover:bg-realenv/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stillLoading ? "检查环境中…" : "我跑完了"}
          </button>
        )}
      </div>
    </div>
  );
}
