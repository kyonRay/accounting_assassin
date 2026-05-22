/**
 * Settings — gear-icon entry + modal with:
 *   1. Manual mode reset (real → sandbox), double-confirm
 *   2. Reset all progress, double-confirm
 *   3. "重新启用本 App" macOS Gatekeeper help (design § 10.2)
 *   4. Manual download placeholder (design § 10.3)
 *
 * Mounted once at App root level (alongside StuckButton). The gear button is
 * embedded in the footer at the bottom-right of App.tsx via consumer placement —
 * the component renders the button + the portal-based modal, so the parent
 * just drops <Settings /> wherever it wants the gear to sit (currently inside
 * the footer next to "进度 N/15").
 *
 * Double-confirm is rendered as an in-modal section swap (not window.confirm),
 * so it can be styled and clearly state what will be lost.
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import { useProgress } from "@/modules/Progress";

// TODO: replace with real release URL once published
const GITHUB_RELEASE_URL = "https://github.com/TODO/accounting-assassin/releases";

type ConfirmStage = "idle" | "confirm-mode" | "confirm-reset";

export function Settings() {
  const mode = useProgress((s) => s.mode);
  const setMode = useProgress((s) => s.setMode);
  const resetProgress = useProgress((s) => s.resetProgress);

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmStage>("idle");
  const [xattrCopied, setXattrCopied] = useState(false);

  function handleOpen() {
    setOpen(true);
    setConfirm("idle");
  }

  function handleClose() {
    setOpen(false);
    setConfirm("idle");
    setXattrCopied(false);
  }

  function handleConfirmModeReset() {
    setMode("sandbox");
    setConfirm("idle");
  }

  function handleConfirmFullReset() {
    resetProgress();
    setConfirm("idle");
    setOpen(false);
  }

  async function handleCopyXattr() {
    const cmd =
      "xattr -dr com.apple.quarantine /Applications/AccountingAssassin.app";
    try {
      await navigator.clipboard.writeText(cmd);
      setXattrCopied(true);
      setTimeout(() => setXattrCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context in tests). Silently ignore.
    }
  }

  function handleOpenReleasePage() {
    // window.open is allowed in webview; Tauri shell.open would be cleaner
    // but adds a plugin dep. Plain anchor target is fine for an external URL.
    window.open(GITHUB_RELEASE_URL, "_blank", "noopener,noreferrer");
  }

  // ── Gear button (inline, NOT floating) ─────────────────────────────────────
  const gearButton = (
    <button
      type="button"
      aria-label="打开设置"
      data-testid="settings-gear-btn"
      onClick={handleOpen}
      className={[
        "inline-flex items-center justify-center",
        "w-6 h-6 rounded-md",
        "text-muted hover:text-graphite hover:bg-graphite/5",
        "transition-colors",
      ].join(" ")}
      title="设置"
    >
      {/* Inline SVG gear — no extra icon dep */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );

  if (!open) {
    return gearButton;
  }

  // ── Modal sections ─────────────────────────────────────────────────────────

  const sandboxAlready = mode === "sandbox";

  const modeSection =
    confirm === "confirm-mode" ? (
      <section
        data-testid="settings-mode-confirm"
        className="rounded-lg border border-realenv/40 bg-realenv/5 p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-graphite">
          确认切回沙箱模式?
        </h3>
        <p className="text-xs text-graphite/80 leading-relaxed">
          这个操作会把你切回沙箱模式。章节完成记录不会丢,但下次进入第 5 章及以后的
          真实环境章节时,App 会再请你做一次「环境切换仪式」,重新检查工具与作业本。
        </p>
        <p className="text-xs text-muted">
          沙箱模式适合复习概念;只要你回到 Ch 5+,模式会自动再次切换到真实环境。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="settings-mode-confirm-yes"
            onClick={handleConfirmModeReset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-realenv text-white hover:bg-realenv/90 transition-colors"
          >
            确认,切回沙箱
          </button>
          <button
            type="button"
            data-testid="settings-mode-confirm-cancel"
            onClick={() => setConfirm("idle")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-graphite/20 text-graphite hover:bg-graphite/5 transition-colors"
          >
            算了,不切
          </button>
        </div>
      </section>
    ) : (
      <section className="rounded-lg border border-graphite/10 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-graphite">模式</h3>
        <p className="text-xs text-muted">
          当前模式:
          <span
            className={[
              "ml-1 inline-block px-1.5 py-0.5 rounded",
              mode === "real"
                ? "bg-realenv/10 text-realenv"
                : "bg-sandbox/10 text-sandbox",
            ].join(" ")}
            data-testid="settings-current-mode"
          >
            {mode === "real" ? "🛠️ 真实环境" : "🧪 沙箱模式"}
          </span>
        </p>
        <p className="text-xs text-graphite/70 leading-relaxed">
          切回沙箱模式是一次「主动后退」:用于你想再走一遍切换仪式,或者真实环境
          出了点状况想先回到沙箱稳一稳。章节进度不会被清空。
        </p>
        <button
          type="button"
          data-testid="settings-mode-reset-btn"
          disabled={sandboxAlready}
          onClick={() => setConfirm("confirm-mode")}
          className={[
            "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
            sandboxAlready
              ? "bg-graphite/5 text-muted cursor-not-allowed"
              : "border border-realenv/40 text-realenv hover:bg-realenv/10",
          ].join(" ")}
        >
          {sandboxAlready ? "已是沙箱模式" : "切回沙箱模式"}
        </button>
      </section>
    );

  const resetSection =
    confirm === "confirm-reset" ? (
      <section
        data-testid="settings-reset-confirm"
        className="rounded-lg border border-graphite/30 bg-graphite/5 p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-graphite">
          确认重置所有进度?
        </h3>
        <p className="text-xs text-graphite/80 leading-relaxed">
          进度将全部清空,你将回到欢迎页。具体会被清掉的:
        </p>
        <ul className="text-xs text-graphite/80 list-disc pl-5 space-y-0.5">
          <li>所有章节的完成记录</li>
          <li>当前阅读到的章节</li>
          <li>沙箱/真实环境模式</li>
          <li>「我已经看过欢迎页」的标记</li>
        </ul>
        <p className="text-xs text-muted">
          作业本目录(<code className="font-mono">~/accounting-learner/</code>)
          不会被删,如果你确实想清掉,需要去 Finder 手动删除。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="settings-reset-confirm-yes"
            onClick={handleConfirmFullReset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-graphite text-white hover:bg-graphite/90 transition-colors"
          >
            我确定,全部清空
          </button>
          <button
            type="button"
            data-testid="settings-reset-confirm-cancel"
            onClick={() => setConfirm("idle")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-graphite/20 text-graphite hover:bg-graphite/5 transition-colors"
          >
            还是算了
          </button>
        </div>
      </section>
    ) : (
      <section className="rounded-lg border border-graphite/10 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-graphite">重置进度</h3>
        <p className="text-xs text-graphite/70 leading-relaxed">
          清空所有章节进度并回到欢迎页。一般只在你想完全从头再走一遍时才用。
        </p>
        <button
          type="button"
          data-testid="settings-reset-btn"
          onClick={() => setConfirm("confirm-reset")}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-graphite/30 text-graphite hover:bg-graphite/5 transition-colors"
        >
          重置所有进度
        </button>
      </section>
    );

  const gatekeeperSection = (
    <section
      data-testid="settings-gatekeeper-help"
      className="rounded-lg border border-graphite/10 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-graphite">
        重新启用本 App(打不开 / 被系统拦下来了)
      </h3>
      <p className="text-xs text-graphite/70 leading-relaxed">
        macOS 偶尔会在系统升级后再次把这个 App 标成「未识别」。下面三条路径按顺序试,
        总有一条管用。试完都不行就走兜底,找老公。
      </p>

      <ol className="text-xs text-graphite/85 list-decimal pl-5 space-y-2 leading-relaxed">
        <li>
          打开<strong>系统设置 → 隐私与安全性</strong>,
          滑到最底部,会看到一行小字
          <em>「App 已被阻止」</em>,旁边有按钮
          <strong>「仍要打开」</strong>,点它,然后输入密码确认。
        </li>
        <li>
          如果是从 iCloud/AirDrop 装过来的,quarantine 标记会比较顽固。打开终端,
          复制粘贴这一行命令并按 Enter:
          <div className="mt-1 flex items-center gap-2">
            <code className="block bg-graphite/5 rounded px-2 py-1 font-mono text-[11px] text-graphite flex-1 overflow-x-auto">
              xattr -dr com.apple.quarantine
              /Applications/AccountingAssassin.app
            </code>
            <button
              type="button"
              data-testid="settings-xattr-copy-btn"
              onClick={handleCopyXattr}
              className="px-2 py-1 text-[11px] font-medium rounded-md bg-graphite/5 text-graphite hover:bg-graphite/10 transition-colors flex-shrink-0"
            >
              {xattrCopied ? "已复制 ✓" : "复制"}
            </button>
          </div>
        </li>
        <li>
          如果是<strong>系统升级之后</strong>又被拦下来的,处理方法跟第 1 条一样:
          系统设置 → 隐私与安全性 → 滑到底部 →「仍要打开」。
        </li>
      </ol>

      <p className="text-xs text-muted leading-relaxed">
        兜底:三条都不行,直接<strong>找老公</strong>—— 给他发个短信
        <span className="font-mono">「App 打不开」</span>加上一张截屏,他能远程帮你。
      </p>
    </section>
  );

  const updateSection = (
    <section
      data-testid="settings-update-help"
      className="rounded-lg border border-graphite/10 p-4 space-y-2"
    >
      <h3 className="text-sm font-semibold text-graphite">手动下载最新版本</h3>
      <p className="text-xs text-graphite/70 leading-relaxed">
        正常情况下 App 会自己提醒你升级。如果一直没动静,或者升级失败了,可以
        到 GitHub Release 页面手动下载一份新的 .dmg。
      </p>
      <button
        type="button"
        data-testid="settings-release-btn"
        onClick={handleOpenReleasePage}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-graphite/20 text-graphite hover:bg-graphite/5 transition-colors"
      >
        前往 GitHub Release 页面
      </button>
    </section>
  );

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-2xl border border-graphite/10 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-graphite/10 flex-shrink-0">
          <h2 className="text-lg font-bold text-graphite">设置</h2>
          <p className="text-xs text-muted mt-1">
            模式重置、进度重置,以及 App 打不开时的几条自救路径。
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4 bg-cream/40">
          {modeSection}
          {resetSection}
          {gatekeeperSection}
          {updateSection}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-graphite/10 flex-shrink-0 flex justify-end">
          <button
            type="button"
            data-testid="settings-close-btn"
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
      {gearButton}
      {createPortal(overlay, document.body)}
    </>
  );
}

export default Settings;
