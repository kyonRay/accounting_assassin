import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch11Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch11Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const codexInstalled = await fs.exists(".progress/codex-installed");
  const codexLoggedIn = await fs.exists(".progress/codex-logged-in");
  const firstTaskTried = await fs.exists(".progress/codex-first-task-tried");
  const styleNoticed = await fs.exists(".progress/style-noticed");

  if (codexInstalled && codexLoggedIn && firstTaskTried && styleNoticed) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!codexInstalled) missing.push("安装 Codex CLI（npm install -g @openai/codex 或 brew install --cask codex）");
  if (!codexLoggedIn) missing.push("完成 codex login 登录流程");
  if (!firstTaskTried) missing.push("用 Codex 完成银行流水 CSV 分类任务");
  if (!styleNoticed) missing.push("阅读并反思 Codex 与 Claude 的工作风格差异");

  const firstHint =
    missing.length === 4
      ? "四个步骤都还没完成。先安装 Codex CLI，登录后在工作目录里跑一次真实任务，最后阅读风格对比内容。"
      : `还差：${missing.join("；")}。回到对应步骤，在终端里完成操作，然后点「我跑完了」。`;

  // Second-attempt: name the exact marker ids
  const missingIds: string[] = [];
  if (!codexInstalled) missingIds.push('"codex-installed"');
  if (!codexLoggedIn) missingIds.push('"codex-logged-in"');
  if (!firstTaskTried) missingIds.push('"codex-first-task-tried"');
  if (!styleNoticed) missingIds.push('"style-noticed"');

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
