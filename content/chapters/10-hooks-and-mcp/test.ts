// content/chapters/10-hooks-and-mcp/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 10 is a real-env chapter with quiz — progress tracked via vfs markers.
// Markers:
//   three-mechanisms-understood — user read the Skills / Hooks / MCP overview
//   hook-installed              — user added a PostToolUse hook to settings.local.json
//   hook-verified               — user confirmed the hook fires via Claude Edit
//   sqlite-mcp-installed        — user installed a SQLite MCP server
//   mcp-query-tried             — user asked Claude to query a SQLite DB via the MCP

describe("Ch 10 · Hooks 与 MCP", () => {
  it("完美用户路径：五个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/three-mechanisms-understood", "done");
    await fs.write(".progress/hook-installed", "done");
    await fs.write(".progress/hook-verified", "done");
    await fs.write(".progress/sqlite-mcp-installed", "done");
    await fs.write(".progress/mcp-query-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 three-mechanisms-understood → 第一次提示含 三件事/对比/Skill.Hook 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/hook-installed", "done");
    await fs.write(".progress/hook-verified", "done");
    await fs.write(".progress/sqlite-mcp-installed", "done");
    await fs.write(".progress/mcp-query-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/三件事|对比|Skill|Hook|MCP/);
  });

  it("缺少 hook-installed → 第一次提示含 PostToolUse/settings/hook 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/three-mechanisms-understood", "done");
    await fs.write(".progress/hook-verified", "done");
    await fs.write(".progress/sqlite-mcp-installed", "done");
    await fs.write(".progress/mcp-query-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/PostToolUse|settings|hook|钩子/i);
  });

  it("缺少 hook-verified → 第一次提示含 触发/验证/日志 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/three-mechanisms-understood", "done");
    await fs.write(".progress/hook-installed", "done");
    await fs.write(".progress/sqlite-mcp-installed", "done");
    await fs.write(".progress/mcp-query-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/触发|验证|日志|\.edits\.log|hook-verified/i);
  });

  it("缺少 sqlite-mcp-installed → 第一次提示含 sqlite/MCP/安装 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/three-mechanisms-understood", "done");
    await fs.write(".progress/hook-installed", "done");
    await fs.write(".progress/hook-verified", "done");
    await fs.write(".progress/mcp-query-tried", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/sqlite|MCP|安装|mcp-server/i);
  });

  it("缺少 mcp-query-tried → 第一次提示含 查询/SQL/SELECT 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/three-mechanisms-understood", "done");
    await fs.write(".progress/hook-installed", "done");
    await fs.write(".progress/hook-verified", "done");
    await fs.write(".progress/sqlite-mcp-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/查询|SQL|SELECT|mcp-query/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only first step done, four missing
    await fs.write(".progress/three-mechanisms-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids
    expect(result.hint).toMatch(
      /hook-installed|hook-verified|sqlite-mcp-installed|mcp-query-tried|我跑完了/,
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
describe("Ch 10 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 5 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']three-mechanisms-understood["']/);
    expect(text).toMatch(/id=["']hook-installed["']/);
    expect(text).toMatch(/id=["']hook-verified["']/);
    expect(text).toMatch(/id=["']sqlite-mcp-installed["']/);
    expect(text).toMatch(/id=["']mcp-query-tried["']/);
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

  it("lesson.mdx 包含 PostToolUse（实际钩子事件名）", async () => {
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
});

// Quiz YAML validation
describe("Ch 10 · quiz.yaml", () => {
  it("包含 5 道题，每道题至少一个 correct option", async () => {
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
    expect(data.questions.length).toBe(5);
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
