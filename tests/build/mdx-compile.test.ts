/**
 * Catches MDX bugs that pass vitest's content-shape tests but break `vite build`.
 *
 * Triggering case (2026-05-25, Ch 12): `<RealStep command="...\"...\"">` —
 * JSX attribute strings don't recognize backslash escapes, so the inner `"`
 * closed the attribute early and the rest was parsed as malformed JSX. Tests
 * still passed because they only check rendered shape, but `pnpm tauri:build`
 * exploded on @mdx-js/rollup's stricter compile pass.
 */
import { describe, it, expect } from "vitest";
import { compile } from "@mdx-js/mdx";
import { readFileSync } from "fs";
import { glob } from "glob";

const lessons = await glob("content/chapters/*/lesson.mdx");

describe("MDX production compile", () => {
  it.each(lessons)("compiles %s without errors", async (lessonPath) => {
    const source = readFileSync(lessonPath, "utf8");
    await expect(compile(source)).resolves.toBeDefined();
  });
});
