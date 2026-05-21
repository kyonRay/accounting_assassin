// content/chapters/12-codex-deep/test.ts
import { describe, it, expect } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { runChecker } from "@/modules/Checker";
import { check } from "./checker";

// Ch 12 is a real-env chapter — progress tracked via vfs markers.
// Markers:
//   workspace-snapshotted   — user ran git snapshot before batch run
//   batch-input-prepared    — user prepared sample CSV files for batch processing
//   auto-approve-tried      — user ran Codex exec (auto-approve mode) on the batch
//   safety-rule-understood  — user read the safety rules (when NOT to use auto-approve)

describe("Ch 12 · Codex 深入", () => {
  it("完美用户路径：四个步骤全部完成 → checker 通过", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-snapshotted", "done");
    await fs.write(".progress/batch-input-prepared", "done");
    await fs.write(".progress/auto-approve-tried", "done");
    await fs.write(".progress/safety-rule-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(true);
    expect(result.hint).toBeUndefined();
    expect(result.showAnswerButton).toBe(false);
  });

  it("缺少 workspace-snapshotted → 第一次提示含 快照/snapshot/git 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/batch-input-prepared", "done");
    await fs.write(".progress/auto-approve-tried", "done");
    await fs.write(".progress/safety-rule-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/快照|snapshot|git/i);
  });

  it("缺少 batch-input-prepared → 第一次提示含 CSV/文件/批量 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-snapshotted", "done");
    await fs.write(".progress/auto-approve-tried", "done");
    await fs.write(".progress/safety-rule-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/CSV|文件|批量/i);
  });

  it("缺少 auto-approve-tried → 第一次提示含 exec|自动|auto 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-snapshotted", "done");
    await fs.write(".progress/batch-input-prepared", "done");
    await fs.write(".progress/safety-rule-understood", "done");

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/exec|自动|auto/i);
  });

  it("缺少 safety-rule-understood → 第一次提示含 安全/风险/规则 关键词", async () => {
    const fs = createVirtualFs();
    await fs.write(".progress/workspace-snapshotted", "done");
    await fs.write(".progress/batch-input-prepared", "done");
    await fs.write(".progress/auto-approve-tried", "done");
    // .progress/safety-rule-understood intentionally absent

    const result = await runChecker(check, { mode: "real", fs }, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/安全|风险|规则/);
  });

  it("第 2 次仍未完成 → 提示变得更具体（含 marker id 关键词）", async () => {
    const fs = createVirtualFs();
    // Only workspace-snapshotted done, others missing
    await fs.write(".progress/workspace-snapshotted", "done");

    const result = await runChecker(check, { mode: "real", fs }, 2);
    expect(result.passed).toBe(false);
    // Second hint should mention specific step ids
    expect(result.hint).toMatch(
      /batch-input-prepared|auto-approve-tried|safety-rule-understood|我跑完了/,
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
describe("Ch 12 · lesson.mdx", () => {
  it("lesson.mdx 包含所有 4 个 RealStep id", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/id=["']workspace-snapshotted["']/);
    expect(text).toMatch(/id=["']batch-input-prepared["']/);
    expect(text).toMatch(/id=["']auto-approve-tried["']/);
    expect(text).toMatch(/id=["']safety-rule-understood["']/);
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

  it("lesson.mdx 不含 QuizRunner（Ch 12 无测验）", async () => {
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

  it("lesson.mdx 包含 Ch 11 前提说明 Callout（type=warn）", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // Should mention Ch 11 as prerequisite
    expect(text).toMatch(/Ch 11|第 11 章/);
  });

  it("lesson.mdx 包含 git restore 安全网说明", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    // Ch 8's safety vocabulary must be present
    expect(text).toMatch(/git restore/);
  });

  it("lesson.mdx 包含 codex exec 命令说明", async () => {
    const nodeFs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = nodePath.dirname(fileURLToPath(import.meta.url));
    const text = await nodeFs.readFile(
      nodePath.resolve(dir, "lesson.mdx"),
      "utf-8",
    );
    expect(text).toMatch(/codex exec/);
  });
});
