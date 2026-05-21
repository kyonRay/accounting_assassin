# Chapter 01 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

1. **两个 SandboxStep**，id 必须是这两个字符串：
   - `<SandboxStep id="comparison-viewed" ...>` — 学习者看完对比演示后点的按钮。
   - `<SandboxStep id="first-step-completed" ...>` — 学习者完成第一次实操后点的按钮。

   这两个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

2. **章末必须有 QuizRunner**，且 src 指向 quiz.yaml：
   ```mdx
   <QuizRunner src="./quiz.yaml" />
   ```
   去掉这一行 → quiz 不渲染。

3. **fixture 数据契约**：`sandbox-fixture/invoices.csv` 的列名必须是 `date,vendor,category,amount`，有 6 行示例数据。改了列名 → checker 的 fixture-data 测试会挂。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）、配色
- 章节内部结构（标题层级、顺序）
- ComparisonDemo 的 leftTitle/rightTitle/left/right 内容
- Callout 的 title 和 children
- SandboxStep 的 children / expectedInput / hint（但 id 不能动！）
- quiz.yaml 的题目内容（只要每题 ≥ 1 个 correct option）

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/01-ai-tools-vs-chatgpt/
# 应该 5 个测试全过
```
