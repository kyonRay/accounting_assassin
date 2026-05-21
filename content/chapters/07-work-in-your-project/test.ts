// content/chapters/07-work-in-your-project/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 07 is a real-env chapter — progress tracked via vfs markers.
// Markers:
//   claude-md-written           — user created CLAUDE.md in ~/accounting-learner/
//   invoice-ocr-script-written  — user asked Claude to write scripts/invoice_ocr.py
//   script-ran-successfully     — user ran the script and got output
//   continue-flow-tried         — user tried claude --continue to resume the session

describe("Ch 07 · 在自己的项目里工作", () => {
  it("完美用户路径：四个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/claude-md-written", "done");
    await fs.write(".progress/invoice-ocr-script-written", "done");
    await fs.write(".progress/script-ran-successfully", "done");
    await fs.write(".progress/continue-flow-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 claude-md-written → 第一次提示含 CLAUDE.md 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/invoice-ocr-script-written", "done");
    await fs.write(".progress/script-ran-successfully", "done");
    await fs.write(".progress/continue-flow-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/CLAUDE\.md|项目记忆/i);
  });

  it("缺少 invoice-ocr-script-written → 第一次提示含 invoice_ocr.py/脚本 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/claude-md-written", "done");
    await fs.write(".progress/script-ran-successfully", "done");
    await fs.write(".progress/continue-flow-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/invoice_ocr\.py|Python 脚本|脚本/i);
  });

  it("缺少 script-ran-successfully → 第一次提示含 运行/跑通 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/claude-md-written", "done");
    await fs.write(".progress/invoice-ocr-script-written", "done");
    await fs.write(".progress/continue-flow-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/运行|跑通|脚本/);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only CLAUDE.md done, others missing
    await fs.write(".progress/claude-md-written", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or "我跑完了"
    expect(result.hint).toMatch(
      /invoice-ocr-script-written|script-ran-successfully|continue-flow-tried|我跑完了/,
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
describe("Ch 07 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 4 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']claude-md-written["']/);
    expect(text).toMatch(/id=["']invoice-ocr-script-written["']/);
    expect(text).toMatch(/id=["']script-ran-successfully["']/);
    expect(text).toMatch(/id=["']continue-flow-tried["']/);
  });

  it("lesson.mdx 不含 QuizRunner（Ch 07 无测验）", async () => {
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
});
