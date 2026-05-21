# Chapter 12 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

1. **四个 RealStep**，id 必须是这四个字符串：
   - `<RealStep id="workspace-snapshotted" ...>` — 用户提交 Git 快照后点击
   - `<RealStep id="batch-input-prepared" ...>` — 用户准备好批量 CSV 文件后点击
   - `<RealStep id="auto-approve-tried" expectsCli="Codex" ...>` — 用户运行 `codex exec` 批量任务后点击
   - `<RealStep id="safety-rule-understood" ...>` — 用户阅读四条安全规则后点击

   这四个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

2. **`expectsCli="Codex"` 只在 `auto-approve-tried` 步骤上**——其他步骤不需要。

3. **本章没有 QuizRunner**（Ch 12 的 `hasQuiz` 为 false）。不要在末尾加 `<QuizRunner />`。

4. **Ch 11 前提说明 Callout 必须保留**——在章节顶部有一个 `type="warn"` 的 Callout，说明本章假设 Ch 11 已完成，并给出 Claude Code 降级路径。

5. **`git restore` 必须出现在课文里**（spec § 3 要求与 Ch 8 词汇对齐）。不要用 `git checkout .`。

## Codex exec 命令（截至 2026-05）

官方支持的非交互式批量运行方式：

```bash
codex exec --sandbox workspace-write "你的任务描述"
```

- `--sandbox workspace-write`：允许工作目录内读写，不弹确认框
- `--full-auto`：旧标志，**已废弃**，当前版本运行时打印警告，不推荐使用

**审批模式说明**（通过 `/permissions` 在会话内切换）：
- Auto（默认）：工作目录内操作自动通过，工作目录外提示确认
- Read-only：只读，任何写操作需要确认
- Full Access：完全无提示（谨慎使用）

**如果命令格式将来发生变化**，只需更新 lesson.mdx 里的 `command=` 属性和说明文字，checker.ts 不需要改。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 `command`（如果官方命令格式有变化）
- 安全规则的表述方式和顺序（保持四条规则的核心含义即可）
- 样例任务的 CSV 文件名和列名

## 技术约束说明

- **不要在课文里暴露实现细节**——Codex 的内部 LLM 调用、token 计费、并发架构等对学习者是黑盒，故意隐藏。
- **风险描述要务实，不要恐惧化**——安全规则是成年人风险管理，不是「这个工具很危险请小心」。
- **本章无 sandbox-fixture 目录**——Ch 12 是纯真实环境章节，使用用户自己的 `~/accounting-learner/` 工作目录。
- **Git 词汇对齐 Ch 8**：撤销用 `git restore .`，新建文件清理用 `git clean -i`，绝对不用 `git checkout .`。

## 无 sandbox-fixture 目录

Ch 12 是纯真实环境章节，学习者使用自己的 `~/accounting-learner/` 工作目录。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
NODE_OPTIONS=--experimental-require-module pnpm test:chapters content/chapters/12-codex-deep/
# 应该 13 个测试全过
```
