import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch03Env {
  fs: VirtualFs;
}

// The 5 categories the lesson promises invoices.csv covers. If any are missing,
// the sandbox state was tampered with or the fixture didn't load — either way
// the lesson's "数字可追溯" claim doesn't hold, so we should not pass.
const EXPECTED_CATEGORIES = ["餐饮", "办公", "差旅", "云服务", "通讯"] as const;

// TODO(Ch3): the SandboxStep components currently only write `.progress/<id>`
// marker files when the learner clicks "我做完了" — the Pyodide script is not
// actually executed end-to-end through the lesson UI (only through the
// integration test in test.ts). When we wire SandboxStep to optionally trigger
// a real `pyodide-runner.run(...)` and capture stdout, replace the
// fixture-category check below with a real stdout assertion that the per-
// category sums appear (e.g. `/办公:\s*\d+\.\d{2}/`). See REVIEW-TRIAGE.md
// item 4 (Ch 03).

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

  // Minimum-viable output validation: even if both markers are set, confirm
  // the fixture invoices.csv is loaded AND contains every category the lesson
  // promised. Catches the case where someone bypassed the sandbox setup
  // (cleared fs, edited fixture, etc.) and would otherwise sail through.
  let fixtureOk = false;
  let missingCategories: string[] = [];
  try {
    const csv = await fs.read("invoices.csv");
    missingCategories = EXPECTED_CATEGORIES.filter((c) => !csv.includes(c));
    fixtureOk = missingCategories.length === 0;
  } catch {
    fixtureOk = false;
    missingCategories = [...EXPECTED_CATEGORIES];
  }

  if (scriptWritten && outputVerified && fixtureOk) {
    return { passed: true };
  }

  const hints: string[] = [];
  // First-attempt directional hint
  if (!fixtureOk && scriptWritten && outputVerified) {
    hints.push(
      `沙箱里的 invoices.csv 状态不对,缺少类目 ${missingCategories.join("/")} —— 试试 [重置沙箱] 按钮重新加载发票数据。`,
    );
  } else if (!scriptWritten && !outputVerified) {
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
