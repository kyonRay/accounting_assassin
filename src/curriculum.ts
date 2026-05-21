export type ChapterPart =
  | "Part I · 沙箱里玩 AI"
  | "Part II · 真实环境的第一步"
  | "Part III · 把 Claude Code 用熟"
  | "Part IV · Codex 与 Cursor"
  | "Part V · 毕业项目";

export type ChapterMode = "sandbox" | "real";

export interface ChapterMeta {
  slug: string;       // e.g., "01-ai-tools-vs-chatgpt"
  num: number;        // 1..15 — display number
  title: string;      // short Chinese title shown in sidebar
  part: ChapterPart;
  mode: ChapterMode;
  hasQuiz: boolean;   // true for Ch 1/4/6/10/13/15 only
}

export const CHAPTERS: ChapterMeta[] = [
  // Part I · 沙箱里玩 AI
  { slug: "01-ai-tools-vs-chatgpt",   num: 1,  title: "AI 工具 ≠ ChatGPT 2.0",              part: "Part I · 沙箱里玩 AI",           mode: "sandbox", hasQuiz: true  },
  { slug: "02-show-files-to-ai",      num: 2,  title: "给 AI 看真实文件",                   part: "Part I · 沙箱里玩 AI",           mode: "sandbox", hasQuiz: false },
  { slug: "03-let-ai-write-code",     num: 3,  title: "让 AI 写代码",                        part: "Part I · 沙箱里玩 AI",           mode: "sandbox", hasQuiz: false },
  { slug: "04-from-once-to-reusable", num: 4,  title: "从一次性帮忙到重复可用",             part: "Part I · 沙箱里玩 AI",           mode: "sandbox", hasQuiz: true  },
  // Part II · 真实环境的第一步
  { slug: "05-your-workstation",      num: 5,  title: "你的工作室:终端、Homebrew、Python",  part: "Part II · 真实环境的第一步",     mode: "real",    hasQuiz: false },
  { slug: "06-first-real-claude",     num: 6,  title: "第一次与真实的 Claude Code 对话",    part: "Part II · 真实环境的第一步",     mode: "real",    hasQuiz: true  },
  // Part III · 把 Claude Code 用熟
  { slug: "07-work-in-your-project",  num: 7,  title: "在自己的项目里工作",                  part: "Part III · 把 Claude Code 用熟", mode: "real",    hasQuiz: false },
  { slug: "08-bug-and-undo",          num: 8,  title: "Bug 来了怎么办:Debug + 撤销",       part: "Part III · 把 Claude Code 用熟", mode: "real",    hasQuiz: false },
  { slug: "09-skills",                num: 9,  title: "Skills:重复工作一句话搞定",          part: "Part III · 把 Claude Code 用熟", mode: "real",    hasQuiz: false },
  { slug: "10-hooks-and-mcp",         num: 10, title: "Hooks 与 MCP",                         part: "Part III · 把 Claude Code 用熟", mode: "real",    hasQuiz: true  },
  // Part IV · Codex 与 Cursor
  { slug: "11-codex-intro",           num: 11, title: "Codex 入门",                           part: "Part IV · Codex 与 Cursor",     mode: "real",    hasQuiz: false },
  { slug: "12-codex-deep",            num: 12, title: "Codex 深入",                           part: "Part IV · Codex 与 Cursor",     mode: "real",    hasQuiz: false },
  { slug: "13-cursor",                num: 13, title: "Cursor",                               part: "Part IV · Codex 与 Cursor",     mode: "real",    hasQuiz: true  },
  // Part V · 毕业项目
  { slug: "14-capstone-a",            num: 14, title: "毕业作品 A:三个独立小工具",          part: "Part V · 毕业项目",              mode: "real",    hasQuiz: false },
  { slug: "15-capstone-b",            num: 15, title: "毕业作品 B:月末结账 AI 工作流",      part: "Part V · 毕业项目",              mode: "real",    hasQuiz: true  },
];

export const PARTS_IN_ORDER: ChapterPart[] = [
  "Part I · 沙箱里玩 AI",
  "Part II · 真实环境的第一步",
  "Part III · 把 Claude Code 用熟",
  "Part IV · Codex 与 Cursor",
  "Part V · 毕业项目",
];

/**
 * Compute display status for one chapter at render time.
 * Centralised so the same rule drives Sidebar icons + future ChapterGate.
 *
 * Four states:
 *   "locked"    — previous chapter not completed (button disabled)
 *   "available" — unlocked but not current and not completed (clickable)
 *   "current"   — the slug being actively viewed (highlighted)
 *   "completed" — chapter done (green check)
 */
export type DisplayStatus = "locked" | "available" | "current" | "completed";

export interface ChapterDisplayState {
  meta: ChapterMeta;
  display: DisplayStatus;
}

export function computeChapterStates(
  chapters: Record<string, { status: string }>,
  currentSlug: string | null,
): ChapterDisplayState[] {
  return CHAPTERS.map((meta, idx) => {
    const isCompleted = chapters[meta.slug]?.status === "completed";
    const prevSlug = idx === 0 ? null : CHAPTERS[idx - 1].slug;
    const prevCompleted =
      prevSlug == null ? true : chapters[prevSlug]?.status === "completed";

    let display: DisplayStatus;
    if (isCompleted) {
      display = "completed";
    } else if (meta.slug === currentSlug && prevCompleted) {
      display = "current";
    } else if (prevCompleted) {
      display = "available";
    } else {
      display = "locked";
    }

    return { meta, display };
  });
}
