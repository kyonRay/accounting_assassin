# Chapter 07 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

1. **四个 RealStep**，id 必须是这四个字符串：
   - `<RealStep id="claude-md-written" ...>` — 用户创建 CLAUDE.md 后点击
   - `<RealStep id="invoice-ocr-script-written" ...>` — 用户让 Claude 写 scripts/invoice_ocr.py 后点击
   - `<RealStep id="script-ran-successfully" expectsCli="Python3" ...>` — 用户跑通脚本后点击
   - `<RealStep id="continue-flow-tried" ...>` — 用户试了 claude --continue 后点击

   这四个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

2. **`expectsCli="Python3"` 只在 `script-ran-successfully` 步骤上**——其他步骤不需要。

3. **本章没有 QuizRunner**（Ch 07 的 `hasQuiz` 为 false）。不要在末尾加 `<QuizRunner />`。

4. **脚本文件名是 `invoice_ocr.py`**（checker 提示语和 lesson 正文里都引用了这个名字）。如果改名，必须同步改 checker.ts 里的提示文字。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果命令格式有变化）
- Callout 的 title 和 children
- CLAUDE.md 示例内容（只是示例，不是契约）

## 技术约束说明

- **不要在课文里引入非标准库 Python 依赖**（不要 pip install）。`invoice_ocr.py` 只用 `subprocess`、`json`、`sys`——全是标准库。
- **不要在课文里暴露 Rust / Vision Framework / objc2 内容**——`aa-ocr` 的实现细节对学习者是黑盒，故意隐藏。
- **不要在脚本里引入 pandas / openpyxl**——这些在 Ch 14 毕业作品里才出现。

## 无 sandbox-fixture 目录

Ch 07 是纯真实环境章节，学习者使用自己的真实发票。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/07-work-in-your-project/
# 应该 8 个测试全过
```
