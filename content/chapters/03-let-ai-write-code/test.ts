// @vitest-environment node
// Pyodide loads WASM + Python stdlib — jsdom cannot provide the necessary
// fetch/TextDecoder environment for WASM instantiation (jsdom 29 limitation).
// Overriding per-file to "node" is explicitly permitted by project constraints.
// The checker tests also run fine in Node — they don't touch the DOM.

import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Sample fixture for the inline test (real fixture file has more rows).
// Must cover all 5 lesson categories (餐饮/办公/差旅/云服务/通讯) — the checker
// validates fixture state against EXPECTED_CATEGORIES.
const FIXTURE = {
  "invoices.csv": [
    "date,vendor,category,amount",
    "2026-04-01,某餐厅,餐饮,128.50",
    "2026-04-02,某打印店,办公,245.80",
    "2026-04-03,云服务公司,云服务,899.00",
    "2026-04-04,中国移动,通讯,99.00",
    "2026-04-08,某餐厅,餐饮,456.80",
    "2026-04-15,某交通,差旅,890.00",
    "2026-04-22,某餐厅,餐饮,289.60",
  ].join("\n"),
};

describe("Ch 03 · 让 AI 写代码", () => {
  it("完美用户路径:两个 marker 都设置 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/script-written", "done");
    await fs.write(".progress/output-verified", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 script-written → 第一次提示含 写/代码/脚本 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/output-verified", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/写|代码|脚本/);
  });

  it("缺少 output-verified → 第一次提示含 结果/看/输出/跑 关键词", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/script-written", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/结果|看|输出|跑/);
  });

  it("第 3 次仍未完成 → showAnswerButton: true", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);

    const result = await runChecker(check, { mode: "sandbox", fs }, 3);
    expect(result.passed).toBe(false);
    expect(result.showAnswerButton).toBe(true);
  });

  // Item 4 (REVIEW-TRIAGE): both markers set but invoices.csv corrupted /
  // missing a category → checker must NOT silently bypass.
  it("两个 marker 都 set,但 fixture 缺类目 → checker 不放过 + 提示重置", async () => {
    const fs = createVirtualFs();
    // Load a fixture missing "通讯" entirely
    await fs.loadFixture({
      "invoices.csv": [
        "date,vendor,category,amount",
        "2026-04-01,某餐厅,餐饮,128.50",
        "2026-04-02,某打印店,办公,245.80",
        "2026-04-03,云服务公司,云服务,899.00",
        "2026-04-15,某交通,差旅,890.00",
      ].join("\n"),
    });
    await fs.write(".progress/script-written", "done");
    await fs.write(".progress/output-verified", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/通讯|重置|invoices/);
  });

  // Fixture sanity: real CSV file on disk has ≥40 data rows + header
  it("sandbox-fixture/invoices.csv 至少 40 笔数据 + header", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const csvPath = path.resolve(dir, "sandbox-fixture/invoices.csv");
    const text = await fs.readFile(csvPath, "utf-8");
    const lines = text.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(41);
    expect(lines[0]).toBe("date,vendor,category,amount");
  });
});

// Pyodide live-run integration test: proves the pedagogical claim that
// "Python truly runs in the sandbox." Ch 3's unique contribution is that
// AI writes code AND the sandbox runs it — this test demonstrates exactly that.
describe("Ch 03 · Pyodide 在沙箱里真跑通", () => {
  it(
    "AI 风格的 Python 脚本能在沙箱里读 invoices.csv 并按类目汇总",
    async () => {
      const { createPyodideRunner } = await import(
        "@/modules/Sandbox/pyodide-runner"
      );
      const { createVirtualFs: makeVfs } = await import(
        "@/modules/Sandbox/virtual-fs"
      );

      const fs = makeVfs();
      await fs.loadFixture(FIXTURE); // 6-row sample inline fixture

      const runner = await createPyodideRunner({ fs });
      await runner.syncFromVfs();

      // The script is the kind of code AI would write — small, idiomatic,
      // does what the lesson says: read invoices.csv and sum amounts by category.
      const SUMMARIZE = `
import csv
from collections import defaultdict

totals = defaultdict(float)
with open("invoices.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        totals[row["category"]] += float(row["amount"])

for cat in sorted(totals):
    print(f"{cat}: {totals[cat]:.2f}")
`;

      const result = await runner.run(SUMMARIZE);
      expect(result.ok).toBe(true);

      // Expected sums from inline FIXTURE:
      //   餐饮: 128.50 + 456.80 + 289.60 = 874.90
      //   办公: 245.80
      //   云服务: 899.00
      //   差旅: 890.00
      //   通讯: 99.00
      expect(result.stdout).toMatch(/餐饮:\s*874\.90/);
      expect(result.stdout).toMatch(/办公:\s*245\.80/);
      expect(result.stdout).toMatch(/云服务:\s*899\.00/);
      expect(result.stdout).toMatch(/差旅:\s*890\.00/);
      expect(result.stdout).toMatch(/通讯:\s*99\.00/);
    },
    60_000, // pyodide WASM load is slow on first call
  );
});
