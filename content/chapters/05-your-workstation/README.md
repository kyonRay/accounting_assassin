# Chapter 05 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

1. **四个 RealStep**，id 必须是这四个字符串：
   - `<RealStep id="brew-installed" expectsCli="Brew" ...>` — 用户安装 Homebrew 后点击
   - `<RealStep id="python-installed" expectsCli="Python3" ...>` — 用户安装 Python 后点击
   - `<RealStep id="git-installed" expectsCli="Git" ...>` — 用户安装 Git 后点击
   - `<RealStep id="claude-installed" expectsCli="Claude" ...>` — 用户安装 Claude Code 后点击

   这四个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

2. **`expectsCli` 属性不能去掉**——它决定健康检查门控。如果用户的电脑上还没有安装对应工具，「我跑完了」按钮会禁用，并显示"请先安装"的提示。

3. **本章没有 QuizRunner**（Ch 05 的 `hasQuiz` 为 false）。不要在末尾加 `<QuizRunner />`。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果官方安装命令更新了，这里要同步更新）
- Callout 的 title 和 children

## 安装命令说明

- `brew install python` 和 `brew install git`：稳定命令，不太会变
- Claude Code 安装命令（`npm install -g @anthropic-ai/claude-code`）：可能随版本迭代变更，请保持与 Anthropic 官方文档同步
  - 官方文档：https://code.claude.com/docs

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/05-your-workstation/
# 应该 9 个测试全过
```
