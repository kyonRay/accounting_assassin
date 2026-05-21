// content/chapters/06-first-real-claude/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 06 is a real-env chapter — progress tracked via vfs markers.
// Markers: claude-version-checked, first-conversation, claude-config-verified

describe("Ch 06 · 第一次与真实 Claude Code 对话", () => {
  it("完美用户路径：三个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/claude-version-checked", "done");
    await fs.write(".progress/first-conversation", "done");
    await fs.write(".progress/claude-config-verified", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 claude-version-checked → 第一次提示含 version/版本 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/first-conversation", "done");
    await fs.write(".progress/claude-config-verified", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/version|版本|--version/i);
  });

  it("缺少 first-conversation → 第一次提示含 对话/会话/claude 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/claude-version-checked", "done");
    await fs.write(".progress/claude-config-verified", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/对话|会话|claude/i);
  });

  it("缺少 claude-config-verified → 第一次提示含 .claude/配置/目录 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/claude-version-checked", "done");
    await fs.write(".progress/first-conversation", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/\.claude|配置|目录/);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only one step done, two missing
    await fs.write(".progress/claude-version-checked", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint must mention the specific marker ids or "我跑完了"
    expect(result.hint).toMatch(/first-conversation|claude-config-verified|我跑完了/);
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
describe("Ch 06 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 3 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']claude-version-checked["']/);
    expect(text).toMatch(/id=["']first-conversation["']/);
    expect(text).toMatch(/id=["']claude-config-verified["']/);
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
});

// Quiz YAML validation
describe("Ch 06 · quiz.yaml", () => {
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
});
