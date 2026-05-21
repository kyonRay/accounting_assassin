import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch09Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch09Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const conceptUnderstood = await fs.exists(
    ".progress/skill-concept-understood",
  );
  const skillFileWritten = await fs.exists(".progress/skill-file-written");
  const skillInvoked = await fs.exists(".progress/skill-invoked-by-claude");
  const testedOnRealData = await fs.exists(
    ".progress/skill-tested-on-real-data",
  );

  if (conceptUnderstood && skillFileWritten && skillInvoked && testedOnRealData) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!conceptUnderstood)
    missing.push("阅读「Skill 是什么」开篇，理解 Skill 说明书与一次性脚本的区别");
  if (!skillFileWritten)
    missing.push(
      "创建 ~/.claude/skills/organize-invoices/SKILL.md（organize-invoices skill 文件）",
    );
  if (!skillInvoked)
    missing.push(
      "开一个新 Claude 会话，用自然语言触发 Skill，确认 Claude 自动识别并调用",
    );
  if (!testedOnRealData)
    missing.push("把真实发票放入 ~/accounting-learner/invoices/ 并跑完整个 Skill 流程");

  const firstHint =
    missing.length === 4
      ? [
          "四个步骤都还没完成。",
          "先读开篇理解 Skill 和一次性脚本的区别，",
          "然后创建 organize-invoices 的 SKILL.md 文件，",
          "再开新会话让 Claude 自动调用它，",
          "最后在真实发票上跑一遍完整流程。",
        ].join("")
      : `还差：${missing.join("；")}。回到对应步骤，完成操作后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!conceptUnderstood) missingIds.push('"skill-concept-understood"');
  if (!skillFileWritten) missingIds.push('"skill-file-written"');
  if (!skillInvoked) missingIds.push('"skill-invoked-by-claude"');
  if (!testedOnRealData) missingIds.push('"skill-tested-on-real-data"');

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
