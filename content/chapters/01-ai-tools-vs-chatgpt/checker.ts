import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch01Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch01Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["沙箱状态异常,试试 [重置沙箱] 按钮重新开始。"],
    };
  }

  const sawComparison = await fs.exists(".progress/comparison-viewed");
  const didFirstStep = await fs.exists(".progress/first-step-completed");

  if (sawComparison && didFirstStep) {
    return { passed: true };
  }

  const hints: string[] = [];
  // First-attempt directional hint
  if (!sawComparison && !didFirstStep) {
    hints.push(
      "你似乎跳过了对比演示和第一次实操,先回到上面看完两段再点'我做完了'。",
    );
  } else if (!sawComparison) {
    hints.push(
      "看上去你跳过了'对比演示'那一段,先上去看完两边的差异再继续。",
    );
  } else if (!didFirstStep) {
    hints.push(
      "'对比演示'已经看过了,但还差一次实操 —— 找到本章下半部分的 SandboxStep,做完后点'我做完了'。",
    );
  }
  // Second-attempt more specific
  hints.push(
    "具体来说:本章第一处 SandboxStep 的 id 是 \"comparison-viewed\",第二处是 \"first-step-completed\",两处都需要点'我做完了'按钮。",
  );
  // Third-attempt nudge toward answer (rare path)
  hints.push(
    "如果两个按钮都已经点过但还失败,可能是沙箱状态被重置了 —— 试试重新过一遍本章。",
  );

  return { passed: false, hints };
};
