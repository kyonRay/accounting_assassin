# 多 AI Review 分诊 (2026-05-22)

15 章 × 2 AI(codex + claude)= 30 份 review。Gemini 因 auth 缺失返回错误,已跳过。
Codex review Ch 1 / Ch 9 / Ch 12 触发了模型 capacity 错误,这三章实际只有 claude 一份有效评估(标注 `claude-only`)。

## 全局观察(跨章节模式)

- **真实环境章节(Ch 5-15)缺一致的 PATH / 新终端 rehash 兜底**。Ch 5、Ch 6、Ch 7、Ch 14 都被指出装完命令后 `command not found` 没有给出可执行的诊断顺序(`source ~/.zshrc`、`which <cmd>`、新开终端、`claude doctor` 等),用户在"装好了但按钮还灰"和"装好了但子进程找不到 binary"两个状态里反复挣扎(codex+claude on 5/6/7,codex on 14)。
- **会计场景虚化**。Ch 2、3、4、10、11、13 都被指出演示数据(发票/银行流水/类目)更像个人记账或玩具文件,完全不接增值税发票号/税率、凭证号、科目代码、退款/工资/转账等真实场景。对 10 年财务用户会立刻"出戏"。这是跨章节最一致的批评。
- **Skill / Hook / MCP 配置中"已存在文件如何合并"零示例**。Ch 9(`~/.claude/skills/...` 内容粘贴)、Ch 10(`settings.local.json` 合并)、Ch 15(同上)都假定用户能正确手工合并 JSON 而不破坏 trailing comma / 覆盖旧块,但全程没给"合并前 / 合并后"对照。
- **真实数据隐私 / 数据出境提示缺失**。Ch 6(第一次真对话)、Ch 7(发票数据进入 Claude 上下文)、Ch 11(银行流水脱敏)、Ch 13(Cursor Privacy Mode 默认关闭 + Background Agent 推到云端 fork)都被点出对会计师身份的合规风险只字未提或只在 callout 角落带过。Ch 13 / Ch 11 / Ch 7 三处尤其严重。
- **Hook `matcher: "Edit"` 漏 Write / MultiEdit** 在 Ch 10 和 Ch 15 都被独立指出(codex on 10,claude on 15)。Claude 写新文件走 Write,日志静默丢失,而本章用"日志出现就算通过"做验证,用户根本不会发现 hook 已坏。

---

## Ch 01 · AI 工具 ≠ ChatGPT 2.0

`claude-only` — codex 触发了模型 capacity 错误。已在提交 `55c3776` 修复 ChatGPT 2026 能力框架 + vendor/客户 fixture。

### Critical (必修)

(无新增 — 已修)

### Important (应修)

- [ ] L92 把 "harness" 译成"装备"作为唯一英文术语,中文 AI 圈对应不上,搜不到原始概念。改为"外壳 / 套件 / 支架"或保留 harness 不译。(claude)
- [ ] L82 "答案每次都一样"过度承诺。同 prompt 两次 Python 微差但聚合一致,应措辞为"数字稳定可复算"。(claude)
- [ ] L128 SandboxStep hint "不会输入也没关系——直接点「我做完了」"让"第一次实操"退化成读完按按钮。要么把 expectedInput 改成可点击的预填模板按钮,要么诚实表述"你看完了 AI 的一次工具调用演示"。(claude)
- [ ] 章末缺一句"本章演示在沙箱里,后续章节会换成真的 Claude Code",学员后续装真 Claude 时体验差异会怀疑装错。(claude)

### Minor (可改 / 跳过)

- Quiz q3 选项 A 用了"权益法 / 成本法"长期股权投资术语 — 跳过(单选题难度合理,会计十年用户应能识别;改文案收益小)。
- 课文 "包含 6 条发票记录"与 fixture 行数耦合 — 跳过(将来 fixture 修改时同步修订即可,目前没有冲突)。
- Quiz q2 / 🔧 emoji 首次出现没解释 — 跳过("🔧"是工具调用图标,在 Ch2 仍延续,理解成本足够低)。

---

## Ch 02 · 给 AI 看真实文件

### Critical (必修)

- [ ] L10 / L40 / L52 ComparisonDemo 把 `Python` 与 `Read` 并列写成"Claude Code 工具"。Claude Code 实际工具是 `Bash`/`Read`/`Edit`/`Write`/`Grep`/`Glob`,Python 是 Bash 调用的解释器。Ch 5+ 真实环境里没有 `🔧 Python` 标签,直接破坏 Ch 1-4 建立的工具心智。改为"用 Bash 跑 Python"或删除 🔧 Python 标签。(claude)
- [ ] L12 / L19 写 "200 笔"、L26 / L39 写 "202 笔",同一份 fixture 两套口径 — Ch 1 的核心承诺是"数据稳定可复算",自己课文先违反。统一到 fixture 的真实行数。(claude+codex)

### Important (应修)

- [ ] L26 / L62 hint 暗示银行 CSV 有"类别"列。真实银行流水导出几乎从不带类别字段,只有日期/金额/对方户名/摘要/交易类型。改 hint 为"对方户名/摘要里有没有奇怪的字眼"。如果 fixture 真造了"类别"列也应去掉。(claude)
- [ ] L31 / L74 expectedInput 与 hint 自相矛盾(精确字符串 vs "不会输入也没关系")。L71 expectedInput 写了"(看明白...不需要再输入)"这种提示文案当占位字符串。fake-claude 匹配行为没说清,用户输入变体或点按钮后看不到工具日志时会卡住。建议放宽匹配或显式说明"无论输入什么、点了按钮就回放日志"。(claude)
- [ ] L37 / L40 直接引入"均值/中位数/标准差/outliers",前一章只讲过"读文件",无任何统计概念铺垫。补一句"AI 会用统计方法找出明显偏高的几笔",或改 hint 不暴露专业词。(codex+claude)
- [ ] 没有"让 AI 报告总行数 + 字段名 + 总和"作为交叉验证步骤的演示。Ch 1 已经埋下"ChatGPT 假装算"的对偶,Ch 2 教"信任 🔧 标记"但真实环境里 🔧 标记可被 AI 编造,反向教学债。建议第二个 SandboxStep 之前插一个"让 AI 报告 bank-statement.csv 的总行数和字段名"步骤。(claude)

### Minor (可改 / 跳过)

- L19 "6 个月 × 200 笔" 不像真实小微企业规模 — 跳过(教学 fixture 的取舍,扩到 2000 笔会让沙箱卡顿,且不影响概念学习)。
- 没有"如何把 Excel 转 CSV"前置教学 — 跳过(Ch 5+ 切到 real-env 时再补更顺,目前沙箱不需要)。
- "找可疑大额支出"任务被吐槽更像内审而非日常会计 — 跳过(分类思路虽窄,但作为 Ch 2 入门任务有戏剧张力)。

---

## Ch 03 · 让 AI 写代码

### Critical (必修)

- [ ] L60 `for cat in sorted(totals)` 按 Unicode 排序,真实输出顺序应是 `云服务 / 办公 / 工资 / 差旅 / 餐饮`,但 L107-113 展示的是 `云服务 / 办公 / 差旅 / 工资 / 餐饮` — 沙箱真跑结果与讲义不一致,违背本章"数字不是 AI 编的"承诺。改 sample 输出顺序或代码加 `key=` 排序。(claude+codex)
- [ ] L17 / L28 把"工资"作为发票类目。工资走工资单/银行代发,**不开发票** — 10 年财务用户一眼出戏。替换为"通讯/快递/物业/水电"之一。(claude+codex on Ch4 同样问题)

### Important (应修)

- [ ] L55 `defaultdict(float)` 累加金额。会计场景应用 `Decimal`,IEEE 754 浮点在多行累加后会漂移。课文应额外点一句"为什么财务要用 Decimal"。(claude)
- [ ] L56 `open("invoices.csv")` 没有 `encoding="utf-8"`。沙箱 Pyodide UTF-8 能跑但讲义号称"AI 写的地道代码";真实用户拷到 Windows / 中文 locale 会 `UnicodeDecodeError`。(claude)
- [ ] L36 expectedInput 与 hint 互相打架(占位提示像必输 vs "直接点我做完了")。零基础用户 100% 会卡。改成 explanatory-only 步骤或删 expectedInput。(claude)
- [ ] checker.ts 只校验 `.progress/script-written` 和 `.progress/output-verified` 两个标志位,沙箱实际没跑代码、输出也不校验也能通关 — 违背"数字可追溯"承诺。补一个最低限度的输出校验(至少校验输出包含 5 个类目)。(claude)
- [ ] L17-25 / L51-68 任务"干净 CSV 按类目求和"完全没有发票号、税额、退款、重复行、缺失值这些真实噪声,还是课堂练习。(codex)
- [ ] L36-42 / L105-119 没告诉零基础用户脚本报错、找不到文件、列名不对时该怎么处理。(codex)

### Minor (可改 / 跳过)

- L92 ComparisonDemo 引入 "harness 的 reflect" 一词无前置定义 — 跳过(改成大白话 "工具自动闭环",但与 Ch1 用语统一即可,Ch1 已用 harness)。
- "复制到我自己电脑试试"的预告 — 跳过(Ch5 自然过渡,不需要此处预告)。

---

## Ch 04 · 从一次性帮忙到重复可用

### Critical (必修)

- [ ] L86 / L138-141 脚本硬编码 `glob.glob("invoices-2026-*.csv")`,然后教"明年只需改一个字"。章节标题是"从一次性到重复可用"但代码本身就是"硬编码年份的临时脚本"。改成 `from datetime import datetime; year = datetime.now().year` 或 CLI 参数,化解标题/代码冲突。(claude)
- [ ] L78-93 `float` 累加金额。同 Ch3,会计硬伤 — Ch 4 是最后一个沙箱章,纠正货币精度的最后机会。(codex)
- [ ] L17 / L22 / L117 "工资"又出现在发票类目里,业务口径混了。(codex+claude on Ch3 同样问题)
- [ ] L86-89 `glob` 静默给出 11 个月汇总,缺月不报警 — 这是会计场景**最危险的 silent failure**,而本章是"重复可用"的最后练习。补一个"count 检查 / 缺月警告"教学。(claude+codex)

### Important (应修)

- [ ] quiz q2-B 把"翻 Claude Code 的工作日志找到 1 月的脚本"标为正确,但 Claude Code 要 Part II(Ch 5+)才装,沙箱学员没有"工作日志"概念。修改答案选项。(claude)
- [ ] quiz q3-A "把代码存到 `~/scripts/` 下"是 Part II 才教的真实文件系统概念。沙箱学员还在虚拟 FS 里。(claude)
- [ ] quiz q3-D "设定时任务每月自动跑"被标为正确,但脚本硬编码 2026,2027/1/1 起会输出空 — 给出会爆雷的"正确答案"。(claude)
- [ ] L128-157 直接说"这段代码现在是你的工具",但没先教零基础用户怎么保存、命名、再次打开这段脚本。(codex)
- [ ] L57-70 / L107-124 / L147-161 只有正常路径,没有文件缺失、列名不对、输出空白时的兜底排查。(codex)

### Minor (可改 / 跳过)

- "AI 帮你写一次,你跑 N 次"叙事和"改一行字"操作脆弱性 — 跳过(已经在 critical 里通过改 `datetime.now().year` 修)。
- README 写 6 行示例数据被锁死 — 跳过(同 Ch1,无需调整)。

---

## Ch 05 · 你的工作台

### Critical (必修)

- [ ] L121 callout "如果 claude 命令找不到 → `source ~/.zprofile`" — `claude.ai/install.sh` 实际把 PATH 写入 `~/.zshrc`(以及 `~/.local/bin`),不是 `.zprofile`。Brew 的 PATH 写到 `.zprofile` 是对的,但 claude 沿用同一招对绝大多数用户失效。把 claude 的 `source` 改为 `~/.zshrc`,或同时 source 两个。(claude+codex)
- [ ] L113 `claude --version` 示例输出 `claude/2.x.x darwin-arm64` 不准。实际形如 `2.0.x (Claude Code)` 单行字符串,按字面对照会让零基础用户怀疑装错。(claude+codex on Ch6 同样)
- [ ] **L22(Homebrew curl)+ L82(`claude.ai/install.sh` curl)+ `brew install` 走 GitHub bottles** — 对国内财务用户无 VPN 时**几乎必败或极慢**。整章零字提及网络判定、清华/中科大 brew 镜像、`HOMEBREW_BOTTLE_DOMAIN`。本章结构性失败,不修这一条章节通过率会非常低。(claude)

### Important (应修)

- [ ] 整章没有一句话把这四个工具落到具体的会计任务(例如"下章我们要用 claude 读你的发票 PDF,所以现在先把 Python 装好")。十年财务的人最在意"装这堆我图啥"。(claude)
- [ ] L96 `brew install --cask claude-code` 作为 curl 之后的"备选",但 curl 装出来的 `~/.local/bin/claude` 和 brew cask 装出来的 `/opt/homebrew/bin/claude` 路径不同。两个都试会装出两份,`claude --version` 拿到的可能不是预期那个。补一句"已经成功装上后就别再试另一种"。(claude)
- [ ] L29-35 / L61-68 / L85-92 / L109-118 RealStep 装完按钮可能继续灰着(健康检查需新终端 rehash PATH)。补一句"如果『我跑完了』点不下去,新开一个终端窗口或运行 `source ~/.zshrc` 再回来"。这是非技术用户最容易抓狂的点。(codex+claude)
- [ ] L70-71 "macOS 上 `python` 可能指向系统自带 Python 2" 已过时(现代 macOS 上 `python` 通常不存在或指向用户装的版本)。改为"`python` 在新版 macOS 上通常不存在或不可预测,本课统一用 `python3`"。(codex)
- [ ] L24-35 brew 安装段只说"等它跑完",没覆盖最常见卡点:要求按 Return、Xcode CLT 弹窗、密码错、网络/证书失败。(codex)
- [ ] L37-43 直接让用户改 `~/.zprofile`,前文没铺垫 PATH / Shell 配置文件 / `>>` 追加。(codex)

### Minor (可改 / 跳过)

- 整章未提"模式切换"(蓝→琥珀 chip)的承诺 — 跳过("信任传递时刻"概念是设计层面,通过 UI 自然呈现,正文不必反复强调)。
- 公司管控 / IT 介入分流 — 跳过(违反课程定位的"个人练习机为主";Ch1 顶部 onboarding 已覆盖隐含)。
- "首次粘贴是 ⌘V 不是右键"的提醒 — 跳过(可以加,但十年财务用户基本熟悉 macOS 键盘操作)。

---

## Ch 06 · 第一次与真实 Claude Code 对话

### Critical (必修)

- [ ] L42 / L50 "Anthropic 账号是免费的就能用"是误导。**Claude Code 实际使用需要 Claude Pro/Max/Team/Enterprise 订阅或 Console API 余额**。会计用户认认真真按教材登录完,第一次 `claude` 调用就报余额/订阅错误,这是教材级别的信任崩塌。L42 必须明写订阅要求和"我应该选哪个"的指引。(claude+codex)
- [ ] L14-16 `claude/1.0.42 darwin-arm64 node-v22.14.0` 和 Quiz q1 选项 B 的版本输出格式是编的。实际 `claude --version` 输出形如 `2.0.x (Claude Code)` 单行字符串。修正样例输出,Quiz 选项同步。(claude+codex)
- [ ] L48-55 欢迎界面 UI 是编的(`Human:` prompt + 方框 ASCII art)。这是非技术用户最依赖的"视觉锚点",对不上立刻慌。要么用真实 TUI 截图,要么把伪装的 ASCII 改成抽象描述。(claude)
- [ ] L62 / L67 "输入 `/exit` 退出"在当前 Claude Code 中不一定生效。官方退出是 `Ctrl+D` / `Ctrl+C` 两次 或 `/quit`。改成"按 `Ctrl+C` 两次退出"或先实测当前版本。(claude+codex)

### Important (应修)

- [ ] L42 之后认证失败完全没兜底:浏览器没自动打开、OAuth 回调失败、SSO 用户、网络代理(国内最常见)、WSL/SSH/容器环境下需要复制登录码贴回终端。第 6 章是"第一次真实",兜底密度反而该比之前更高。(claude+codex)
- [ ] L93 "Claude 只操作你允许它访问的目录,不会碰其他地方"措辞过强。Claude Code 实际按 permission prompt 询问后访问任何路径,不是硬沙箱。会让用户日后看权限弹窗无脑 Allow。改为"Claude 每次想读/写文件都会弹窗问你,看清路径再批准"。(claude)
- [ ] 数据隐私零提示。Quiz q2 让用户承认"每句话都发到 Anthropic 服务器",但正文从未告诉财务用户"别把客户姓名、税号、银行账号直接贴进对话"。L77 旁加 `type="warn"` 的"什么不能让 Claude 看"。(claude)
- [ ] L23-29 兜底只给重开终端 + `source`,没给 PATH 诊断或 `claude doctor`;装了但仍 `command not found` 是最常见故障。(codex)
- [ ] 整章 0 个真实会计场景 — 第一句教用户问"我在哪个目录"对 10 年财务无代入感。换成"读一下 invoice.csv 告诉我有几行"。(claude)

### Minor (可改 / 跳过)

- L77 "工具调用" / 🔧 概念零铺垫 — 跳过(Ch 1-2 已建立 🔧 标记心智,Ch 6 复用合理)。
- L36 `&&` 链式语法 / `~` 展开未铺垫 — 跳过(Ch 5 已经反复使用 `&&` 和 `~`)。
- 已存在 `~/.claude/` 目录的判定 — 跳过(教学层面用 `ls` 显示有东西已足够,深究 `.credentials.json` 反而过细)。

---

## Ch 07 · 在自己的项目里工作

### Critical (必修)

- [ ] L83 `aa-ocr --version` 作为安装自检不可用 — `aa-ocr` 实际接口只定义了 `aa-ocr <path>`,没有 `--version` 子命令。零基础用户跑这一行会拿到一个非 "command not found" 的另一种错误,误判为装好了。改成 `which aa-ocr` 或 `aa-ocr --help`,且与 `aa-ocr/src/main.rs` 实际实现对齐。(codex+claude)
- [ ] L94-100 / L88 示例 JSON 字段 `amount` 写成字符串 `"1234.56"`,实际 `aa-ocr` 输出是数值 + `source_file` / `fields` / `raw_text` 嵌套对象(见 `aa-ocr/src/output.rs`)。Claude 据此写的解析代码会与真实输出对不上。修正样例 JSON 与字段结构。(codex)
- [ ] L82-85 退出码语义混乱:`3 = 无法识别 (图片质量低 OR 不支持格式)` 把两类不同失败合并;且整套码跳过了 `1`,违反 CLI 习惯。Claude 写的脚本因此产生错误分支处理。要么拆 3 / 5,要么在课文明示退出码语义来源(以 `aa-ocr` 实现为准)并将 `1` 留作"运行错误"。(claude)
- [ ] L146-148 命令 `python3 ~/.../invoice_ocr.py ~/.../invoices/<发票文件名>` 的 `<发票文件名>` 占位符。零基础用户**会原样输入** `<发票文件名>` 或带尖括号粘贴。改成 `your_invoice.pdf` 并明示"把这 5 个字改成你实际的文件名"。同时给路径加引号防空格/中文。(claude+codex)

### Important (应修)

- [ ] L111 "没有真实发票,可以用任何 PDF 测试基本流程" — 任意 PDF 跑 `aa-ocr` 大概率退出码 3 / 全 null 退出码 4,用户会以为脚本坏了。App 应在 sandbox-fixture 内置一张样板发票 PDF;课文改为引用这个文件。(codex+claude)
- [ ] L65-72 / L80-85 兜底"回到 Ch 5 重新走一遍"无效 — Ch 5 切换是单向的,checker 不会重置 RealStep 标记。明确指向 Settings 里的"重新安装 aa-ocr"或 StuckButton 诊断入口。(claude)
- [ ] 完全没有数据隐私 / 出境提醒。这是用户第一次把真实业务数据放进项目目录,后续用 `claude --continue` 让 Claude 帮调试时,真实发票内容会被读进 Claude 上下文并上传 Anthropic。加 Callout:"真实税号/金额出现在终端时,Claude 默认会读取上传"。(claude)
- [ ] L73-79 / L88 4 字段(date/vendor/amount/tax_id)对增值税发票实务过于单薄,且 `amount` 没说含税/不含税(批量入账时会进错科目)。如果 `aa-ocr` 已能输出更多字段,补齐;否则在 Callout 说明"本课程把字段缩到最小,真实工作里你会加发票号/税额/购方信息"。(claude)
- [ ] checker.ts 用 VirtualFs sentinel(`.progress/claude-md-written`)验证 real-mode 章节 — 只能证明点了按钮,不能证明 `~/accounting-learner/CLAUDE.md` 真的存在。Task 4.x 实装 `read_user_file` 时同步加文件落地校验。(claude)

### Minor (可改 / 跳过)

- `--continue` 紧跟着 `/exit` 引入认知负担过大 — 跳过(Section 4 已经放在末尾铺垫"未来工作流",非主任务,可保留)。
- L31-50 CLAUDE.md 例子里目录结构未必触发 `mkdir` — 跳过(Section 3 实际让 Claude "帮你创建目录结构",目录创建语义已闭环)。

---

## Ch 08 · Bug 来了怎么办:Debug + 撤销

### Critical (必修)

- [ ] L234 描述 `git checkout .` 会"**静默丢弃未跟踪修改**" — **事实错误**。`git checkout .` / `git restore .` 都只回退已跟踪文件;未跟踪文件不动。这种关键 Git 边界写错会把学员的 Git 心智带歪。改为"`git checkout .` 含义随上下文变化(切分支 / 回滚已跟踪文件),容易和 `git checkout <branch>` 混"。(codex)
- [ ] L255 / L257 / L262 / 本章回顾表 把"找老公"作为标题级兜底出现 4 次,假定"已婚 + 老公会编程 + 在身边"。对单身或老公不懂代码的用户是死胡同。改成"找一位会编程的家人/朋友"或直接指向 StuckButton。(claude)

### Important (应修)

- [ ] L278-280 `cp ~/Library/Application\ Support/AccountingAssassin/fixtures/bad_encoding.csv ...` — Tauri 端并未铺设这个 fixtures 路径(CLAUDE.md 里 App 私有目录只承诺存 `progress.json + .bak`)。L285-292 Python 兜底生成 fixture 时没有 `os.makedirs(os.path.dirname(path), exist_ok=True)`,而 `~/accounting-learner/invoices/` 可能不存在(Ch 7 不一定建过)。两条都失败,练习还没开始就崩。修复方法:先 `mkdir -p`,或把生成器改为 `pathlib.Path.parent.mkdir(parents=True, exist_ok=True)`。(claude)
- [ ] L209-218 教 `git restore .`,但没说**已经 `git add` 但还没 commit 的修改 `restore` 默认不动**。本章工作流恰恰会撞上 staged but not committed 场景 — "撤销了但脚本还是坏的"。明写 `git restore --staged --worktree .` 或在 § 5 把命令统一。(claude)
- [ ] L303-315 / L298 没有固定工作目录,脚本读相对路径 `invoices/...`;学员稍微换个启动目录就先报路径错,进不到编码 bug 主题。补 `cd ~/accounting-learner` 前置。(codex)
- [ ] L295-309 / L393-425 默认 pandas / openpyxl 已就绪,零基础用户更可能先撞 `ModuleNotFoundError`。补 `pip3 install pandas openpyxl` 前置或在出错时给 fallback 指引。(codex)
- [ ] § 9 步骤 3 "如果报错(很可能报 IndentationError 或 SyntaxError)"是赌运气 — Claude 给 30 行 CSV 累加脚本几乎不会真出语法错。补一条 fallback:"如果脚本仍能跑通,跟 Claude 说『再加复杂功能,加到不能跑为止』"。(claude)

### Minor (可改 / 跳过)

- § 5 第一次出现 Git 时一次性端出 8 条命令 — 跳过(commit `c30a547` 已加 `git init/config` 前置,reviewer 引用的是旧版)。
- § 9 步骤 1 单路径 `git add scripts/simple_sum.py` 与 § 5 的 `git add -A` 不一致 — 跳过(单文件 add 在该场景合理,前后逻辑一致)。

---

## Ch 09 · Skills:一句话搞定重复工作

`claude-only` — codex 触发了模型 capacity 错误。

### Critical (必修)

- [ ] SKILL.md L88-113 步骤 3 解析 4 字段(date/vendor/amount/tax_id),步骤 4 写"按 vendor **类目**分组求和",但输出表头是 5 列(日期/商家/金额/税号/**类目**)。**vendor=商家名 ≠ 类目=会计科目**,两者完全不同来源,"类目"列没有数据来源,Claude 只能编或留空。10 年财务用户一看就识破。修法:删除"类目"列,改为按 vendor(商家)分组,或新增"摘要 → 类目"的映射规则。(claude)
- [ ] L142-161 验证 Skill 是否真被调用的判据只是"Claude 回复里提到 organize-invoices",但 Claude 完全可以嘴上承认却根本没读 SKILL.md(纯靠 description 关键词自由发挥)。在 SKILL.md 步骤里加一个肉眼可见的 marker(如步骤 1 之前先 `echo "organize-invoices v1 启动"` 或在 Excel 文件名里加版本号 sentinel),让学生有实证。(claude)

### Important (应修)

- [ ] 全章假设 `aa-ocr` 已能跑且退出码 3/4 是稳定合约,但开篇没有 `aa-ocr --version` / `which aa-ocr` 自检(且 `--version` 子命令在 `aa-ocr` 现实中不可用,与 Ch 7 同样的修正)。加一个安装自检步骤。(claude)
- [ ] "本月"语义未定义 — 按文件 mtime?按 OCR 的 `date`?跨月发票算哪个月?第一次跑会得到"所有发票都被收进来",学生困惑。SKILL.md 步骤里明写"按 OCR 提取的发票 `date` 字段筛选当月,如缺失则按 mtime 兜底"。(claude)
- [ ] Skills 是 Claude Code 较新版本才支持的特性,课文未要求 `claude --version` 检查 — 旧版用户的 SKILL.md 永远不被识别且零报错。加一个最低版本说明。(claude)
- [ ] Method A 让非技术用户在终端**粘贴含 `---` frontmatter 的多行 message** — 引号 / 换行 / 转义在 zsh + Claude Code REPL 里非常容易翻车。把 Method B(`nano`)升级为推荐路径,Method A 降级或删。(claude)
- [ ] `~/accounting-learner/invoices/` 不存在 / 空目录 / `outputs/` 不存在的兜底全章零提及。SKILL.md 步骤 0 加目录存在性检查。(claude)

### Minor (可改 / 跳过)

- 复用 Ch 8 "四段式 BugReportCard" 措辞 — 跳过(Ch 8 已建立此模板,前置引用合理)。

---

## Ch 10 · Hooks 与 MCP:让 Claude 接入你的工具链

### Critical (必修)

- [ ] L168-181 `~/.claude/settings.json` 里加 `mcpServers` 的写法在当前 Claude Code 里很可能**不被识别**。Codex 引用 Anthropic 官方:user 级 MCP 写在 `~/.claude.json`(根对象),项目级写在 `.mcp.json`;`~/.claude/settings.json` 加 `mcpServers` 是旧/无效写法。**必须实跑一遍 `claude mcp list` 验证 Connected**,否则全章 4/5 步直接挂。(claude+codex)
- [ ] L159 `claude mcp add sqlite-db uvx -- mcp-server-sqlite --db-path "..."` 参数顺序可疑 — CLI 惯例是 `claude mcp add <name> -- <cmd> <args...>`,`--` 紧跟 name。实测一遍并写正确的语法。(claude)
- [ ] L176 `/Users/你的用户名/accounting-learner/accounting.db` 是占位符,**没有一句话说"请把『你的用户名』替换成 `whoami` 的输出"**。非技术用户照抄 → MCP 启动失败 → 没有有用报错。改为 `$HOME/accounting-learner/accounting.db` 或加红字 Callout。(claude)

### Important (应修)

- [ ] L63 / L88-92 hook `matcher: "Edit"` 只匹配 Edit,但用户让 Claude "在 README.md 里加一行" 时如果 README.md 不存在,Claude 走 Write 路径,hook 不触发。L125-130 troubleshooting callout 完全没提"matcher 太窄"。补一条 matcher 多模式(`Edit|Write|MultiEdit`)或一句"如果日志没出现,可能是 Claude 用 Write 创建了新文件"。(claude+codex on Ch15 同样问题)
- [ ] L110-130 / L162-180 配置完 MCP 后**必须退出并重启 `claude` 会话**才会加载新 server。课文一字未提。`claude mcp list` 可能在旧会话里显示空白,用户以为安装失败。(claude)
- [ ] L96 / L192 "`mcp-server-sqlite` 是 Anthropic 官方维护"在事实层面已过时 — modelcontextprotocol/servers 仓库的 Python 参考实现已被官方标注 reference-only / 不再活跃维护。改成"社区维护的官方参考实现"或换一个仍维护的 MCP server demo。(claude)
- [ ] L211-235 样本数据(顺丰/盒马/滴滴 + 几十~几百块)是个人消费台账,不是 10 年财务的经手发票。L240 示例提问"本月按类目总金额"也偏初级。换成"按对方供应商汇总进项税额"更贴专业身份。(claude+codex)
- [ ] L56-69 hook command 同时叠 4 层引号(JSON + 转义 + shell + `$(...)` 子命令)。前 9 章如未专门讲"JSON 字符串里嵌 shell 命令",这里直接抛给零基础是断崖。改成单层引号或多行 heredoc。(claude)
- [ ] L96-101 troubleshooting 让用户跑 `python3 -c "import json; ..."` 验证 JSON — 零基础用户连 Python 是否装好都不清楚。改成 `jq empty .claude/settings.local.json` 或让 Claude 自检。(claude)

### Minor (可改 / 跳过)

- L160-170 sqlite3 heredoc(`<< 'SQL' ... SQL`)第一次出现 — 跳过(heredoc 视为单一可粘贴块,无需深讲,出错可以全文重粘)。
- L188 数据初始化脚本非幂等(重跑 INSERT 报错)— 跳过(教学场景一次性创建,真实使用替换为用户自己的 db;改成 `CREATE TABLE IF NOT EXISTS` + INSERT 即可,影响小)。
- L49 项目根 == `~/accounting-learner` 的隐含假设 — 跳过(全课程一直在 `~/accounting-learner/` 工作,假设合理)。

---

## Ch 11 · Codex 入门

### Critical (必修)

- [ ] L46 `brew install --cask codex` 几乎肯定错。CLI 工具走 formula(`brew install codex` 或 npm),`--cask` 是给 .app 用的;若官方 tap 不存在这条会直接 `No available cask`。发课前 `brew search codex` + `codex --help` 实跑一遍,把所有命令字符串落到 README"截至 2026-05"块。(claude+codex)
- [ ] L78-86 / L83-86 把 API key 登录写成 `codex --provider openai --api-key sk-...`,这和官方 README/当前帮助里的 API-key 流程不一致(主流 Codex CLI 用 `OPENAI_API_KEY` 环境变量)。新手照抄会得到错入口。(claude+codex)
- [ ] **Codex approval mode 完全没提**。Codex CLI 默认会弹"是否允许写文件 / 执行命令"的确认框,而 L107-110 的对比文案反而暗示"Codex 直接动手不问"。学生看到陌生 prompt 会愣住或按错,然后任务失败、归因到自己"没学会"。正文里加一段"第一次看到 Codex 问你 Approve? 时怎么办"。(claude)

### Important (应修)

- [ ] L147 "`/exit` 或按 `Ctrl+C` 退出" — Ctrl+C 在任务执行中按下是**中断任务**而非退出 REPL,可能截断正在写的 CSV。改成"等 Codex 显示完成后输入 `/exit`"。(claude)
- [ ] L113-123 / L136-140 "银行流水"被写成全是支出 + 5 个支出类目(餐饮/交通/快递/办公/其它),工资/转账/退款这类真实流水没落点。10 年财务用户立即出戏。补真实流水的混合记录。(codex+claude)
- [ ] L57-62 nvm 兜底写错 — `brew install nvm` 之后还需 `mkdir ~/.nvm` + 改 `~/.zshrc` + `nvm install <ver>` + `nvm use` + 重开 shell,零基础用户照抄只会更卡。改成"全程用 `brew install node` 装 Node 再跑 `npm install -g @openai/codex`"。(claude)
- [ ] L95-104 `codex login` 没有"5 分钟后终端仍无 Logged in 字样 = 失败"的客观信号 + 没覆盖浏览器没回跳 / 公司代理 / macOS keychain 权限弹窗这三个高频卡点。(claude+codex)
- [ ] L85 RealStep `cd ~/accounting-learner && codex` 假设此目录存在;若用户跳章或 Ch 5/6 失败,会立刻 `cd: no such file or directory`。RealStep 的 `expectsCli` 只 gate Codex 是否装上。补 `mkdir -p ~/accounting-learner/outputs && cd ~/accounting-learner && codex`。(claude)
- [ ] L78 "需要 ChatGPT Plus / Pro / Business / Edu / Enterprise 订阅" 的合规警告塞在 callout 里,L116 tip "手动脱敏处理后"一句话带过 — 让 10 年财务把客户/个人银行流水喂给 OpenAI 服务器,这是**合规警告必须放正文显眼位置**而不是折叠 callout。(claude)

### Minor (可改 / 跳过)

- L51 "看到 `codex 0.x.x`" 版本前缀写死 — 跳过(命令字符串发课前实测时同步修就行,本身不是教学关键点)。
- 章顶降级到 Claude Code 会让 Ch 11 / 12 的对比章节失去意义 — 跳过(降级目的是不让无订阅用户被卡死;对比体验丢失是已知 trade-off)。

---

## Ch 12 · Codex 深入:自动审批与批量处理

`claude-only` — codex 触发了模型 capacity 错误。

### Critical (必修)

- [ ] L106-111 把 `--sandbox workspace-write` 解释为"不需要每步确认"是**概念折叠**。"不弹确认框"是 `exec` 子命令默认非交互导致的,`--sandbox` 控制的是文件系统写权限边界。在交互式 `codex` 里加 `--sandbox workspace-write` 同样**会**逐步弹确认框。这是规则二、规则四的概念地基,折叠后学生区分不出"权限"和"审批"两个轴。改:把 `--sandbox` 与"非交互"分开讲。(claude)
- [ ] L7 "把 `codex` 替换成 `claude`,`codex exec` 替换成 `claude -p`,概念完全一样" — `claude -p` 是 print/headless 模式,但写权限走的是 `--permission-mode` / `--allowedTools` / `--dangerously-skip-permissions`,**不是** `--sandbox workspace-write`。1:1 替换给学生跑会直接报参数错误。(claude)
- [ ] **L37 `git add -A` 把真实银行流水 / 客户数据写入 Git 历史是不可逆的合规事故**。如果以后 repo 推到 GitHub / 同事共享,数据外泄不可逆。课文应在快照步骤之前先教 `.gitignore data/raw/ data/classified/`,或者用 `git stash` 路径替代 commit 做快照。(claude)

### Important (应修)

- [ ] L130 "多个文件可能**并行处理** —— Codex 会同时派出多个子任务" — Codex `exec` 默认单一会话顺序执行工具调用,不是 multi-agent fan-out。要么删,要么改成"按它自己的节奏顺序处理,中间不需要你介入"。(claude)
- [ ] L62 `git clean -i` 在规则一首次出现,Ch 8 commit `c30a547` 已经教过 `git restore .` 和 `git clean -i`,前置已 OK,但本章应明确引用 Ch 8 → 避免学生重新理解。(claude)
- [ ] L91-94 唯一报错引导只覆盖"找不到文件 → cwd 不对"。没覆盖:① `codex exec` 中途某个文件失败,部分输出已落地(怎么知道哪些重跑?)② 用户没登录 Codex / 订阅过期 ③ `git commit` 报 `Please tell me who you are`(没设 `user.email`,Ch 8 的 `git config user.email/name` 前置如果跳过会撞)④ AI 跑出来的批量结果如何"肉眼快速复核"。(claude)
- [ ] L123 命令里的转义引号 `command="... codex exec --sandbox workspace-write \"帮我...\""` 对非技术用户是劝退。要么改成多行 heredoc,要么强烈建议先 `codex` 交互式启动再粘贴 prompt。(claude)

### Minor (可改 / 跳过)

- 样例分类清单(餐厅、滴滴、快递、超市、办公用品、停车费、外卖)对企业财务全是个人消费 — 跳过(Ch 11 同问题已记录,Ch 12 沿用样例,如要改建议两章一起;本章主题是 `codex exec` 工作流不是分类逻辑)。
- L132 "完成后 Codex 会给你一份汇报" 没说汇报长什么样 — 跳过(本身就是滚动式,新增"向上翻几屏查看"一句虽好但优先级低)。

---

## Ch 13 · Cursor

### Critical (必修)

- [ ] **Cursor 默认数据外发,Privacy Mode 是 opt-in**。Background Agent 更甚 — 跑在 Cursor 云端容器、需要 GitHub 仓库连接、代码被推到 Cursor 控制的临时 fork。`~/accounting-learner/` 里有客户名、金额、税号 → 直接被发到 Cursor 服务器。本章必须在 §2 安装后、§4 第一次 Composer 之前**强制引导 Settings → General → Privacy Mode = Enabled**,并解释默认行为。这是合规事故级别。(claude)
- [ ] §6 Background Agent 描述为"在后台执行""你可以切换到其他 App 继续工作",掩盖了:它跑在 Cursor 云端容器、需要 GitHub 仓库连接、代码会被推到 Cursor 控制的临时 fork。非技术用户会以为是本地后台进程,关掉 Cursor.app 就停。Quiz Q3 同步修。(claude)
- [ ] §3 / §6 / §7 (L86-89 / L238-240 / L268) 把 Background Agent 写成"通常需要 Pro",但官方个人档已含 Background Agents;L268 把 Codex 订阅写成 `ChatGPT Plus+` 与 OpenAI 当前说法对不上。按 2026-05 cursor.com 官方价目表 + OpenAI 现行计划重写。(codex)

### Important (应修)

- [ ] §4 / §5 / §6 三个 RealStep 演示任务全是 hello-world(给所有 .py 末尾加 `print("[完成]...")`、hello.py 接受姓名参数、为 hello.py 生成 `_test.py`)。10 年会计的 40 分钟全程零会计内容,完全没传递"Cursor 在我工作里能帮我什么"。前面已经有 `invoice_ocr.py`、报表脚本可用,这里却空转。把任务换成"用 Composer 同时改 invoice_ocr.py + batch_ocr.py 加币种支持"之类。(claude+codex)
- [ ] §2 第二步 "Install 'cursor' command" 实际要写 `/usr/local/bin/cursor` 或 `/opt/homebrew/bin/cursor`,会**弹 macOS 系统密码框**。lesson 完全没提示;非技术用户看到密码框第一反应是"是不是病毒"。同时 §3 cursor.com 浏览器跳回失败 / 公司代理拦截两种最常见登录卡点也没兜底。(claude)
- [ ] §1 L3-6 让免费用户跳过安装/登录/三个体验步骤直接读对比表,但 §2-6 又把这些当主线。概念学习和动手路径被拆成两套,零基础读者在第一处分叉时不知道走哪条。明确分流路径或合并。(codex)
- [ ] §6 L238-240 "没 Pro" 处理成"点我跑完了" — 没给任何替代练习或验证路径;读者不知道自己是权限不够、入口变了还是操作真失败。(codex)
- [ ] Quiz Q4 精确到"Ch 12 第一条 Git 快照",但 Ch 13 lesson 正文没有任何 codex / Git 快照的复习钩子,孤零零的考冷门细节。在 §7 对比表附近放一句桥接。(claude)

### Minor (可改 / 跳过)

- §4 / §5 默认 `~/accounting-learner`、`scripts/hello.py`、`invoice_ocr.py` 已存在 — 跳过(已在 Important "演示任务换成真实文件"里间接覆盖,改成真实文件后该问题消失)。

---

## Ch 14 · 毕业作品 A:发票月报与流水分类

### Critical (必修)

- [ ] §3 / §4 / §5 (L211 / L369 / L456) 输出文件一律按"**当月日期**"命名,但**月末结账核心场景是关上月的账**(6/2 跑通常出 2026-05 报表,不是 2026-06 空账)。十年财务会立刻撞上歧义。改成 prompt 显式让 Claude 询问账期(默认上一个完整月份),或文件名按凭证 `date` 字段而非当前日期。(codex+claude)
- [ ] §3 invoice-ocr 同月二次运行**静默覆盖**前一次手工修正过的"需手填" sheet — 会计反复跑+人工补是核心场景,这是**数据丢失级别**的坑。改:输出文件追加时间戳后缀 `_v2`、`_v3`,或在覆盖前提示用户。(claude)
- [ ] §2 `pip3 install pandas openpyxl` 是全课程**第一次出现 pip / 第三方库**,但仅一句话带过。中国大陆用户从 PyPI 直连大概率超时,缺镜像源指引(`-i https://pypi.tuna.tsinghua.edu.cn/simple`)、缺代理场景、缺"`pip3: command not found`"诊断。一旦网络卡住,非技术用户不知道是网络问题。补镜像源 callout。(claude)

### Important (应修)

- [ ] §3 121-145 "Claude Code 本身无法直接读取 .xlsx 文件"措辞过度绝对化 — Claude 可以直接 `python3 -c` 读 xlsx,这是流程问题不是能力限制。改成"直接 Read 工具只显示二进制,所以我们让它跑脚本来读"。(codex+claude)
- [ ] §3 / §4 多 python3 / pip3 不一致(Homebrew Python / 系统 Python / pyenv)是 2026 macOS 非技术用户头号坑,全篇零提。`pip3 install` 装到 A,`python3 batch_ocr.py` 跑的是 B → `ModuleNotFoundError`。补 `python3 -c "import sys; print(sys.executable)"` 和 `which python3 && which pip3` 一致性校验。(claude)
- [ ] §3 L255-286 兜底只兜了 `aa-ocr` 找不到和 symlink。脚本半途失败、只生成半个 Excel、个别文件坏掉时怎么收口都没说。(codex)
- [ ] §4 L359-370 只读第一个 `.csv`,其余文件静默丢掉。多账户/多月份流水一次导出几份很常见。改 prompt 让 Claude 显式询问要处理哪一个 CSV 或 enumerate 所有。(codex)
- [ ] §4 子串匹配:"京东"归"办公"但京东也卖零食/外卖,"美团"归"餐饮"但美团也卖办公用品。§4"够用即可" Callout 把风险粉饰了。明示分类是"AI 初稿,需会计审核"。(claude)
- [ ] §4 编码探测只覆盖 utf-8 + gbk,招行/中行实际可能是 GB18030 或带 BOM 的 UTF-16。补 fallback 链。(claude)
- [ ] §3 "AI 校验"工作流(打印到终端 → 复制 → 粘贴回 Claude)对几十行数据脆性极高 — 让 Claude 直接读 xlsx 并产出 JSON 更稳。(claude)

### Minor (可改 / 跳过)

- §3 `aa-ocr 找不到` callout 改 `.zshrc` 之后没说 `source` 或新终端 — 跳过(已在 Ch 5 / Ch 6 全局观察里覆盖)。
- 银行流水里的退款/冲账(负值 + "退款"关键词)未分类处理 — 跳过(Ch 14 是 capstone,真实工作中会迭代;明示"需会计审核"已能兜住)。

---

## Ch 15 · 毕业作品 B:一句话跑完月结

### Critical (必修)

- [ ] §5 L264 / L268 hook `matcher: "Edit"` 不限制路径 — **会记录 Claude 在任何目录的 Edit 操作,不只是 capstone-b**。标题"capstone-b 文件变化自动写日志"是误导。Edit matcher 也不捕获 Write / MultiEdit,凭证脚本生成新文件用 Write,日志大量漏记。改成 `matcher: "Edit|Write|MultiEdit"` + 在 command 里加 `case` 过滤路径前缀;或 SKILL.md 内显式说"hook 范围是全工作目录"。(claude+codex on Ch10 同样问题)
- [ ] L75-77 / L98-115 把 `bank-classifier` 的"分类结果"直接当成"已知借方科目"是**偷换概念**(业务分类 ≠ 会计科目)。学员会以为分类 CSV 本身就能直接写进凭证。需在 `make_vouchers.py` 之前补一节"分类标签 → 借方科目映射表"。(codex)
- [ ] L100-117 凭证匹配规则"日期相差≤1 天 AND 金额相差≤0.01"在真实数据上会**批量误配**:信用卡入账日期和发票日期错位常 >1 天、同日多笔相同小额无消解、工资/税/利息本来就没对应发票。同时提示词列了 12 个借方科目枚举,但脚本无任何"摘要→科目"映射逻辑,实际产出会全部落"管理费用-其他",和"AI 初步分类、你审核"叙事直接矛盾。在 SKILL.md 里增加"未匹配项进 unmatched.csv 而非默认填 fallback"。(claude+codex)
- [ ] §5 L268 hook command `$(jq -r '.tool_input.file_path // empty')` — 如果 jq 未安装或字段为空,echo 静默写入"[时间戳] Edit: "空尾巴,而本章验证步骤("cat 日志看见时间戳就过")**检测不出 hook 已坏**。jq 依赖只在 callout 角落提了"如果还没装就 brew install"。改成 SKILL.md 步骤里强制 `command -v jq || brew install jq` 前置;或日志格式里加 `if -z` 判定。(claude)

### Important (应修)

- [ ] aggregator 的 `inputs/` 目录**从未被清空过**。SKILL.md §第四步只说"放入...后运行",上个月已经在 `report-aggregator/inputs/` 里的 `invoice_summary_2026-04.xlsx` 不会被清掉,5 月跑工作流时两个月数据会被一起汇总进 `month_end_2026-05.xlsx`。会计十年经验用户一旦发现 5 月报表里有 4 月数据,会对整个工作流根本性怀疑。SKILL.md 加"步骤 0:清空 inputs/ 或按账期分子目录"。(claude)
- [ ] SKILL.md "YYYY-MM 统一用当月日期"但月末结账语义是关上月的账 — 同 Ch 14 同问题。明示账期 = 上一个完整月份或脚本启动时询问。(claude+codex)
- [ ] L199-200 让 Claude 取"第一个 CSV" — `inputs/` 里有多个导出文件时是高风险歧义(测试文件 / 上月文件)。Claude 默默拿错账期。改成 prompt 显式询问或 enumerate。(codex)
- [ ] L126-129 / L361-369 兜底只说"找不到文件就退出/把错误展示出来",没告诉非技术用户下一步补什么、重跑哪一步、怎么从中断处恢复。补"每一步的中断/重启入口"清单。(codex)
- [ ] 没有"数字闭环"复核工具(如"凭证总笔数 = 银行流水笔数 - 待核查笔数")。本章把"一句话跑完"作为成就感高潮,但对"假成功"几乎没给用户校验工具。SKILL.md 加一步"最后打印闭环校验摘要"。(claude)

### Minor (可改 / 跳过)

- 已在 commit `087c28a` 修复 Ch 15 的 hook stdin/jq idiom + direction-aware voucher mapping + 绝对路径 Skill — 该提交主要修了 hook 命令格式与 voucher direction 推断,但 Critical 列里的 matcher 范围 / jq 静默失败 / 凭证匹配规则仍未被那个提交覆盖,需要进一步迭代。

---

## 备注

- 所有 `lesson.review.gemini.md` 文件因 auth 缺失返回单行错误,本次未参考;依照分诊规则跳过不删。
- Ch 1 / Ch 9 / Ch 12 的 codex review 因模型 capacity 错误未返回有效内容,这三章 critical 项均依赖 claude single-source — 在 fix-apply 阶段建议这三章额外谨慎,或后续 codex 重跑后补一轮。
- 凡是评审建议涉及"App 应替用户跑 `brew install` / `pip install`"的内容,均按 spec § 2.5 / CLAUDE.md "App never gets sudo" 准则**拒绝采纳**(本次 30 份 review 中未发现该违规建议)。
