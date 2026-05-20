/**
 * fake-claude.ts
 *
 * Scripted "fake Claude" responder for the Sandbox environment (Ch 1-4).
 *
 * No real LLM calls are made. Each session declares a list of turns that
 * map user-input patterns to pre-written AI responses. This gives stable,
 * deterministic output with no API key requirement and full pedagogical
 * control. See design spec § 4.2.
 *
 * Stability guarantee: `handle(input)` is pure — calling it multiple times
 * with the same input returns structurally identical results (deep-equal).
 * No randomness, timestamps, or auto-incremented IDs are inserted.
 */

export interface FakeToolCall {
  /** Tool name as it appears in the terminal (e.g., "Read", "Python", "Bash"). */
  name: string;
  /** Arguments passed to the tool. */
  args: Record<string, unknown>;
  /** Faked result text shown after the tool "runs". Optional. */
  result?: string;
}

export interface FakeClaudeTurn {
  /**
   * Pattern to match the user's input.
   * - RegExp: `match.test(userInput)` is used. Do NOT use the global `/g` flag
   *   on patterns meant to be reused — the implementation resets `lastIndex`
   *   defensively, but stateless patterns are simpler.
   * - string: `userInput.includes(match)` (case-sensitive substring).
   *   An empty string always matches (catch-all quirk — see tests).
   */
  match: RegExp | string;
  response: {
    toolCalls?: FakeToolCall[];
    /** Final natural-language reply shown after all tool calls. */
    text?: string;
  };
}

export interface FakeClaudeSession {
  /** Chapter slug or session id — used for debugging/logs only. */
  id: string;
  turns: FakeClaudeTurn[];
  /**
   * Optional response when no turn matches.
   * Default: null — the terminal stays quiet.
   */
  fallback?: FakeClaudeTurn["response"];
}

export interface FakeClaudeResponse {
  /** Always present; empty array when no tool calls are scripted. */
  toolCalls: FakeToolCall[];
  /** Always present; empty string when no text is scripted. */
  text: string;
}

export interface FakeClaude {
  /**
   * Match `userInput` against the session's turns in order.
   * Returns the first matching response (normalized), the fallback (normalized),
   * or null if nothing matches.
   */
  handle(userInput: string): FakeClaudeResponse | null;
}

/** Normalize a raw response definition into a fully-typed FakeClaudeResponse. */
function normalize(
  response: FakeClaudeTurn["response"]
): FakeClaudeResponse {
  return {
    toolCalls: response.toolCalls ?? [],
    text: response.text ?? "",
  };
}

/**
 * Create a `FakeClaude` instance bound to the given session.
 *
 * The returned object is stateless with respect to call history — only the
 * session script determines behavior. Calling `handle` with the same input
 * any number of times always yields the same result (deep-equal).
 */
export function createFakeClaude(session: FakeClaudeSession): FakeClaude {
  return {
    handle(userInput: string): FakeClaudeResponse | null {
      for (const turn of session.turns) {
        let matched: boolean;

        if (turn.match instanceof RegExp) {
          // Defensively reset lastIndex to guard against /g flag misuse.
          // Using .test() on a /g regex advances lastIndex, which would cause
          // alternating match/no-match on repeated calls with the same input.
          turn.match.lastIndex = 0;
          matched = turn.match.test(userInput);
        } else {
          // Literal substring containment. Empty string always matches.
          matched = userInput.includes(turn.match);
        }

        if (matched) {
          return normalize(turn.response);
        }
      }

      // No turn matched.
      if (session.fallback !== undefined) {
        return normalize(session.fallback);
      }

      return null;
    },
  };
}
