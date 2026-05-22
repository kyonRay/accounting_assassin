# Chapter 14 · 内容契约

> 给未来重写本章 lesson.mdx 的任何人 / AI：这些是不能改动的"契约"，改了会让代码失效。其它内容（措辞、举例、结构、章节顺序）随意调整。

## 必须保留的 MDX 元素

### 八个 RealStep（id 不可改）

| id | 含义 | 约束 |
|---|---|---|
| `deps-installed` | 用户安装 pandas + openpyxl | `expectsCli="Python3"` |
| `invoice-ocr-scaffolded` | Claude 搭建 capstone-a/invoice-ocr/ 项目 | — |
| `invoice-ocr-ran` | 用户运行 batch_ocr.py | `expectsCli="Python3"` |
| `bank-classifier-scaffolded` | Claude 搭建 capstone-a/bank-classifier/ 项目 | — |
| `bank-classifier-ran` | 用户运行 bank_classify.py | `expectsCli="Python3"` |
| `report-aggregator-scaffolded` | Claude 搭建 capstone-a/report-aggregator/ 项目 | — |
| `report-aggregator-ran` | 用户运行 aggregate.py | `expectsCli="Python3"` |
| `capstone-a-reviewed` | 用户完成毕业作品 A 回顾 | 无 command= |

这八个 id 在 `checker.ts` 里硬编码，改了 lesson.mdx 但没同步改 checker.ts → 章节永远 checker 不通过。

### 必须出现的元素

- **`expectsCli="Python3"`**：至少 `deps-installed` 步骤上必须有此属性（test.ts 断言）。
- **无 `<QuizRunner />`**：Ch 14 的 `hasQuiz` 为 `false`，lesson.mdx 末尾不得加 QuizRunner（test.ts 断言）。
- **`aa-ocr`**：lesson.mdx 必须出现 aa-ocr 关键词（test.ts 断言）。
- **`pandas`** 和 **`openpyxl`**：lesson.mdx 必须出现这两个词（test.ts 断言）。
- **`降级`**：lesson.mdx 必须出现"降级"关键词（test.ts 断言）。
- **`capstone-a`**：lesson.mdx 必须出现目录名（test.ts 断言）。
- **降级流说明**：必须提及退出码 4、「需手填」或「人工填写」、「失败」sheet（test.ts 断言）。

### 三工具结构必须保留

lesson.mdx 必须提及三个工具路径（test.ts 断言）：
- `invoice-ocr`
- `bank-classifier`
- `report-aggregator`

## 可以自由改动的

- 段落措辞、举例、callout 类型（tip/warn/insight）
- 章节内部结构（标题层级、顺序）
- RealStep 的 children 内容（用户看到的说明文字）
- RealStep 的 command（如果路径或脚本名有变化）
- 三个工具的具体分类规则或提示词（只要核心逻辑不变）
- 添加或调整 Callout

## 降级流教学说明（锁定的教学目标）

invoice-ocr 章节的**降级流**（OCR Fallback Flow）是本章最重要的教学目标：

```
aa-ocr 退出码 0 → 主表 sheet
aa-ocr 退出码 4 → 需手填 sheet（标注缺失字段）
aa-ocr 退出码 3 → 失败 sheet
```

这个三层结构必须出现在 lesson.mdx 里（作为概念说明或作为 Claude 的 scaffold prompt），test.ts 会断言退出码 4、需手填、失败 sheet 的相关词汇出现。

## pip 安装指令约束

安装命令必须包含 `--user` 参数（避免 sudo），并提供 `--break-system-packages` 作为 Homebrew Python 的备用方案。不要在安装指令里涉及 venv——本章故意推迟 venv 的介绍。

## 技术约束说明

- **不要暴露 aa-ocr 的内部实现**（Rust/Vision/objc2）——`aa-ocr` 是黑盒 CLI，这是全课程的约定。
- **不要引入 venv**——第一次提及 venv 只是简单说明「以后再讲」，不展开。
- **三个工具是独立的**——不要在 Ch 14 里让它们互相依赖，那是 Ch 15 的任务。
- **脚本名**：checker.ts 和 test.ts 不依赖脚本具体文件名，但 lesson.mdx 里引用了 `batch_ocr.py`、`bank_classify.py`、`aggregate.py`——如果改名，lesson.mdx 的说明文字需要同步更新。

## 无 sandbox-fixture 目录

Ch 14 是纯真实环境章节（mode: "real"），无沙盒模式。不需要 sandbox-fixture。

## 重写后的最小检查

```bash
pnpm test:chapters content/chapters/14-capstone-a/
# 所有测试应该通过

pnpm typecheck
# 无类型错误

pnpm lint
# 无 lint 警告
```
