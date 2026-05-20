/** What the checker function returns when called by the runner */
export type CheckerVerdict =
  | { passed: true }
  | { passed: false; hints: string[] };
// hints[0] = directional, hints[1] = specific, hints[2] = final, etc.
// The runner picks the right hint based on `attempt`.

/** The execution environment passed to each chapter's checker function */
export interface CheckerEnv {
  mode: "sandbox" | "real";
  // Other facilities the chapter checker can use. Concrete fields (vfs, db, etc.)
  // are not required by the runner itself — the runner passes env through unchanged.
  [key: string]: unknown;
}

/** A chapter's checker is an async function with this signature */
export type CheckerFn = (env: CheckerEnv) => Promise<CheckerVerdict>;

/** What runChecker returns to the caller */
export interface RunResult {
  passed: boolean;
  hint?: string;             // present only when !passed
  showAnswerButton: boolean; // true only when attempt >= 3 and !passed
  // If the checker function itself throws, include the error message for diagnostics
  error?: string;
}

const FALLBACK_HINT = "请检查你的步骤,看是否漏掉了什么。";
const CHECKER_ERROR_HINT = "校验器自身报错(可能是沙箱状态异常),试试重置后再来一次。";

/**
 * Run a chapter's checker function and return a progressive hint result.
 *
 * @param fn      - The chapter's checker function (from checker.ts)
 * @param env     - The execution environment (vfs, db, mode, …); passed through unchanged
 * @param attempt - 1-based attempt number; determines which hint to show
 *
 * Hint-picking logic:
 *   attempt <= 1 → hints[0] (or FALLBACK_HINT if hints is empty)
 *   attempt === 2 → hints[1] ?? hints[0] ?? FALLBACK_HINT
 *   attempt >= 3  → hints[2] ?? hints[1] ?? hints[0] ?? FALLBACK_HINT  (+ showAnswerButton: true)
 *
 * Note: an empty-string hint ("") is treated as explicitly present — only `undefined`
 * triggers fallback to a lower index.
 */
export async function runChecker(
  fn: CheckerFn,
  env: CheckerEnv,
  attempt: number,
): Promise<RunResult> {
  let verdict: CheckerVerdict;

  try {
    verdict = await fn(env);
  } catch (err) {
    return {
      passed: false,
      hint: CHECKER_ERROR_HINT,
      showAnswerButton: attempt >= 3,
      error: String(err),
    };
  }

  if (verdict.passed) {
    return { passed: true, showAnswerButton: false };
  }

  const { hints } = verdict;
  const showAnswerButton = attempt >= 3;

  let hint: string;
  if (attempt <= 1) {
    hint = hints[0] !== undefined ? hints[0] : FALLBACK_HINT;
  } else if (attempt === 2) {
    hint =
      hints[1] !== undefined ? hints[1] :
      hints[0] !== undefined ? hints[0] :
      FALLBACK_HINT;
  } else {
    // attempt >= 3
    hint =
      hints[2] !== undefined ? hints[2] :
      hints[1] !== undefined ? hints[1] :
      hints[0] !== undefined ? hints[0] :
      FALLBACK_HINT;
  }

  return { passed: false, hint, showAnswerButton };
}
