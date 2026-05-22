// content/chapters/14-capstone-a/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 14 is a real-env chapter with NO quiz — progress tracked via vfs markers.
// Markers (8 total):
//   deps-installed              — user installed pandas + openpyxl via pip3
//   invoice-ocr-scaffolded      — Claude scaffolded capstone-a/invoice-ocr/ project
//   invoice-ocr-ran             — user ran batch_ocr.py on a folder of invoices
//   bank-classifier-scaffolded  — Claude scaffolded capstone-a/bank-classifier/ project
//   bank-classifier-ran         — user ran bank_classify.py on a CSV statement
//   report-aggregator-scaffolded— Claude scaffolded capstone-a/report-aggregator/ project
//   report-aggregator-ran       — user ran aggregate.py on multiple Excel files
//   capstone-a-reviewed         — user reviewed what they built across all three utilities

describe("Ch 14 · 毕业作品 A · 三个独立小工具", () => {
  it("完美用户路径：八个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 deps-installed → 第一次提示含 pandas/openpyxl/pip 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/pandas|openpyxl|pip/i);
  });

  it("缺少 invoice-ocr-scaffolded → 第一次提示含 invoice-ocr/发票/批量 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/invoice-ocr|发票|批量/i);
  });

  it("缺少 invoice-ocr-ran → 第一次提示含 batch_ocr/运行/发票 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/batch_ocr|运行|发票/i);
  });

  it("缺少 bank-classifier-scaffolded → 第一次提示含 bank-classifier/银行/分类 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/bank-classifier|银行|分类/i);
  });

  it("缺少 bank-classifier-ran → 第一次提示含 bank_classify/CSV/流水 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/bank_classify|CSV|流水/i);
  });

  it("缺少 report-aggregator-scaffolded → 第一次提示含 report-aggregator/汇总/多表 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-ran", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/report-aggregator|汇总|多表/i);
  });

  it("缺少 report-aggregator-ran → 第一次提示含 aggregate/报表/聚合 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/capstone-a-reviewed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/aggregate|报表|聚合/i);
  });

  it("缺少 capstone-a-reviewed → 第一次提示含 回顾/复盘/三个工具 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/deps-installed", "done");
    await fs.write(".progress/invoice-ocr-scaffolded", "done");
    await fs.write(".progress/invoice-ocr-ran", "done");
    await fs.write(".progress/bank-classifier-scaffolded", "done");
    await fs.write(".progress/bank-classifier-ran", "done");
    await fs.write(".progress/report-aggregator-scaffolded", "done");
    await fs.write(".progress/report-aggregator-ran", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/回顾|复盘|三个/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only first step done, rest missing
    await fs.write(".progress/deps-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or "我跑完了"
    expect(result.hint).toMatch(
      /invoice-ocr-scaffolded|bank-classifier-scaffolded|report-aggregator-scaffolded|capstone-a-reviewed|我跑完了/,
    );
  });

  it("第 3 次仍未完成 → showAnswerButton: true", async () => {
    const fs = createVirtualFs();
    // No markers at all

    const result = await runChecker(check, { mode: "real", fs }, 3);
    expect(result.passed).toBe(false);
    expect(result.showAnswerButton).toBe(true);
  });
});

// lesson.mdx content validation
describe("Ch 14 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 8 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']deps-installed["']/);
    expect(text).toMatch(/id=["']invoice-ocr-scaffolded["']/);
    expect(text).toMatch(/id=["']invoice-ocr-ran["']/);
    expect(text).toMatch(/id=["']bank-classifier-scaffolded["']/);
    expect(text).toMatch(/id=["']bank-classifier-ran["']/);
    expect(text).toMatch(/id=["']report-aggregator-scaffolded["']/);
    expect(text).toMatch(/id=["']report-aggregator-ran["']/);
    expect(text).toMatch(/id=["']capstone-a-reviewed["']/);
  });

  it("lesson.mdx 包含 expectsCli=\"Python3\" 至少一次", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/expectsCli=["']Python3["']/);
  });

  it("lesson.mdx 不含 QuizRunner（Ch 14 无测验）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).not.toMatch(/<QuizRunner/);
  });

  it("lesson.mdx 包含关键术语：aa-ocr / pandas / openpyxl / 降级 / capstone-a", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/aa-ocr/);
    expect(text).toMatch(/pandas/);
    expect(text).toMatch(/openpyxl/);
    expect(text).toMatch(/降级/);
    expect(text).toMatch(/capstone-a/);
  });

  it("lesson.mdx 包含三工具小节结构（invoice-ocr / bank-classifier / report-aggregator）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/invoice-ocr/);
    expect(text).toMatch(/bank-classifier/);
    expect(text).toMatch(/report-aggregator/);
  });

  it("lesson.mdx 包含降级流说明（OCR 退出码 4 / 需手填 / 失败 sheet）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // Must explain the three-sheet fallback design.
    // Split into two independent assertions so the check survives reformatting
    // the visualization (ASCII art → table → paragraph) without false negatives.
    expect(text).toMatch(/退出码/);
    expect(text).toMatch(/需手填/);
    expect(text).toMatch(/失败|sheet|Sheet/);
  });

  it("lesson.mdx AI 校验步骤是核心流（含跨字段合理性检查提示词）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // AI validation must appear as a concrete instructional beat, not optional
    expect(text).toMatch(/AI 校验|交给 Claude.*校验|合理性检查/);
    // Must NOT frame AI validation as optional
    expect(text).not.toMatch(/（可选）.*Claude.*验证|可选.*Claude.*格式/);
  });
});
