#!/usr/bin/env bash
#
# review-chapter.sh — run multi-AI review on one chapter's content
#
# Usage:
#   scripts/review-chapter.sh <NN> [ai...]
# Examples:
#   scripts/review-chapter.sh 01                     # default: codex claude gemini
#   scripts/review-chapter.sh 08 codex               # only codex
#   scripts/review-chapter.sh 14 codex claude        # two
#
# Idempotent: re-running overwrites the prior review outputs.
# Tolerant: any AI not installed is skipped, not fatal.

set -euo pipefail

NN="${1:?usage: scripts/review-chapter.sh <NN> [ai...]   (NN like 01, 08, 14; default ai list: codex claude gemini)}"
shift || true
AIS=("$@")
if [ "${#AIS[@]}" -eq 0 ]; then
  AIS=(codex claude gemini)
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DIR="$(find content/chapters -maxdepth 1 -type d -name "${NN}-*" | head -1)"
if [ -z "$DIR" ]; then
  echo "ERROR: no chapter directory matches content/chapters/${NN}-*" >&2
  exit 1
fi
DIR="${DIR%/}/"  # normalize trailing slash

MDX="${DIR}lesson.mdx"
CHECKER="${DIR}checker.ts"
QUIZ="${DIR}quiz.yaml"
README="${DIR}README.md"

if [ ! -f "$MDX" ]; then
  echo "ERROR: $MDX not found" >&2
  exit 1
fi

PROMPT="${DIR}lesson.review-prompt.md"

# Assemble the review prompt with full chapter content embedded.
# Codex review fix #5a: feed full content via heredoc, never just file paths.
{
  cat <<'PROMPT_HEAD'
你是一名教学产品 review 专家,正在 review 一份"教零基础财务会计师(10 年财务经验,但**完全不懂编程**)用 AI 编程工具(Claude Code / Codex / Cursor)处理日常会计任务"的章节。

请从以下 5 个维度做 review。**每条只写最重要的问题**,严控到 3 行以内。如果某维度没有问题,直接写"无"。

1. **概念准确性**:有没有错误陈述、过时事实、技术细节错(尤其工具版本/命令)
2. **教学顺序**:前置概念是否在前面章节充分铺垫(可参考章节编号顺序)
3. **真实场景的合理性**:会计场景的数据/任务是否真实可执行
4. **失败兜底**:出错或卡住时的引导是否清晰(给非技术用户)
5. **遗漏的边角情况**:特别是非技术用户最可能踩坑的地方

不要给"赞美式" review。**我要刺刀**。逐条带上 lesson.mdx 的行号或具体段落引用,以便定位。

---

PROMPT_HEAD
  printf '# Lesson MDX (%s)\n\n```mdx\n' "$MDX"
  cat "$MDX"
  printf '\n```\n\n# Checker (%s)\n\n```ts\n' "$CHECKER"
  if [ -f "$CHECKER" ]; then cat "$CHECKER"; else echo "(no checker.ts)"; fi
  printf '\n```\n\n# Quiz (%s)\n\n```yaml\n' "$QUIZ"
  if [ -f "$QUIZ" ]; then cat "$QUIZ"; else echo "(no quiz.yaml — chapter has no quiz)"; fi
  printf '\n```\n\n# README (%s)\n\n```md\n' "$README"
  if [ -f "$README" ]; then cat "$README"; else echo "(no README.md)"; fi
  printf '\n```\n'
} > "$PROMPT"

PROMPT_LINES="$(wc -l < "$PROMPT" | tr -d ' ')"
echo "Prompt assembled: $PROMPT (${PROMPT_LINES} lines)"

REVIEWED=()
SKIPPED=()
FAILED=()

for AI in "${AIS[@]}"; do
  OUT="${DIR}lesson.review.${AI}.md"
  case "$AI" in
    codex)
      if command -v codex >/dev/null 2>&1; then
        echo "→ codex reviewing $DIR..."
        if codex exec --sandbox read-only --skip-git-repo-check - < "$PROMPT" > "$OUT" 2>&1; then
          REVIEWED+=("$AI")
        else
          FAILED+=("$AI (see $OUT for stderr)")
        fi
      else
        SKIPPED+=("$AI (not installed)")
      fi
      ;;
    claude)
      if command -v claude >/dev/null 2>&1; then
        echo "→ claude reviewing $DIR..."
        if claude --print < "$PROMPT" > "$OUT" 2>&1; then
          REVIEWED+=("$AI")
        else
          FAILED+=("$AI (see $OUT for stderr)")
        fi
      else
        SKIPPED+=("$AI (not installed)")
      fi
      ;;
    gemini)
      if command -v gemini >/dev/null 2>&1; then
        echo "→ gemini reviewing $DIR..."
        if gemini --prompt "$(cat "$PROMPT")" > "$OUT" 2>&1; then
          REVIEWED+=("$AI")
        else
          FAILED+=("$AI (see $OUT for stderr)")
        fi
      else
        SKIPPED+=("$AI (not installed)")
      fi
      ;;
    *)
      SKIPPED+=("$AI (unknown reviewer — supported: codex claude gemini)")
      ;;
  esac
done

echo
echo "=== Review summary ==="
echo "Chapter:  $DIR"
echo "Reviewed: ${REVIEWED[*]:-(none)}"
[ "${#SKIPPED[@]}" -gt 0 ] && echo "Skipped:  ${SKIPPED[*]}"
[ "${#FAILED[@]}"  -gt 0 ] && echo "Failed:   ${FAILED[*]}"
if [ "${#REVIEWED[@]}" -gt 0 ]; then
  echo "Outputs:"
  for AI in "${REVIEWED[@]}"; do
    echo "  ${DIR}lesson.review.${AI}.md"
  done
fi
