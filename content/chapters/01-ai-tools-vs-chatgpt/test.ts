// content/chapters/01-ai-tools-vs-chatgpt/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

const FIXTURE = {
  "invoices.csv": [
    "date,vendor,category,amount",
    "2026-04-01,上海某某商贸,办公,1234.50",
    "2026-04-03,北京云服务公司,云服务,899.00",
    "2026-04-08,某餐厅,餐饮,456.80",
    "2026-04-15,某打印店,办公,128.40",
    "2026-04-22,某交通,差旅,890.00",
    "2026-04-28,某餐厅,餐饮,289.60",
  ].join("\n"),
};

describe("Ch 01 · AI 工具 ≠ ChatGPT 2.0", () => {
  it("完美用户路径:看过对比 + 完成第一次实操 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    // simulate user clicking "我做完了" on both gating steps
    await fs.write(".progress/comparison-viewed", "done");
    await fs.write(".progress/first-step-completed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 comparison-viewed marker → 第一次提示", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/first-step-completed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/对比|演示|两边/); // directional hint
  });

  it("缺少 first-step-completed marker → 第一次提示", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);
    await fs.write(".progress/comparison-viewed", "done");

    const result = await runChecker(check, { mode: "sandbox", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/实操|做完了|尝试/); // directional hint
  });

  it("第 3 次仍未完成 → showAnswerButton: true", async () => {
    const fs = createVirtualFs();
    await fs.loadFixture(FIXTURE);

    const result = await runChecker(check, { mode: "sandbox", fs }, 3);
    expect(result.passed).toBe(false);
    expect(result.showAnswerButton).toBe(true);
  });
});

// Quiz YAML validation
describe("Ch 01 · quiz.yaml", () => {
  it("每道题至少有一个 correct option", async () => {
    const yaml = await import("yaml");
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const nodeUrl = await import("node:url");
    const __filename = nodeUrl.fileURLToPath(import.meta.url);
    const __dirname = nodePath.dirname(__filename);
    const yamlPath = nodePath.resolve(__dirname, "quiz.yaml");
    const text = await nodeFs.readFile(yamlPath, "utf-8");
    const data = yaml.parse(text) as {
      questions: Array<{ id: string; options: Array<{ correct?: boolean }> }>;
    };
    expect(data.questions.length).toBeGreaterThan(0);
    for (const q of data.questions) {
      const corrects = q.options.filter((o) => o.correct === true);
      expect(
        corrects.length,
        `Question ${q.id} must have at least one correct option`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
