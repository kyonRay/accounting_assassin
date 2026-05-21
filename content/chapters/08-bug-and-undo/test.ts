// content/chapters/08-bug-and-undo/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 08 is a real-env chapter — progress tracked via vfs markers.
// Markers (6 total):
//   intro-read                  — user read the intro about bug-as-dialogue
//   template-tried              — user tried the BugReportCard once
//   exercise-1-encoding-fixed   — exercise 1 (encoding bug) done
//   exercise-2-silent-sum-fixed — exercise 2 (silent bug / merged cells) done
//   exercise-3-git-rollback-done — exercise 3 (git restore . rollback) done
//   forward-ref-noted           — user read the systematic-debugging mention

describe("Ch 08 · Bug 来了怎么办", () => {
  it("完美用户路径：六个标记全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/intro-read", "done");
    await fs.write(".progress/template-tried", "done");
    await fs.write(".progress/exercise-1-encoding-fixed", "done");
    await fs.write(".progress/exercise-2-silent-sum-fixed", "done");
    await fs.write(".progress/exercise-3-git-rollback-done", "done");
    await fs.write(".progress/forward-ref-noted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 intro-read → 第一次提示含 Bug 不是失败/心态 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/template-tried", "done");
    await fs.write(".progress/exercise-1-encoding-fixed", "done");
    await fs.write(".progress/exercise-2-silent-sum-fixed", "done");
    await fs.write(".progress/exercise-3-git-rollback-done", "done");
    await fs.write(".progress/forward-ref-noted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Bug 不是失败|心态|intro-read|第一节/i);
  });

  it("缺少 template-tried → 第一次提示含 四段式/模板 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/intro-read", "done");
    await fs.write(".progress/exercise-1-encoding-fixed", "done");
    await fs.write(".progress/exercise-2-silent-sum-fixed", "done");
    await fs.write(".progress/exercise-3-git-rollback-done", "done");
    await fs.write(".progress/forward-ref-noted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/四段式|模板|template/i);
  });

  it("缺少 exercise-1-encoding-fixed → 第一次提示含 编码/UnicodeDecodeError 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/intro-read", "done");
    await fs.write(".progress/template-tried", "done");
    await fs.write(".progress/exercise-2-silent-sum-fixed", "done");
    await fs.write(".progress/exercise-3-git-rollback-done", "done");
    await fs.write(".progress/forward-ref-noted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/编码|UnicodeDecodeError|练习.*1|练习一/i);
  });

  it("缺少 exercise-2-silent-sum-fixed → 第一次提示含 静默/合并单元格 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/intro-read", "done");
    await fs.write(".progress/template-tried", "done");
    await fs.write(".progress/exercise-1-encoding-fixed", "done");
    await fs.write(".progress/exercise-3-git-rollback-done", "done");
    await fs.write(".progress/forward-ref-noted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/静默|合并单元格|对数|练习.*2|练习二/i);
  });

  it("缺少 exercise-3-git-rollback-done → 第一次提示含 git restore/回退 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/intro-read", "done");
    await fs.write(".progress/template-tried", "done");
    await fs.write(".progress/exercise-1-encoding-fixed", "done");
    await fs.write(".progress/exercise-2-silent-sum-fixed", "done");
    await fs.write(".progress/forward-ref-noted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/git restore|回退|练习.*3|练习三/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id）", async () => {
    const fs = createVirtualFs();
    // Only intro-read done, others missing
    await fs.write(".progress/intro-read", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids or 我跑完了
    expect(result.hint).toMatch(
      /template-tried|exercise-1-encoding-fixed|exercise-2-silent-sum-fixed|exercise-3-git-rollback-done|forward-ref-noted|我跑完了/,
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
describe("Ch 08 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 6 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']intro-read["']/);
    expect(text).toMatch(/id=["']template-tried["']/);
    expect(text).toMatch(/id=["']exercise-1-encoding-fixed["']/);
    expect(text).toMatch(/id=["']exercise-2-silent-sum-fixed["']/);
    expect(text).toMatch(/id=["']exercise-3-git-rollback-done["']/);
    expect(text).toMatch(/id=["']forward-ref-noted["']/);
  });

  it("lesson.mdx 包含 <DebugFlowchart /> 组件", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/<DebugFlowchart/);
  });

  it("lesson.mdx 包含 <BugReportCard / 组件", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/<BugReportCard/);
  });

  it("lesson.mdx 不含 QuizRunner（Ch 08 无测验）", async () => {
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

  it("lesson.mdx 明确禁止 git checkout . （不应含这个命令的正面用法）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // The lesson should mention git checkout . only to forbid/warn about it
    // It should also contain git restore . as the safe alternative
    expect(text).toMatch(/git restore \./);
    // If git checkout . appears, it must be in a warning/forbidden context
    if (text.includes("git checkout .")) {
      expect(text).toMatch(/禁用|不要用|危险|forbidden|warn/i);
    }
  });

  it("lesson.mdx 包含 traceback 相关内容（5 种常见错误类型）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/SyntaxError/);
    expect(text).toMatch(/NameError/);
    expect(text).toMatch(/TypeError/);
    expect(text).toMatch(/KeyError/);
    expect(text).toMatch(/FileNotFoundError/);
  });

  it("lesson.mdx 包含 systematic-debugging 彩蛋引用", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/systematic-debugging/);
  });
});
