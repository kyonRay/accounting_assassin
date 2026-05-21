# Chapter 10 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

### 五个 RealStep（id 不可改）

| id | 含义 |
|---|---|
| `three-mechanisms-understood` | 用户读完 Skill / Hook / MCP 对比表后点击 |
| `hook-installed` | 用户在 `.claude/settings.local.json` 里配置了 PostToolUse hook 后点击 |
| `hook-verified` | 用户确认 hook 触发、日志文件出现新行后点击 |
| `sqlite-mcp-installed` | 用户安装 SQLite MCP 服务器并通过 `claude mcp list` 确认后点击 |
| `mcp-query-tried` | 用户用自然语言让 Claude 通过 MCP 查询 SQLite 数据库后点击 |

这五个 id 在 `checker.ts` 里硬编码。改了 lesson.mdx 但没同步改 checker.ts → 章节永远 checker 不通过。

### 必须出现的字面量

- **`PostToolUse`**：lesson.mdx 正文里必须出现这个字符串（test.ts 断言此字符串）。这是当前 Claude Code hooks 配置的实际事件名（不是 `PostEdit`）。
- **`<QuizRunner src="./quiz.yaml" />`**：lesson.mdx 末尾必须出现此块（test.ts 断言）。

### 本章必须有 QuizRunner

Ch 10 的 `hasQuiz` 为 `true`，是 6 个测验节点之一（Ch 1/4/6/10/13/15）。不要删除末尾的 `<QuizRunner src="./quiz.yaml" />`。

## Quiz 契约

### 题目数量与结构

**5 道题**，混合题型：

| 题号 | id | 类型 | 考查点 |
|---|---|---|---|
| 1 | q1 | single-choice | Hook 适用场景（自动触发类任务） |
| 2 | q2 | single-choice | Hook 不适用场景（一次性任务） |
| 3 | q3 | multiple-choice | MCP 特征（进程 + 工具暴露） |
| 4 | q4 | single-choice | Skill 适用场景（重复多步工作流） |
| 5 | q5 | single-choice | Hook 安全性（破坏性命令的危险） |

每道题的 `id`（q1–q5）不可改，`checker.ts` 不依赖这些 id，但 test.ts 验证每道题至少一个 `correct: true`。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果命令格式有变化）
- Hook 示例的具体 JSON（如果 Claude Code hooks schema 更新了）
- MCP 安装命令（如果 `claude mcp add` 语法有变化，或 `uvx` 换成其他方式）
- Quiz 题目的措辞、干扰项内容（只要答案方向不变）
- Callout 的 title 和 children

## 技术约束说明

### Hooks schema（截至 2026-05）

当前 Claude Code 实际使用的 hooks 格式（从 `~/.claude/settings.json` 验证）：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "你的 shell 命令"
          }
        ]
      }
    ]
  }
}
```

**不要**在 lesson.mdx 里写 `"PostEdit"` 事件——这个事件名在当前版本不存在。正确名称是 `PostToolUse` 加 `matcher: "Edit"`。

如果未来 Claude Code 添加了 `PostEdit` 事件，可以同时提及两种写法，但 `PostToolUse` 仍需保留（test.ts 断言其存在）。

### MCP 安装（截至 2026-05）

官方 SQLite MCP 包名是 `mcp-server-sqlite`，通过 `uvx` 运行。如果安装方式变化，更新 lesson.mdx 里的命令即可——checker.ts 只检查 marker，不检查具体命令。

### Hook 示例必须安全

Hook 示例命令必须是**只追加写文件**的操作，不能是：
- 代码格式化（可能改坏用户代码）
- `rm` / `truncate`（破坏性）
- 网络请求（慢 + 隐私问题）
- 任何需要 sudo 的操作

## 无 sandbox-fixture 目录

Ch 10 是纯真实环境章节，无沙盒模式。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/10-hooks-and-mcp/
# 应该 13 个测试全过
```
