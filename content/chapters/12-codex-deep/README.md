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

- `--full-auto`：旧标志，**已废弃**，当前版本运行时打印警告，不推荐使用

### 两条独立的轴（lesson.mdx 必须保持这个区分）

Codex 的权限和审批是**两条不同的轴**，绝对不能在课文里混为一谈：

1. **`--sandbox <mode>`（权限轴）**：Codex 能在哪里写文件。
   - 可选值：`read-only` / `workspace-write` / `danger-full-access`
   - 这个标志**不**控制是否弹确认框。
2. **`--ask-for-approval <mode>`（审批轴）**：Codex 执行命令前要不要暂停等用户点同意。
   - 可选值：`untrusted`（默认，陌生命令要问） / `on-request` / `never`
3. **`codex exec` 是非交互式子命令**：它「不弹确认框」是因为子命令本身是非交互的，**不是因为** `--sandbox` 做了什么。
   - 交互式 `codex` + `--sandbox workspace-write` 仍然会弹确认框。

**如果命令格式将来发生变化**，只需更新 lesson.mdx 里的 `command=` 属性和说明文字，checker.ts 不需要改。但**不要**在重写时把权限轴和审批轴混回一句话——这是 Ch 12 的概念底线。

## Claude Code 对照（不能写成 1:1 替换）

Claude Code 的权限模型和 Codex 不一样，**不能**写成「把 codex 换成 claude 就行」：

- `codex` ≈ `claude`（都是交互式 REPL）
- `codex exec` ≈ `claude -p` / `--print`（都是非交互式 / headless）
- `codex --sandbox workspace-write` 在 Claude Code 这边对应的是 `--permission-mode acceptEdits`（语义相近，**不**完全相同）——不是 `--sandbox`，也不是 `--dangerously-skip-permissions`
- Claude Code 还有 `--allowedTools` / `--disallowedTools` 这套独立的工具白名单机制，Codex 没有对应物

课文里只能说「类似的能力，参数不一样，详见 Ch 6-10」，不能说「概念完全一样」。

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
- **`.gitignore` 必须出现在 `git add -A` 之前**：银行流水 / 客户数据是真实敏感信息。如果课文教学员先 `git add -A` 再 `git commit`，数据就会被写进 Git 历史，以后推到 GitHub 或分享仓库时无法清理。重写时必须保留：在第一次 `git add -A` 之前，先把 `data/raw/` / `data/classified/` / `outputs/` / `*.csv` / `*.xlsx` 加进 `.gitignore` 并单独提交一次。

## 无 sandbox-fixture 目录

Ch 12 是纯真实环境章节，学习者使用自己的 `~/accounting-learner/` 工作目录。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
NODE_OPTIONS=--experimental-require-module pnpm test:chapters content/chapters/12-codex-deep/
# 应该 13 个测试全过
```
