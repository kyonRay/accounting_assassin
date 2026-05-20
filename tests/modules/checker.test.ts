import { describe, it, expect } from "vitest";
import {
  runChecker,
  type CheckerFn,
  type CheckerEnv,
} from "@/modules/Checker/index";

const baseEnv: CheckerEnv = { mode: "sandbox" };

// Helpers
const passingChecker: CheckerFn = async () => ({ passed: true });
const failingChecker = (hints: string[]): CheckerFn =>
  async () => ({ passed: false, hints });
const throwingChecker: CheckerFn = async () => {
  throw new Error("boom");
};

describe("runChecker", () => {
  // 1. Pass
  it("pass: returns { passed: true, showAnswerButton: false } with no hint", async () => {
    const result = await runChecker(passingChecker, baseEnv, 1);
    expect(result.passed).toBe(true);
    expect(result.showAnswerButton).toBe(false);
    expect(result.hint).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  // 2. Attempt 1 fail, full hints array → hints[0]
  it("attempt 1 fail with full hints: returns hints[0]", async () => {
    const hints = ["方向性提示", "具体提示", "最终提示"];
    const result = await runChecker(failingChecker(hints), baseEnv, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("方向性提示");
    expect(result.showAnswerButton).toBe(false);
  });

  // 3. Attempt 2 fail, full hints → hints[1]
  it("attempt 2 fail with full hints: returns hints[1]", async () => {
    const hints = ["方向性提示", "具体提示", "最终提示"];
    const result = await runChecker(failingChecker(hints), baseEnv, 2);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("具体提示");
    expect(result.showAnswerButton).toBe(false);
  });

  // 4. Attempt 3 fail, full hints → hints[2] + showAnswerButton: true
  it("attempt 3 fail with full hints: returns hints[2] and showAnswerButton true", async () => {
    const hints = ["方向性提示", "具体提示", "最终提示"];
    const result = await runChecker(failingChecker(hints), baseEnv, 3);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("最终提示");
    expect(result.showAnswerButton).toBe(true);
  });

  // 5. Attempt 5 (well past 3) → hints[2] (or last) + showAnswerButton: true
  it("attempt 5 fail: returns hints[2] and showAnswerButton true", async () => {
    const hints = ["方向性提示", "具体提示", "最终提示"];
    const result = await runChecker(failingChecker(hints), baseEnv, 5);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("最终提示");
    expect(result.showAnswerButton).toBe(true);
  });

  // 6. Attempt 2 with only 1 hint → degrades to hints[0]
  it("attempt 2 with only 1 hint: degrades to hints[0]", async () => {
    const hints = ["唯一提示"];
    const result = await runChecker(failingChecker(hints), baseEnv, 2);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("唯一提示");
    expect(result.showAnswerButton).toBe(false);
  });

  // 7. Attempt 3 with empty hints array → fallback + showAnswerButton: true
  it("attempt 3 with empty hints array: returns fallback and showAnswerButton true", async () => {
    const result = await runChecker(failingChecker([]), baseEnv, 3);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("请检查你的步骤,看是否漏掉了什么。");
    expect(result.showAnswerButton).toBe(true);
  });

  // 8a. Checker throws at attempt 1 → error field set, showAnswerButton false
  it("checker throws at attempt 1: returns error and showAnswerButton false", async () => {
    const result = await runChecker(throwingChecker, baseEnv, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe(
      "校验器自身报错(可能是沙箱状态异常),试试重置后再来一次。"
    );
    expect(result.error).toBe("Error: boom");
    expect(result.showAnswerButton).toBe(false);
  });

  // 8b. Checker throws at attempt 3 → error field set, showAnswerButton true
  it("checker throws at attempt 3: returns error and showAnswerButton true", async () => {
    const result = await runChecker(throwingChecker, baseEnv, 3);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe(
      "校验器自身报错(可能是沙箱状态异常),试试重置后再来一次。"
    );
    expect(result.error).toBe("Error: boom");
    expect(result.showAnswerButton).toBe(true);
  });

  // 9. env passes through unmodified
  it("env passes through: checker receives the same env object", async () => {
    const envSpy: CheckerEnv = { mode: "real", customField: "abc" };
    let receivedEnv: CheckerEnv | null = null;
    const envCapturingChecker: CheckerFn = async (env) => {
      receivedEnv = env;
      return { passed: true };
    };
    await runChecker(envCapturingChecker, envSpy, 1);
    expect(receivedEnv).toBe(envSpy); // same reference — runner must not copy/mutate
  });

  // Edge: attempt 1 with empty hints → fallback, no showAnswerButton
  it("attempt 1 with empty hints: returns fallback and showAnswerButton false", async () => {
    const result = await runChecker(failingChecker([]), baseEnv, 1);
    expect(result.passed).toBe(false);
    expect(result.hint).toBe("请检查你的步骤,看是否漏掉了什么。");
    expect(result.showAnswerButton).toBe(false);
  });

  // Edge: empty-string hint is treated as present, not as missing
  it("empty-string hint at index 1 is treated as present (not a fallback trigger)", async () => {
    const hints = ["第一个提示", ""];
    const result = await runChecker(failingChecker(hints), baseEnv, 2);
    expect(result.hint).toBe(""); // explicit author choice — runner passes it through
    expect(result.showAnswerButton).toBe(false);
  });
});
