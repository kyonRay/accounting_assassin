// content/chapters/13-cursor/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 13 is a real-env chapter with quiz — progress tracked via vfs markers.
// Markers:
//   cursor-installed        — user installed Cursor and CLI binary is on PATH
//   cursor-logged-in        — user logged in via cursor.com web flow
//   composer-tried          — user opened Composer and gave it a multi-file task
//   at-ref-tried            — user used @ to reference a specific file in a prompt
//   background-agent-tried  — user spun up a Background Agent on an async task
//   tool-choice-understood  — user read the three-tool comparison + Part IV synthesis

describe("Ch 13 · Cursor 工作流", () => {
  it("完美用户路径：六个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-installed", "done");
    await fs.write(".progress/cursor-logged-in", "done");
    await fs.write(".progress/composer-tried", "done");
    await fs.write(".progress/at-ref-tried", "done");
    await fs.write(".progress/background-agent-tried", "done");
    await fs.write(".progress/tool-choice-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 cursor-installed → 第一次提示含 Cursor/安装/install 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-logged-in", "done");
    await fs.write(".progress/composer-tried", "done");
    await fs.write(".progress/at-ref-tried", "done");
    await fs.write(".progress/background-agent-tried", "done");
    await fs.write(".progress/tool-choice-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Cursor|安装|install/i);
  });

  it("缺少 cursor-logged-in → 第一次提示含 登录/login/账号 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-installed", "done");
    await fs.write(".progress/composer-tried", "done");
    await fs.write(".progress/at-ref-tried", "done");
    await fs.write(".progress/background-agent-tried", "done");
    await fs.write(".progress/tool-choice-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/登录|login|账号/i);
  });

  it("缺少 composer-tried → 第一次提示含 Composer/多文件/composer 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-installed", "done");
    await fs.write(".progress/cursor-logged-in", "done");
    await fs.write(".progress/at-ref-tried", "done");
    await fs.write(".progress/background-agent-tried", "done");
    await fs.write(".progress/tool-choice-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Composer|多文件|composer/i);
  });

  it("缺少 at-ref-tried → 第一次提示含 @引用|@-ref|@ 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-installed", "done");
    await fs.write(".progress/cursor-logged-in", "done");
    await fs.write(".progress/composer-tried", "done");
    await fs.write(".progress/background-agent-tried", "done");
    await fs.write(".progress/tool-choice-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/@|引用|at-ref/i);
  });

  it("缺少 background-agent-tried → 第一次提示含 后台|异步|Background 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-installed", "done");
    await fs.write(".progress/cursor-logged-in", "done");
    await fs.write(".progress/composer-tried", "done");
    await fs.write(".progress/at-ref-tried", "done");
    await fs.write(".progress/tool-choice-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/后台|异步|Background/i);
  });

  it("缺少 tool-choice-understood → 第一次提示含 对比|工具选择|三工具 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/cursor-installed", "done");
    await fs.write(".progress/cursor-logged-in", "done");
    await fs.write(".progress/composer-tried", "done");
    await fs.write(".progress/at-ref-tried", "done");
    await fs.write(".progress/background-agent-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/对比|工具选择|三工具|三种工具/);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only first step done, five missing
    await fs.write(".progress/cursor-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or "我跑完了"
    expect(result.hint).toMatch(
      /cursor-logged-in|composer-tried|at-ref-tried|background-agent-tried|tool-choice-understood|我跑完了/,
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
describe("Ch 13 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 6 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']cursor-installed["']/);
    expect(text).toMatch(/id=["']cursor-logged-in["']/);
    expect(text).toMatch(/id=["']composer-tried["']/);
    expect(text).toMatch(/id=["']at-ref-tried["']/);
    expect(text).toMatch(/id=["']background-agent-tried["']/);
    expect(text).toMatch(/id=["']tool-choice-understood["']/);
  });

  it("lesson.mdx 包含 expectsCli=\"Cursor\" 至少一次", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/expectsCli=["']Cursor["']/);
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

  it("lesson.mdx 包含 Cursor 订阅降级说明 Callout", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // Should mention subscription cost or fallback path
    expect(text).toMatch(/订阅|Pro|20|降级|回来/);
  });

  it("lesson.mdx 包含三工具对比（Composer / @ 引用 / Background Agent）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/Composer/);
    expect(text).toMatch(/Background Agent/);
  });

  it("lesson.mdx 包含 Part IV 综合工具对比（Claude vs Codex vs Cursor）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // The closing step must compare all three tools
    expect(text).toMatch(/Claude.*Codex|Codex.*Claude/);
  });
});

// Quiz YAML validation
describe("Ch 13 · quiz.yaml", () => {
  it("包含 6 道题，每道题至少一个 correct option", async () => {
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
    expect(data.questions.length).toBe(6);
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
});
