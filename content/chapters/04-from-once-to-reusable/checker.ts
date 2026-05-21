import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch04Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch04Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["沙箱状态异常,试试 [重置沙箱] 按钮重新开始。"],
    };
  }

  const scriptWritten = await fs.exists(".progress/script-written");
  const firstRun = await fs.exists(".progress/first-run-done");
  const reused = await fs.exists(".progress/reused-on-new-month");

  if (scriptWritten && firstRun && reused) {
    return { passed: true };
  }

  const hints: string[] = [];

  // First-attempt directional hint
  if (!scriptWritten) {
    hints.push(
      "第一步:看 AI 写出能批量处理 12 个月的脚本 —— 那段代码就在课文中,看完点'我做完了'。",
    );
  } else if (!firstRun) {
    hints.push(
      "第二步:看沙箱跑出 12 个月的汇总结果 —— 看明白后点'我做完了'。",
    );
  } else if (!reused) {
    hints.push(
      "第三步:本章的核心 —— 假装下个月又来了新文件,用**同一段脚本**再跑一次,体验'写一次跑 N 次'的复用感。",
    );
  }

  // Second-attempt more specific
  hints.push(
    "具体来说:三处 SandboxStep 的 id 依次是 \"script-written\" / \"first-run-done\" / \"reused-on-new-month\",三处都需要点'我做完了'。",
  );

  // Third-attempt nudge toward answer (rare path)
  hints.push(
    "如果都点过了还失败,可能是沙箱状态被重置了 —— 重新过一遍本章。",
  );

  return { passed: false, hints };
};
