import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch02Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch02Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["沙箱状态异常,试试 [重置沙箱] 按钮重新开始。"],
    };
  }

  const readCsv = await fs.exists(".progress/read-csv-completed");
  const basicInfo = await fs.exists(".progress/basic-info-confirmed");
  const reviewedOutliers = await fs.exists(".progress/outliers-reviewed");

  if (readCsv && basicInfo && reviewedOutliers) {
    return { passed: true };
  }

  const hints: string[] = [];
  const missing = [!readCsv, !basicInfo, !reviewedOutliers].filter(Boolean).length;
  if (missing === 3) {
    hints.push(
      "你似乎跳过了三步实操,先回到上面让 AI 看一下 bank-statement.csv,再让它报告基本信息,最后确认可疑大额。",
    );
  } else if (!readCsv) {
    hints.push(
      "第一步:让 AI 看一下 bank-statement.csv —— 它会用 Read 工具打开文件,你需要看到那个 🔧 Read 标记。",
    );
  } else if (!basicInfo) {
    hints.push(
      "第二步是『信任传递』的第一道关:让 AI 先报告总行数、字段名、总金额。看到具体数字 = AI 真的跑了脚本,而不是凭印象瞎说。",
    );
  } else if (!reviewedOutliers) {
    hints.push(
      "AI 已经标出可疑大额了,你需要确认看过这些结果 —— 找到本章最后一处 SandboxStep,点'我做完了'。",
    );
  }
  hints.push(
    '具体来说:本章三处 SandboxStep 的 id 依次是 "read-csv-completed"、"basic-info-confirmed"、"outliers-reviewed",每处都需要点\'我做完了\'按钮。',
  );
  hints.push(
    "如果三个按钮都已经点过但还失败,可能是沙箱状态被重置了 —— 试试重新过一遍本章。",
  );

  return { passed: false, hints };
};
