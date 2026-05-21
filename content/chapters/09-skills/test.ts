// content/chapters/09-skills/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 09 is a real-env chapter — progress tracked via vfs markers.
// Markers:
//   skill-concept-understood  — user read the Skills intro
//   skill-file-written        — user wrote ~/.claude/skills/organize-invoices/SKILL.md
//   skill-invoked-by-claude   — user verified Claude auto-loaded + invoked the skill
//   skill-tested-on-real-data — user ran the workflow on their actual invoices

describe("Ch 09 · Skills (一句话搞定重复工作)", () => {
  it("完美用户路径：四个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/skill-concept-understood", "done");
    await fs.write(".progress/skill-file-written", "done");
    await fs.write(".progress/skill-invoked-by-claude", "done");
    await fs.write(".progress/skill-tested-on-real-data", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 skill-concept-understood → 第一次提示含 开篇/一次性脚本 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/skill-file-written", "done");
    await fs.write(".progress/skill-invoked-by-claude", "done");
    await fs.write(".progress/skill-tested-on-real-data", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/开篇|一次性脚本/);
  });

  it("缺少 skill-file-written → 第一次提示含 SKILL.md/organize-invoices 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/skill-concept-understood", "done");
    await fs.write(".progress/skill-invoked-by-claude", "done");
    await fs.write(".progress/skill-tested-on-real-data", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/SKILL\.md|organize-invoices|skill-file/i);
  });

  it("缺少 skill-invoked-by-claude → 第一次提示含 Claude 调用/自动 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/skill-concept-understood", "done");
    await fs.write(".progress/skill-file-written", "done");
    await fs.write(".progress/skill-tested-on-real-data", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Claude 调用|自动|新.*会话|skill-invoked/i);
  });

  it("缺少 skill-tested-on-real-data → 第一次提示含 真实发票/测试 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/skill-concept-understood", "done");
    await fs.write(".progress/skill-file-written", "done");
    await fs.write(".progress/skill-invoked-by-claude", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/真实发票|真实.*数据|测试|skill-tested/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only skill-concept-understood done, others missing
    await fs.write(".progress/skill-concept-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or 我跑完了
    expect(result.hint).toMatch(
      /skill-file-written|skill-invoked-by-claude|skill-tested-on-real-data|我跑完了/,
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
describe("Ch 09 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 4 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']skill-concept-understood["']/);
    expect(text).toMatch(/id=["']skill-file-written["']/);
    expect(text).toMatch(/id=["']skill-invoked-by-claude["']/);
    expect(text).toMatch(/id=["']skill-tested-on-real-data["']/);
  });

  it("lesson.mdx 包含 organize-invoices 字符串", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/organize-invoices/);
  });

  it("lesson.mdx 包含完整路径 ~/.claude/skills/organize-invoices/SKILL.md", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/~\/\.claude\/skills\/organize-invoices\/SKILL\.md/);
  });

  it("lesson.mdx 不含 QuizRunner（Ch 09 无测验）", async () => {
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
