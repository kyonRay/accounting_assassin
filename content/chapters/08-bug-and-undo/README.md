# Chapter 08 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

### 六个 RealStep（id 不可改）

| id | 含义 |
|---|---|
| `intro-read` | 用户阅读「Bug 不是失败，是对话」开篇后点击 |
| `template-tried` | 用户尝试了 BugReportCard 一次后点击 |
| `exercise-1-encoding-fixed` | 用户完成练习 1（编码 bug）后点击 |
| `exercise-2-silent-sum-fixed` | 用户完成练习 2（静默 bug/对数验证）后点击 |
| `exercise-3-git-rollback-done` | 用户完成练习 3（git restore 回退）后点击 |
| `forward-ref-noted` | 用户阅读 systematic-debugging 彩蛋后点击 |

这六个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没改 checker.ts → 章节永远 checker 不通过。

### 两个必需的 MDX 组件

1. **`<DebugFlowchart />`** — 渲染 § 5.4.3 调试工作流程图。无 props，自包含。
2. **`<BugReportCard />`** — 渲染四段式 bug 报告模板卡片。可选 props：
   - `defaultExpected?: string` — 预填"期望"
   - `defaultActual?: string` — 预填"实际"
   - `defaultTried?: string` — 预填"我试过的"

### 四个 Section labels（load-bearing，来自 spec § 5.4.2）

BugReportCard 中的标签必须与下方文字**完全一致**（checker 在 lesson.mdx 内容测试里断言这些字符串）：

```
【期望】
【实际】
【报错原文】
【我试过的】
```

## 本章无 QuizRunner

Ch 08 没有随堂测验（quiz 仅在 Ch 01/04/06/10/13/15）。不要在末尾加 `<QuizRunner />`。

## 安全约束（不可违反）

- **禁止在任何正面示例里使用 `git checkout .`**
  唯一的出现场景是警告 Callout（`type="warn"`），明确说明为什么禁用
- **安全的撤销命令是 `git restore .`**（跟踪文件）和 `git clean -i`（未跟踪文件）
- 五种 traceback 类型（SyntaxError / NameError / TypeError / KeyError / FileNotFoundError）必须都提到

## 可以自由改动的

- 段落措辞、举例内容、callout 类型（tip/warn/insight）
- 练习的具体数字、文件名、示例 CSV 内容
- 三个练习的内部步骤顺序（但每个练习的 **Bug 类型分类** 不变）：
  - 练习 1 = 编码 bug（GBK vs UTF-8）
  - 练习 2 = 静默 bug（合并单元格求和漏行）
  - 练习 3 = AI 越改越坏 + git restore 受控回退
- RealStep 的 children 说明文字
- Callout 的 title 和 children

## sandbox-fixture 目录说明

| 文件 | 说明 |
|---|---|
| `bad_encoding.csv` | GBK 编码的发票明细 CSV（Python 用 `content.encode('gbk')` 生成）|
| `merged_cells_demo.md` | 合并单元格 bug 场景的文字说明（无法检入真实 .xlsx）|

**重要：`bad_encoding.csv` 是故意用 GBK 编码写入的。**
请勿用任何文本编辑器重新保存这个文件——保存后会被转成 UTF-8，练习场景就失效了。

生成命令（如需重新生成）：

```python
content = '类目,金额,日期,备注\n办公用品,120.00,2025-01-15,打印纸\n交通费,380.50,2025-01-20,出差火车票\n餐饮招待,256.00,2025-01-22,客户午餐\n办公用品,88.00,2025-02-01,圆珠笔\n差旅费,1250.00,2025-02-05,机票\n'
with open('bad_encoding.csv', 'wb') as f:
    f.write(content.encode('gbk'))
```

## 已知设计偏差

### BugReportCard 不自动填充终端报错

Spec § 5.4.2 说「自动把当前沙箱/真实环境的报错填进去」。这在当前架构里不可行：

- Ch 8 是真实环境章节（`mode: "real"`）
- Tauri IPC 没有暴露捕获终端 stdout 的接口（也不应该暴露——安全边界）
- 沙箱模式下 Ch 8 不适用

当前实现：手动粘贴流程（用户手动把终端输出粘到【报错原文】 textarea）。
这个功能可以在未来加入 Tauri 的诊断收集模块（参见 `collect_diagnostics()` 接口）后实现。

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/08-bug-and-undo/
# 应该 16 个测试全过
```
