import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch08Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch08Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const introRead = await fs.exists(".progress/intro-read");
  const templateTried = await fs.exists(".progress/template-tried");
  const exercise1Done = await fs.exists(".progress/exercise-1-encoding-fixed");
  const exercise2Done = await fs.exists(".progress/exercise-2-silent-sum-fixed");
  const exercise3Done = await fs.exists(".progress/exercise-3-git-rollback-done");
  const forwardRefNoted = await fs.exists(".progress/forward-ref-noted");

  if (
    introRead &&
    templateTried &&
    exercise1Done &&
    exercise2Done &&
    exercise3Done &&
    forwardRefNoted
  ) {
    return { passed: true };
  }

  // Build directional first-attempt hint (点 missing 的那步)
  const missing: string[] = [];
  if (!introRead) missing.push("阅读「Bug 不是失败，是对话」开篇（第一节）");
  if (!templateTried) missing.push("用四段式模板整理一次 bug 报告（BugReportCard）");
  if (!exercise1Done) missing.push("完成练习 1：编码 bug（UnicodeDecodeError）修复");
  if (!exercise2Done) missing.push("完成练习 2：静默 bug（合并单元格求和漏行）对数验证");
  if (!exercise3Done) missing.push("完成练习 3：AI 越改越坏 → git restore . 受控回退");
  if (!forwardRefNoted) missing.push("阅读彩蛋：systematic-debugging 技能介绍");

  const firstHint =
    missing.length === 6
      ? [
          "六个步骤都还没完成。",
          "先读开篇理解「Bug 不是失败，是对话」这个心态，",
          "然后按顺序做三个练习（编码 bug / 静默 bug / git restore 回退），",
          "最后看一下彩蛋里关于 systematic-debugging 技能的介绍。",
        ].join("")
      : `还差：${missing.join("；")}。回到对应步骤，在终端里完成操作，然后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!introRead) missingIds.push('"intro-read"');
  if (!templateTried) missingIds.push('"template-tried"');
  if (!exercise1Done) missingIds.push('"exercise-1-encoding-fixed"');
  if (!exercise2Done) missingIds.push('"exercise-2-silent-sum-fixed"');
  if (!exercise3Done) missingIds.push('"exercise-3-git-rollback-done"');
  if (!forwardRefNoted) missingIds.push('"forward-ref-noted"');

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
