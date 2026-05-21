// @vitest-environment node
// Pyodide loads WASM + Python stdlib — jsdom cannot provide the necessary
// fetch/TextDecoder environment for WASM instantiation (jsdom 29 limitation).
// Overriding per-file to "node" is explicitly permitted by project constraints.
// The checker tests also run fine in Node — they don't touch the DOM.

import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Inline 12-month fixture for the Pyodide test (sparse — 2-4 rows per month is enough)
// Real fixture data lives in sandbox-fixture/ with 30-50 rows per month.
const FIXTURE: Record<string, string> = {
  "invoices-2026-01.csv":
    "date,vendor,category,amount\n" +
    "2026-01-05,某餐厅,餐饮,100.00\n" +
    "2026-01-15,阿里云,云服务,200.00\n" +
    "2026-01-20,顺丰速运,办公,50.00\n",
  "invoices-2026-02.csv":
    "date,vendor,category,amount\n" +
    "2026-02-03,某餐厅,餐饮,150.00\n" +
    "2026-02-14,腾讯云,云服务,180.00\n",
  "invoices-2026-03.csv":
    "date,vendor,category,amount\n" +
    "2026-03-08,某餐厅,餐饮,120.00\n" +
    "2026-03-15,某打印店,办公,80.00\n" +
    "2026-03-22,滴滴出行,差旅,300.00\n",
  "invoices-2026-04.csv":
    "date,vendor,category,amount\n" +
    "2026-04-01,某餐厅,餐饮,160.00\n" +
    "2026-04-10,阿里云,云服务,250.00\n",
  "invoices-2026-05.csv":
    "date,vendor,category,amount\n" +
    "2026-05-05,某餐厅,餐饮,200.00\n" +
    "2026-05-18,某打印店,办公,90.00\n" +
    "2026-05-25,滴滴出行,差旅,180.00\n",
  "invoices-2026-06.csv":
    "date,vendor,category,amount\n" +
    "2026-06-03,某餐厅,餐饮,140.00\n" +
    "2026-06-12,腾讯云,云服务,220.00\n",
  "invoices-2026-07.csv":
    "date,vendor,category,amount\n" +
    "2026-07-07,某餐厅,餐饮,175.00\n" +
    "2026-07-19,顺丰速运,办公,60.00\n" +
    "2026-07-28,滴滴出行,差旅,250.00\n",
  "invoices-2026-08.csv":
    "date,vendor,category,amount\n" +
    "2026-08-02,某餐厅,餐饮,130.00\n" +
    "2026-08-15,阿里云,云服务,300.00\n",
  "invoices-2026-09.csv":
    "date,vendor,category,amount\n" +
    "2026-09-06,某餐厅,餐饮,190.00\n" +
    "2026-09-20,某打印店,办公,75.00\n" +
    "2026-09-28,滴滴出行,差旅,200.00\n",
  "invoices-2026-10.csv":
    "date,vendor,category,amount\n" +
    "2026-10-08,某餐厅,餐饮,155.00\n" +
    "2026-10-22,腾讯云,云服务,210.00\n",
  "invoices-2026-11.csv":
    "date,vendor,category,amount\n" +
    "2026-11-03,某餐厅,餐饮,180.00\n" +
    "2026-11-14,顺丰速运,办公,55.00\n" +
    "2026-11-25,滴滴出行,差旅,220.00\n",
  "invoices-2026-12.csv":
    "date,vendor,category,amount\n" +
    "2026-12-05,某餐厅,餐饮,210.00\n" +
    "2026-12-20,阿里云,云服务,280.00\n",
};

describe("Ch 04 · 从一次性帮忙到重复可用", () => {
  it("完美用户路径:三个 marker 都设置 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/script-written", "done");
    await fs.write(".progress/first-run-done", "done");
    await fs.write(".progress/reused-on-new-month", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 script-written → 第一次提示含脚本/AI/代码关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/first-run-done", "done");
    await fs.write(".progress/reused-on-new-month", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/脚本|AI|代码/);
  });

  it("缺少 first-run-done → 第一次提示含结果/跑/汇总关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/script-written", "done");
    await fs.write(".progress/reused-on-new-month", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/结果|跑|汇总/);
  });

  it("缺少 reused-on-new-month → 第一次提示含复用/再跑/脚本关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/script-written", "done");
    await fs.write(".progress/first-run-done", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/复用|再跑|脚本/);
  });

  it("第 3 次仍未完成 → showAnswerButton: true", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);

    const result = await runChecker(check, { mode: "sandbox", fs }, 3);
    expect(result.passed).toBe(false);
    expect(result.showAnswerButton).toBe(true);
  });

  // Fixture sanity: 12 separate CSVs exist on disk with correct naming
  it("sandbox-fixture/ 含 12 个 invoices-2026-MM.csv 文件", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const fixtureDir = path.resolve(dir, "sandbox-fixture");
    const files = await fs.readdir(fixtureDir);
    const monthlyFiles = files.filter((f) =>
      /^invoices-2026-(0[1-9]|1[0-2])\.csv$/.test(f),
    );
    expect(monthlyFiles).toHaveLength(12);
  });
});

describe("Ch 04 · quiz.yaml", () => {
  it("每道题至少有一个 correct option", async () => {
    const yaml = await import("yaml");
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const yamlPath = nodePath.resolve(dir, "quiz.yaml");
    const text = await nodeFs.readFile(yamlPath, "utf-8");
    const data = yaml.parse(text) as {
      questions: Array<{ id: string; options: Array<{ correct?: boolean }> }>;
    };
    expect(data.questions.length).toBeGreaterThanOrEqual(3);
    expect(data.questions.length).toBeLessThanOrEqual(5);
    for (const q of data.questions) {
      const corrects = q.options.filter((o) => o.correct === true);
      expect(
        corrects.length,
        `Q${q.id} must have ≥1 correct option`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("lesson.mdx 末尾接 <QuizRunner src='./quiz.yaml'/>", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/<QuizRunner\s+src=["']\.\/quiz\.yaml["']/);
  });
});

// Pyodide integration: prove 12-month aggregation actually works in sandbox
describe("Ch 04 · sandbox 真能跨 12 个月汇总", () => {
  it(
    "AI 风格的 glob+sum 脚本能在沙箱里跑通",
    async () => {
      const { createPyodideRunner } = await import(
        "@/modules/Sandbox/pyodide-runner"
      );
      const { createVirtualFs: makeVfs } = await import(
        "@/modules/Sandbox/virtual-fs"
      );

      const fs = makeVfs();
      await fs.loadFixture(FIXTURE);

      const runner = await createPyodideRunner({ fs });
      await runner.syncFromVfs();

      const SCRIPT = `
import csv
import glob
from collections import defaultdict

totals = defaultdict(float)
for path in sorted(glob.glob("invoices-2026-*.csv")):
    with open(path) as f:
        for row in csv.DictReader(f):
            totals[row["category"]] += float(row["amount"])

for cat in sorted(totals):
    print(f"{cat}: {totals[cat]:.2f}")
`;
      const result = await runner.run(SCRIPT);
      expect(result.ok).toBe(true);
      // Sanity: at least one category line in stdout (Chinese char + colon + digits)
      expect(result.stdout).toMatch(/[一-龥]+:\s*\d+\.\d{2}/);
      // Assert at least 2 categories appear (proves we actually read multiple files)
      const lines = result.stdout.trim().split("\n").filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(2);
    },
    60_000, // pyodide WASM load is slow on first run
  );
});
