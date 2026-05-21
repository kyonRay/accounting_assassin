import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch06Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch06Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const versionChecked = await fs.exists(".progress/claude-version-checked");
  const firstConversation = await fs.exists(".progress/first-conversation");
  const configVerified = await fs.exists(".progress/claude-config-verified");

  if (versionChecked && firstConversation && configVerified) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!versionChecked) missing.push("检查 Claude 版本（claude --version）");
  if (!firstConversation) missing.push("开启第一次对话（cd ~/accounting-learner && claude）");
  if (!configVerified) missing.push("确认 ~/.claude/ 目录已创建");

  const firstHint =
    missing.length === 3
      ? "三个步骤都还没完成。先从 claude --version 验证安装，再开启第一次对话，最后确认配置目录。"
      : `还差：${missing.join("；")}。回到对应步骤，在自己的终端里操作，完成后点「我跑完了」。`;

  // Second-attempt: name the exact marker ids
  const missingIds: string[] = [];
  if (!versionChecked) missingIds.push('"claude-version-checked"');
  if (!firstConversation) missingIds.push('"first-conversation"');
  if (!configVerified) missingIds.push('"claude-config-verified"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt: suggest StuckButton
  const thirdHint =
    "如果三个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
