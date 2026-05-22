/**
 * crashStore — process-local "most recent crash" memory.
 *
 * Per design spec § 8.5, the diagnostic report ("我卡住了") should
 * automatically include the most recent crash (sanitized) so the user
 * does not have to remember or describe what they were doing when the
 * App fell over.
 *
 * NOT persisted: crashes do not survive an App restart. Once the user
 * relaunches we deliberately forget — both because the React tree is
 * fresh and because a stale crash from yesterday is noise, not signal.
 *
 * Sanitization (applied at `recordCrash` time, never on read):
 *   - Capture ONLY `error.name`, `error.message`, sanitized `error.stack`.
 *     We deliberately ignore `error.cause` and any custom properties some
 *     libraries hang on the Error (they have a habit of stashing user
 *     data such as the failing input there).
 *   - Stack: trimmed to the first 20 lines (deeper frames are noise for
 *     an end user and rarely add diagnostic value).
 *   - Stack: any `/Users/<username>/` prefix is rewritten to `~/...` so
 *     the report never leaks the macOS home directory name.
 */
import { create } from "zustand";

export interface CrashRecord {
  name: string;
  message: string;
  /** Sanitized stack (first 20 lines, /Users/<name>/ replaced with ~/...). */
  stack: string;
  /** ISO 8601 UTC timestamp. */
  timestampUtc: string;
}

export interface CrashStoreState {
  lastCrash: CrashRecord | null;
  recordCrash: (err: Error) => void;
  clearCrash: () => void;
}

const STACK_MAX_LINES = 20;

/** Exported for direct unit testing of the sanitizer. */
export function sanitizeStack(rawStack: string | undefined): string {
  if (!rawStack) return "";
  const lines = rawStack.split("\n").slice(0, STACK_MAX_LINES);
  // Replace any /Users/<one-segment>/ prefix with ~/...
  // We use a non-greedy character class that excludes `/` so we never
  // accidentally chew through multiple path components.
  return lines
    .map((line) => line.replace(/\/Users\/[^/\s]+\//g, "~/"))
    .join("\n");
}

export const useCrashStore = create<CrashStoreState>((set) => ({
  lastCrash: null,
  recordCrash: (err) => {
    set({
      lastCrash: {
        name: err.name,
        message: err.message,
        stack: sanitizeStack(err.stack),
        timestampUtc: new Date().toISOString(),
      },
    });
  },
  clearCrash: () => set({ lastCrash: null }),
}));
