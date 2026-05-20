import { describe, it, expect } from "vitest";
import {
  createFakeClaude,
  type FakeClaudeSession,
} from "@/modules/Sandbox/fake-claude";

// Minimal session factory for convenience
function makeSession(
  overrides: Partial<FakeClaudeSession> = {}
): FakeClaudeSession {
  return {
    id: "test-session",
    turns: [],
    ...overrides,
  };
}

describe("createFakeClaude", () => {
  // 1. Regex match → returns the right response
  it("matches a regex pattern and returns the scripted response", () => {
    const session = makeSession({
      turns: [
        {
          match: /read.*csv/i,
          response: {
            toolCalls: [{ name: "Read", args: { path: "invoices.csv" } }],
            text: "Here is the CSV.",
          },
        },
      ],
    });
    const claude = createFakeClaude(session);
    const result = claude.handle("please read the invoices.csv file");
    expect(result).not.toBeNull();
    expect(result!.toolCalls).toHaveLength(1);
    expect(result!.toolCalls[0].name).toBe("Read");
    expect(result!.text).toBe("Here is the CSV.");
  });

  // 2. String (substring) match → returns the right response
  it("matches a literal string substring and returns the scripted response", () => {
    const session = makeSession({
      turns: [
        {
          match: "ls -la",
          response: {
            toolCalls: [{ name: "Bash", args: { command: "ls -la" } }],
            text: "Listed files.",
          },
        },
      ],
    });
    const claude = createFakeClaude(session);
    const result = claude.handle("run ls -la in my directory");
    expect(result).not.toBeNull();
    expect(result!.toolCalls[0].name).toBe("Bash");
    expect(result!.text).toBe("Listed files.");
  });

  // 3. First match wins (when multiple turns could match)
  it("returns the first matching turn when multiple turns could match", () => {
    const session = makeSession({
      turns: [
        {
          match: "hello",
          response: { text: "first match" },
        },
        {
          match: /hello/,
          response: { text: "second match" },
        },
      ],
    });
    const claude = createFakeClaude(session);
    const result = claude.handle("hello world");
    expect(result!.text).toBe("first match");
  });

  // 4. No match + no fallback → returns null
  it("returns null when no turn matches and no fallback is set", () => {
    const session = makeSession({
      turns: [
        {
          match: "specific phrase",
          response: { text: "response" },
        },
      ],
    });
    const claude = createFakeClaude(session);
    expect(claude.handle("something completely different")).toBeNull();
  });

  // 5. No match + fallback → returns fallback (normalized)
  it("returns the fallback response when no turn matches and fallback is set", () => {
    const session = makeSession({
      turns: [
        {
          match: "specific phrase",
          response: { text: "specific response" },
        },
      ],
      fallback: { text: "I don't understand that." },
    });
    const claude = createFakeClaude(session);
    const result = claude.handle("unknown input");
    expect(result).not.toBeNull();
    expect(result!.text).toBe("I don't understand that.");
    expect(result!.toolCalls).toEqual([]);
  });

  // 6. Stability: same input → 3 calls → 3 identical responses
  it("returns identical responses on repeated calls with the same input (stability)", () => {
    const session = makeSession({
      turns: [
        {
          match: /python/i,
          response: {
            toolCalls: [{ name: "Python", args: { code: "print('hi')" }, result: "hi" }],
            text: "Done.",
          },
        },
      ],
    });
    const claude = createFakeClaude(session);
    const r1 = claude.handle("run python code");
    const r2 = claude.handle("run python code");
    const r3 = claude.handle("run python code");
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  // 7. toolCalls + text both present in output even when one is missing in turn definition
  it("normalizes response: missing toolCalls defaults to [] and missing text defaults to ''", () => {
    const session = makeSession({
      turns: [
        {
          // no toolCalls in response
          match: "no tools",
          response: { text: "just text" },
        },
        {
          // no text in response
          match: "no text",
          response: { toolCalls: [{ name: "Bash", args: {} }] },
        },
      ],
    });
    const claude = createFakeClaude(session);

    const r1 = claude.handle("no tools here");
    expect(r1).not.toBeNull();
    expect(r1!.toolCalls).toEqual([]);
    expect(r1!.text).toBe("just text");

    const r2 = claude.handle("no text please");
    expect(r2).not.toBeNull();
    expect(r2!.toolCalls).toHaveLength(1);
    expect(r2!.text).toBe("");
  });

  // 8. Stateful regex with /g flag doesn't break repeat calls
  it("handles a /g (global) regex correctly on repeated calls without breaking", () => {
    const globalRegex = /foo/g;
    const session = makeSession({
      turns: [
        {
          match: globalRegex,
          response: { text: "matched foo" },
        },
      ],
    });
    const claude = createFakeClaude(session);
    const r1 = claude.handle("foo bar");
    const r2 = claude.handle("foo bar");
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r1!.text).toBe("matched foo");
    expect(r2!.text).toBe("matched foo");
    expect(r1).toEqual(r2);
  });

  // Empty turns array → fallback or null
  it("returns null for empty turns array when no fallback", () => {
    const claude = createFakeClaude(makeSession({ turns: [] }));
    expect(claude.handle("anything")).toBeNull();
  });

  it("returns fallback for empty turns array when fallback is set", () => {
    const claude = createFakeClaude(
      makeSession({ turns: [], fallback: { text: "fallback!" } })
    );
    const result = claude.handle("anything");
    expect(result!.text).toBe("fallback!");
    expect(result!.toolCalls).toEqual([]);
  });

  // Empty-string match is a catch-all (documented quirk)
  it("empty string match catches all inputs (known catch-all quirk)", () => {
    const session = makeSession({
      turns: [
        {
          match: "",
          response: { text: "catch-all" },
        },
      ],
    });
    const claude = createFakeClaude(session);
    expect(claude.handle("anything at all")!.text).toBe("catch-all");
    expect(claude.handle("")!.text).toBe("catch-all");
  });

  // Empty userInput still iterates turns
  it("handles empty string user input against regex and string patterns", () => {
    const session = makeSession({
      turns: [
        {
          match: /^$/,
          response: { text: "empty input matched" },
        },
      ],
    });
    const claude = createFakeClaude(session);
    expect(claude.handle("")!.text).toBe("empty input matched");
    expect(claude.handle("not empty")).toBeNull();
  });
});
