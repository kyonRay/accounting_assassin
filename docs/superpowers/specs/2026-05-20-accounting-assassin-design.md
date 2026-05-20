# 记账杀手 · Accounting Assassin — 设计文档

| 项 | 值 |
|---|---|
| 日期 | 2026-05-20 |
| 状态 | Draft — 待用户最终 review |
| 作者 | Kyong + Claude(brainstorming session) |
| 文档类型 | 设计规格(Design Spec) |
| 下一步 | 经 review 后,移交 writing-plans skill 编写实施计划 |

---

## 1. 摘要(Executive Summary)

**记账杀手** 是一个面向**零基础财务会计师**(妻子,10 年会计经验,无编程经验)的 **macOS 原生交互式学习平台**,目的是在 3-6 周内教会她使用 **Claude Code / Codex / Cursor** 三款 AI 编程工具完成真实会计工作,并最终独立产出:① 一组解决日常痛点的小工具脚本;② 一个完整的"月末结账"AI 工作流。

App 本身使用 **Tauri + React + TypeScript** 实现,以 macOS 原生 `.app` 分发。15 章课程分为 5 个阶段,前 4 章在 App 内置沙箱中完成(零环境门槛),从第 5 章开始切换到学习者本机真实环境(由 App 全程引导)。6 个关键章节末配备小测验(Quiz)做形成性评估。

---

## 2. 需求与约束(Requirements & Constraints)

### 2.1 目标用户画像

- **身份**:10 年经验的财务会计师
- **技术背景**:完全零基础。Excel 熟练,用过 ChatGPT 网页版,**没碰过终端、命令行、代码、git**
- **可用时间**:碎片化,每天 1-2 小时,持续 3-6 周
- **设备**:macOS(优先 Apple Silicon)
- **动机**:被 AI 浪潮触动,愿意学习,但对"装环境""命令行"有天然恐惧

### 2.2 产品目标(End-State)

学完 15 章后,她应该能独立产出:

1. **小工具脚本集**:发票批量 OCR、银行流水自动分类、多表报表汇总 等 3 个以上独立可用的 Python 脚本
2. **AI 工作流(毕业项目 B)**:一个端到端"月末结账"工作流(发票收集 → 银行对账 → 凭证生成 → 月报输出),用 Claude Code Skill + Hook 串联

### 2.3 教学场景载体(真实数据题材)

四类全部覆盖,作为不同章节的练习素材:

- 发票 / 票据处理(OCR + 分类 + 报销)
- 银行流水 / 多账户对账
- 凭证录入 + 月末结账
- 税务申报 / 报表准备

### 2.4 教学工具范围

- **主线**:Claude Code(占 4 章主线 + 后续工作流)
- **横向**:Codex(2 章,含"自动批准 / 并发子任务"等差异化能力)
- **横向**:Cursor(1 章,聚焦 Composer / @ 引用 / Background Agent 等"工作流"特性,**弱化 IDE 概念**)

### 2.5 硬约束

- App 必须是 **macOS 原生体验**(双击即开、菜单栏、深色模式适配等)
- 不接真实 LLM API(沙箱阶段使用脚本化"假 AI",见 § 4.2)
- **三层文件系统边界严格分离**(见 § 2.5.1)
- App 进程级隔离崩溃:崩溃时自动保存进度,重启后回到此处(详见 § 8.5)
- App 自己产生的错误一律翻译为中文 + 下一步建议;外部工具(claude / brew / codex 等)的原始英文报错允许保留显示,但必须配中文解读

#### 2.5.1 三层文件系统边界

| 边界 | 范围 | 写入方 | 用户认知 |
|---|---|---|---|
| **用户工作区** | `~/accounting-learner/` | App 通过 Tauri RealEnvBridge 写入(路径白名单)| "我的作业本" |
| **App 私有状态** | `~/Library/Application Support/AccountingAssassin/` | Tauri 默认存储(progress.json / feedback.json / crash 日志等),用户不应手动改 | macOS 标准约定,她不需要看到 |
| **系统级安装** | `/opt/homebrew/`、`~/.claude/`、`~/.cursor/`、`~/.codex/`、PATH 等 | **由用户在自己终端跑命令产生**,App **不主动写** | 装一次后她不需要再碰 |

**关键原则**:App 自己**不去执行** `brew install` —— 而是**展示命令、引导她在自己终端按回车**。这同时实现了三件事:(a) App 永远不需要 sudo;(b) 教学价值(她在学"我装了什么、装到哪了");(c) 如果安装失败,失败现场在她自己终端里,我们的"卡住按钮"诊断能直接拿到原始 brew 日志。

### 2.6 外部依赖与降级策略

课程从 Ch 5 起强依赖外部工具,这些工具有账户、订阅、网络等真实成本。设计上必须显式承认依赖并提供降级路径。

| 工具 | 账户 / 订阅 | 网络要求 | 章节依赖 | 不可用时降级 |
|---|---|---|---|---|
| Claude Code | Anthropic 账户 + 订阅(Claude Pro $20/月 或 Claude Max $100/月)| 持续可达 api.anthropic.com | Ch 5-15 主线 | App 自检后引导"检查订阅 / 重新登录 / 切网络";阻塞时保留沙箱章节复习模式 |
| Codex CLI | OpenAI 账户 + 订阅(ChatGPT Plus / Pro)| 持续可达 openai.com | Ch 11-12 | Codex 不可用时,Ch 11-12 临时用 Claude Code 演示同任务,概念照常讲;她事后再补 Codex 部分 |
| Cursor | Cursor 账户 + 订阅(Pro $20/月)| 持续可达 cursor.com | Ch 13 | Cursor 不可用时,Ch 13 降级为"看预录演示 + 概念讲解"模式 |

**额外原则**:
- 每个工具在第一次出现的章节里,App **自动跑健康检查**(`xxx --version`、登录态自检命令、网络可达)并显示结果
- App **不存储**任何外部工具的 API key / 登录凭证 —— 全部由用户在自己机器上完成认证
- "卡住"按钮诊断报告包含每个外部工具的版本和最近一次健康检查结果(**不含**凭证)
- 课程开始前的 Ch 0(可选导览章)或 Ch 5 开篇会**显式列出所有付费工具的费用**,让用户提前知情

---

## 3. 整体架构(Architecture)

### 3.1 三层结构

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri Shell(Rust)                                          │
│  • 启动窗口 / 菜单栏 / 系统通知                              │
│  • 暴露给 JS 的命令(execute_real_command / check_install)  │
│  • 文件系统访问授权(白名单 ~/accounting-learner/)         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Tauri IPC (invoke)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  React 应用(src/)—— 课程主体                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ LessonViewer │  │   Sandbox    │  │  RealEnvBridge   │  │
│  │  (MDX 渲染) │  │ (xterm + fs)│  │  (Tauri 命令封装) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Progress    │  │   Checker    │  │   AccountingDB   │  │
│  │  (进度持久化)│  │ (练习校验)  │  │  (SQLite 沙箱)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐                                            │
│  │     Quiz     │                                            │
│  │  (章末小测) │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ 文件加载(bundle 内)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  内容资产(content/)                                         │
│  • chapters/NN-slug/lesson.mdx                               │
│  • chapters/NN-slug/sandbox-fixture/                         │
│  • chapters/NN-slug/checker.ts                               │
│  • chapters/NN-slug/quiz.yaml(可选)                        │
│  • chapters/NN-slug/test.ts                                  │
│  • assets/(发票样本、流水样本等)                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 关键边界

- **内容与代码彻底分离**:每章是 `content/chapters/NN-slug/` 一个文件夹,加章节 = 复制文件夹改内容,不动 React 代码
- **沙箱与真实环境硬隔离**:Sandbox 模块永远不接触本机;RealEnvBridge 模块永远走 Tauri IPC;UI 用蓝/橙颜色显式区分模式
- **Tauri Rust 层只做白名单系统调用**,不写业务逻辑

### 3.3 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 外壳 | Tauri 2.x | macOS 原生感 + 体积小(~15 MB)+ Claude Code 协作友好 |
| 前端 | React + TypeScript + Vite | 生态最成熟,AI 工具最熟 |
| 样式 | Tailwind CSS | 课程视觉以排版为主,Tailwind 适配快 |
| 课程内容 | MDX(@mdx-js/react) | 文本+组件混排,Markdown 友好 |
| 沙箱终端 | xterm.js | 视觉与真实终端一致 |
| 沙箱 Python | Pyodide(WASM) | 浏览器内跑真实 Python,无需用户装环境 |
| 沙箱数据库 | sql.js(WASM SQLite) | 模拟真实会计 DB |
| 状态管理 | Zustand | 比 Redux 轻、比 Context 强 |
| 路由 | TanStack Router 或 React Router | 二选一,路由不复杂 |
| 测试 | Vitest + React Testing Library | Vite 同源,ESM 友好 |

---

## 4. 核心模块设计(Module Design)

### 4.1 模块清单

| # | 模块 | 职责 |
|---|---|---|
| ① | LessonViewer | 加载并渲染 MDX 课程内容 |
| ② | Sandbox | App 内沙箱运行时(xterm + Pyodide + 虚拟 fs) |
| ③ | RealEnvBridge | 通过 Tauri IPC 桥接本机真实环境 |
| ④ | Checker | 跑章节 checker.ts,递进式提示 |
| ⑤ | Progress | 进度持久化、模式切换、备份恢复 |
| ⑥ | AccountingDB | SQLite 沙箱数据,预置"假公司"6 个月会计数据 |
| ⑦ | Quiz | 章末小测验加载/答题/反馈 |

### 4.2 沙箱内的"假 Claude Code"(关键决策)

**Sandbox 模块不调用任何真实 LLM API**,而是基于章节 MDX 中 `<SandboxStep>` 声明的"预期输入 / 预期 AI 响应剧本"渲染脚本化对话。视觉上 100% 还原真实 Claude Code 的 tool calls 展示。

理由:
- 不要求用户开 API key(减少劝退)
- 输出稳定可复现,课程文档不会因模型变更失效
- 教学控制力强:每一步都精确,没有"意外"

到 **Ch 5** 起,用户在真实环境与**真正的** Claude Code 对话,完成"沙箱毕业"仪式。

### 4.3 模块详细职责与接口

详见各模块下属规格(实施阶段由 writing-plans 拆解为子规格)。

---

## 5. 课程大纲(Curriculum)

15 章,5 阶段,总学时约 20-25 小时(每章 1-2 小时)。

| # | 章节 | 阶段 | 含 Quiz | 真实场景载体 |
|---|---|---|---|---|
| **Part I · 沙箱里玩 AI**(完全无环境门槛) | | | | |
| 01 | **AI 工具 ≠ ChatGPT 2.0**:原理 + 对比演示 | 沙箱 | 🎯 | 发票算总额(对比演示) |
| 02 | 给 AI 看真实文件 —— 让它读你的银行流水 | 沙箱 | — | 银行流水可疑大额识别 |
| 03 | 让 AI 写代码(不让它代你跑)| 沙箱 | — | 发票按类目汇总 |
| 04 | 把"一次性帮忙"变"重复可用" —— 脚本化思维 | 沙箱 | 🎯 | 12 个月数据批量处理 |
| **Part II · 真实环境的第一步**(关键过渡) | | | | |
| 05 | 你的"工作室":Mac 终端、Homebrew、Python | 真实 | — | 装环境 |
| 06 | 第一次与真实的 Claude Code 对话 | 真实 | 🎯 | 第一次 claude 命令 |
| **Part III · 把 Claude Code 用熟** | | | | |
| 07 | 在自己的项目里工作:CLAUDE.md / --continue / 文件管理 | 真实 | — | 写发票 OCR 脚本 |
| 08 | 不怕弄坏东西:Git 与"撤销" | 真实 | — | 版本管理基础 |
| 09 | Skills:把重复工作变成"一句话搞定" | 真实 | — | 写"整理本月发票"Skill |
| 10 | Hooks 与 MCP:自动化 + 给 AI 长出手脚 | 真实 | 🎯 | SQLite MCP + 自动校验 Hook |
| **Part IV · Codex 与 Cursor** | | | | |
| 11 | Codex 入门 —— 第二个"AI 同事"的性格 | 真实 | — | 流水自动分类(对比) |
| 12 | Codex 深入 —— 自动批准、并发子任务 | 真实 | — | 批量处理任务 |
| 13 | Cursor —— 第三种 vibe-coding 工作流 | 真实 | 🎯 | 同任务对比 |
| **Part V · 毕业项目** | | | | |
| 14 | 毕业作品 A:三个独立小工具 | 真实 | — | OCR + 分类 + 报表汇总 |
| 15 | 毕业作品 B:月末结账 AI 工作流 | 真实 | 🎯 | 端到端工作流 |

### 5.1 Ch 1 详细展开(地基章,P0 投入)

| 段落 | 内容 |
|---|---|
| 开场:你过去用的 AI | 沙箱内嵌仿 ChatGPT 对话框,演示"问 3 次同问题得 3 个不同答案",凸显"没去算、在编" |
| 新的 AI 是怎么工作的 | 沙箱仿真 Claude Code,演示同问题触发 `ls` / `cat` / `python` tool calls,3 次同结果 |
| 原理图解 | "模型 = 会编故事的大脑";"模型+harness = 大脑+眼睛+手+反思"。harness 译为"装备"或"工作框架",避免英文术语 |
| 为什么对会计师重要 | 会计本质是"可追溯、可复算";会瞎编的 AI 不可用,会真去算 + 让你看到怎么算的 AI 才可用 |
| 第一次实操 | 沙箱里让 AI 把 1 张发票文字 → Excel 一行结构化数据,显示工作日志 |
| 章末 Quiz(5 题) | 见 § 7 |

### 5.2 章节解锁规则

- 默认线性解锁:完成 N 章后 N+1 章解锁
- Quiz **不阻断**解锁(答错也能进下一章)
- 开发者菜单(仅 dev build 可见)允许跳转任意章节

### 5.3 毕业项目的关键技术路线

毕业作品 A 的三个小工具(发票 OCR、流水分类、报表汇总)涉及真实底层技术选型。对零基础用户而言,**底层依赖的选择直接决定她能不能跑得起来**,必须在设计阶段就收敛,不留到 Ch 14 现场决策。

#### 5.3.1 发票 OCR(最复杂,必须明确)

**主线方案:macOS 原生 Apple Vision + pdfplumber 双轨,人机协作降级**

| 输入类型 | 处理路径 | 中文识别 | 失败兜底 |
|---|---|---|---|
| 真 PDF(有文字层)| `pdfplumber` 提取文字 | 完美(无 OCR 损失)| 切到下条 |
| 扫描件 PDF / 手机拍照 JPG/PNG | macOS Vision Framework(`VNRecognizeTextRequest`,中文模式)| 印刷体良好,手写较差 | 关键字段(金额 / 日期 / 抬头)失败时,提示她**手填 + AI 复核**,而不是一直转圈 |

**为什么选 Vision + pdfplumber**:
- **零依赖**:Vision 是 macOS 系统内置,不要 `brew install tesseract`、不联网、不要 API Key
- **零成本**:相比腾讯/阿里/百度云 OCR,无费用
- **教学价值**:她会学到一条重要规律 —— "AI 不是万能,该回到人 + 工具协作时就回到"
- **失败优雅**:OCR 失败时不让她不知所措,而是降级为"她填一两个关键字段 + AI 校验"的人机模式

**实现路径**:Tauri Rust 侧通过 `objc2` crate 调用 Apple Vision Framework,或者更轻量地通过 `shortcuts run` 调起一个 macOS Shortcut。Ch 7 引导她**让 Claude Code 写**这段 Rust + Python 胶水代码 —— 完成"用 AI 教会计师用 AI 写 AI 工具"的元教学闭环。

**淘汰方案**(记录以备后查):
- **Tesseract**:中文 traineddata 装起来繁琐,识别率不显著好于 Vision,放弃
- **云 OCR**(腾讯/阿里/百度):引入账号 / 计费 / 网络依赖,对零基础门槛过高,放弃
- **Claude / GPT 视觉 API**:费用高、稳定性差、且属于章节强依赖,放弃

#### 5.3.2 流水分类 & 报表汇总

主线:**Python + Claude Code 写脚本**,数据格式默认 CSV / XLSX(`pandas` + `openpyxl`)。无额外底层依赖。

数据来源:
- 银行流水:她从网银导出的 CSV / XLSX(假设网银能导)
- 报表:她现有 Excel 模板,脚本读 + 改

---

## 6. 数据流(Data Flow)

### 6.1 沙箱模式数据流(Ch 1-4)

```
用户交互 → React → Sandbox(xterm)→ Pyodide / sql.js
                     ↑                ↓
                     └── 虚拟 fs ←────┘

Checker 读虚拟 fs → 报告通过/未通过 → Progress 持久化
```

所有数据流动在 WebView 内部完成,不碰本机文件。

### 6.2 真实模式数据流(Ch 5+)

```
用户交互 → React → RealEnvBridge ──IPC──→ Rust ──→ 本机 shell
                                              ↓
                                       ~/accounting-learner/
                                              ↑
Checker 读本机文件 ←──IPC── Rust ←───────────┘
     ↓
报告通过/未通过 → Progress 持久化
```

### 6.3 关键时刻:Ch 5 模式切换(单向不可逆)

第一次进入 Ch 5 时弹出全屏"过渡仪式"对话框,用户确认后:

1. `invoke('initialize_real_env')` → Rust 创建 `~/accounting-learner/` + 写 README
2. 检查本机 brew / python / git 状态,返回缺失项清单
3. Progress 切换为 `mode: 'real'`
4. 顶部状态条颜色 蓝 → 橙
5. UI 切到"真实模式" —— `<RealStep>` 组件接管渲染

**一旦切换,不可自动回退**(避免她在"沙箱里折腾"和"真实环境工作"间漂移)。如需手动重置,需进设置 + 二次确认。

### 6.4 一节课的完整生命周期(以 Ch 3 为例)

1. 用户点击侧边栏 Ch 3
2. `useChapter("03-...")` 触发加载:lesson.mdx / sandbox-fixture / checker.ts / quiz.yaml(若有)
3. Sandbox.reset() + Sandbox.loadFixture()
4. AccountingDB.reset() + 执行 seed.sql
5. LessonViewer 渲染 MDX,内嵌 `<SandboxStep>` 等待交互
6. 用户与沙箱"假 Claude"对话,根据 lesson.mdx 预定义剧本响应
7. 用户点"试一试" → Checker.check('sandbox')
8. 通过 → Progress.markCompleted() + 解锁下一章
9. 若章末有 Quiz → 渲染 `<QuizRunner>`,答题不影响解锁

---

## 7. Quiz 模块设计

### 7.1 设计原则

1. **答错没有惩罚**:Quiz 不阻断章节解锁
2. **每个答案(对/错都有)都附带"为什么"**:错题反馈是教学黄金时刻
3. **场景化、不死记**:用真实会计场景测概念
4. **3-5 题封顶**:不超过 3 分钟

### 7.2 题型

仅 **单选题** 和 **多选题** 两种(不做配对/拖拽等复杂题型,简化开发)。

### 7.3 触发章节

6 个关键检查点:Ch 1 / 4 / 6 / 10 / 13 / 15。其他章节不强制配 Quiz。

### 7.4 Ch 1 Quiz 完整示例(5 题)

| # | 题型 | 主题 |
|---|---|---|
| Q1 | 单选 | 输出稳定性 —— "ChatGPT 三次给三个不同金额"反映了什么 |
| Q2 | 单选 | 工具调用本质 —— `🔧 Read invoices.csv` 是什么 |
| Q3 | 多选(场景判断)| 给出 4 个场景,各判断该用 ChatGPT 还是 Claude Code |
| Q4 | 单选 | "harness" 大概是什么 |
| Q5 | 单选(反向陷阱题)| Claude Code **不如** ChatGPT 方便的场景 |

详细题干、选项、反馈文案见 `content/chapters/01-ai-tools-vs-chatgpt/quiz.yaml`(开发阶段产出)。

### 7.5 Quiz 数据结构(YAML)

```yaml
# content/chapters/01-.../quiz.yaml
title: "检查你对第 1 章的理解"
description: "5 道题 · 大约 3 分钟 · 答错也没关系"
questions:
  - id: q1
    type: single-choice
    stem: |
      你问 ChatGPT 三次同样的问题:"我有 50 张发票,帮我算总金额"。
      它给了你 ¥12,340、¥10,890、¥13,520 三个答案。这反映了什么?
    options:
      - id: A
        text: "ChatGPT 出 bug 了"
        feedback: "其实不是 bug。真正原因是 ChatGPT 网页版不能读你的文件,它在猜。"
      - id: B
        text: "ChatGPT 没有真的去算,只是在猜"
        feedback: "完全正确!ChatGPT 在生成文本而不是做算术。"
        correct: true
      # ...
```

### 7.6 与 LessonViewer 的集成

每章 lesson.mdx 末尾(若该章配 Quiz):

```mdx
<QuizRunner src="./quiz.yaml" />
```

### 7.7 间隔重复(Spaced Repetition)— 未来扩展,不进 MVP

后期可在 Ch 10 Quiz 中混入 Ch 1 的题,毕业前出综合测验。MVP 阶段不实现。

---

## 8. 错误处理与"卡点"设计

### 8.1 三条贯穿原则

1. **App 自己产生的错误一律翻译为中文 + 下一步建议** —— 外部工具(claude / brew / codex)的原始报错可以保留英文展示,但必须配一段中文解读,让她知道大致发生了什么、该做什么
2. **每个错误附带"接下来你可以做什么"** —— 不让她对错误屏发呆
3. **"我卡住了"按钮全 App 永驻** —— 沙箱模式淡灰色,真实模式醒目橙色

> **说明**:我们不承诺"她**永远**不会看到英文报错"。当她在自己终端跑 `brew install` 失败时,会看到 brew 的原始英文输出 —— 这是教学的一部分,她未来要学会读这些。App 能做的、也必须做的,是在那段英文旁边给她中文解读和下一步建议。

### 8.2 错误分类

#### A. 沙箱内错误

| 触发 | UI 表现 |
|---|---|
| 输入未支持的命令 | "沙箱里能跑的命令有限,试试 `help`" |
| Python 代码报错 | 错误高亮 + "💬 要让 AI 帮你看看吗?"按钮 |
| 文件不存在 | 列出 fixture 文件 + [重置沙箱] |
| Checker 未通过 | 走递进式提示(见 § 8.4) |

#### B. 真实环境错误

| 触发 | UI 表现 |
|---|---|
| 命令不存在(brew/python/claude)| "App 没找到 `xxx`,可能上一步没成功或终端没刷新" + [再检查] [我卡住了] |
| 文件没创建 | "在 `~/accounting-learner/...` 找不到 `xxx.py`,是不是名字写错?"+ 显示该目录文件列表 |
| Claude Code 启动失败 | "常见原因:① 没登录 ② 网络" + [打开终端登录] |
| 命令超时(>60s)| "命令跑了 1 分钟还没结束,你想:[再等等] [取消重试] [我卡住了]" |
| 越界路径访问 | 用户永远看不到(启动时静态校验 + 运行时拦截) |

#### C. App 自身错误

| 触发 | UI 表现 |
|---|---|
| Tauri IPC 失败 | 全屏覆盖"App 内部通信出问题" + [重启 App] |
| MDX 渲染失败 | "这一章暂时加载不出来,跳下一章或反馈给老公?" |
| Progress 文件损坏 | "已从备份恢复"(每次写入顺手写 .bak) |
| `~/accounting-learner/` 被删 | 启动弹窗"重建会清空真实环境产物"+ 二次确认 |

### 8.3 "我卡住了"按钮 —— 宇宙逃生舱

诊断报告采集走 **allowlist**(明确列哪些字段),不是 denylist。报告包含:
- 当前章节、卡在第几步
- 最近一次错误(若有)
- OS / shell / PATH
- Python / Claude Code / Git 版本
- 沙箱目录文件列表

**绝不包含**:发票内容、银行流水、任何用户真实工作数据。

报告格式:**可读 markdown**(让用户对"App 收集了什么"完全透明,信任感更强)。提供 [复制到剪贴板] 和 [保存为文件] 两个动作。

### 8.4 Checker 失败的递进式提示

```
第 1 次失败 → 方向性提示("看看代码有没有漏掉'其他'类目?")
第 2 次失败 → 更具体提示(指出具体行)
第 3 次失败 → 提供 [看参考解答] 按钮(但带反向劝阻文案)
```

"看答案"是温柔可选项,不是强制 —— 给学习者最终的安全感。

### 8.5 崩溃隔离与可恢复性

我们**不承诺"永不崩溃"** —— Tauri WebView、外部 CLI、macOS 系统弹窗都可能引发不可控失败。设计目标是 **崩溃可隔离、状态可恢复、问题可上报**:

- React 顶层 ErrorBoundary 兜住 UI 异常,降级显示"出问题了,要重启吗?"对话框
- Tauri Rust 侧 `panic::set_hook` 把所有 panic 转为 JS 友好错误,不让进程整体退出
- 所有 IPC 调用包 try/catch,失败降级为"该操作暂时不可用,要重试吗?"
- 任何状态变更**先写本地存储再更新 UI**,崩溃后重启能回到此处
- 不可恢复的崩溃自动落 crash 日志到 `~/Library/Application Support/AccountingAssassin/crashes/YYYY-MM-DD-HHmmss.log`;"卡住按钮"诊断报告会自动附上最近一次崩溃日志(脱敏后)

**验收标准**(用来代替原"永不崩溃"的不可验收措辞):
- 在 dev build 里人为触发 IPC 失败 / Rust panic / WebView crash 三种场景,UI 都必须能恢复或重启
- 真实环境 Ch 5-15 手测时,至少一次故意"装错环境"看 App 反应,要求降级到"卡住按钮"流程而非白屏

---

## 9. 测试策略

教学产品的测试重点不在 React 组件,而在**"内容 × 沙箱 × Checker"三元组的一致性**。

### 9.1 五层测试(按 ROI 排序)

| 层 | 名称 | 必做? | 工具 |
|---|---|---|---|
| ① | 章节自检(每章一个 test.ts,跑"完美用户"路径)| ✓ | Vitest |
| ② | 关键模块单测(Sandbox / Checker / Progress / RealEnvBridge)| ✓ | Vitest + RTL |
| ③ | 沙箱 E2E(Playwright 跑 Ch 1-4)| 选做 | Playwright |
| ④ | 真实环境诊断模式(App 内置开发者菜单,人工跑)| ✓ | 手动 |
| ⑤ | 妻子视角手测(独立测试账号,从零过 happy path)| ✓ | 手动 |

### 9.2 章节自检(Level 1)= 测试即规格

```typescript
// content/chapters/03-let-ai-write-code/test.ts
describe('Ch 3 · 让 AI 写代码', () => {
  it('完美用户路径应该跑通', async () => {
    const ctx = await setupChapter('03-let-ai-write-code');
    await runScriptedSession(ctx, [/* 预设输入 */]);
    const result = await ctx.checker.check('sandbox');
    expect(result.passed).toBe(true);
  });

  it('故意写错时,Checker 应报出对应提示', async () => {
    // ...
  });
});
```

**工作流**:你先写 `test.ts`(完美路径断言),让 Claude Code 写 `lesson.mdx + fixture + checker.ts` 让测试通过。这把"AI 写的内容看起来对但跑不通"挡在 CI 外。

### 9.3 真实环境章节不做自动 E2E

`brew install` 这类命令不适合自动化测。改用:
- App 内置"开发者菜单"(仅 dev build):跳章、重置 `~/accounting-learner/`、模拟全新环境、跑当前章 real-env checker
- 你每发版前手动走 Ch 5-15,大约 2 小时

### 9.4 妻子视角手测

每完成一个 milestone(如 Ch 1-4),在独立测试账号上从零过一遍,记录"卡了多久、哪里看不懂、哪里想退出"。这一层会发现 Level 1-4 永远找不到的措辞/UX 问题。

### 9.5 多 AI Review 流水线(用户已规划的工作流)

每章内容除了 Claude Code 起草,还会让 Codex / Gemini 等其他 AI 做交叉 review。内置脚本:

```
scripts/review-chapter.sh NN  # 自动把 lesson.mdx 提交给指定 AI 做 review
                              # 返回结构化反馈写入 lesson.review.md
```

review 记录与课程内容一起进 git,后期可作为"AI 协作要交叉验证"的教学示范。

### 9.6 CI 配置(精简)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    - pnpm install
    - pnpm lint
    - pnpm test:chapters    # Level 1
    - pnpm test:modules     # Level 2
    # 不在 CI 跑 E2E 和真实环境
```

---

## 10. 打包、分发、首次启动

### 10.1 打包

- 输出格式:`.dmg`
- 构建命令:`pnpm tauri build`
- 体积目标:< 30 MB(Tauri 8 MB + Pyodide 12 MB + sql.js + 课程内容)
- 架构:arm64 优先,按需再 build x86_64

### 10.2 macOS 签名 —— "右键打开"方案

**决定**:**不申请 Apple Developer Program**,永远用"右键 → 打开 → 仍要打开"绕过 Gatekeeper。

理由:
- ¥720/年的订阅是家用项目的非必要成本
- "右键打开"只需要做一次,App 之后启动跟签名版本完全一样
- 我们写一份图文教程附在 .dmg 旁边,她按一次后终生免烦扰

**实施要点**:
- 用 `codesign --sign -` 做 ad-hoc 自签名(避免某些 macOS 版本的额外阻拦)
- 在 .dmg 里附带 `首次安装说明.pdf`,图文步骤:① 拖到 Applications ② 在 Applications 里**右键** App 图标 → 点"打开" → 弹窗里点"打开"
- App 内 Settings 页面也保留"如何重新启用未识别 App"的链接(防 macOS 重置安全设置后她不知道怎么办)

**首次启动失败分支**(必须在 .dmg 安装说明 PDF 里写清):

| 场景 | 处理 |
|---|---|
| 右键打开仍被拦截(Apple Silicon + macOS 14+ 偶发)| 图文引导:**系统设置 → 隐私与安全性 → 滑到底部"App 已被阻止" → 点"仍要打开"** |
| `xattr` 隔离属性顽固(从 iCloud 下载常见)| 提供一句话命令(她复制粘贴):`xattr -dr com.apple.quarantine /Applications/AccountingAssassin.app` —— 配套图文截图 |
| 系统更新后再次被拦 | App 内 Settings 页保留"重新启用本 App"的图文链接 |
| 以上全部失败 | 引导她**找老公**(短信发"App 打不开" + 截屏),你远程帮她跑命令 |

**未来如果想分享给同事/朋友**:那时再决定要不要买 ADP,不影响当前 MVP。

### 10.3 分发与更新

- 不上 App Store
- `.dmg` 通过 iCloud Drive / AirDrop 给她
- 自动更新:Tauri Updater plugin + 私有 GitHub Release
- 更新策略:启动时静默检查,有新版本时弹"我升级一下?",绝不强制

**更新与运行时失败分支**:

| 场景 | 处理 |
|---|---|
| 自动更新下载失败(网络/GitHub Release 访问异常)| App 内"设置 → 检查更新"页显示失败原因 + [打开 GitHub Release 页面] 按钮,引导她**手动下载新 .dmg** |
| 自动更新静默失败(更常见,她可能不知道)| "卡住按钮"诊断报告包含最近一次更新尝试的时间、版本、结果,你可远程帮她定位 |
| App 被移走或重命名(她整理 Applications 误操作)| 启动时自检 App bundle 位置;不在 `/Applications/AccountingAssassin.app` 时弹"App 应该在 /Applications/,请把我拖回去"对话框 + 拖动示意图 |
| macOS 大版本升级后启动异常 | App 自检 macOS 主版本号,跨大版本(如 14 → 15)时主动提示"系统刚升级,可能需要再做一次'右键打开'授权"+ 引导链接 |
| Tauri Updater 完全无响应(罕见但严重)| 设置页提供"手动下载最新版本"按钮,跳转 GitHub Release 页面,降级为传统手动升级 |

### 10.4 第一次启动的 60 秒(关键设计)

**渐进披露原则**:第一次启动时**侧边栏不出现**,让她在最低复杂度下完成第一个对比演示,然后再展开完整 UI。

```
[T+0s]   双击 → 启动画面(3s,Logo + "你的 AI 同事正在到岗...")
[T+3s]   全屏欢迎页(不要求登录,不要求填资料,只展示"准备做什么")
[T+5s]   点"开始" → 温暖进度条 + 流动文案("正在创建练习文件夹...")
[T+30s]  直接进入 Ch 1 第一段(无侧边栏,只有正文)
[T+60s]  完成第一个对比演示 → 弹温暖反馈层 → 侧边栏展开
[T+90s]  完整 UI 展开,她已"上钩"
```

### 10.5 反馈收集

- 每章末 1 秒打分:[👍 学到了] [😐 还行] [👎 看不懂] + 选填两句话
- 存本地 `~/Library/Application Support/AccountingAssassin/feedback.json`,**不联网**
- "一键发给老公"按钮:用 mailto: / iMessage 协议发给开发者
- **不包含**任何用户工作数据

---

## 11. 迭代节奏(Roadmap)

**交付策略**:**一次性完整交付**(等 15 章 + 全部基础设施 + 打磨都完成,再给妻子)。中间不向她暴露任何半成品。

| 周 | 里程碑 | 关键产出 |
|---|---|---|
| 1 | App 骨架 | Tauri + React 项目搭起,LessonViewer + Sandbox 雏形可渲染一章 MDX |
| 2 | Part I 沙箱基础设施 | Sandbox 模块完整(虚拟 fs / Pyodide / 仿 Claude)+ Checker + Progress + Ch 1 Quiz 组件 |
| 3 | Part I 内容完整 | Ch 1-4 全部 lesson.mdx + fixture + checker + test 通过 + Ch 1/4 Quiz |
| 4 | Part II(工程最难的部分)| Ch 5-6 真实环境切换 + RealEnvBridge + 诊断模式 + "卡住按钮" + Ch 6 Quiz |
| 5 | Part III Claude Code 主线 | Ch 7-10 内容 + Ch 10 Quiz |
| 6 | Part IV Codex/Cursor | Ch 11-13 内容 + Ch 13 Quiz |
| 7 | Part V 毕业项目 + 全面打磨 | Ch 14-15 + Ch 15 Quiz + 多 AI review 流水线跑过所有章 |
| 8 | 妻子视角手测 + 修表面问题 | 你用独立测试账号从零走一遍,记录卡点,修完后才能交付 |
| 9(交付周)| 一次性完整发布 | 打 .dmg + 写"首次安装说明.pdf" + 一次性给她 |

**为什么选完整交付**:
- 用户决定:**等全部完成再交付**(而非阶段性试用)
- 反馈来源改为"你自己用独立账号手测"(§ 9.4),不依赖她的早期反馈
- 一次性发布的好处:她拿到的是完整故事,首屏体验经过 1 周打磨,wow moment 最强
- 风险代价:中间走错方向的成本变高,所以**每周 milestone 内部必须严格走 testing-as-spec 流程**,把 AI 写的内容用 test.ts 卡住

---

## 12. 开放问题与未来扩展(Open Questions / Future Work)

- **多模型 review 流水线的具体协议**:如何把 Claude Code 起草 → Codex review → Gemini review 的结果合并成单一可读输出?待 § 9.5 的 `scripts/review-chapter.sh` 实施时定。
- **间隔重复(Spaced Repetition)**:MVP 后,根据她到 Ch 10 时对 Ch 1-4 概念的记忆衰退情况决定是否实施。
- **Windows 版本**:Tauri 跨平台,理论可行,但 RealEnvBridge 中所有 shell 命令需重做。当前不在 scope 内。
- **真实 LLM API 接入**:目前沙箱用脚本化"假 Claude"。是否在中后期某些章节(如 Ch 4)接入真实 API 让她体验"完整自由对话",待用户使用反馈决定。
- **App 内的"问老公"功能**:让她在 App 里直接给你发问题(集成 iMessage / 邮件 / 自建 webhook),不需要切到其他 App。MVP 后考虑。

---

## 13. 关键设计决策汇总(Decision Log)

| 决策 | 选择 | 理由 |
|---|---|---|
| App 形态 | macOS 原生(Tauri)| 用户硬约束 + Claude Code 友好度 |
| 教学环境 | 沙箱 → 真实(单向)| 零基础最稳的路径 |
| 沙箱 AI | 脚本化"假 Claude"| 输出稳定、不要 API key、教学控制力强 |
| AI 工具范围 | Claude Code(主)+ Codex(2 章)+ Cursor(1 章,弱化 IDE)| 用户选择 |
| 课程量级 | 15 章 / 3-6 周 | 用户选择 |
| Quiz 阻断解锁 | 否 | 教学心理学(避免焦虑) |
| Quiz 题型 | 仅单选/多选 | 简化实现 |
| Quiz 章节 | Ch 1/4/6/10/13/15 共 6 个 | 平衡覆盖与负担 |
| Apple Developer Program | 永远不买,用"右键打开"绕 Gatekeeper | 节省 ¥720/年,一次性麻烦 |
| 首次启动 UI | 渐进披露(侧边栏后出现)| 降低首屏复杂度 |
| 测试 E2E 自动化 | 仅沙箱章节(选做),真实环境章节人工 | brew install 等命令不适合自动化 |
| 多 AI Review 流水线 | 内置 `scripts/review-chapter.sh` | 用户已规划 + 教学示范价值 |
| 交付策略 | 等 15 章全部完成再一次性交付 | 一次性 wow moment 优于阶段性试用 |
| **文件系统边界** | 三层(用户工作区 / App 私有状态 / 系统级安装)清晰分离 | Codex review 指出原"严格限于 ~/accounting-learner/"自相矛盾(后续 § 2.5.1) |
| **外部工具依赖** | 显式声明账户/订阅/网络要求 + 降级路径 | Codex review 指出隐藏依赖会爆雷(§ 2.6) |
| **发票 OCR 主线** | macOS Apple Vision + pdfplumber + 人机降级 | 零依赖、零费用、教学友好(§ 5.3.1) |
| **错误处理承诺** | 改为可验收措辞("隔离 + 翻译 + 兜底",不承诺"永不崩溃")| Codex review 指出绝对承诺不可验收(§ 8.1 / § 8.5) |
| **安装/更新失败分支** | 在 § 10.2 / 10.3 显式列出兜底路径(右键失败 / xattr / 系统升级 / App 位置异常 / 更新失败)| Codex review 指出原分发链路太脆 |
| commit 规范 | 不带 Co-Authored-By 等 AI trailer | 用户全局偏好 |

---

## 14. 附录:术语表

| 术语 | 解释 |
|---|---|
| harness | "工作框架 / 装备" —— 包裹模型的工具调用、文件读写、自我验证机制 |
| 沙箱(Sandbox)| App 内置的"假"开发环境,用 Pyodide + 虚拟 fs 实现,无环境门槛 |
| 真实环境(Real env)| 用户本机的真实 shell / 文件系统 / Claude Code |
| Checker | 每章一个,判断练习是否完成 |
| Fixture | 章节预置的沙箱数据(CSV、SQL、PDF 等) |
| vibe coding | 通过 AI 自然语言指令完成代码工作的协作模式 |

---

*本设计文档完成于 2026-05-20,在 brainstorming 阶段产出,经用户分节确认。下一步:经最终 review 后,移交 writing-plans skill 编写实施计划。*
