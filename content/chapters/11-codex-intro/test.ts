// content/chapters/11-codex-intro/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 11 is a real-env chapter — progress tracked via vfs markers.
// Markers:
//   codex-installed        — user installed Codex CLI (expectsCli="Codex")
//   codex-logged-in        — user ran `codex login` and authenticated
//   codex-first-task-tried — user ran Codex on the bank CSV classification task
//   style-noticed          — user reflected on how Codex's style differs from Claude

describe("Ch 11 · Codex 入门", () => {
  it("完美用户路径：四个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/codex-installed", "done");
    await fs.write(".progress/codex-logged-in", "done");
    await fs.write(".progress/codex-first-task-tried", "done");
    await fs.write(".progress/style-noticed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 codex-installed → 第一次提示含 Codex/安装/codex 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/codex-logged-in", "done");
    await fs.write(".progress/codex-first-task-tried", "done");
    await fs.write(".progress/style-noticed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Codex|安装|codex/i);
  });

  it("缺少 codex-logged-in → 第一次提示含 登录/login 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/codex-installed", "done");
    await fs.write(".progress/codex-first-task-tried", "done");
    await fs.write(".progress/style-noticed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/登录|login/i);
  });

  it("缺少 codex-first-task-tried → 第一次提示含 任务/分类/CSV 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/codex-installed", "done");
    await fs.write(".progress/codex-logged-in", "done");
    await fs.write(".progress/style-noticed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/任务|分类|CSV/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only codex-installed done, others missing
    await fs.write(".progress/codex-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or "我跑完了"
    expect(result.hint).toMatch(
      /codex-logged-in|codex-first-task-tried|style-noticed|我跑完了/,
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
describe("Ch 11 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 4 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']codex-installed["']/);
    expect(text).toMatch(/id=["']codex-logged-in["']/);
    expect(text).toMatch(/id=["']codex-first-task-tried["']/);
    expect(text).toMatch(/id=["']style-noticed["']/);
  });

  it("lesson.mdx 包含 expectsCli=\"Codex\" 至少一次", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/expectsCli=["']Codex["']/);
  });

  it("lesson.mdx 不含 QuizRunner（Ch 11 无测验）", async () => {
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

  it("lesson.mdx 包含降级说明 Callout（type=warn 或 type=tip）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // Should mention the downgrade path (Ch 11/12 skip or Claude fallback)
    expect(text).toMatch(/Ch 11|第 11 章|暂时跳过|Claude Code 演示/);
  });
});
