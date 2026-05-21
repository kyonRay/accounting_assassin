// content/chapters/05-your-workstation/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 05 is a real-env chapter — no fixture data files needed.
// Progress is tracked via vfs markers written by RealStep clicks.

describe("Ch 05 · 你的工作台", () => {
  it("完美用户路径：四个安装步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/brew-installed", "done");
    await fs.write(".progress/python-installed", "done");
    await fs.write(".progress/git-installed", "done");
    await fs.write(".progress/claude-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 brew-installed → 第一次提示含 Homebrew/brew 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/python-installed", "done");
    await fs.write(".progress/git-installed", "done");
    await fs.write(".progress/claude-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Homebrew|brew/i);
  });

  it("缺少 python-installed → 第一次提示含 Python 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/brew-installed", "done");
    await fs.write(".progress/git-installed", "done");
    await fs.write(".progress/claude-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Python|python/i);
  });

  it("缺少 git-installed → 第一次提示含 Git/git 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/brew-installed", "done");
    await fs.write(".progress/python-installed", "done");
    await fs.write(".progress/claude-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Git|git/);
  });

  it("缺少 claude-installed → 第一次提示含 Claude 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/brew-installed", "done");
    await fs.write(".progress/python-installed", "done");
    await fs.write(".progress/git-installed", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/Claude|claude/i);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 id 关键词）", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/brew-installed", "done");
    // missing: python, git, claude

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // second hint should mention the specific step ids or "我跑完了"
    expect(result.hint).toMatch(/python-installed|git-installed|claude-installed|我跑完了/);
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
describe("Ch 05 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 4 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']brew-installed["']/);
    expect(text).toMatch(/id=["']python-installed["']/);
    expect(text).toMatch(/id=["']git-installed["']/);
    expect(text).toMatch(/id=["']claude-installed["']/);
  });

  it("lesson.mdx 不含 QuizRunner（Ch 05 无测验）", async () => {
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
