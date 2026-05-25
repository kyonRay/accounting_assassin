// content/chapters/02-show-files-to-ai/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Minimal inline fixture — just enough rows to exercise the checker.
// The real fixture file (sandbox-fixture/bank-statement.csv) is verified
// separately below (Test #6) via node:fs.
//
// Schema mirrors a real Chinese bank statement export: 日期/金额/对方户名/摘要/交易类型.
// There is intentionally NO "类别" column — real bank statements never include
// a spending-category field. Anomalies must be inferred from 对方户名 / 摘要 /
// 金额 distribution, not from a pre-labeled category.
const FIXTURE = {
  "bank-statement.csv": [
    "日期,金额,对方户名,摘要,交易类型",
    "2026-01-05,245.80,家乐福超市,POS-消费,消费",
    "2026-01-12,328.50,海底捞火锅,POS-消费,消费",
    "2026-01-20,560.00,12306铁路购票,POS-消费,消费",
    "2026-02-03,899.00,腾讯云,POS-消费,消费",
    "2026-02-18,45800.00,海外汇出,SWIFT跨境-收款行未注明,跨境汇款",
    "2026-03-10,68.00,星巴克,POS-消费,消费",
    "2026-04-10,52000.00,异常账户,对私转账-无附言,转账",
    "2026-05-07,31500.00,私人借款,对私转账-个人借款,转账",
    "2026-06-01,42.00,沙县小吃,POS-消费,消费",
    "2026-06-20,67000.00,海外汇出,SWIFT跨境-收款行未注明,跨境汇款",
  ].join("\n"),
};

describe("Ch 02 · 给 AI 看真实文件", () => {
  it("完美用户路径:三步实操都完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/read-csv-completed", "done");
    await fs.write(".progress/basic-info-confirmed", "done");
    await fs.write(".progress/outliers-reviewed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 read-csv-completed marker → 第一次提示含 读取/csv 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/basic-info-confirmed", "done");
    await fs.write(".progress/outliers-reviewed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/看一下|读取|csv/i);
  });

  it("缺少 basic-info-confirmed marker → 第一次提示含 基本信息/总行数/信任 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/read-csv-completed", "done");
    await fs.write(".progress/outliers-reviewed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/基本信息|总行数|总金额|字段名|信任/i);
  });

  it("缺少 outliers-reviewed marker → 第一次提示含 确认/可疑/大额 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/read-csv-completed", "done");
    await fs.write(".progress/basic-info-confirmed", "done");

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

  it("fixture 不含'类别'列(真实银行流水从不带分类字段)", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const csvPath = nodePath.resolve(
      dir,
      "sandbox-fixture/bank-statement.csv",
    );
    const text = await nodeFs.readFile(csvPath, "utf-8");
    const header = text.split("\n")[0];
    // 真实银行流水导出从不带 spending-category 字段。
    // Header must use 日期/金额/对方户名/摘要/交易类型 schema.
    expect(header).not.toMatch(/类别|category/i);
    expect(header).toMatch(/日期/);
    expect(header).toMatch(/金额/);
    expect(header).toMatch(/对方户名/);
  });
});
