import type { Quiz, QuizOption, QuizQuestion, QuizQuestionType } from "./index";

const VALID_TYPES: QuizQuestionType[] = ["single-choice", "multiple-choice"];

function assertString(val: unknown, path: string): asserts val is string {
  if (typeof val !== "string" || val.trim() === "") {
    throw new Error(`parseQuiz: "${path}" must be a non-empty string, got ${JSON.stringify(val)}`);
  }
}

function parseOption(raw: unknown, qId: string, idx: number): QuizOption {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`parseQuiz: question "${qId}" option[${idx}] must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  assertString(obj.id, `questions[${qId}].options[${idx}].id`);
  assertString(obj.text, `questions[${qId}].options[${idx}].text`);
  assertString(obj.feedback, `questions[${qId}].options[${idx}].feedback`);
  if ("correct" in obj && typeof obj.correct !== "boolean") {
    throw new Error(
      `parseQuiz: question "${qId}" option "${obj.id as string}".correct must be boolean`,
    );
  }
  return {
    id: obj.id as string,
    text: obj.text as string,
    feedback: obj.feedback as string,
    ...(obj.correct === true ? { correct: true } : {}),
  };
}

function parseQuestion(raw: unknown, idx: number): QuizQuestion {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`parseQuiz: questions[${idx}] must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  assertString(obj.id, `questions[${idx}].id`);
  assertString(obj.type, `questions[${idx}].type`);
  assertString(obj.stem, `questions[${idx}].stem`);

  const id = obj.id as string;
  const type = obj.type as string;

  if (!VALID_TYPES.includes(type as QuizQuestionType)) {
    throw new Error(
      `parseQuiz: question "${id}".type must be one of ${VALID_TYPES.join(" | ")}, got "${type}"`,
    );
  }

  if (!Array.isArray(obj.options) || obj.options.length === 0) {
    throw new Error(
      `parseQuiz: question "${id}".options must be a non-empty array`,
    );
  }

  const options = (obj.options as unknown[]).map((o, i) => parseOption(o, id, i));

  const correctCount = options.filter((o) => o.correct === true).length;
  if (correctCount === 0) {
    throw new Error(
      `parseQuiz: question "${id}" has zero correct options — every question must have at least one`,
    );
  }

  return {
    id,
    type: type as QuizQuestionType,
    stem: obj.stem as string,
    options,
  };
}

/**
 * Validates and narrows a raw YAML-imported object to a `Quiz`.
 * Throws if shape is wrong. Used both at runtime and in tests.
 */
export function parseQuiz(raw: unknown): Quiz {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("parseQuiz: expected an object at the top level");
  }
  const obj = raw as Record<string, unknown>;

  assertString(obj.title, "title");
  assertString(obj.description, "description");

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error("parseQuiz: \"questions\" must be a non-empty array");
  }

  const questions = (obj.questions as unknown[]).map(parseQuestion);

  return {
    title: obj.title as string,
    description: obj.description as string,
    questions,
  };
}
