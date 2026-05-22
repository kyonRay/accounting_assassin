# 记账杀手 · Accounting Assassin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macOS-native Tauri + React app teaching a zero-foundation accountant to use Claude Code / Codex / Cursor through a 15-chapter sandbox → real-env curriculum, with the design spec in `docs/superpowers/specs/2026-05-20-accounting-assassin-design.md` as authoritative reference.

**Architecture:** Three layers — Tauri Rust shell (only fixed-signature whitelisted commands), React/TypeScript frontend (7 modules: LessonViewer / Sandbox / RealEnvBridge / Checker / Progress / AccountingDB / Quiz), and content directory (`content/chapters/NN-slug/` per chapter with MDX + fixture + checker + quiz + test). Sandbox phase (Ch 1-4) runs entirely in WebView (Pyodide + sql.js + virtual fs + scripted "fake Claude"); real-env phase (Ch 5+) bridges to user's terminal/files via whitelisted Tauri IPC. A separate Rust binary `aa-ocr` (in `aa-ocr/`) abstracts OCR away from the user.

**Tech Stack:** Tauri 2.x · React 18 · TypeScript · Vite · pnpm · Tailwind CSS · MDX (@mdx-js/react + @mdx-js/rollup) · Zustand · TanStack Router · xterm.js · Pyodide · sql.js · Vitest · React Testing Library · Rust (aa-ocr CLI: `pdf-extract` + `objc2` for Vision Framework)

---

## How to Use This Plan

**Detail level is intentionally non-uniform**:
- **Week 1-3** (foundation + Part I): full TDD bite-sized steps with code shown.
- **Week 4** (real-env infrastructure, the engineering peak): task-level with key code shown.
- **Week 5-9** (content + polish + release): task & milestone outlines; the patterns established in Week 1-3 (testing-as-spec, per-chapter directory layout, checker/fixture/quiz triple) repeat. **Re-invoke `superpowers:writing-plans` before starting each of Weeks 5-9 to expand into bite-sized tasks** based on what's learned in earlier weeks.

**Testing-as-spec convention** (every chapter, no exceptions):
1. Write `content/chapters/NN-slug/test.ts` first (assert the perfect-user path)
2. Run it → must FAIL (lesson doesn't exist yet)
3. Write `sandbox-fixture/` (the data)
4. Write `checker.ts`
5. Write `lesson.mdx`
6. Write `quiz.yaml` (only for 6 quiz chapters: 1/4/6/10/13/15)
7. Run `test.ts` → must PASS
8. Commit chapter as one atomic unit

**Reference**: The design spec at `docs/superpowers/specs/2026-05-20-accounting-assassin-design.md` (852 lines) is the source of truth. Every task here cites the relevant section number for cross-check.

---

## Project File Structure

```
accounting_assassin/
├── docs/superpowers/
│   ├── specs/2026-05-20-accounting-assassin-design.md   (existing)
│   └── plans/2026-05-20-accounting-assassin-implementation-plan.md  (this file)
│
├── src-tauri/                                # Tauri Rust shell
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── env.rs                        # check_command_exists
│       │   ├── fs.rs                         # read_user_file
│       │   ├── checker.rs                    # run_bundled_checker
│       │   ├── shell.rs                      # open_terminal_at
│       │   └── env_init.rs                   # initialize_real_env (Ch 5)
│       ├── safety/
│       │   ├── mod.rs
│       │   └── path_guard.rs                 # canonicalize + prefix check
│       └── diagnostics/
│           ├── mod.rs
│           └── report.rs                     # stuck-button diagnostics
│
├── src/                                       # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── modules/
│   │   ├── LessonViewer/
│   │   ├── Sandbox/                          # Terminal, pyodide-runner, virtual-fs, fake-claude
│   │   ├── RealEnvBridge/
│   │   ├── Checker/
│   │   ├── Progress/                         # Zustand store + persistence
│   │   ├── AccountingDB/                     # sql.js
│   │   └── Quiz/
│   ├── components/
│   │   ├── ModeIndicator.tsx                 # 蓝/橙 sandbox/real chip
│   │   ├── StuckButton.tsx                   # universal escape hatch
│   │   ├── Sidebar.tsx
│   │   ├── BugReportCard.tsx                 # § 5.4.2 four-part template
│   │   └── WelcomeFlow.tsx                   # T+0 / +3 / +30 / +60 sequence
│   ├── app/
│   └── styles/
│
├── content/
│   └── chapters/
│       ├── 01-ai-tools-vs-chatgpt/
│       │   ├── lesson.mdx
│       │   ├── checker.ts
│       │   ├── sandbox-fixture/
│       │   ├── quiz.yaml
│       │   └── test.ts
│       ├── 02-show-files-to-ai/
│       ├── 03-let-ai-write-code/
│       ├── 04-from-once-to-reusable/
│       ├── 05-your-workstation/
│       ├── 06-first-real-claude/
│       ├── 07-work-in-your-project/
│       ├── 08-bug-and-undo/                  # the upgraded Debug+Git chapter
│       ├── 09-skills/
│       ├── 10-hooks-and-mcp/
│       ├── 11-codex-intro/
│       ├── 12-codex-deep/
│       ├── 13-cursor/
│       ├── 14-capstone-a/
│       ├── 15-capstone-b/
│       └── _shared/assets/                   # invoice PDFs, CSV samples
│
├── aa-ocr/                                    # Separate Rust CLI workspace
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── pdf.rs                            # pdf-extract integration
│       ├── vision.rs                         # objc2 + Vision Framework
│       └── output.rs                         # unified JSON schema
│
├── scripts/
│   ├── review-chapter.sh                     # multi-AI review pipeline
│   ├── package-dmg.sh                        # build + ad-hoc sign + dmg
│   └── verify-clean-install.sh
│
├── tests/
│   ├── modules/
│   └── e2e/
│
├── .github/workflows/ci.yml
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
└── eslint.config.js
```

---

# Phase 1 · Week 1 — App Skeleton (detailed TDD)

**Milestone deliverable:** `pnpm tauri:dev` opens a macOS native window showing a hello-world MDX chapter; `pnpm test` runs and at least one test passes.

## Task 1.1: Repo metadata + tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`, `eslint.config.js`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/kyonguo/workspace/code/accounting_assassin
pnpm init
```

Replace `package.json` with:

```json
{
  "name": "accounting-assassin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest",
    "test:chapters": "vitest run content/chapters",
    "test:modules": "vitest run src/modules tests/modules",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
src-tauri/target/
.DS_Store
*.log
.env*
!.env.example
*.dmg
*.bak
```

- [ ] **Step 3: Add devDependencies + runtime deps**

```bash
# devDeps
pnpm add -D typescript@5 vite@5 @vitejs/plugin-react react@18 react-dom@18 @types/react @types/react-dom vitest @testing-library/react @testing-library/jest-dom jsdom @mdx-js/react @mdx-js/rollup @types/mdx tailwindcss@3 postcss autoprefixer eslint prettier zustand @tanstack/react-router xterm xterm-addon-fit @rollup/plugin-yaml yaml

# runtime deps (needed by Tauri Storage adapter in Task 3.3 and Quiz YAML loader in Task 3.1)
pnpm add @tauri-apps/api @tauri-apps/plugin-fs
```

> **Codex review fix #4**:`@rollup/plugin-yaml` 给 Quiz YAML 静态导入用,`yaml` 给 chapter test 解析 quiz.yaml 用,`@tauri-apps/plugin-fs` 给 Task 3.3 的 Progress 持久化 Tauri 存储适配器用 —— 三个都要在 Week 1 就装,避免后面卡住。

- [ ] **Step 4: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"],
      "@content/*": ["./content/*"]
    },
    "baseUrl": "."
  },
  "include": ["src", "content", "tests"]
}
```

- [ ] **Step 5: vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import path from "path";

export default defineConfig({
  plugins: [mdx({ providerImportSource: "@mdx-js/react" }), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@content": path.resolve(__dirname, "./content"),
    },
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
});
```

- [ ] **Step 6: vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import path from "path";

import yaml from "@rollup/plugin-yaml";

export default defineConfig({
  plugins: [mdx({ providerImportSource: "@mdx-js/react" }), react(), yaml()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Codex review fix #1: Vitest 默认只匹配 *.{test,spec}.ts;
    // 我们的 chapter test 用 content/chapters/NN-slug/test.ts 命名,
    // 必须显式加进来,否则 pnpm test:chapters 静默跑不出任何用例
    include: [
      "**/*.{test,spec}.{ts,tsx}",
      "content/chapters/**/test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@content": path.resolve(__dirname, "./content"),
    },
  },
});
```

> **Codex review fix #1**:Vitest 默认 include 是 `**/*.{test,spec}.{ts,tsx}`,**`content/chapters/NN-slug/test.ts` 这种文件名不会被自动识别**。设计 spec § 3.2 承诺过 `test.ts` 命名约定,因此修配置而不是改命名。`@rollup/plugin-yaml` 也加进来,让 Vitest 能解析章节的 quiz.yaml。

- [ ] **Step 7: Init Tailwind**

```bash
pnpm exec tailwindcss init -p
```

Edit `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./content/**/*.{md,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        sandbox: "#4A90E2",
        realenv: "#E2A04A",
        done: "#5BA877",
        graphite: "#2C2C2E",
        muted: "#8A8A8E",
      },
      fontFamily: {
        zh: ["PingFang SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vite.config.ts vitest.config.ts tailwind.config.ts postcss.config.js .gitignore
git commit -m "chore: initial tooling (pnpm, vite, vitest, tailwind, mdx)"
```

## Task 1.2: Tauri scaffold

**Files:**
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/build.rs`

- [ ] **Step 1: Install Tauri CLI**

```bash
cargo install tauri-cli --version "^2" --locked
```

Verify: `cargo tauri --version` should print 2.x.

- [ ] **Step 2: Run tauri init**

```bash
cd /Users/kyonguo/workspace/code/accounting_assassin
pnpm exec tauri init --app-name "AccountingAssassin" --window-title "记账杀手 · Accounting Assassin" --frontend-dist "../dist" --dev-url "http://localhost:1420" --before-dev-command "pnpm dev" --before-build-command "pnpm build" --ci
```

- [ ] **Step 3: Lock down tauri.conf.json**

Edit `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AccountingAssassin",
  "version": "0.1.0",
  "identifier": "com.kyong.accounting-assassin",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [
      {
        "title": "记账杀手 · Accounting Assassin",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 700
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; worker-src 'self' blob:"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": ["icons/icon.icns"],
    "macOS": {
      "minimumSystemVersion": "12.0",
      "signingIdentity": "-"
    }
  }
}
```

`signingIdentity: "-"` = ad-hoc signing per § 10.2.

- [ ] **Step 4: Minimal main.rs**

`src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Verify Tauri dev runs**

```bash
pnpm tauri:dev
```

Expected: macOS window opens titled "记账杀手 · Accounting Assassin".

- [ ] **Step 6: Commit**

```bash
git add src-tauri/
git commit -m "feat(tauri): scaffold macOS app shell with strict CSP and empty invoke_handler"
```

## Task 1.3: React entry + basic layout

**Files:**
- Create: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/tailwind.css`

- [ ] **Step 1: index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>记账杀手 · Accounting Assassin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Tailwind CSS entry**

`src/styles/tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  background: theme(colors.cream);
  color: theme(colors.graphite);
  font-family: theme(fontFamily.zh);
}
```

- [ ] **Step 3: main.tsx**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: App.tsx — three-column placeholder**

```typescript
export default function App() {
  return (
    <div className="h-screen w-screen grid grid-cols-[260px_1fr_400px] grid-rows-[1fr_32px]">
      <aside className="row-span-1 bg-cream/60 border-r border-graphite/10 p-4">
        <h1 className="text-sm font-bold tracking-wide">课程进度</h1>
        <p className="text-muted text-xs mt-2">侧边栏(占位)</p>
      </aside>
      <main className="row-span-1 bg-white p-8 overflow-y-auto">
        <p className="text-muted">课程主体(占位)</p>
      </main>
      <aside className="row-span-1 bg-sandbox/5 border-l border-graphite/10 p-4">
        <span className="inline-block px-2 py-1 rounded-md bg-sandbox/10 text-sandbox text-xs">
          🧪 沙箱模式
        </span>
      </aside>
      <footer className="col-span-3 bg-cream border-t border-graphite/10 px-4 flex items-center text-xs text-muted">
        进度 0/15 · 准备就绪
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm tauri:dev
```

Expected: window shows 3-column layout with placeholder text.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.tsx src/App.tsx src/styles/tailwind.css
git commit -m "feat(ui): three-column layout shell with sandbox chip placeholder"
```

## Task 1.4: MDX loading + first lesson rendering

**Files:**
- Create: `src/modules/LessonViewer/LessonViewer.tsx`, `src/modules/LessonViewer/useChapter.ts`, `src/modules/LessonViewer/mdx-components.tsx`, `src/modules/LessonViewer/index.ts`
- Create: `content/chapters/00-hello/lesson.mdx`

- [ ] **Step 1: First test chapter MDX**

`content/chapters/00-hello/lesson.mdx`:

```mdx
# 你好,记账杀手

这是第一个测试章节,用来验证 MDX 渲染管道是否工作。

如果你能看到这段中文文字,说明:
- Vite 加载了 MDX
- React 渲染了组件
- Tailwind 排版生效了
```

- [ ] **Step 2: mdx-components.tsx**

```typescript
import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
  p: (props) => <p className="leading-relaxed my-3" {...props} />,
  ul: (props) => <ul className="list-disc pl-6 my-3 space-y-1" {...props} />,
  code: (props) => (
    <code className="bg-graphite/5 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />
  ),
};
```

- [ ] **Step 3: useChapter hook**

```typescript
import { useEffect, useState } from "react";
import type { ComponentType } from "react";

type LessonModule = { default: ComponentType };

// Codex review fix #2:Vite 的动态 import() 无法稳定解析 alias + 模板字符串。
// 用 import.meta.glob 在构建期生成静态可分析的 chapter manifest,所有 lesson.mdx
// 文件都会被 Vite 发现并 bundle。
const chapterLoaders = import.meta.glob<LessonModule>(
  "/content/chapters/*/lesson.mdx",
);

export function useChapter(slug: string) {
  const [Lesson, setLesson] = useState<ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLesson(null);
    setError(null);

    const key = `/content/chapters/${slug}/lesson.mdx`;
    const loader = chapterLoaders[key];
    if (!loader) {
      setError(new Error(`Chapter not found: ${slug}`));
      return;
    }

    loader()
      .then((mod) => {
        if (!cancelled) setLesson(() => mod.default);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err);
      });

    return () => { cancelled = true; };
  }, [slug]);

  return { Lesson, error };
}
```

> **Codex review fix #2**:`import.meta.glob` 是 Vite 官方推荐的"按模式批量动态加载"方式,构建期就能枚举到所有匹配文件,**没有路径别名 + 模板字符串带来的静态分析问题**。所有 15 章的 lesson.mdx 会自动进 bundle。

- [ ] **Step 4: LessonViewer component**

```typescript
import { MDXProvider } from "@mdx-js/react";
import { mdxComponents } from "./mdx-components";
import { useChapter } from "./useChapter";

interface Props { slug: string; }

export function LessonViewer({ slug }: Props) {
  const { Lesson, error } = useChapter(slug);
  if (error) return <div className="text-red-600">课程加载失败:{error.message}</div>;
  if (!Lesson) return <div className="text-muted">正在加载...</div>;
  return (
    <MDXProvider components={mdxComponents}>
      <article className="prose prose-zinc max-w-3xl">
        <Lesson />
      </article>
    </MDXProvider>
  );
}
```

- [ ] **Step 5: Wire into App.tsx**

Replace the main column:

```typescript
import { LessonViewer } from "@/modules/LessonViewer";

// in JSX, main column:
<LessonViewer slug="00-hello" />
```

- [ ] **Step 6: Verify**

```bash
pnpm tauri:dev
```

Expected: window shows rendered Markdown.

- [ ] **Step 7: Commit**

```bash
git add src/modules/LessonViewer/ content/chapters/00-hello/ src/App.tsx
git commit -m "feat(lesson): MDX loader + LessonViewer rendering first chapter"
```

## Task 1.5: Test infrastructure + smoke test

**Files:**
- Create: `tests/setup.ts`, `tests/modules/LessonViewer.test.tsx`

- [ ] **Step 1: tests/setup.ts**

```typescript
import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
```

- [ ] **Step 2: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LessonViewer } from "@/modules/LessonViewer";

describe("LessonViewer", () => {
  it("renders the hello chapter", async () => {
    render(<LessonViewer slug="00-hello" />);
    await waitFor(() => {
      expect(screen.getByText("你好,记账杀手")).toBeInTheDocument();
    });
  });

  it("shows error when chapter does not exist", async () => {
    render(<LessonViewer slug="99-does-not-exist" />);
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Run tests → PASS**

```bash
pnpm test
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: smoke test for LessonViewer"
```

## Task 1.6: CI workflow

**Files:** `.github/workflows/ci.yml`

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:modules
      - run: pnpm test:chapters
```

- [ ] Commit:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions for lint + typecheck + tests"
```

## Week 1 Acceptance

- [ ] `pnpm tauri:dev` opens macOS window
- [ ] Window shows 3-column layout
- [ ] Main column renders "你好,记账杀手"
- [ ] `pnpm test` reports 2 passing tests
- [ ] `pnpm typecheck` succeeds
- [ ] Git log shows 5+ commits this week

---

# Phase 2 · Week 2 — Sandbox runtime + Ch 1 (detailed TDD)

**Milestone deliverable:** Ch 1 fully playable — comparison demo works, sandbox terminal accepts input, Pyodide runs Python on virtual fs, Checker passes on perfect-user path.

## Task 2.1: Virtual filesystem

**Files:** `src/modules/Sandbox/virtual-fs.ts`, `tests/modules/virtual-fs.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createVirtualFs, type VirtualFs } from "@/modules/Sandbox/virtual-fs";

describe("VirtualFs", () => {
  let fs: VirtualFs;
  beforeEach(() => { fs = createVirtualFs(); });

  it("write then read returns same content", async () => {
    await fs.write("hello.txt", "world");
    expect(await fs.read("hello.txt")).toBe("world");
  });

  it("exists returns true/false correctly", async () => {
    await fs.write("a.txt", "x");
    expect(await fs.exists("a.txt")).toBe(true);
    expect(await fs.exists("b.txt")).toBe(false);
  });

  it("list returns all paths", async () => {
    await fs.write("invoices/01.csv", "");
    await fs.write("notes.md", "");
    const all = await fs.list();
    expect(all.sort()).toEqual(["invoices/01.csv", "notes.md"]);
  });

  it("reset clears all files", async () => {
    await fs.write("a.txt", "x");
    await fs.reset();
    expect(await fs.exists("a.txt")).toBe(false);
  });

  it("loadFixture seeds multiple files", async () => {
    await fs.loadFixture({
      "data/x.csv": "col\n1\n",
      "scripts/y.py": "print('hi')",
    });
    expect(await fs.read("data/x.csv")).toBe("col\n1\n");
  });
});
```

- [ ] **Step 2: Run test → FAIL**

```bash
pnpm test virtual-fs
```

- [ ] **Step 3: Implement**

```typescript
export interface VirtualFs {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(): Promise<string[]>;
  reset(): Promise<void>;
  loadFixture(files: Record<string, string>): Promise<void>;
}

export function createVirtualFs(): VirtualFs {
  const store = new Map<string, string>();
  return {
    async read(path) {
      const v = store.get(path);
      if (v === undefined) throw new Error(`File not found: ${path}`);
      return v;
    },
    async write(path, content) { store.set(path, content); },
    async exists(path) { return store.has(path); },
    async list() { return [...store.keys()]; },
    async reset() { store.clear(); },
    async loadFixture(files) {
      for (const [p, c] of Object.entries(files)) store.set(p, c);
    },
  };
}
```

- [ ] **Step 4: Test → PASS**
- [ ] **Step 5: Commit**

```bash
git add src/modules/Sandbox/virtual-fs.ts tests/modules/virtual-fs.test.ts
git commit -m "feat(sandbox): in-memory virtual filesystem with fixture loader"
```

> IndexedDB persistence deferred to Week 3.

## Task 2.2: Pyodide runner

**Files:** `src/modules/Sandbox/pyodide-runner.ts`, `tests/modules/pyodide-runner.test.ts`

- [ ] Install: `pnpm add pyodide`
- [ ] Write failing test (verify arithmetic, stdout capture, error propagation)
- [ ] Implement `createPyodideRunner({ fs })` returning `{ run(code), syncFromVfs() }`
- [ ] Test → PASS (first run downloads pyodide WASM, slow)
- [ ] Commit: `feat(sandbox): Pyodide runner with vfs sync, stdout/stderr capture`

## Task 2.3: AccountingDB (sql.js)

**Files:** `src/modules/AccountingDB/sqlite-runner.ts`, `index.ts`, `tests/modules/sqlite-runner.test.ts`

- [ ] Install: `pnpm add sql.js && pnpm add -D @types/sql.js`
- [ ] TDD: write failing test that loads seed SQL, runs SELECT, gets rows
- [ ] Implement `createAccountingDb()` returning `{ loadSeed(sql), query(sql), reset() }`
- [ ] Test → PASS
- [ ] Commit: `feat(db): AccountingDB SQLite via sql.js`

## Task 2.4: xterm.js Terminal component

**Files:** `src/modules/Sandbox/Terminal.tsx`, `src/modules/Sandbox/index.ts`

- [ ] Implement Terminal wrapping xterm.js + FitAddon
- [ ] Line-buffered input → emits `onInput(line)`
- [ ] Custom dark theme matching design § 7.2 mockup
- [ ] Wire into App.tsx right column
- [ ] Manual verify: typing echoes, Enter submits
- [ ] Commit: `feat(sandbox): xterm.js terminal with line-buffered input`

## Task 2.5: Fake Claude scripted responder

**Files:** `src/modules/Sandbox/fake-claude.ts`, `tests/modules/fake-claude.test.ts`

- [ ] TDD: test matches regex input, returns scripted response, stable on repeated calls
- [ ] Implement `createFakeClaude(session)` with `handle(userInput)` → `{ toolCalls, text } | null`
- [ ] Test → PASS
- [ ] Commit: `feat(sandbox): scripted fake-claude responder (stable output)`

## Task 2.6: MDX custom components

**Files:** `src/modules/LessonViewer/components/{SandboxStep,ComparisonDemo,Callout}.tsx`

- [ ] Implement SandboxStep: shows expected input + "我做完了" button, sets vfs marker
- [ ] Implement ComparisonDemo: side-by-side cards (ChatGPT vs Claude)
- [ ] Implement Callout: tip/warn/insight variants
- [ ] Register in mdx-components.tsx
- [ ] Smoke test for Callout
- [ ] Commit: `feat(mdx): SandboxStep, ComparisonDemo, Callout`

## Task 2.7: Checker module

**Files:** `src/modules/Checker/runner.ts`, `index.ts`, `tests/modules/checker.test.ts`

- [ ] TDD: test passes-true, attempt-1 hint, attempt-2 escalation, attempt-3 shows answer button
- [ ] Implement `runChecker(fn, env, attempt)` returning `{ passed, hint, showAnswerButton }`
- [ ] Test → PASS
- [ ] Commit: `feat(checker): progressive hint runner`

## Task 2.8: Ch 1 content (testing-as-spec)

**Files:** `content/chapters/01-ai-tools-vs-chatgpt/{test.ts, lesson.mdx, checker.ts, sandbox-fixture/*, quiz.yaml}`

- [ ] **Step 1: Write test.ts FIRST** asserting perfect-user path passes checker
- [ ] **Step 2: Run → FAIL** (lesson/checker don't exist)
- [ ] **Step 3: Create sandbox-fixture/** (invoices.csv with 6 sample invoices + seed.sql)
- [ ] **Step 4: Write checker.ts** (gate on `.progress/comparison-viewed` + `.progress/first-step-completed` markers)
- [ ] **Step 5: Write lesson.mdx** (use ComparisonDemo + SandboxStep + Callout per spec § 5.1)
- [ ] **Step 6: Write quiz.yaml** (5 questions per § 7.4)
- [ ] **Step 7: Add quiz.yaml validation test** (every question has 1+ correct option)
- [ ] **Step 8: Test → PASS**
- [ ] **Step 9: Commit Ch 1 as one unit**

```bash
git add content/chapters/01-ai-tools-vs-chatgpt/
git commit -m "feat(content): Ch 01 — AI 工具 ≠ ChatGPT 2.0 (testing-as-spec complete)"
```

## Week 2 Acceptance

- [ ] `pnpm tauri:dev` → navigate to Ch 1 → comparison demo shows + sandbox terminal accepts input
- [ ] Following the perfect-user path completes checker
- [ ] `pnpm test:chapters` reports Ch 1 tests passing
- [ ] `pnpm test:modules` reports all module tests passing

---

# Phase 3 · Week 3 — Part I + Quiz module + First-launch

**Milestone deliverable:** Part I (Ch 1-4) fully playable. Quiz on Ch 1 and Ch 4 works. First-launch flow with progressive disclosure. Sidebar shows progress.

## Task 3.1: Quiz module

**Files:** `src/modules/Quiz/QuizRunner.tsx`, `quiz-loader.ts`, `index.ts`, `tests/modules/quiz.test.tsx`

- [ ] TDD: render question stem, submit correct answer shows positive feedback, submit wrong shows hint
- [ ] Implement Quiz types + QuizRunner component (single + multi choice)
- [ ] Set up YAML import via `@rollup/plugin-yaml`
- [ ] Test → PASS
- [ ] Commit: `feat(quiz): QuizRunner with single/multi choice, instant feedback`

## Task 3.2: Ch 2-4 content

Each chapter follows Task 2.8's TDD pattern. Scenarios per design § 5:

- [ ] **Ch 2** (`02-show-files-to-ai/`): 银行流水可疑大额识别. AI reads CSV with 200 rows, flags outliers.
- [ ] **Ch 3** (`03-let-ai-write-code/`): 发票按类目汇总. AI writes Python, sandbox runs it via Pyodide.
- [ ] **Ch 4** (`04-from-once-to-reusable/`): 12 个月数据批量处理 + **quiz.yaml** (3-5 questions on script reuse mindset).

For each:
1. Write test.ts (perfect-user path)
2. Run → FAIL
3. fixture → checker → lesson.mdx → (quiz for Ch 4)
4. Run → PASS
5. Atomic commit

> **Vibe-coding hint**: For each chapter ask Claude Code: "请按 `content/chapters/01-ai-tools-vs-chatgpt/` 结构,实现 `02-show-files-to-ai/`,让 test.ts 通过。先写 test.ts,我 review 后再实现其它。"

## Task 3.3: Progress store + Tauri storage adapter + first-launch flow

**Files:** `src/modules/Progress/store.ts`, `src/modules/Progress/persistence.ts`, `src/components/WelcomeFlow.tsx`

- [ ] **Step 1: Implement Tauri storage adapter(critical — Codex review fix #3)**

`src/modules/Progress/persistence.ts`:

```typescript
import {
  readTextFile,
  writeTextFile,
  exists,
  remove,
  BaseDirectory,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

// 写到 macOS 标准位置:~/Library/Application Support/AccountingAssassin/
// 这是 spec § 2.5.1 定义的"App 私有状态"边界 —— 不能默认走 localStorage!
const APP_DATA_DIR = { baseDir: BaseDirectory.AppLocalData } as const;

async function ensureDir() {
  // Tauri 自动创建 AppLocalData 根目录,无需手动创建
}

const tauriStorage: StateStorage = {
  async getItem(name) {
    try {
      const file = `${name}.json`;
      if (await exists(file, APP_DATA_DIR)) {
        return await readTextFile(file, APP_DATA_DIR);
      }
      // 主文件不存在时尝试 .bak(spec § 8.2 备份恢复)
      const bak = `${name}.json.bak`;
      if (await exists(bak, APP_DATA_DIR)) {
        return await readTextFile(bak, APP_DATA_DIR);
      }
      return null;
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    await ensureDir();
    // 先写主文件
    await writeTextFile(`${name}.json`, value, APP_DATA_DIR);
    // 再顺手写一份 .bak,作为下次启动恢复时的兜底
    await writeTextFile(`${name}.json.bak`, value, APP_DATA_DIR);
  },
  async removeItem(name) {
    try {
      await remove(`${name}.json`, APP_DATA_DIR);
      await remove(`${name}.json.bak`, APP_DATA_DIR);
    } catch { /* ignore */ }
  },
};

// 在 Vitest(jsdom)环境里没有 Tauri IPC,降级到 localStorage 保持单测可跑
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const progressStorage = isTauri
  ? createJSONStorage(() => tauriStorage)
  : createJSONStorage(() => localStorage);
```

- [ ] **Step 2: 给 Tauri 加权限**

修改 `src-tauri/capabilities/default.json`(或新建 capability)加上:

```json
{
  "identifier": "progress-storage",
  "permissions": [
    "fs:allow-app-read-recursive",
    "fs:allow-app-write-recursive"
  ]
}
```

这是 Tauri 2 唯一允许 plugin-fs 写 AppLocalData 的方式。

- [ ] **Step 3: Implement Zustand store using the adapter**

`src/modules/Progress/store.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { progressStorage } from "./persistence";

// ...(ProgressState interface 与 plan 原文一致)

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      // ...(原本的 state + actions)
    }),
    {
      name: "accounting-assassin-progress",
      storage: progressStorage,    // ← 关键:走 Tauri,不走默认 localStorage
    },
  ),
);
```

- [ ] **Step 4: Implement WelcomeFlow component**: T+0 splash → T+3 welcome → T+30 preparing → done
- [ ] **Step 5: Sandbox-only prep wording** per § 10.4 (no mention of `~/accounting-learner/`)
- [ ] **Step 6: Gate App.tsx on `hasCompletedOnboarding`**
- [ ] **Step 7: Unit test for persistence**:写测试覆盖"主文件损坏时从 .bak 恢复"
- [ ] **Step 8: Manual verify**:跑一次 `pnpm tauri:dev`,完成 Ch 1,杀进程,重启 → 应该回到 Ch 1 已完成状态;然后`open ~/Library/Application\ Support/com.kyong.accounting-assassin/` 看到 `accounting-assassin-progress.json` 和 `.bak`

- [ ] **Step 9: Commit**

```bash
git add src/modules/Progress/ src/components/WelcomeFlow.tsx src-tauri/capabilities/
git commit -m "feat(progress): Zustand store with Tauri AppLocalData storage adapter + .bak backup"
```

> **Codex review fix #3**:Zustand `persist` 默认走 localStorage(WebView 沙箱内,**不是 macOS 文件系统**)。这会让 spec § 2.5.1 的"App 私有状态在 ~/Library/Application Support/AccountingAssassin/"边界承诺成空话。必须手写 Tauri storage adapter,直接走 `@tauri-apps/plugin-fs` 的 AppLocalData,才能真正达成 spec 的存储位置承诺。Vitest 环境降级 localStorage 是为了让单测在 jsdom 里能跑。

## Task 3.4: Sidebar + curriculum manifest

**Files:** `src/curriculum.ts`, `src/components/Sidebar.tsx`

- [ ] Define `CHAPTERS` array (15 entries with slug/num/title/part/mode/hasQuiz per design § 5)
- [ ] Implement Sidebar: groups by Part, shows locked/in-progress/completed/quiz-marker states
- [ ] Hide sidebar until first chapter completed (progressive disclosure per § 10.4)
- [ ] Commit: `feat(sidebar): chapter list grouped by Part with locked/done/current states`

## Week 3 Acceptance

- [ ] First launch shows welcome → preparing → Ch 1 (no sidebar)
- [ ] Completing Ch 1 reveals sidebar with all 15 chapters grouped
- [ ] Ch 1 shows ✓, Ch 2 ● blue (current), Ch 3-4 ○, Ch 5+ 🔒
- [ ] Ch 1 and Ch 4 Quiz both render at chapter end
- [ ] `pnpm test:chapters` Ch 1-4 all pass
- [ ] Reload app → returns to last open chapter (persistence works)

---

# Phase 4 · Week 4 — Real environment infrastructure + Ch 5-6 (task-level)

**Milestone deliverable:** Ch 5-6 playable on real macOS — mode switches sandbox → real, `~/accounting-learner/` created on Ch 5 confirm, App verifies python/claude via whitelisted shell commands, "stuck button" emits diagnostic markdown.

## Task 4.1: Tauri Rust commands (whitelisted)

**Files:** `src-tauri/src/safety/path_guard.rs`, `src-tauri/src/commands/{env,fs,checker,shell,env_init}.rs`, modify `main.rs`

Per design § 4.3, only these commands exposed:

| Command | Signature | Purpose |
|---|---|---|
| `check_command_exists` | `(cmd: AllowedCommand)` | enum-constrained, runs `which $cmd` |
| `read_user_file` | `(rel_path: PathBuf)` | canonicalize + prefix-check inside `~/accounting-learner/` |
| `run_bundled_checker` | `(name: BundledChecker)` | runs App-bundled checker, never accepts user paths |
| `open_terminal_at` | `(rel_path: PathBuf)` | opens macOS Terminal; does NOT execute commands |
| `initialize_real_env` | `()` | creates `~/accounting-learner/` + README + health-check report |
| `collect_diagnostics` | `()` | returns markdown report (allowlisted fields) |

**Critical: `path_guard::check_inside_workspace`** canonicalizes the joined path and verifies it starts_with the workspace root. Rejects `../etc/passwd` and any symlink escapes.

**`AllowedCommand` enum**: `Python3 | Claude | Brew | Git | Codex | Cursor` — each maps to a fixed binary name. No string interpolation.

- [ ] Implement path_guard.rs with anyhow error handling
- [ ] Implement each command file (env, fs, checker, shell, env_init)
- [ ] Register handlers in main.rs `tauri::generate_handler!`
- [ ] Write Rust unit tests: each path_guard test includes a path-escape rejection case
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml` → all pass
- [ ] Commit per command file

## Task 4.2: TypeScript wrappers + useRealEnv hook

**Files:** `src/modules/RealEnvBridge/invoke.ts`, `health-check.ts`, `useRealEnv.ts`, `index.ts`

- [ ] Implement typed wrappers around `@tauri-apps/api/core` invoke
- [ ] `useRealEnv()` hook returns reactive state: `{ ready, missing, mode, ... }`
- [ ] `health-check.ts` runs all checks in parallel, returns aggregated status
- [ ] Test using `@tauri-apps/api/mocks` IPC mock
- [ ] Commit

## Task 4.3: Mode switch ritual (Ch 5 transition)

**Files:** `src/components/ModeTransition.tsx`, `src/components/RealStep.tsx`, modify mdx-components.tsx

- [ ] Implement ModeTransition: full-screen confirmation dialog per § 6.3
- [ ] Triggers `initializeRealEnv()` → if ready, set progress.mode = 'real' → ModeIndicator shifts blue→amber
- [ ] Implement RealStep MDX component: card with command + [复制] + [我跑完了] buttons; latter triggers chapter checker in 'real' mode
- [ ] Test mode switch flow
- [ ] Commit

## Task 4.4: Stuck button + diagnostic report

**Files:** `src/components/StuckButton.tsx`, `src-tauri/src/diagnostics/report.rs`

- [ ] Rust: implement diagnostic collector with allowlist (current chapter, system info, tool versions, sandbox file list)
- [ ] **Critical: no user file content in report** — verify with test
- [ ] React: floating StuckButton in bottom-right; gray in sandbox, amber in real
- [ ] Click → modal showing markdown preview + [复制到剪贴板] + [保存为文件]
- [ ] Test that report does NOT include any file outside `~/accounting-learner/`
- [ ] Commit

## Task 4.5: Ch 5-6 content

- [ ] **Ch 5** (`05-your-workstation/`): step-by-step env install (Homebrew → python3 → git → claude). test.ts mocks realEnv calls.
- [ ] **Ch 6** (`06-first-real-claude/`): first claude CLI session, verify `~/.claude/` exists. Includes quiz.yaml.

Standard testing-as-spec, with `<RealStep>` instead of `<SandboxStep>`.

## Week 4 Acceptance

- [ ] On clean macOS, Ch 5 walks through brew + python + git + claude installs with App-guided verification
- [ ] Ch 6 successfully verifies `claude --version` output
- [ ] ModeIndicator transitions blue→amber after Ch 5 ritual
- [ ] StuckButton works in both modes
- [ ] Diagnostic markdown copies to clipboard
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes (including path-escape rejections)
- [ ] Ch 6 Quiz renders

---

# Phase 5 · Week 5 — Part III + aa-ocr CLI

**Milestone deliverable:** Ch 7-10 content complete; `aa-ocr` Rust CLI works on PDF + JPG returning unified JSON.

## Task 5.1: aa-ocr Rust CLI (parallel workstream)

**Files:** `aa-ocr/Cargo.toml`, `aa-ocr/src/{main,pdf,vision,output}.rs`

Add `aa-ocr` to workspace. Crates: `pdf-extract = "0.7"`, `objc2 = "0.5"`, `objc2-vision = "0.2"`, `serde_json = "1"`.

JSON schema per design § 5.3.1.1:

```json
{
  "source_file": "invoices/2026-04-001.pdf",
  "fields": {
    "date":   { "value": "2026-04-15", "confidence": 0.92 },
    "amount": { "value": 1234.50, "confidence": 0.88, "currency": "CNY" },
    "vendor": { "value": "上海某某商贸", "confidence": 0.81 },
    "tax_id": { "value": null, "confidence": 0.0, "reason": "未识别" }
  },
  "raw_text": "完整识别出的全文..."
}
```

Exit codes: 0 success, 2 file not found, 3 unrecognizable, 4 partial fields missing.

- [ ] Cargo manifest + workspace setup
- [ ] main.rs: argument parsing (1 arg: file path)
- [ ] pdf.rs: try pdf-extract; return None if no text layer
- [ ] vision.rs: objc2 binding to VNRecognizeTextRequest (Chinese mode)
- [ ] output.rs: unified JSON serialization
- [ ] cargo tests with fixture PDFs/JPGs under `aa-ocr/tests/fixtures/`
- [ ] Modify `initialize_real_env` to symlink `aa-ocr` binary into `~/accounting-learner/.bin/`
- [ ] Commit per module

## Task 5.2: Ch 7 content

Scenario: Python script that calls `aa-ocr` via subprocess, parses JSON, prints structured data. Crucially **no Rust/Vision/objc2 exposure to learner**.

- [ ] test.ts (perfect-user path: file invoice_ocr.py exists, runs with sample, output contains expected fields)
- [ ] Standard TDD pattern
- [ ] Lesson covers CLAUDE.md basics + --continue
- [ ] Commit

## Task 5.3: Ch 8 — Debug + Git restore (heaviest content chapter)

Implements full § 5.4 teaching:

- [ ] Implement `<DebugFlowchart>` MDX component rendering the § 5.4.3 ASCII flowchart as a styled diagram
- [ ] Implement `<BugReportCard>` component: shows the four-part template per § 5.4.2, with one-click "复制到剪贴板" that auto-populates 报错原文 from most recent terminal output
- [ ] Write Ch 8 lesson.mdx using above components
- [ ] Write 3 practice exercises per § 5.4.4 (encoding bug, silent bug, AI-getting-worse-rollback)
- [ ] Forward-reference `superpowers:systematic-debugging` skill per § 5.4.5
- [ ] Standard TDD: test.ts, checker.ts, lesson.mdx, fixture
- [ ] Commit

## Task 5.4: Ch 9 — Skills

- [ ] Scenario: write `~/.claude/skills/organize-invoices/SKILL.md` Skill
- [ ] Demonstrate Claude auto-loading and invoking it
- [ ] Standard TDD
- [ ] Commit

## Task 5.5: Ch 10 — Hooks + MCP + quiz

- [ ] Scenario: write a hook running after Edit, install SQLite MCP server
- [ ] Include quiz.yaml (Hooks vs Skills vs MCP discrimination)
- [ ] Standard TDD
- [ ] Commit

## Week 5 Acceptance

- [ ] `aa-ocr sample.pdf` outputs valid JSON for both PDF-with-text-layer and scanned-image cases
- [ ] `cargo test --manifest-path aa-ocr/Cargo.toml` passes
- [ ] Ch 7-10 chapter tests pass
- [ ] Manual: complete Ch 10 in dev mode, SQLite MCP works

---

# Phase 6 · Week 6 — Part IV (Codex + Cursor)

**Milestone deliverable:** Ch 11-13 content complete (Codex × 2 + Cursor × 1).

- [ ] **Ch 11** Codex 入门 — install Codex CLI, run same task as Ch 7 with Codex, compare style
- [ ] **Ch 12** Codex 深入 — auto-approve mode, concurrent subtasks
- [ ] **Ch 13** Cursor (de-emphasize IDE) — Composer / @-ref / Background Agent + quiz.yaml

Each chapter's first `<RealStep>` includes external-tool health check + graceful downgrade message per design § 2.6.

## Week 6 Acceptance

- [ ] Ch 11-13 chapter tests pass
- [ ] If Codex/Cursor not installed, downgrade message renders correctly (manual test by uninstalling and re-running)

---

# Phase 7 · Week 7 — Part V capstones

**Milestone deliverable:** Ch 14-15 complete; learner can build and run all 3 graduation utilities + the orchestrated month-end-close workflow.

> **Decision recorded 2026-05-22** — Template scaffolding for Ch 14 is **Claude-driven via MDX**, NOT via a new Tauri "copy template" command:
> - lesson.mdx embeds the scaffold prompt for each utility as a code block inside a `<RealStep>` whose `command` opens Claude (`cd ~/accounting-learner && claude`)
> - User pastes the prompt to Claude in their own terminal; Claude creates the project files
> - No new Tauri IPC, no React TemplatePicker UI, no `content/chapters/14-capstone-a/templates/` subdirectory
> - This honors CLAUDE.md's "each chapter is a self-contained directory" and "App shows commands, user runs them" principles
> - Reverses the earlier "App copies chosen template to ..." plan wording

## Task 7.1: Ch 14 capstone A — three Claude-scaffolded utilities ✅ done

- [x] Each of the three utilities (`invoice-ocr/`, `bank-classifier/`, `report-aggregator/`) gets a scaffold step + run step in lesson.mdx
- [x] Scaffold steps are MDX-embedded Claude prompts the user pastes to Claude in their own terminal
- [x] Walks user through `pip3 install --user pandas openpyxl` (with `--break-system-packages` hedge for Brew Python 3.12+); first introduction of pandas/openpyxl per Ch 7 README's deferred-until-Ch-14 constraint
- [x] 降级流 (OCR exit 4 → 人填 → AI 校验) is taught **explicitly** as the core teaching per spec § 5.3.1.3 — its own section, concrete 3-sheet Excel structure (主表 / 需手填 / 失败), and a worked AI-validation Claude prompt
- [x] Standard TDD: test.ts → checker.ts → lesson.mdx → README.md, all 4 files under `content/chapters/14-capstone-a/`
- [x] Closing `capstone-a-reviewed` reflection step points at Ch 15 as the integration synthesis
- [x] Commits: `52c1f7e` (initial) · `6d9a341` (AI-validation promotion + pandas dedupe) · `0c39edb` (reformat-robust exit-code regex)

## Task 7.2: Ch 15 capstone B — month-end orchestration + final quiz ✅ done

- [x] End-to-end "月末结账" workflow combining Ch 14's three utilities + a new `voucher-gen` step
- [x] Voucher generation script (新增) is also Claude-scaffolded inline — joins Ch 14's `invoice_summary` + `bank_classified` outputs into a vouchers CSV (借方/贷方/金额/摘要)
- [x] Skill (`~/.claude/skills/month-end-close/SKILL.md`) orchestrates the 4 steps — recalls Ch 9 SKILL.md teaching exactly
- [x] Hook (`PostToolUse` + `matcher: "Edit"` in `~/accounting-learner/.claude/settings.local.json`) logs edits — recalls Ch 10 hook teaching exactly. Marker id is `hook-capstone-b-installed` (renamed from `hook-installed` to avoid namespace collision with Ch 10)
- [x] Climax `workflow-run` step: user says "帮我做本月结账" → Claude finds the Skill → runs all 4 steps → produces `~/accounting-learner/outputs/month_end_<YYYY-MM>.xlsx`
- [x] Final cross-chapter `quiz.yaml` — 8 questions spanning Ch 5/7/8/9/10/11/12/13/14: env rationale, CLAUDE.md, `git restore .` (with `git checkout .` as TRAP wrong answer), Skill judgment, Skill/Hook/MCP distinction, Claude vs Codex default behavior, Cursor's 3 features, aa-ocr exit-4 降级流
- [x] Course-finale framing in closing `reflection-completed` step — capability summary table, "把这个模式推广" generalization, ending Callout
- [x] Standard TDD: 5 files (test/checker/lesson/quiz/README) under `content/chapters/15-capstone-b/`
- [x] Commits: `1093883` (initial) · hook-id rename commit

## Week 7 Acceptance

- [x] All 15 chapter test files pass (171/171)
- [x] `pnpm typecheck` + `pnpm lint` clean
- [x] Ch 15's final quiz factually accurate to Ch 8/10/11/12/13/14 source content (cross-chapter review pass)
- [x] No `git checkout .` taught; `git restore .` discipline maintained throughout new content
- [x] No new Rust/React/curriculum.ts changes — Week 7 is content-only as the spec's "chapter = self-contained directory" rule prescribes

---

# Phase 8 · Week 8 — Polish + multi-AI review + clean-install self-test

**Milestone deliverable:** All 15 chapters reviewed by 2+ AIs, surface issues fixed, app polished.

## Task 8.1: scripts/review-chapter.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

NN="${1:?usage: review-chapter.sh <NN> (e.g. 03)}"
DIR=$(ls -d content/chapters/${NN}-*/ 2>/dev/null | head -1)
if [ -z "$DIR" ]; then
  echo "ERROR: no chapter directory matches content/chapters/${NN}-*" >&2
  exit 1
fi

mdx="${DIR}lesson.mdx"
checker="${DIR}checker.ts"
quiz="${DIR}quiz.yaml"

# Codex review fix #5a:不能只把文件路径丢给 codex,必须把 review 任务 + 章节
# 完整内容一起喂给它,否则 codex 收到的只是一个字符串 "content/chapters/...
# lesson.mdx",输出会是空的或胡说八道
codex --print - <<EOF > "${DIR}lesson.review.codex.md"
你是一名教学产品 review 专家。下面是一份"教零基础财务会计师(10 年经验,无编程基础)用 AI 工具"的章节。请从以下 5 个维度做 review,每条只写最重要的问题,不超过 3 行:

1. 概念准确性:有没有错误陈述、过时事实
2. 教学顺序:前置概念是否在前面章节充分铺垫
3. 真实场景的合理性:会计场景的数据/任务是否真实
4. 失败兜底:出错或卡住时的引导是否清晰
5. 遗漏的边角情况

# Lesson MDX
$(cat "$mdx")

# Checker
$(cat "$checker" 2>/dev/null || echo "(no checker.ts)")

# Quiz
$(cat "$quiz" 2>/dev/null || echo "(no quiz.yaml)")
EOF

# (可选)Gemini / Claude / 其它 AI 同样模式
# gemini --print - <<EOF > "${DIR}lesson.review.gemini.md"
# ... 同样的 review prompt ...
# EOF

echo "Reviews written to ${DIR}lesson.review.*.md"
```

> **Codex review fix #5a**:原版 `codex review "$mdx"` 只把路径当 prompt 传给 codex,**codex 收到的是字符串字面量,不是文件内容**。修法:用 heredoc 把 review 指令 + 完整章节内容(mdx + checker + quiz)一起喂给 codex 的 `--print` 模式,确保 review 真正基于内容产出。

- [ ] Implement script with structured review prompt
- [ ] Run for all 15 chapters
- [ ] Triage feedback chapter-by-chapter, fix surface issues
- [ ] Commit: `docs: AI review pass on all 15 chapters with fixes`

## Task 8.2: Final UX polish

- [ ] Animation tuning (chapter transitions, sidebar reveal smoothness)
- [ ] Optional: subtle sound on completion
- [ ] Settings page: manual mode reset, "重新启用本 App" link, reset progress (with confirmation)
- [ ] Empty states and error boundaries

## Task 8.3: Clean-install self-test (wife-perspective)

**Files:** `scripts/verify-clean-install.sh`

- [ ] Use fresh macOS test account or VM
- [ ] Walk Ch 1-15 from scratch
- [ ] Time per chapter
- [ ] Record every hesitation point + error
- [ ] Fix surface issues before declaring Week 8 done

## Week 8 Acceptance

- [ ] Every chapter has `lesson.review.codex.md` (and optionally gemini)
- [ ] High-priority review issues fixed (tracked in git log)
- [ ] Clean self-test completes Ch 1-15 with no blockers

---

# Phase 9 · Week 9 — Release

**Milestone deliverable:** Ad-hoc signed `.dmg` + `首次安装说明.pdf` delivered to wife.

## Task 9.1: scripts/package-dmg.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

pnpm tauri:build

APP="src-tauri/target/release/bundle/macos/AccountingAssassin.app"
if [ ! -d "$APP" ]; then
  echo "ERROR: built .app not found at $APP" >&2
  exit 1
fi

# ad-hoc 签名(spec § 10.2 决定不申请 ADP)
codesign --force --deep --sign - "$APP"

# Codex review fix #5b:DMG 路径含通配符,不能存进变量后直接 cp "$DMG"
# (bash 不展开引号内通配)。用 find 显式解析出真实路径。
DMG=$(find src-tauri/target/release/bundle/dmg -name "AccountingAssassin_*.dmg" -type f | head -1)
if [ -z "$DMG" ]; then
  echo "ERROR: no DMG produced by tauri:build" >&2
  exit 1
fi

mkdir -p release/
cp "$DMG" release/
cp docs/首次安装说明.pdf release/
echo "Release artifacts:"
ls -lh release/
```

> **Codex review fix #5b**:原版 `DMG="...AccountingAssassin_*.dmg"` 加引号 `cp "$DMG"` 时,bash 把通配符当字面量,**cp 会找不到名字真就是 `*.dmg` 的文件**。改用 `find` 显式找出真实路径 + 显式失败分支(找不到时 `exit 1`,不静默)。

- [ ] Implement
- [ ] Test on dev machine

## Task 9.2: 首次安装说明.pdf

Single-page PDF (rendered from markdown):
- 拖到 Applications 文件夹
- 在 Applications 里 **右键** App 图标 → 点"打开" → 弹窗里再点"打开"
- 失败兜底:三个场景的图文步骤(系统设置 → 隐私与安全性;xattr -dr 命令;系统升级后重新授权)— per § 10.2
- "怎么找老公"步骤(短信+截屏)

- [ ] Write markdown + render to PDF (pandoc / markdown-pdf)
- [ ] Verify formatting on real PDF reader

## Task 9.3: Final verification

- [ ] Build .dmg with package-dmg.sh
- [ ] On a never-used macOS account: drag to Applications, right-click → 打开 → 仍要打开 → confirm app launches without further intervention
- [ ] Walk Ch 1 on this clean account
- [ ] Re-verify subscription pricing in § 2.6 still accurate (per disclaimer)
- [ ] Tag git: `git tag v1.0.0`

## Task 9.4: Delivery

- [ ] Put `.dmg` + PDF in iCloud Drive shared folder
- [ ] Send wife the link
- [ ] Stand by for her first questions

## Week 9 Acceptance

- [ ] Signed .dmg **< 30 MB**(对齐 spec § 10.1 的 bundle 体积承诺;若超过,需先排查是 Pyodide 包体过大、还是 aa-ocr 二进制未 strip,再决定是否调整 spec)
- [ ] Right-click-open verified on clean account
- [ ] Wife successfully opens the app and reaches Ch 1
- [ ] Project marked v1.0.0 in git

---

# Self-Review Checklist

Reviewed against design spec on 2026-05-20.

**Spec coverage**:
- § 2 needs/constraints → Goal + per-week milestones
- § 2.5.1 three-layer file boundary → Task 4.1 (Rust path_guard) + Task 5.1 (aa-ocr binary placement)
- § 2.6 external dependencies → Ch 5/6/11/12/13 chapter tests (downgrade behavior)
- § 3 architecture → reflected in `src/` directory structure
- § 4 modules → one task per module across Weeks 1-3
- § 4.3 subprocess boundary → Task 4.1 explicit allowlist enum
- § 5 curriculum → 15 chapter tasks across Weeks 2-7, each following testing-as-spec
- § 5.3.1 aa-ocr → Task 5.1 (dedicated)
- § 5.4 debug teaching → Task 5.3 (Ch 8 + flowchart + BugReportCard)
- § 6 data flow → mode switch in Task 4.3
- § 7 Quiz module → Task 3.1 + per-chapter quiz.yaml in Tasks 2.8 (Ch 1), 3.2 (Ch 4), 4.5 (Ch 6), 5.5 (Ch 10), 6 (Ch 13), 7 (Ch 15)
- § 8 error handling → Task 4.4 stuck button + Task 8.2 polish
- § 9 testing → testing-as-spec discipline in every chapter task + CI in Task 1.6
- § 10 packaging → Tasks 9.1-9.2
- § 10.2 right-click signing → Task 9.2 PDF
- § 11 roadmap → directly shapes Weeks 1-9

**No spec gaps identified.**

**Placeholder scan**: no "TBD/TODO/implement later" remaining. Weeks 1-3 fully bite-sized with code shown; Weeks 4-9 have sufficient implementation guidance for vibe-coding with re-invocation of writing-plans for detailed weekly breakdowns when starting each week.

**Type consistency**: `CheckerFn`, `CheckerEnv`, `CheckerResult`, `RunResult` (Checker); `VirtualFs` (Sandbox); `Quiz`, `QuizQuestion`, `QuizOption` (Quiz); `ChapterMeta`, `ChapterProgress` (Progress); `AllowedCommand`, `CommandCheck` (RealEnvBridge) — names match across earlier and later tasks.

---

*Plan complete. 9 phases. Weeks 1-3 fully bite-sized for immediate execution; Weeks 4-9 outlined with key code samples and acceptance criteria, intended for re-invocation of writing-plans at the start of each week.*
