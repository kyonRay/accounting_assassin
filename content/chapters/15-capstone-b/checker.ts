import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch15Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch15Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const workspacePrepared = await fs.exists(".progress/workspace-prepared");
  const voucherScriptScaffolded = await fs.exists(
    ".progress/voucher-script-scaffolded",
  );
  const skillOrchestratorWritten = await fs.exists(
    ".progress/skill-orchestrator-written",
  );
  const hookInstalled = await fs.exists(".progress/hook-installed");
  const workflowRun = await fs.exists(".progress/workflow-run");
  const reflectionCompleted = await fs.exists(".progress/reflection-completed");

  if (
    workspacePrepared &&
    voucherScriptScaffolded &&
    skillOrchestratorWritten &&
    hookInstalled &&
    workflowRun &&
    reflectionCompleted
  ) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!workspacePrepared)
    missing.push(
      "确认 Ch 14 的三个工具（capstone-a/）存在，并创建 capstone-b/ 工作目录",
    );
  if (!voucherScriptScaffolded)
    missing.push(
      "用 Claude 搭建凭证生成工具（capstone-b/voucher-gen/scripts/make_vouchers.py）",
    );
  if (!skillOrchestratorWritten)
    missing.push(
      "写出 Skill 说明书 ~/.claude/skills/month-end-close/SKILL.md，描述 4 步结账编排",
    );
  if (!hookInstalled)
    missing.push(
      "在 settings.local.json 配置 PostToolUse Hook，监控 capstone-b 文件变化写入日志",
    );
  if (!workflowRun)
    missing.push(
      "对 Claude 说「帮我做本月结账」，让 Skill 完整跑通 4 步工作流，产出 month_end 汇总文件",
    );
  if (!reflectionCompleted)
    missing.push(
      "完成课程终章回顾，读完毕业总结并点「我跑完了」",
    );

  const firstHint =
    missing.length === 6
      ? [
          "六个步骤都还没完成。",
          "先确认 Ch 14 的三个工具都在（capstone-a/），创建 capstone-b/ 目录，",
          "然后用 Claude 搭建凭证生成工具，",
          "写出 month-end-close Skill 说明书，",
          "安装 PostToolUse Hook，",
          "最后运行完整的月末结账工作流，",
          "读完课程总结后完成。",
        ].join("")
      : `还差：${missing.join("；")}。回到对应步骤，完成操作后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!workspacePrepared) missingIds.push('"workspace-prepared"');
  if (!voucherScriptScaffolded) missingIds.push('"voucher-script-scaffolded"');
  if (!skillOrchestratorWritten)
    missingIds.push('"skill-orchestrator-written"');
  if (!hookInstalled) missingIds.push('"hook-installed"');
  if (!workflowRun) missingIds.push('"workflow-run"');
  if (!reflectionCompleted) missingIds.push('"reflection-completed"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt hint: suggest StuckButton
  const thirdHint =
    "如果六个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
