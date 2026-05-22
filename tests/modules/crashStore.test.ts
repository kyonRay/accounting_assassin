import { describe, it, expect, beforeEach } from "vitest";
import { useCrashStore, sanitizeStack } from "@/modules/Progress";

beforeEach(() => {
  useCrashStore.getState().clearCrash();
});

describe("sanitizeStack", () => {
  it("returns empty string when stack is undefined", () => {
    expect(sanitizeStack(undefined)).toBe("");
  });

  it("returns empty string when stack is empty", () => {
    expect(sanitizeStack("")).toBe("");
  });

  it("trims stack to first 20 lines", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `frame ${i}`);
    const result = sanitizeStack(lines.join("\n"));
    const out = result.split("\n");
    expect(out).toHaveLength(20);
    expect(out[0]).toBe("frame 0");
    expect(out[19]).toBe("frame 19");
  });

  it("replaces /Users/<name>/ with ~/...", () => {
    const stack = `Error: boom
    at Foo (/Users/alice/projects/app/src/main.tsx:42:10)
    at Bar (/Users/alice/projects/app/src/Bar.tsx:1:1)`;
    const out = sanitizeStack(stack);
    expect(out).not.toMatch(/\/Users\/alice\//);
    expect(out).toContain("~/projects/app/src/main.tsx");
    expect(out).toContain("~/projects/app/src/Bar.tsx");
  });

  it("does not modify stack lines without /Users/ prefix", () => {
    const stack = `Error: boom
    at Foo (webpack:///./src/main.tsx:42:10)
    at Bar (node:internal/process:1:1)`;
    expect(sanitizeStack(stack)).toBe(stack);
  });

  it("handles multiple /Users/ paths on the same line", () => {
    const stack = "at fn (/Users/alice/a.ts:1) called by /Users/alice/b.ts:2";
    const out = sanitizeStack(stack);
    expect(out).not.toMatch(/\/Users\/alice/);
    expect(out).toContain("~/a.ts");
    expect(out).toContain("~/b.ts");
  });

  it("does not chew through multi-segment paths", () => {
    // The replacement must stop at the next `/`, leaving deeper segments intact.
    const stack = "at fn (/Users/bob/very/deep/path/file.ts:1)";
    const out = sanitizeStack(stack);
    expect(out).toBe("at fn (~/very/deep/path/file.ts:1)");
  });
});

describe("useCrashStore", () => {
  it("starts with lastCrash = null", () => {
    expect(useCrashStore.getState().lastCrash).toBeNull();
  });

  it("recordCrash captures name, message, sanitized stack, and timestamp", () => {
    const err = new Error("something broke");
    err.name = "TypeError";
    err.stack = `TypeError: something broke
    at f (/Users/alice/foo.ts:1:1)`;

    useCrashStore.getState().recordCrash(err);
    const got = useCrashStore.getState().lastCrash;

    expect(got).not.toBeNull();
    expect(got!.name).toBe("TypeError");
    expect(got!.message).toBe("something broke");
    expect(got!.stack).not.toMatch(/\/Users\/alice/);
    expect(got!.stack).toContain("~/foo.ts");
    // Timestamp must be a parseable ISO-8601 UTC string.
    expect(() => new Date(got!.timestampUtc).toISOString()).not.toThrow();
    expect(got!.timestampUtc).toMatch(/Z$/);
  });

  it("recordCrash overwrites the previous crash (only last is kept)", () => {
    useCrashStore.getState().recordCrash(new Error("first"));
    useCrashStore.getState().recordCrash(new Error("second"));
    expect(useCrashStore.getState().lastCrash?.message).toBe("second");
  });

  it("recordCrash handles errors with no stack property", () => {
    const err = new Error("no stack");
    delete err.stack;
    useCrashStore.getState().recordCrash(err);
    expect(useCrashStore.getState().lastCrash?.stack).toBe("");
  });

  it("recordCrash does NOT capture error.cause or custom properties", () => {
    const err = new Error("outer") as Error & {
      cause?: unknown;
      sensitiveUserInput?: unknown;
    };
    err.cause = new Error("inner with /Users/alice/secret.csv content");
    err.sensitiveUserInput = "password123";
    useCrashStore.getState().recordCrash(err);

    const got = useCrashStore.getState().lastCrash!;
    // Allowlist: only name/message/stack/timestampUtc — nothing else slips in.
    expect(Object.keys(got).sort()).toEqual(
      ["message", "name", "stack", "timestampUtc"].sort(),
    );
    expect(JSON.stringify(got)).not.toContain("password123");
    expect(JSON.stringify(got)).not.toContain("secret.csv");
  });

  it("clearCrash resets to null", () => {
    useCrashStore.getState().recordCrash(new Error("boom"));
    expect(useCrashStore.getState().lastCrash).not.toBeNull();
    useCrashStore.getState().clearCrash();
    expect(useCrashStore.getState().lastCrash).toBeNull();
  });
});
