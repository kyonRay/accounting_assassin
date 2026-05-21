# Chapter 06 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

1. **三个 RealStep**，id 必须是这三个字符串：
   - `<RealStep id="claude-version-checked" expectsCli="Claude" ...>` — 用户验证 claude --version 后点击
   - `<RealStep id="first-conversation" ...>` — 用户完成第一次 claude 对话后点击
   - `<RealStep id="claude-config-verified" ...>` — 用户确认 ~/.claude/ 目录存在后点击

   这三个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

2. **`expectsCli="Claude"` 不能从 claude-version-checked 步骤去掉**——它决定健康检查门控，Claude Code 未安装时会禁用按钮并提示"请先安装"。

3. **章末必须有 QuizRunner**，且 src 指向 quiz.yaml：
   ```mdx
   <QuizRunner src="./quiz.yaml" />
   ```
   去掉这一行 → quiz 不渲染。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（说明文字）
- RealStep 的 command（如果命令变了）
- Callout 的 title 和 children
- quiz.yaml 的题目内容（只要每题 ≥ 1 个 correct option）

## Quiz 正确答案参考

| 题号 | 正确选项 | 要点 |
|---|---|---|
| q1 | B | claude --version 输出版本字符串格式 |
| q2 | B + C | 认证需要网络 + LLM 推理在云端 |
| q3 | B | Claude Code 能直接操作文件，网页版不行 |
| q4 | B | ~/.claude/ 存配置和凭证，不是数据 |
| q5 | B | command not found 通常是 PATH 问题，重启终端或 source 解决 |

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/06-first-real-claude/
# 应该 9 个测试全过
```
