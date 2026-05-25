import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch07Env {
  fs: VirtualFs;
}

// TODO(real-env-verification): Ch 07 is a real-env chapter, but this checker
// only inspects vfs sentinel files (`.progress/claude-md-written`, etc.).
// A vfs sentinel proves the user clicked the「我跑完了」button — it does NOT
// prove that `~/accounting-learner/CLAUDE.md` (or `scripts/invoice_ocr.py`)
// actually exists on the user's filesystem.
//
// The Tauri-side `read_user_file` IPC IS implemented (src-tauri/src/commands/fs.rs
// + src/modules/RealEnvBridge/invoke.ts `readUserFile`), so the missing piece
// is plumbing it through the Checker module's env shape (currently VirtualFs-only)
// and updating tests to mock the IPC.
//
// This is a cross-cutting change that affects all real-env chapter checkers
// (Ch 5-10, 12-15), not just Ch 07 — should be done in one pass as a dedicated
// task rather than patched per-chapter. Tracked in REVIEW-TRIAGE.md Ch 07 #5.

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch07Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const claudeMdWritten = await fs.exists(".progress/claude-md-written");
  const scriptWritten = await fs.exists(".progress/invoice-ocr-script-written");
  const scriptRan = await fs.exists(".progress/script-ran-successfully");
  const continueFlowTried = await fs.exists(".progress/continue-flow-tried");

  if (claudeMdWritten && scriptWritten && scriptRan && continueFlowTried) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!claudeMdWritten) missing.push("创建 CLAUDE.md（项目记忆文件）");
  if (!scriptWritten) missing.push("让 Claude 写 invoice_ocr.py 脚本");
  if (!scriptRan) missing.push("跑通脚本（运行 python3 脚本看到输出）");
  if (!continueFlowTried) missing.push("体验 claude --continue 跨会话延续");

  const firstHint =
    missing.length === 4
      ? "四个步骤都还没完成。先写 CLAUDE.md 告诉 Claude 项目背景，再让它写 Python 脚本，跑通后试试 --continue 恢复上次会话。"
      : `还差：${missing.join("；")}。回到对应步骤，在终端里完成操作，然后点「我跑完了」。`;

  // Second-attempt: name the exact marker ids
  const missingIds: string[] = [];
  if (!claudeMdWritten) missingIds.push('"claude-md-written"');
  if (!scriptWritten) missingIds.push('"invoice-ocr-script-written"');
  if (!scriptRan) missingIds.push('"script-ran-successfully"');
  if (!continueFlowTried) missingIds.push('"continue-flow-tried"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt: suggest StuckButton
  const thirdHint =
    "如果四个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
