import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch05Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch05Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常,试试刷新页面后重新开始。"],
    };
  }

  const brewInstalled = await fs.exists(".progress/brew-installed");
  const pythonInstalled = await fs.exists(".progress/python-installed");
  const gitInstalled = await fs.exists(".progress/git-installed");
  const claudeInstalled = await fs.exists(".progress/claude-installed");

  if (brewInstalled && pythonInstalled && gitInstalled && claudeInstalled) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!brewInstalled) missing.push("Homebrew（brew 安装器）");
  if (!pythonInstalled) missing.push("Python（brew install python）");
  if (!gitInstalled) missing.push("Git（brew install git）");
  if (!claudeInstalled) missing.push("Claude Code");

  const firstHint =
    missing.length === 4
      ? "四个安装步骤都还没完成，从第一步装 Homebrew 开始，每步跑完后点「我跑完了」。"
      : `还差：${missing.join("、")}。回到对应步骤，在自己的终端里跑命令，跑完后点「我跑完了」。`;

  // Second-attempt: name the exact marker ids
  const missingIds: string[] = [];
  if (!brewInstalled) missingIds.push('"brew-installed"');
  if (!pythonInstalled) missingIds.push('"python-installed"');
  if (!gitInstalled) missingIds.push('"git-installed"');
  if (!claudeInstalled) missingIds.push('"claude-installed"');

  const secondHint =
    `具体来说，还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果命令已经跑过了但没点按钮，请回去点一下。";

  // Third-attempt: suggest StuckButton
  const thirdHint =
    "如果四个「我跑完了」都已经点过但校验还不通过，说明可能出了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
