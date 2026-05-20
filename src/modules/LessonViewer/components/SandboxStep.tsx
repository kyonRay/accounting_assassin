import { useState } from "react";
import type { ReactNode } from "react";

export interface SandboxStepProps {
  /** Unique step id within the chapter, used as the vfs marker filename */
  id: string;
  /** What the learner is expected to do/type, rendered as a code block */
  expectedInput?: string;
  /** Optional hint shown above the button */
  hint?: string;
  /** Explanatory content before the button */
  children: ReactNode;
  /** Called when the learner clicks "我做完了" */
  onComplete?: (id: string) => void;
}

export function SandboxStep({
  id,
  expectedInput,
  hint,
  children,
  onComplete,
}: SandboxStepProps) {
  const [done, setDone] = useState(false);

  function handleComplete() {
    setDone(true);
    onComplete?.(id);
  }

  return (
    <div className="border border-sandbox/30 rounded-lg p-4 my-4 bg-sandbox/5">
      <div className="text-graphite text-sm leading-relaxed">{children}</div>

      {expectedInput && (
        <pre className="mt-3 bg-graphite/5 border border-graphite/10 rounded p-3 font-mono text-sm whitespace-pre-wrap">
          {expectedInput}
        </pre>
      )}

      {hint && (
        <p className="mt-3 text-xs text-muted italic">{hint}</p>
      )}

      <div className="mt-4">
        {done ? (
          <span className="inline-flex items-center gap-1 text-done font-semibold text-sm">
            ✓ 已完成
          </span>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            className="bg-sandbox text-white text-sm font-medium px-4 py-2 rounded hover:bg-sandbox/90 transition-colors"
          >
            我做完了
          </button>
        )}
      </div>
    </div>
  );
}
