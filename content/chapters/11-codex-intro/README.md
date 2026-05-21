# Chapter 11 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

1. **四个 RealStep**，id 必须是这四个字符串：
   - `<RealStep id="codex-installed" expectsCli="Codex" ...>` — 用户安装 Codex CLI 后点击
   - `<RealStep id="codex-logged-in" ...>` — 用户完成 `codex login` 后点击
   - `<RealStep id="codex-first-task-tried" ...>` — 用户用 Codex 完成银行流水分类任务后点击
   - `<RealStep id="style-noticed" ...>` — 用户阅读并感受风格对比后点击

   这四个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

2. **`expectsCli="Codex"` 只在 `codex-installed` 步骤上**——其他步骤不需要。这个 gate 在 Rust `check_command_exists` 枚举里对应 `AllowedCommand::Codex`。

3. **本章没有 QuizRunner**（Ch 11 的 `hasQuiz` 为 false）。不要在末尾加 `<QuizRunner />`。

4. **降级说明 Callout 必须保留**（spec § 2.6）——在章节顶部有一个 `type="warn"` 的 Callout，说明没有 ChatGPT Plus 订阅时的降级路径（用 Claude Code 演示同任务）。

## Codex CLI 安装命令（截至 2026-05）

官方支持两种方式：
- `npm install -g @openai/codex`（推荐，跨平台）
- `brew install --cask codex`（macOS Homebrew）

CLI 入口命令：`codex`（安装后直接运行）

登录命令：`codex login`（通过 ChatGPT 账号授权）

**如果命令格式将来发生变化**，只需更新 lesson.mdx 里的 `command=` 属性和说明文字，checker.ts 不需要改。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 `command`（如果官方安装命令格式有变化）
- 对比表格里的具体内容（两个工具的风格描述可以更新）
- 样例任务的 CSV 文件名和列名

## 技术约束说明

- **不要在课文里暴露实现细节**——Codex 的内部 LLM 调用、token 计费、API 层等对学习者是黑盒，故意隐藏。
- **风格对比要保持中立**——不能说某个工具"更好"，只能说"适合不同场景"。这是 spec § 2.6 的明确要求。
- **本章无 sandbox-fixture 目录**——Ch 11 是纯真实环境章节，使用用户自己的工作目录。

## 无 sandbox-fixture 目录

Ch 11 是纯真实环境章节，学习者使用自己的 `~/accounting-learner/` 工作目录。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
NODE_OPTIONS=--experimental-require-module pnpm test:chapters content/chapters/11-codex-intro/
# 应该 10 个测试全过
```
