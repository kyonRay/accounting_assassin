# Chapter 15 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

### 六个 RealStep（id 不可改）

| id | 含义 | 约束 |
|---|---|---|
| `workspace-prepared` | 用户确认 Ch 14 capstone-a/ 三工具就绪，创建 capstone-b/ 目录 | `expectsCli="Python3"` |
| `voucher-script-scaffolded` | Claude 搭建 capstone-b/voucher-gen/ 凭证生成工具 | — |
| `skill-orchestrator-written` | 用户写出 ~/.claude/skills/month-end-close/SKILL.md | — |
| `hook-capstone-b-installed` | 用户安装 PostToolUse Hook 到 settings.local.json | — |
| `workflow-run` | 用户运行完整月末结账工作流（一句话触发 Skill） | `expectsCli="Python3"` |
| `reflection-completed` | 用户读完课程总结，完成毕业回顾 | 无 command= |

这六个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没同步改 checker.ts → 章节永远 checker 不通过。

### 必须出现的元素

- **`expectsCli="Python3"`**：至少 `workspace-prepared` 步骤上必须有此属性（test.ts 断言）。
- **`<QuizRunner src="./quiz.yaml" />`**：lesson.mdx 末尾必须有此元素（test.ts 断言）。
- **`SKILL.md`**：lesson.mdx 必须出现 SKILL.md 关键词（test.ts 断言）。
- **`month-end-close`**：lesson.mdx 必须出现 Skill 名称（test.ts 断言）。
- **`PostToolUse`**：lesson.mdx 必须出现 Hook 事件名（test.ts 断言）。
- **`凭证` 或 `make_vouchers`**：lesson.mdx 必须提及凭证生成步骤（test.ts 断言）。
- **`capstone-a` 和 `capstone-b`**：lesson.mdx 必须出现这两个目录名（test.ts 断言）。
- **无 `git checkout .`**：本章及全课禁止教学此命令——使用 `git restore .`（test.ts 断言）。

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果路径或脚本名有变化）
- 凭证生成的配对逻辑说明（只要核心概念不变）
- SKILL.md 的具体内容（只要四步结构和名称不变）
- Hook 的具体 shell 命令（只要 PostToolUse 触发模式不变）

## 工作流四步结构（锁定的教学目标）

月末结账工作流的四步顺序是核心教学内容，必须保留：

```
第一步：invoice-ocr (batch_ocr.py)
第二步：bank-classifier (bank_classify.py)
第三步：voucher-gen (make_vouchers.py)  ← 本章新增
第四步：report-aggregator (aggregate.py) → 产出 month_end_YYYY-MM.xlsx
```

步骤可以在 SKILL.md 内容里描述，也可以在 lesson.mdx 正文里以表格或列表呈现，但四步顺序和各步的脚本名不应修改。

## 终章 quiz 规格（锁定）

`quiz.yaml` 必须：
- 8 道题（test.ts 断言）
- 包含 single-choice 和 multiple-choice 两种题型（test.ts 断言）
- 每道题至少一个 `correct: true` 选项（test.ts 断言）
- 每个选项都有 `feedback` 字段（test.ts 断言）
- 覆盖跨章节知识回顾（Ch 5/7/8/9/10/11-12/13/14）
- 包含一道「git checkout . 是错的」陷阱题（推荐用 q3）

## 技术约束说明

- **不要在本章重建 Ch 14 的工具**——capstone-a/ 的三个工具视为已存在。
- **不要引入新的 pip 包**——脚本只用 pandas + openpyxl（Ch 14 已安装）。
- **凭证生成是本章唯一新工具**——其他三步只是「调用 Ch 14 的脚本」。
- **无 sandbox-fixture 目录**——Ch 15 是纯真实环境章节（mode: "real"）。

## 重写后的最小检查

```bash
NODE_OPTIONS=--experimental-require-module pnpm test:chapters content/chapters/15-capstone-b/
# 所有测试应该通过

pnpm typecheck
# 无类型错误

pnpm lint
# 无 lint 警告
```
