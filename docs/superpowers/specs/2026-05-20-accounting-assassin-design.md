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

> **价格信息时效性**:下表所有价格、档位、官方页面**截至 2026-05-20**。订阅产品定价变动较快,**正式发版前(§ 11 第 9 周交付周)必须重新核对一次**,并把过期信息更新到 .dmg 附带的 PDF 说明里。

| 工具 | 账户 / 订阅(2026-05-20)| 官方链接 | 网络要求 | 章节依赖 | 不可用时降级 |
|---|---|---|---|---|---|
| Claude Code | Anthropic 账户 + 订阅:Claude Pro $20/月,或 Claude Max $100/月 / $200/月 两档 | [anthropic.com/pricing](https://www.anthropic.com/pricing) · [claude-code](https://www.anthropic.com/claude-code) | 持续可达 api.anthropic.com | Ch 5-15 主线 | App 自检后引导"检查订阅 / 重新登录 / 切网络";阻塞时保留沙箱章节复习模式 |
| Codex CLI | OpenAI 账户 + 订阅:ChatGPT Plus / Pro / Business / Enterprise / Edu 任一即可 | [openai.com/codex](https://openai.com/codex) | 持续可达 openai.com | Ch 11-12 | Codex 不可用时,Ch 11-12 临时用 Claude Code 演示同任务,概念照常讲;她事后再补 Codex 部分 |
| Cursor | Cursor 账户 + 订阅:Pro $20/月,Pro+ / Ultra 更高档(按用量需要选档)| [cursor.com/pricing](https://cursor.com/pricing) | 持续可达 cursor.com | Ch 13 | Cursor 不可用时,Ch 13 降级为"看预录演示 + 概念讲解"模式 |

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
│  • 暴露给 JS 的命令:仅固定白名单(check_command_exists /    │
│    read_user_file / run_bundled_checker / open_terminal_at  │
│    等),**不暴露任意 shell 接口**(详见 § 4.3)             │
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

### 4.3 RealEnvBridge 的子进程安全边界(关键)

**问题**:Tauri 的路径白名单只管 **Tauri 自己的文件 API**,**不管子进程**。一旦 App 启动 `python script.py` 或 `claude` 子进程,这些子进程拥有用户级完整文件系统权限,可以读写到 `~/Documents/`、`~/Desktop/` 任何位置。所以"`~/accounting-learner/` 是安全边界"这个声明只有**架构和工作流上一致地维持**,才是真正成立的。

**实现原则**:

| 原则 | 落地 |
|---|---|
| **没有"任意 shell 命令"接口** | RealEnvBridge 只暴露**固定签名的白名单 Tauri 命令**:`check_command_exists(cmd: enum)` / `read_user_file(rel_path: PathBuf)` / `run_bundled_checker(name: enum)` / `open_terminal_at(rel_path: PathBuf)` / `open_in_editor(rel_path: PathBuf)`。没有 `execute_real_command(cmd: String)` 这种通配接口 |
| **App 不执行用户写的代码** | 用户在 Ch 7+ 写的脚本(发票 OCR、流水分类等),由**用户在自己的终端**执行;App 帮她打开终端到正确目录 + 把命令复制到剪贴板,但不替她跑 |
| **Checker 优先文件读取验证,不执行任意代码** | 校验"练习产物"靠**读文件并解析**(如检查 `summary.xlsx` 是否包含 3 个类目),不靠跑她的脚本。极个别必须运行的检查由 App bundle 内的预置脚本完成(由我们维护、参数受限),而不是接受用户路径动态加载 |
| **路径全部规范化 + prefix 校验** | 所有用户传入的相对路径在 Rust 侧 `canonicalize` 后,校验是否仍在 `~/accounting-learner/` 内;符号链接、`../` 越界等攻击向量在静态校验时拒绝 |
| **明确划清"App 边界"vs"她的本机"** | 文档和 UI 都讲清:`~/accounting-learner/` 是 **App 帮她维护**的目录;她在自己终端跑的命令则在**她整个 macOS 的权限范围内**,这件事 App 无法限制,也不应假装能限制 |

**为什么这样取舍**:真正的进程级沙箱(seccomp / macOS Sandbox `.entitlements`)对零基础用户太重(签名复杂、调试困难),且我们不签 ADP 也走不了 App Sandbox。所以我们选择**通过架构约束实现"够用的"边界**,而不是技术沙箱。这要求文档、UI、checker 设计**保持一致的契约**,任何对此契约的破坏都视为高优先级安全 bug。

### 4.4 模块详细职责与接口

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
| 07 | 在自己的项目里工作:CLAUDE.md / --continue / 文件管理 | 真实 | — | 用 Python 调 App 预置的 `aa-ocr` CLI 处理一张发票(详见 § 5.3.1)|
| 08 | **Bug 来了怎么办:Debug + 撤销** | 真实 | — | 读 traceback / 向 AI 提 bug / git reset 作为实验安全网(详见 § 5.4)|
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

#### 5.3.1 发票 OCR(用 App 预置 CLI,把复杂度藏起来)

**主线方案:App 随包分发一个 `aa-ocr` CLI(我们写好的 Rust 二进制),她只学"用 Python 调命令行工具 + 解析 JSON"**

##### 5.3.1.1 `aa-ocr` 工具规格(我们交付的,不是她写的)

| 项 | 设计 |
|---|---|
| **形态** | 单一 Rust 静态链接二进制,随 App 安装到 `/Applications/AccountingAssassin.app/Contents/MacOS/aa-ocr`,首次启动后 App 把它符号链接到 `~/accounting-learner/.bin/aa-ocr`,加入 PATH |
| **接口** | `aa-ocr <file.pdf\|jpg\|png>` → 输出统一 JSON 到 stdout(见下面 schema)|
| **内部实现** | (a) 真 PDF 有文字层:Rust 内嵌 `pdf-extract` 提取;(b) 扫描件/图片:Rust 通过 `objc2` 调 macOS `Vision Framework` 做 OCR;(c) 统一把"字段(date/amount/vendor/tax_id)"做基本正则抽取 |
| **退出码** | 0 = 成功;2 = 文件不存在;3 = 无法识别;4 = 部分字段缺失(JSON 里标注哪几个字段 confidence 低)|

**统一 JSON schema**:

```json
{
  "source_file": "invoices/2026-04-001.pdf",
  "fields": {
    "date":     {"value": "2026-04-15", "confidence": 0.92},
    "amount":   {"value": 1234.50,      "confidence": 0.88, "currency": "CNY"},
    "vendor":   {"value": "上海某某商贸", "confidence": 0.81},
    "tax_id":   {"value": null,         "confidence": 0.0,  "reason": "未识别"}
  },
  "raw_text": "完整识别出的全文..."
}
```

##### 5.3.1.2 课程交付什么

| 章节 | 她要做的(可达成范围)| 她**不**要做的 |
|---|---|---|
| Ch 7 | 写一段 Python 用 `subprocess.run(["aa-ocr", file], ...)`,解析返回的 JSON,处理失败字段 | 写 Rust、调 Vision Framework、写 OCR 算法 |
| Ch 14 毕业项目 A | 把 Ch 7 学的扩展为"批量处理一个文件夹的发票 + 输出 Excel 汇总" | 同上 |

**为什么这样划分**:
- 零基础用户的可达成范围是 **"会调命令行工具 + 处理结构化数据"**,这是通用、可迁移、可教的能力
- "写 OCR 引擎"是工业级工程师的工作,不属于本课程目标
- 把 OCR 复杂度封装在 CLI 里,**毕业项目失败的概率降低 10 倍**:她写 Python 调一个稳定工具,远比她调 Vision API 容易

##### 5.3.1.3 失败降级:人机协作

`aa-ocr` 退出码 4(部分字段低 confidence)时,Python 脚本应做:
- 把低 confidence 字段单独列出
- 显示原始发票图片让她肉眼读
- 让她**手填**这几个字段
- 然后 AI(用她在 Ch 9 学的 Skill)对这条记录做最后一次合理性校验(金额 + 日期 + 抬头是否一致)

这一条"OCR 失败 → 人填关键字段 → AI 校验"的降级流是 Ch 14 的核心教学内容 —— **她会理解"AI 工具不是万能,设计降级流是工程师的本职"**。

##### 5.3.1.4 淘汰方案(记录以备后查)

- **让她写 Rust + Vision 胶水**:零基础用户范围外,Codex review 指出过度设计,放弃
- **Tesseract**:中文 traineddata 装起来繁琐,且需 `brew install`,放弃
- **pdfplumber 直接给她用**:需要 `pip install`、虚拟环境,门槛比"调 CLI"高,放弃(其能力并入 `aa-ocr` 内部)
- **云 OCR**(腾讯/阿里/百度):引入账号 / 计费 / 网络依赖,对零基础门槛过高,放弃
- **Claude / GPT 视觉 API**:费用高、稳定性差、属于章节强依赖,放弃

#### 5.3.2 流水分类 & 报表汇总

主线:**Python + Claude Code 写脚本**,数据格式默认 CSV / XLSX(`pandas` + `openpyxl`)。无额外底层依赖。

数据来源:
- 银行流水:她从网银导出的 CSV / XLSX(假设网银能导)
- 报表:她现有 Excel 模板,脚本读 + 改

### 5.4 调试教学策略(Ch 8 详细展开)

**Ch 8 标题**:**"Bug 来了怎么办:Debug + 撤销"**(原"Git 与撤销"的整合升级)

零基础用户在 Ch 7 开始让 Claude Code 写真实脚本后,**必然**会遇到 bug。如果没有系统教 debug,她遇到第一个看不懂的英文 traceback 就会放弃。Ch 8 是整门课的"心理安全网"章节,**比 Skills / Hooks / MCP 都更关键**。

#### 5.4.1 Ch 8 七大教学要点

| # | 要点 | 教学方式 |
|---|---|---|
| 1 | **Bug 不是失败,是对话** | 重塑心理预期:写代码 90% 时间在修 bug,不是写代码本身有问题 |
| 2 | **traceback 倒着读** | 教她最后一行 + 行号定位 80% 的 bug,演示读 5 种常见报错:`SyntaxError` / `NameError` / `TypeError` / `KeyError` / `FileNotFoundError` |
| 3 | **给 AI 提 bug 的"四段式"标准模板** | 一个标准沟通模板,见 § 5.4.2 |
| 4 | **"再跑一遍"验证原则** | 永远不要相信"我已经修好了" —— AI 改完代码,她必须自己跑一遍才能说修好 |
| 5 | **git 作为实验安全网(事前快照 + 事后受控回退)** | **事前**:让 AI 试改之前先 `git commit -am 'before retry'` 留快照,事后回退无压力。**事后**:不要"改坏了就 reset"—— 先 `git status` 看哪些文件变了、再 `git diff` 看具体改了什么、确认要丢之后才用 `git restore .` 恢复已跟踪文件;新文件单独用 `git clean -i` 交互式选(避免误删)。**禁用** `git checkout .`(命令语义重载、丢未提交修改无警告)|
| 6 | **何时停下来找老公** | 试 3 次 AI 还修不好 / 报错完全看不懂 / AI 开始绕圈,就该停。**这是个能力**,不是失败 |
| 7 | **会计数据脏的特殊性** | 空行 / 合并单元格 / 日期格式不一致 / 币种 / 负数表示法 / 编码问题。教她"假设数据是脏的"作为默认心智 |

#### 5.4.2 给 AI 提 bug 的"四段式"模板

```
【期望】
我让脚本把 invoices.csv 里的发票按类目汇总到 summary.xlsx

【实际】
脚本跑出来 summary.xlsx 是空的,什么都没有

【报错原文】(整段复制,不要删英文)
Traceback (most recent call last):
  File "summarize.py", line 12, in <module>
    df = pd.read_csv("invoices.csv")
  ...
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb7

【我试过的】
- 我又跑了一次,还是一样
- 我打开了 invoices.csv,看着挺正常
```

**为什么这个模板有效**:
- "期望 vs 实际" 让 AI 知道你想要什么,不是空泛地说"不对"
- "报错原文整段复制"让 AI 直接拿到诊断信息(而不是她描述报错)
- "我试过的"防止 AI 重复建议她已试过的方案

模板会做成 App 内一个**可一键复制的卡片组件**,她按那个按钮自动把当前沙箱/真实环境的报错填进去,只需要补充"期望"和"试过的"。

#### 5.4.3 "出 bug 时的标准工作流"流程图(Ch 8 核心交付)

```
出 bug 了
   │
   ▼
深呼吸 → 不慌,bug 是对话不是失败
   │
   ▼
【事前快照】 让 AI 改之前先:
       git commit -am "before retry"
   (这样无论 AI 怎么改,你都能干净回到这里)
   │
   ▼
看 traceback 最后一行(行号 + 报错类型)
   │
   ▼
按"四段式"模板把信息整理好(App 一键复制)
   │
   ▼
粘给 Claude Code,让它解释 + 修复
   │
   ▼
AI 改完代码 → 你自己跑一遍验证(不要相信"我已修复")
   │
   ├─ 修好了 → git status 看变化 → git commit 一份快照,继续
   │
   └─ 没修好 / 改坏了
        │
        ▼
   git status      ← 先看 AI 改了哪些文件
   git diff        ← 再看具体改了什么
        │
        ▼
   决定:要 / 不要 / 部分要?
        │
        ├─ 全部不要 → git restore .          (恢复已跟踪文件)
        │              git clean -i          (新文件交互式选,可选)
        │
        ├─ 部分要 → 跟 AI 进一步细化要求,重试 ≤ 3 次
        │
        └─ 完全卡 → "我卡住了"按钮 + 通知老公
```

这张图会做成 Ch 8 一开始就给出的 "海报",她以后随时翻回来看。

#### 5.4.4 真实场景实操(Ch 8 练习设计)

Ch 8 用 **3 个真实 bug 场景** 让她亲手走完整工作流:

| 练习 | Bug 类型 | 她需要做的 |
|---|---|---|
| 练习 1 | 编码 bug:发票 CSV 是 GBK,代码假设 UTF-8 | 读 traceback → 套模板 → 让 AI 修 → 验证 |
| 练习 2 | 静默 bug:求和漏一行(因为有合并单元格)| 学会"对数"验证,而不是相信脚本输出 |
| 练习 3 | AI 越改越坏:多轮对话让 Claude 把简单代码改复杂、跑不通 | 学会 `git status` → `git diff` 看清现状 → `git restore .` 受控回退 + 重新提问 |

#### 5.4.5 进阶引用:Claude Code 自带的 systematic-debugging 工作流

到 Ch 9-10 (Skills / Hooks) 时,可以告诉她**Claude Code 本身有一个内置的"systematic-debugging" 工作流**(superpowers 插件的一部分)。她未来遇到复杂 bug 可以直接说"用 systematic-debugging 帮我",让 AI 走一套既定的诊断流程。这是 Ch 8 教的"基本工作流"的**专业版**。

不在 Ch 8 主线讲,作为彩蛋 / 进阶引用,让她知道"这件事是有标准做法的,我现在学的是入门版"。

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
[T+5s]   点"开始" → 温暖进度条 + 流动文案
         ("正在准备沙箱练习区..." / "正在加载示例发票数据...")
[T+30s]  直接进入 Ch 1 第一段(无侧边栏,只有正文)
[T+60s]  完成第一个对比演示 → 弹温暖反馈层 → 侧边栏展开
[T+90s]  完整 UI 展开,她已"上钩"
```

**首启文案的边界纪律**:T+5s 准备阶段**只准备沙箱(App 内存 + IndexedDB)**,**不**写本机文件系统。本机的 `~/accounting-learner/` 目录直到 Ch 5 过渡仪式才会通过 `initialize_real_env` 创建(见 § 6.3)。所有首启文案都必须配得上"沙箱"语义,不能让她误以为 App 已经在改她的电脑。

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
| **Debug 教学整合** | 把 Ch 8 从"Git 与撤销"升级为"Bug 来了怎么办:Debug + 撤销",新增 § 5.4 调试教学策略 | 用户指出原文档无系统 debug 教学,vibe coding 必然遇 bug,零基础用户的 debug 元能力是关键短板 |
| **子进程安全边界** | RealEnvBridge 只暴露固定签名白名单命令,无 `execute_real_command` 通配口;用户脚本由用户自己终端跑,App 不替她执行;Checker 优先文件读取验证 | Codex review v2 指出 Tauri 路径白名单不约束子进程,需通过架构约束维持边界(§ 4.3)|
| **OCR 实现路径收窄** | App 预置 `aa-ocr` Rust CLI(我们写),Ch 7 只教她"Python 调 CLI + 处理 JSON";不让零基础用户碰 Rust / Vision Framework / pip install | Codex review v2 指出原"让她写 Rust + objc2 胶水"过度设计,且 pdfplumber 非零依赖(§ 5.3.1)|
| **git 回退命令规范** | 禁用 `git checkout .`(语义重载、丢未提交修改无警告);改用事前 `git commit` 快照 + 事后 `git status` / `git diff` 二次确认 + `git restore .` 受控回退,新文件用 `git clean -i` 交互式选 | Codex review v2 指出原命令对新手太危险(§ 5.4.1 / § 5.4.3)|
| **订阅价格标注时效** | § 2.6 表头加"截至 2026-05-20,发布前复核",每行加官方链接列;补全 Claude Max $200 档、Cursor Pro+/Ultra、ChatGPT 五档 | Codex review v2 指出硬编码价格易过期 |
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
