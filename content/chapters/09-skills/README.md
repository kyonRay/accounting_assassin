# Chapter 09 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

### 四个 RealStep（id 不可改）

| id | 含义 |
|---|---|
| `skill-concept-understood` | 用户阅读完 Skill 概念介绍后点击 |
| `skill-file-written` | 用户创建 `~/.claude/skills/organize-invoices/SKILL.md` 后点击 |
| `skill-invoked-by-claude` | 用户开新会话，用自然语言触发，Claude 自动调用 Skill 后点击 |
| `skill-tested-on-real-data` | 用户在真实发票上跑完整个 Skill 流程后点击 |

这四个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

### 必须出现的字面量

- **SKILL.md 路径**：课文正文必须出现完整路径 `~/.claude/skills/organize-invoices/SKILL.md`（test.ts 断言此完整路径字符串）。
- **`organize-invoices`**：Skill 名称，必须在 lesson.mdx 里出现（test.ts 断言此字符串）。

### 本章没有 QuizRunner

Ch 09 的 `hasQuiz` 为 `false`。不要在末尾加 `<QuizRunner />`。

### SKILL.md 的 YAML frontmatter 结构（不可改）

```yaml
---
name: organize-invoices
description: <描述文字可改，但 name 字段值必须是 organize-invoices>
---
```

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果命令格式有变化）
- SKILL.md 的 `description` 字段文字（只要语义不变、仍描述整理发票这件事）
- SKILL.md 正文里的步骤措辞（但步骤数量和大致内容保持合理）
- Callout 的 title 和 children

## 技术约束说明

- **不要暴露 aa-ocr 的 Rust/Vision Framework 内部实现**——`aa-ocr` 对学习者是黑盒，只需知道接口（文件路径输入 → JSON 输出，exit code 含义）。
- **不要在课文里引入 pandas/openpyxl 等依赖**——SKILL.md 描述的是 Claude 的任务，不是用户要跑的脚本。Claude 会选择合适的工具（可能用这些库，但学习者不需要手动 pip install）。
- **不要在本章里讲 Hooks 或 MCP**——那是 Ch 10 的内容。本章只讲 Skills。

## 无 sandbox-fixture 目录

Ch 09 是纯真实环境章节，学习者使用自己的真实发票。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/09-skills/
# 应该 11 个测试全过
```
