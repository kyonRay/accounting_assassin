# Chapter 13 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

### 六个 RealStep（id 不可改）

| id | 含义 |
|---|---|
| `cursor-installed` | 用户安装 Cursor + 把 `cursor` CLI 安装到 PATH，`expectsCli="Cursor"` |
| `cursor-logged-in` | 用户通过 cursor.com 完成账号登录 |
| `composer-tried` | 用户打开 Composer 并给它一个多文件任务 |
| `at-ref-tried` | 用户在对话框里用 @ 符号引用了一个具体文件 |
| `background-agent-tried` | 用户启动了 Background Agent 来处理一个异步任务 |
| `tool-choice-understood` | 用户阅读了 Claude Code / Codex / Cursor 三工具对比表 |

这六个 id 在 `checker.ts` 里硬编码。改了 lesson.mdx 但没同步改 checker.ts → 章节永远 checker 不通过。

### 必须出现的元素

- **`expectsCli="Cursor"`**：`cursor-installed` 步骤的 RealStep 必须有此属性（test.ts 断言）。
- **`<QuizRunner src="./quiz.yaml" />`**：lesson.mdx 末尾必须出现此块（test.ts 断言）。
- **`Composer`** 和 **`Background Agent`**：lesson.mdx 正文里必须出现这两个词（test.ts 断言）。
- **三工具对比**（Claude + Codex 同时出现）：test.ts 断言。
- **降级说明 Callout**：顶部必须有 `<Callout type="warn">` 提及 Cursor 订阅和降级路径（test.ts 断言含 `订阅|Pro|20|降级|回来`）。

### 本章必须有 QuizRunner

Ch 13 的 `hasQuiz` 为 `true`，是 6 个测验节点之一（Ch 1/4/6/10/13/15）。不要删除末尾的 `<QuizRunner src="./quiz.yaml" />`。

## Quiz 契约

### 题目数量与结构

**6 道题**，混合题型：

| 题号 | id | 类型 | 考查点 |
|---|---|---|---|
| 1 | q1 | single-choice | 三工具选择（批量文件任务 → Codex） |
| 2 | q2 | single-choice | @ 引用功能的本质（上下文定位） |
| 3 | q3 | multiple-choice | Background Agent 特征（异步、Pro 要求） |
| 4 | q4 | single-choice | Ch 12 安全规则长期记忆（Git 快照） |
| 5 | q5 | single-choice | Cursor 定位（不是编辑器，是工作流工具） |
| 6 | q6 | multiple-choice | Claude Code 适用场景（探索性对话） |

每道题的 `id`（q1–q6）不可改，`checker.ts` 不依赖这些 id，但 test.ts 验证每道题至少一个 `correct: true`。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果 Cursor CLI 命令格式有变化）
- Composer 快捷键描述（如果 Cursor 版本更新了快捷键）
- Quiz 题目的措辞、干扰项内容（只要答案方向不变）
- Callout 的 title 和 children

## 可以自由改动的（补充）

### `background-agent-tried` 没有 `command=` 属性——这是故意的

Background Agent 只能从 Cursor GUI 内部启动（通过命令面板或侧边栏入口），没有对应的终端命令可以直接打开它。因此 `background-agent-tried` 的 `<RealStep>` 不设置 `command=` 属性，这与其他步骤不一致，但符合实际情况。如果 Cursor 未来提供了 CLI 入口，可以补上。

## 技术约束说明

### Cursor CLI 安装（截至 2026-05）

`cursor` CLI 通过 Cursor.app 内部的命令面板安装到 PATH：
`Cmd+Shift+P → "Install 'cursor' command"`

这是 Cursor 官方支持的方式。不同版本菜单文字可能略有差异（有时是 "Shell Command: Install 'cursor' command"）。

### expectsCli="Cursor" 校验

`cursor-installed` RealStep 上的 `expectsCli="Cursor"` 会触发应用层检查 `cursor` CLI 是否在 PATH 里。这是 spec § 2.6 要求的 Cursor 可用性健康检查。

### 无 sandbox-fixture 目录

Ch 13 是纯真实环境章节（mode: "real"），无沙盒模式。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/13-cursor/
# 所有测试应该通过
```
