import { useState } from "react";
import type { Quiz, QuizOption, QuizQuestion } from "./index";

export interface QuizRunnerProps {
  quiz: Quiz;
  /** Called when the learner submits any question (observational only — does not block progress). */
  onSubmit?: (questionId: string, selectedIds: string[], correct: boolean) => void;
}

// ---------------------------------------------------------------------------
// Per-question state machine
// ---------------------------------------------------------------------------

type QuestionState =
  | { phase: "answering"; selected: Set<string> }
  | { phase: "submitted"; selected: Set<string>; allCorrect: boolean };

function isAllCorrect(selected: Set<string>, options: QuizOption[]): boolean {
  const correctIds = new Set(options.filter((o) => o.correct).map((o) => o.id));
  if (selected.size !== correctIds.size) return false;
  for (const id of selected) {
    if (!correctIds.has(id)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Single question renderer
// ---------------------------------------------------------------------------

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  onSubmit?: (questionId: string, selectedIds: string[], correct: boolean) => void;
}

function QuestionCard({ question, index, total, onSubmit }: QuestionCardProps) {
  const [state, setState] = useState<QuestionState>({
    phase: "answering",
    selected: new Set<string>(),
  });

  const { type, id: qId, stem, options } = question;
  const isMulti = type === "multiple-choice";

  function toggleOption(optId: string) {
    if (state.phase !== "answering") return;
    setState((prev) => {
      if (prev.phase !== "answering") return prev;
      const next = new Set(prev.selected);
      if (isMulti) {
        if (next.has(optId)) next.delete(optId);
        else next.add(optId);
      } else {
        next.clear();
        next.add(optId);
      }
      return { phase: "answering", selected: next };
    });
  }

  function handleSubmit() {
    if (state.phase !== "answering" || state.selected.size === 0) return;
    const selectedIds = Array.from(state.selected);
    const correct = isAllCorrect(state.selected, options);
    setState({ phase: "submitted", selected: state.selected, allCorrect: correct });
    onSubmit?.(qId, selectedIds, correct);
  }

  function handleRetry() {
    setState({ phase: "answering", selected: new Set<string>() });
  }

  const submitted = state.phase === "submitted";
  const correctOptionIds = new Set(options.filter((o) => o.correct).map((o) => o.id));

  return (
    <div className="mb-8 rounded-xl border border-graphite/15 bg-white p-6 shadow-sm">
      {/* Question counter */}
      <p className="mb-3 text-xs text-muted">
        第 {index + 1} 题，共 {total} 题
        {isMulti && (
          <span className="ml-2 rounded bg-graphite/10 px-1.5 py-0.5 text-xs">
            多选
          </span>
        )}
      </p>

      {/* Stem */}
      <div className="mb-4 whitespace-pre-line text-base leading-relaxed text-graphite">
        {stem}
      </div>

      {/* Multiple-choice selection count helper */}
      {isMulti && state.phase === "answering" && state.selected.size > 0 && (
        <p className="mb-2 text-xs text-muted">已选 {state.selected.size} 项</p>
      )}

      {/* Result banner */}
      {submitted && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
            state.allCorrect
              ? "bg-done/10 text-done border border-done/30"
              : "bg-realenv/10 text-realenv border border-realenv/30"
          }`}
          role="status"
        >
          {state.allCorrect ? "✅ 答对了" : "➡️ 再想想"}
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = state.selected.has(opt.id);
          const isCorrectOpt = correctOptionIds.has(opt.id);
          const showFeedback = submitted && isSelected;
          const showCorrectBadge = submitted && !isSelected && isCorrectOpt;

          // Determine option background
          let optBg = "border-graphite/20 bg-graphite/3";
          if (submitted && isSelected && isCorrectOpt) {
            optBg = "border-done/40 bg-done/8";
          } else if (submitted && isSelected && !isCorrectOpt) {
            optBg = "border-realenv/40 bg-realenv/8";
          } else if (submitted && !isSelected && isCorrectOpt) {
            optBg = "border-done/20 bg-done/5";
          } else if (!submitted && isSelected) {
            optBg = "border-graphite/50 bg-graphite/8";
          }

          return (
            <div key={opt.id}>
              <button
                type="button"
                onClick={() => toggleOption(opt.id)}
                disabled={submitted}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${optBg} ${
                  submitted ? "cursor-default" : "cursor-pointer hover:bg-graphite/8"
                }`}
                aria-pressed={isSelected}
              >
                <span className="font-semibold text-graphite/60 mr-2">{opt.id}.</span>
                <span>{opt.text}</span>
                {showCorrectBadge && (
                  <span className="ml-2 rounded bg-done/20 px-1.5 py-0.5 text-xs text-done font-medium">
                    (正确答案)
                  </span>
                )}
              </button>
              {showFeedback && (
                <p className="mt-1 ml-3 text-sm text-graphite/70 leading-relaxed">
                  {opt.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Action button */}
      <div className="mt-4 flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={state.selected.size === 0}
            className="rounded-lg bg-graphite px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            提交
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-lg border border-graphite/30 px-5 py-2 text-sm font-medium text-graphite transition-colors hover:bg-graphite/8"
          >
            再答一次
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuizRunner — renders the full quiz
// ---------------------------------------------------------------------------

export function QuizRunner({ quiz, onSubmit }: QuizRunnerProps) {
  const { title, description, questions } = quiz;
  return (
    <div className="my-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-graphite mb-1">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={i}
          total={questions.length}
          onSubmit={onSubmit}
        />
      ))}
    </div>
  );
}
