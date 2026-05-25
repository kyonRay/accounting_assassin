# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**记账杀手 / Accounting Assassin** — a macOS-native Tauri + React + TypeScript learning app teaching a zero-foundation accountant (10 years finance experience, never coded) to use AI coding tools (Claude Code, Codex, Cursor) over 15 chapters in 3-6 weeks. Currently in **Week 1 (foundation) complete**, Weeks 2-9 still to implement.

**Authoritative references** — read these before making non-trivial changes:
- `docs/superpowers/specs/2026-05-20-accounting-assassin-design.md` (~860 lines) — design spec, source of truth for product decisions
- `docs/superpowers/plans/2026-05-20-accounting-assassin-implementation-plan.md` (~1500 lines) — 9-week task-by-task implementation plan

## Commands

```bash
pnpm dev                    # Vite frontend only (use tauri:dev instead for real testing)
pnpm tauri:dev              # full app — opens macOS window; first build is 3-10 min, cached after
pnpm tauri:build            # produces .dmg in src-tauri/target/release/bundle/dmg/

pnpm test                   # runs vitest once and exits (NOT watch mode)
pnpm test:watch             # explicit watch mode
pnpm test:modules           # only src/modules + tests/modules
pnpm test:chapters          # only content/chapters/**/test.ts (chapter testing-as-spec)
pnpm test path/to/file      # single file: pnpm test tests/modules/LessonViewer.test.tsx

pnpm typecheck              # tsc --noEmit
pnpm lint                   # eslint . --max-warnings 0

cargo check --manifest-path src-tauri/Cargo.toml    # Rust-only check, much faster than tauri:dev
cargo test --manifest-path src-tauri/Cargo.toml     # Rust tests (none yet — Task 4.1 adds first)
```

**Node version quirk**: `NODE_OPTIONS=--experimental-require-module` is prefixed on test scripts because Node 22.11 + jsdom 29 has an ESM/CJS interop bug. Remove this prefix once Node ≥ 22.12.

## Architecture (3 layers)

```
Tauri Rust shell (src-tauri/)
  ↓ whitelisted IPC commands ONLY (no execute_real_command, no arbitrary shell)
React frontend (src/)
  ↓ MDX + custom components, loaded via import.meta.glob
Chapter content (content/chapters/NN-slug/)
  lesson.mdx + checker.ts + sandbox-fixture/ + quiz.yaml + test.ts
```

**Key constraint**: each chapter is a self-contained directory. Adding a chapter means copying a folder and changing content — never touching React code. This is what makes 15 chapters maintainable.

**Sandbox vs real-env mode** (`Progress.mode`):
- `sandbox` (Ch 1-4): entirely in WebView — Pyodide + sql.js + virtual fs + scripted "fake Claude". No filesystem access.
- `real` (Ch 5+): bridges to user's actual terminal/files via `RealEnvBridge` (Tauri IPC). UI chip switches blue → amber.
- Switch is **single-directional**. Manual reset requires Settings + double-confirm.

## Three file system boundaries (HARD INVARIANT)

| Boundary | Path | Who writes |
|---|---|---|
| User workspace | `~/accounting-learner/` | App via Tauri RealEnvBridge (path-allowlisted) |
| App private state | `~/Library/Application Support/AccountingAssassin/` | Tauri storage adapter (progress.json + .bak) |
| System installs | `/opt/homebrew/`, `~/.claude/`, etc. | User in their own terminal — App **never** runs `brew install` |

**App never gets sudo.** App shows commands; user runs them.

## Subprocess safety (Codex review fix — DO NOT regress)

`RealEnvBridge` (Tauri Rust commands, currently empty — populated in Task 4.1) exposes **only fixed-signature whitelisted commands**:

- `check_command_exists(cmd: AllowedCommand enum)` — never accepts arbitrary strings
- `read_user_file(rel_path: PathBuf)` — canonicalize + prefix-check inside `~/accounting-learner/`
- `run_bundled_checker(name: enum)` — runs App-bundled scripts only, not user paths
- `open_terminal_at(rel_path: PathBuf)` — opens Terminal.app, does not execute commands
- `initialize_real_env()`, `collect_diagnostics()`

**Forbidden**: any `execute_real_command(cmd: String)` interface. Tauri's path allowlist doesn't constrain child processes — security relies on architectural discipline.

## Testing-as-spec workflow (every chapter, no exceptions)

For each `content/chapters/NN-slug/`:

1. Write `test.ts` first (asserting perfect-user path)
2. Run `pnpm test:chapters NN` → must FAIL (lesson doesn't exist)
3. Write `sandbox-fixture/`, `checker.ts`, `lesson.mdx`, `quiz.yaml` (only Ch 1/4/6/10/13/15)
4. Run → must PASS
5. Atomic commit per chapter

**Vitest config gotcha**: chapter tests use `test.ts` (not `*.test.ts`). `vitest.config.ts` has `include: ["**/*.{test,spec}.{ts,tsx}", "content/chapters/**/test.ts"]` — don't drop the second entry.

## Critical implementation patterns

**Chapter loading** — use `import.meta.glob`, NOT `import(\`@content/...${slug}...\`)`. Vite cannot statically analyze the latter. See `src/modules/LessonViewer/useChapter.ts`.

**Progress persistence** — Zustand `persist` middleware uses a custom Tauri storage adapter writing to `BaseDirectory.AppLocalData` (currently to be implemented in Task 3.3). Default `localStorage` would violate the App-private-state boundary above.

**Invoice OCR** — App ships a pre-built `aa-ocr` Rust binary (Task 5.1) wrapping Apple Vision + PDF text extraction. Chapter content teaches Python calling this CLI + parsing JSON. The user **never** writes Rust / objc2 / Vision Framework code; that complexity is hidden in the binary.

**Git rollback teaching** (Ch 8) — teach `git restore .` + `git status` / `git diff` confirmation, NEVER `git checkout .` (destructive + semantically overloaded).

**Sandbox "fake Claude"** — `src/modules/Sandbox/fake-claude.ts` (Task 2.5) returns scripted responses based on regex matching against expected user input. No real LLM API calls. This is intentional: stable outputs, no API key requirement, full pedagogical control.

## Error handling conventions (design spec § 8)

- App-self errors → translate to Chinese + provide "next step"
- External CLI errors (claude / brew / codex output) → show original English in `<details>` + Chinese interpretation
- Never claim "永不崩溃" — instead: isolate, translate, recover (top-level `<ErrorBoundary>` + Tauri `panic::set_hook`)
- `StuckButton` ("我卡住了") is universally present — gray in sandbox mode, amber in real-env mode
- Diagnostic reports use an **allowlist** of fields (never user data, never credentials)

## Commit conventions

- **Use global git config for author** — do not pass `-c user.name=...` per-command
- **Never** append `Co-Authored-By` trailer (user's global preference)
- Conventional Commits subject (`feat:`, `fix:`, `chore:`, `test:`, `ci:`, `docs:`)
- Atomic commits — one logical change per commit, even if it means 2-3 small commits per task

## macOS distribution

- **No Apple Developer Program** — ship ad-hoc signed `.app` (`codesign --force --deep --sign -`)
- Users open via right-click → "打开" once; `.dmg` must include `首次安装说明.pdf` with fallbacks for `xattr -dr com.apple.quarantine` + System Settings → Privacy & Security
- Bundle target: < 30 MB (Pyodide is the heaviest dep)
- Tauri `signingIdentity: "-"` in `tauri.conf.json`

## Quiz module

Quizzes appear at exactly **6 checkpoints**: Ch 1 / 4 / 6 / 10 / 13 / 15. Single-choice + multi-choice only (no matching/drag). Quiz **does not block** chapter unlock — wrong answers show in-place Chinese feedback only. YAML format (`quiz.yaml` per chapter), loaded via `@rollup/plugin-yaml`.

## When something doesn't fit the plan

- Plan deviations are OK if well-reasoned. Document the why in the commit message.
- If a change cuts across files in a way the plan didn't anticipate, **stop and update the spec or plan first**, then implement. The spec is the source of truth.
- For Codex/AI reviews of new work: surface findings to the user with severity and recommended fix, but let the user decide. Never silently apply review feedback to user-facing decisions.
