export type QuizQuestionType = "single-choice" | "multiple-choice";

export interface QuizOption {
  id: string;       // e.g., "A", "B", "C", "D"
  text: string;     // the option text shown to the learner
  feedback: string; // shown when this option is selected (right or wrong)
  correct?: boolean; // present iff this option is correct
}

export interface QuizQuestion {
  id: string;              // e.g., "q1"
  type: QuizQuestionType;
  stem: string;            // multi-line text (rendered as plain paragraphs)
  options: QuizOption[];
}

export interface Quiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export { parseQuiz } from "./quiz-loader";
export { QuizRunner } from "./QuizRunner";
