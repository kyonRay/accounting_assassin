// content/chapters/02-show-files-to-ai/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Minimal inline fixture — just enough rows to exercise the checker.
// The real fixture file (sandbox-fixture/bank-statement.csv) is verified
// separately below (Test #5) via node:fs.
const FIXTURE = {
  "bank-statement.csv": [
    "date,vendor,category,amount",
    "2026-01-05,家乐福超市,日用,245.80",
    "2026-01-12,海底捞火锅,餐饮,328.50",
    "2026-01-20,12306铁路购票,差旅,560.00",
    "2026-02-03,腾讯云,办公,899.00",
    "2026-02-18,海外汇出,未知,45800.00",
    "2026-03-10,星巴克,餐饮,68.00",
    "2026-04-10,异常账户,未知,52000.00",
    "2026-05-07,私人借款,未知,31500.00",
    "2026-06-01,沙县小吃,餐饮,42.00",
    "2026-06-20,海外汇出,未知,67000.00",
  ].join("\n"),
};

describe("Ch 02 · 给 AI 看真实文件", () => {
  it("完美用户路径:两步实操都完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/read-csv-completed", "done");
    await fs.write(".progress/outliers-reviewed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 read-csv-completed marker → 第一次提示含 读取/csv 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/outliers-reviewed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/看一下|读取|csv/i);
  });

  it("缺少 outliers-reviewed marker → 第一次提示含 确认/可疑/大额 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/read-csv-completed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/确认|可疑|大额/i);
  });

  it("第 3 次提交仍无 marker → passed: false, showAnswerButton: true", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);

    const result = await runChecker(check, { mode: "sandbox", fs }, 3);
    expect(result.passed).toBe(false);
    expect(result.showAnswerButton).toBe(true);
  });

  it("fixture 文件存在且至少有 200 行数据(不含 header)", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const csvPath = nodePath.resolve(
      dir,
      "sandbox-fixture/bank-statement.csv",
    );
    const text = await nodeFs.readFile(csvPath, "utf-8");
    const lines = text.trim().split("\n");
    // First line is header; remaining are data rows
    const dataRows = lines.length - 1;
    expect(
      dataRows,
      `bank-statement.csv 应有至少 200 行数据,实际 ${dataRows} 行`,
    ).toBeGreaterThanOrEqual(200);
  });
});
