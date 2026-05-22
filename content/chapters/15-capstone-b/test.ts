// content/chapters/15-capstone-b/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 15 · 毕业作品 B · 月末结账 AI 工作流
// This is a real-env chapter with quiz — progress tracked via vfs markers.
// Markers (6 total):
//   workspace-prepared        — user confirmed Ch 14 outputs exist, created capstone-b/
//   voucher-script-scaffolded — Claude scaffolded capstone-b/voucher-gen/ project
//   skill-orchestrator-written— user wrote ~/.claude/skills/month-end-close/SKILL.md
//   hook-capstone-b-installed            — user installed the PostToolUse log hook for capstone-b
//   workflow-run              — user ran full month-end workflow ("帮我做本月结账")
//   reflection-completed      — user completed the closing reflection

describe("Ch 15 · 毕业作品 B · 月末结账 AI 工作流", () => {
  it("完美用户路径：六个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-prepared", "done");
    await fs.write(".progress/voucher-script-scaffolded", "done");
    await fs.write(".progress/skill-orchestrator-written", "done");
    await fs.write(".progress/hook-capstone-b-installed", "done");
    await fs.write(".progress/workflow-run", "done");
    await fs.write(".progress/reflection-completed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 workspace-prepared → 第一次提示含 capstone-a/工作空间/Ch14 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/voucher-script-scaffolded", "done");
    await fs.write(".progress/skill-orchestrator-written", "done");
    await fs.write(".progress/hook-capstone-b-installed", "done");
    await fs.write(".progress/workflow-run", "done");
    await fs.write(".progress/reflection-completed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/capstone-a|工作空间|capstone-b|Ch.?14|14/i);
  });

  it("缺少 voucher-script-scaffolded → 第一次提示含 凭证/voucher/make_vouchers 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-prepared", "done");
    await fs.write(".progress/skill-orchestrator-written", "done");
    await fs.write(".progress/hook-capstone-b-installed", "done");
    await fs.write(".progress/workflow-run", "done");
    await fs.write(".progress/reflection-completed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/凭证|voucher|make_vouchers/i);
  });

  it("缺少 skill-orchestrator-written → 第一次提示含 Skill/SKILL.md/month-end-close 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-prepared", "done");
    await fs.write(".progress/voucher-script-scaffolded", "done");
    await fs.write(".progress/hook-capstone-b-installed", "done");
    await fs.write(".progress/workflow-run", "done");
    await fs.write(".progress/reflection-completed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Skill|SKILL\.md|month-end-close/i);
  });

  it("缺少 hook-capstone-b-installed → 第一次提示含 Hook/钩子/PostToolUse 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-prepared", "done");
    await fs.write(".progress/voucher-script-scaffolded", "done");
    await fs.write(".progress/skill-orchestrator-written", "done");
    await fs.write(".progress/workflow-run", "done");
    await fs.write(".progress/reflection-completed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Hook|钩子|PostToolUse/i);
  });

  it("缺少 workflow-run → 第一次提示含 工作流/结账/month_end 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-prepared", "done");
    await fs.write(".progress/voucher-script-scaffolded", "done");
    await fs.write(".progress/skill-orchestrator-written", "done");
    await fs.write(".progress/hook-capstone-b-installed", "done");
    await fs.write(".progress/reflection-completed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/工作流|结账|month_end/i);
  });

  it("缺少 reflection-completed → 第一次提示含 回顾/反思/课程 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-prepared", "done");
    await fs.write(".progress/voucher-script-scaffolded", "done");
    await fs.write(".progress/skill-orchestrator-written", "done");
    await fs.write(".progress/hook-capstone-b-installed", "done");
    await fs.write(".progress/workflow-run", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/回顾|反思|课程|毕业/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only first step done, rest missing
    await fs.write(".progress/workspace-prepared", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or "我跑完了"
    expect(result.hint).toMatch(
      /voucher-script-scaffolded|skill-orchestrator-written|hook-capstone-b-installed|workflow-run|reflection-completed|我跑完了/,
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
describe("Ch 15 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 6 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']workspace-prepared["']/);
    expect(text).toMatch(/id=["']voucher-script-scaffolded["']/);
    expect(text).toMatch(/id=["']skill-orchestrator-written["']/);
    expect(text).toMatch(/id=["']hook-capstone-b-installed["']/);
    expect(text).toMatch(/id=["']workflow-run["']/);
    expect(text).toMatch(/id=["']reflection-completed["']/);
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

  it("lesson.mdx 末尾含 QuizRunner block", async () => {
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

  it("lesson.mdx 不含 git checkout . (禁止教学)", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // "git checkout ." is forbidden — use "git restore ." instead
    expect(text).not.toMatch(/git checkout \./);
  });

  it("lesson.mdx 包含 Skill 相关关键词（SKILL.md / month-end-close）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/SKILL\.md/);
    expect(text).toMatch(/month-end-close/);
  });

  it("lesson.mdx 包含 PostToolUse Hook 相关内容", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/PostToolUse/);
  });

  it("lesson.mdx 包含凭证生成关键词（凭证/make_vouchers）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/凭证|make_vouchers/);
  });

  it("lesson.mdx 包含 capstone-a 和 capstone-b 目录名", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/capstone-a/);
    expect(text).toMatch(/capstone-b/);
  });
});

// Quiz YAML validation
describe("Ch 15 · quiz.yaml", () => {
  it("包含 8 道题，每道题至少一个 correct option", async () => {
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
    expect(data.questions.length).toBe(8);
    for (const q of data.questions) {
      const corrects = q.options.filter((o) => o.correct === true);
      expect(
        corrects.length,
        `Question ${q.id} must have at least one correct option`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("包含 single-choice 和 multiple-choice 题型", async () => {
    const yaml = await import("yaml");
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const nodeUrl = await import("node:url");
    const __filename = nodeUrl.fileURLToPath(import.meta.url);
    const __dirname = nodePath.dirname(__filename);
    const yamlPath = nodePath.resolve(__dirname, "quiz.yaml");
    const text = await nodeFs.readFile(yamlPath, "utf-8");
    const data = yaml.parse(text) as {
      questions: Array<{ id: string; type: string }>;
    };
    const types = new Set(data.questions.map((q) => q.type));
    expect(types.has("single-choice")).toBe(true);
    expect(types.has("multiple-choice")).toBe(true);
  });

  it("每道题的每个选项都有 feedback 字段", async () => {
    const yaml = await import("yaml");
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const nodeUrl = await import("node:url");
    const __filename = nodeUrl.fileURLToPath(import.meta.url);
    const __dirname = nodePath.dirname(__filename);
    const yamlPath = nodePath.resolve(__dirname, "quiz.yaml");
    const text = await nodeFs.readFile(yamlPath, "utf-8");
    const data = yaml.parse(text) as {
      questions: Array<{
        id: string;
        options: Array<{ id: string; feedback?: string }>;
      }>;
    };
    for (const q of data.questions) {
      for (const opt of q.options) {
        expect(
          opt.feedback,
          `Question ${q.id} option ${opt.id} must have feedback`,
        ).toBeTruthy();
      }
    }
  });
});
