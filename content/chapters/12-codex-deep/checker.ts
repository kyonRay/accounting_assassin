import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch12Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch12Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const workspaceSnapshotted = await fs.exists(
    ".progress/workspace-snapshotted",
  );
  const batchInputPrepared = await fs.exists(".progress/batch-input-prepared");
  const autoApproveTried = await fs.exists(".progress/auto-approve-tried");
  const safetyRuleUnderstood = await fs.exists(
    ".progress/safety-rule-understood",
  );

  if (
    workspaceSnapshotted &&
    batchInputPrepared &&
    autoApproveTried &&
    safetyRuleUnderstood
  ) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!workspaceSnapshotted)
    missing.push("提交 Git 快照（snapshot）——在批量跑之前给工作区做一次存档");
  if (!batchInputPrepared)
    missing.push("准备好批量处理用的 CSV 文件（放入 data/raw/ 目录）");
  if (!autoApproveTried)
    missing.push("用 codex exec 命令（自动审批模式）跑一次批量任务");
  if (!safetyRuleUnderstood)
    missing.push("阅读并理解「什么时候不该用 auto-approve」四条安全规则");

  const firstHint =
    missing.length === 4
      ? "四个步骤都还没完成。先提交 Git 快照保护工作区，准备好批量 CSV 文件，" +
        "然后用 codex exec 体验自动审批模式，最后阅读安全规则卡片。"
      : `还差：${missing.join("；")}。回到对应步骤，在终端里完成操作，然后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!workspaceSnapshotted) missingIds.push('"workspace-snapshotted"');
  if (!batchInputPrepared) missingIds.push('"batch-input-prepared"');
  if (!autoApproveTried) missingIds.push('"auto-approve-tried"');
  if (!safetyRuleUnderstood) missingIds.push('"safety-rule-understood"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt hint: suggest StuckButton
  const thirdHint =
    "如果四个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
