import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { parseQuiz } from "@/modules/Quiz/quiz-loader";
import { QuizRunner } from "@/modules/Quiz/QuizRunner";
import type { Quiz } from "@/modules/Quiz/index";

// ---------------------------------------------------------------------------
// Minimal valid quiz fixtures
// ---------------------------------------------------------------------------

const SINGLE_QUESTION_QUIZ: Quiz = {
  title: "测验标题",
  description: "测验说明",
  questions: [
    {
      id: "q1",
      type: "single-choice",
      stem: "哪个是正确答案?",
      options: [
        { id: "A", text: "错误选项", feedback: "这是错误的。", correct: undefined },
        { id: "B", text: "正确选项", feedback: "完全正确!", correct: true },
        { id: "C", text: "另一个错误", feedback: "不对哦。" },
      ],
    },
  ],
};

const MULTI_QUESTION_QUIZ: Quiz = {
  title: "多选测验",
  description: "多选说明",
  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      stem: "请选出所有正确答案:",
      options: [
        { id: "A", text: "正确A", feedback: "A 对!", correct: true },
        { id: "B", text: "正确B", feedback: "B 对!", correct: true },
        { id: "C", text: "错误C", feedback: "C 错!", correct: undefined },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 1. parseQuiz: accepts a well-formed quiz
// ---------------------------------------------------------------------------

describe("parseQuiz", () => {
  it("validates and returns a well-formed Quiz", () => {
    const raw = {
      title: "检查你对第 1 章的理解",
      description: "5 道题 · 大约 3 分钟",
      questions: [
        {
          id: "q1",
          type: "single-choice",
          stem: "这是问题干",
          options: [
            { id: "A", text: "选项A", feedback: "反馈A" },
            { id: "B", text: "选项B", feedback: "反馈B", correct: true },
          ],
        },
      ],
    };
    const quiz = parseQuiz(raw);
    expect(quiz.title).toBe("检查你对第 1 章的理解");
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.questions[0].type).toBe("single-choice");
    expect(quiz.questions[0].options[1].correct).toBe(true);
  });

  // 2. Rejects missing title
  it("throws when title is missing", () => {
    const raw = {
      description: "测验说明",
      questions: [
        {
          id: "q1",
          type: "single-choice",
          stem: "问题",
          options: [{ id: "A", text: "选项A", feedback: "反馈", correct: true }],
        },
      ],
    };
    expect(() => parseQuiz(raw)).toThrow(/title/);
  });

  // 3. Rejects empty questions array
  it("throws when questions is empty", () => {
    const raw = {
      title: "测验",
      description: "说明",
      questions: [],
    };
    expect(() => parseQuiz(raw)).toThrow(/questions/);
  });

  // 4. Rejects a question with zero correct options
  it("throws when a question has zero correct options", () => {
    const raw = {
      title: "测验",
      description: "说明",
      questions: [
        {
          id: "q1",
          type: "single-choice",
          stem: "问题",
          options: [
            { id: "A", text: "选项A", feedback: "反馈A" },
            { id: "B", text: "选项B", feedback: "反馈B" },
          ],
        },
      ],
    };
    expect(() => parseQuiz(raw)).toThrow(/correct/i);
  });

  // 5. Rejects invalid type value
  it("throws when question type is invalid", () => {
    const raw = {
      title: "测验",
      description: "说明",
      questions: [
        {
          id: "q1",
          type: "drag-and-drop",
          stem: "问题",
          options: [{ id: "A", text: "选项A", feedback: "反馈", correct: true }],
        },
      ],
    };
    expect(() => parseQuiz(raw)).toThrow(/type/);
  });
});

// ---------------------------------------------------------------------------
// 6. QuizRunner: renders title + description + all questions
// ---------------------------------------------------------------------------

describe("QuizRunner rendering", () => {
  it("renders title, description and all questions", () => {
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} />);
    expect(screen.getByText("测验标题")).toBeInTheDocument();
    expect(screen.getByText("测验说明")).toBeInTheDocument();
    expect(screen.getByText("哪个是正确答案?")).toBeInTheDocument();
    expect(screen.getByText("错误选项")).toBeInTheDocument();
    expect(screen.getByText("正确选项")).toBeInTheDocument();
    expect(screen.getByText("另一个错误")).toBeInTheDocument();
  });

  // 7. single-choice: clicking correct option auto-submits (no 提交 button needed)
  it("single-choice: selecting correct option immediately shows '答对了'", () => {
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} />);

    // Select the correct option (B) — feedback appears immediately, no 提交 click
    fireEvent.click(screen.getByText("正确选项").closest("button")!);

    // Should show 答对了 banner
    expect(screen.getByRole("status")).toHaveTextContent("答对了");
    // Should show feedback for selected option
    expect(screen.getByText("完全正确!")).toBeInTheDocument();
  });

  // 8. single-choice: clicking wrong option auto-submits
  it("single-choice: selecting wrong option immediately shows '再想想' + correct badge", () => {
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} />);

    // Select the wrong option (A) — feedback appears immediately
    fireEvent.click(screen.getByText("错误选项").closest("button")!);

    // Should show 再想想 banner
    expect(screen.getByRole("status")).toHaveTextContent("再想想");
    // Should show feedback for selected wrong option
    expect(screen.getByText("这是错误的。")).toBeInTheDocument();
    // Should show correct badge on the unselected correct option
    expect(screen.getByText("(正确答案)")).toBeInTheDocument();
  });

  // 9. multiple-choice partial correct → 再想想; select all → 答对了
  it("multiple-choice: partial selection → '再想想', full correct → '答对了'", () => {
    const { unmount } = render(<QuizRunner quiz={MULTI_QUESTION_QUIZ} />);

    // Select only A (one of two correct)
    fireEvent.click(screen.getByText("正确A").closest("button")!);
    fireEvent.click(screen.getByText("提交"));

    expect(screen.getByRole("status")).toHaveTextContent("再想想");
    unmount();

    // Fresh render: select both A and B
    render(<QuizRunner quiz={MULTI_QUESTION_QUIZ} />);
    fireEvent.click(screen.getByText("正确A").closest("button")!);
    fireEvent.click(screen.getByText("正确B").closest("button")!);
    fireEvent.click(screen.getByText("提交"));

    expect(screen.getByRole("status")).toHaveTextContent("答对了");
  });

  // 10. multiple-choice: select both correct + 1 wrong → 再想想
  it("multiple-choice: selecting both correct + wrong extra → '再想想'", () => {
    render(<QuizRunner quiz={MULTI_QUESTION_QUIZ} />);

    fireEvent.click(screen.getByText("正确A").closest("button")!);
    fireEvent.click(screen.getByText("正确B").closest("button")!);
    fireEvent.click(screen.getByText("错误C").closest("button")!);
    fireEvent.click(screen.getByText("提交"));

    expect(screen.getByRole("status")).toHaveTextContent("再想想");
  });

  // 11. 再答一次 clears the question state
  it("'再答一次' resets the question back to answering state", () => {
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} />);

    // Select option — auto-submits for single-choice
    fireEvent.click(screen.getByText("正确选项").closest("button")!);

    // Banner should be visible
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Click 再答一次
    fireEvent.click(screen.getByText("再答一次"));

    // Banner should be gone, hint text back, no 提交 button for single-choice
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("点选项即出反馈")).toBeInTheDocument();
    // Feedback text should be gone
    expect(screen.queryByText("完全正确!")).not.toBeInTheDocument();
  });

  // 12. onSubmit callback fires correctly for single-choice (on option click)
  it("onSubmit callback fires with (questionId, selectedIds, correctness) on option click", () => {
    const onSubmit = vi.fn();
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} onSubmit={onSubmit} />);

    // Select wrong option A — fires immediately
    fireEvent.click(screen.getByText("错误选项").closest("button")!);

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith("q1", ["A"], false);
  });

  it("onSubmit callback fires with correct=true when right answer selected", () => {
    const onSubmit = vi.fn();
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("正确选项").closest("button")!);

    expect(onSubmit).toHaveBeenCalledWith("q1", ["B"], true);
  });

  // 13. single-choice has NO 提交 button (not just disabled — absent)
  it("single-choice: 提交 button is not rendered before selection", () => {
    render(<QuizRunner quiz={SINGLE_QUESTION_QUIZ} />);
    expect(screen.queryByText("提交")).not.toBeInTheDocument();
  });

  // 14. multi-choice STILL shows 提交 button (regression guard)
  it("multi-choice: 提交 button is present before submission", () => {
    render(<QuizRunner quiz={MULTI_QUESTION_QUIZ} />);
    expect(screen.getByText("提交")).toBeInTheDocument();
  });

  // Submit button is disabled until an option is selected (multi-choice only)
  it("multi-choice: submit button is disabled when no option selected", () => {
    render(<QuizRunner quiz={MULTI_QUESTION_QUIZ} />);
    const submitBtn = screen.getByText("提交");
    expect(submitBtn).toBeDisabled();
  });

  // Per-question state is isolated
  it("per-question state is isolated: submitting Q1 does not affect Q2", () => {
    const twoQuestionQuiz: Quiz = {
      title: "两题测验",
      description: "说明",
      questions: [
        {
          id: "q1",
          type: "single-choice",
          stem: "第一题?",
          options: [
            { id: "A", text: "Q1选项A", feedback: "Q1反馈A" },
            { id: "B", text: "Q1正确", feedback: "Q1正确反馈", correct: true },
          ],
        },
        {
          id: "q2",
          type: "single-choice",
          stem: "第二题?",
          options: [
            { id: "A", text: "Q2选项A", feedback: "Q2反馈A" },
            { id: "B", text: "Q2正确", feedback: "Q2正确反馈", correct: true },
          ],
        },
      ],
    };

    render(<QuizRunner quiz={twoQuestionQuiz} />);

    // Submit Q1 by clicking its correct option (single-choice auto-submits)
    fireEvent.click(screen.getByText("Q1正确").closest("button")!);

    // Q1 shows 答对了
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent("答对了");

    // Q2 still shows hint text (not submitted, no 提交 button for single-choice)
    expect(screen.queryByText("Q2正确反馈")).not.toBeInTheDocument();
    // Both questions exist but only Q1 is submitted
    expect(screen.getByText("第一题?")).toBeInTheDocument();
    expect(screen.getByText("第二题?")).toBeInTheDocument();
  });
});
