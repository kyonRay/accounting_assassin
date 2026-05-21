import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch03Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch03Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["沙箱状态异常,试试 [重置沙箱] 按钮重新开始。"],
    };
  }

  const scriptWritten = await fs.exists(".progress/script-written");
  const outputVerified = await fs.exists(".progress/output-verified");

  if (scriptWritten && outputVerified) {
    return { passed: true };
  }

  const hints: string[] = [];
  // First-attempt directional hint
  if (!scriptWritten && !outputVerified) {
    hints.push(
      "你似乎跳过了两步实操,先回到上面看 AI 写代码,再看沙箱跑出的结果。",
    );
  } else if (!scriptWritten) {
    hints.push(
      "第一步:看 AI 写出的 Python 代码 —— 那段代码就在课文中,看完点'我做完了'。",
    );
  } else if (!outputVerified) {
    hints.push(
      "第二步:看沙箱真的把那段代码跑出来的结果 —— 几条按类目汇总的数字,看明白后点'我做完了'。",
    );
  }
  // Second-attempt more specific
  hints.push(
    "具体来说:本章第一处 SandboxStep 的 id 是 \"script-written\",第二处是 \"output-verified\",两处都需要点'我做完了'按钮。",
  );
  // Third-attempt nudge toward answer (rare path)
  hints.push(
    "如果两个按钮都已经点过但还失败,可能是沙箱状态被重置了 —— 试试重新过一遍本章。",
  );

  return { passed: false, hints };
};
