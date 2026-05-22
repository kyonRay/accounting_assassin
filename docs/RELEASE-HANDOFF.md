# 发布交接清单 (Release Handoff)

本文件列出实现计划里 **必须由人手动完成** 的步骤 —— Agent 无法替你做。

---

## 任务 8.3 · 干净安装自测(妻子视角)

> 计划原文:在干净 macOS 测试账号或虚拟机上,从零走 Ch 1-15;记录每个犹豫点和报错;在宣布 Week 8 完工前修掉表层问题。

**为什么 Agent 做不了**:需要真机/虚拟机里**新创建的 macOS 用户账号**,从零安装、模拟妻子操作。Agent 没有 GUI、没有新建账号的权限。

**建议步骤**:

1. 在你的开发 Mac 上 *系统设置 → 用户与群组 → 加号* 新建一个标准用户(例如 `taixin`),不给管理员权限。
2. 注销当前用户,用新账号登录。
3. 从你已经签名的 .dmg(由 `scripts/package-dmg.sh` 产出)安装 App,严格按 `docs/首次安装说明.pdf` 走一遍 —— 包括三条失败兜底路径(系统设置开关、`xattr` 命令、找老公兜底)。
4. **从 Ch 1 一直做到 Ch 15**。每章记录:
   - 走完用了多久(可以用 iPhone 计时,Ch 1 估计 5-10 分钟,Ch 14/15 capstone 估计 30-60 分钟)
   - 哪里停下来犹豫超过 5 秒(往往说明 UI 描述不够清楚)
   - 哪里出报错弹窗 / Checker 卡了 3 次以上
5. 回到开发账号,把发现的问题汇成一份 `release-notes/2026-MM-DD-clean-install.md`,按"必修 / 应修 / 可改"分级。

**完工判据**:Ch 1-15 全程走通,没有阻塞性 bug(必修类为零),才算 Week 8 通过。

---

## 任务 9.3 · 最终验证(签名版 .dmg + 干净账号)

> 计划原文:在从未用过的 macOS 账号上,拖到 `Applications` → 右键 → 打开 → 仍要打开 → 确认 App 启动不需要进一步干预;走完 Ch 1;复核 § 2.6 的订阅价格仍准确;`git tag v1.0.0`。

**为什么 Agent 做不了**:涉及 macOS Gatekeeper 真实交互(右键菜单、隐私与安全性弹窗、`xattr` 命令)、跨账号的 .dmg 安装、最后 `git tag` 触发的发布事件。

**操作清单**:

```bash
# 1. 在你的开发 Mac 上构建签名 .dmg
scripts/package-dmg.sh
# 产物:release/AccountingAssassin_<version>_aarch64.dmg + 首次安装说明.pdf

# 2. 注销到 8.3 新建的干净账号,把 release/ 整个文件夹 AirDrop / iCloud 过去
#    (或者直接 cp 到 /Users/Shared/)

# 3. 在干净账号里:打开 .dmg → 拖到 Applications → 右键打开 → 仍要打开
#    验证 App 启动不需要进一步干预(不需要再开终端 / 改设置)

# 4. 在干净账号里走完 Ch 1(只走 Ch 1 即可,完整 1-15 是 8.3 的范围)

# 5. 复核 docs/superpowers/specs/2026-05-20-accounting-assassin-design.md § 2.6
#    Codex / Cursor / Claude Code 的订阅价格是否还准确。
#    特别检查:
#      - Claude Pro / Max
#      - Codex(ChatGPT Plus 内含 vs 独立 OpenAI API)
#      - Cursor Pro
#    任何价格变动都先 PR 改 spec,再继续

# 6. 回到开发账号,打 tag
git tag v1.0.0
git push origin v1.0.0
```

**完工判据**:干净账号里 1 个用户(没有任何技术背景)能完成"拖到 Applications → 启动 App → 看见 Ch 1 欢迎页"全流程,中间不需要找你帮忙。

---

## 任务 9.4 · 交付给妻子

> 计划原文:把 `.dmg` + PDF 放到 iCloud Drive 共享文件夹;给妻子发链接;待命接收她的第一批问题。

**为什么 Agent 做不了**:Agent 无法访问你的 iCloud 账号、无法发短信、也不应该自动发任何东西到家人沟通渠道。

**建议步骤**:

1. 把 `release/` 文件夹拖到 iCloud Drive(或者 AirDrop 给她)。两个文件:
   - `AccountingAssassin_<version>_aarch64.dmg`
   - `首次安装说明.pdf`
2. 给她发一条短信(建议措辞,可改):
   > 亲爱的,我做了一个学 AI 工具的小 App 给你。先看下 `首次安装说明.pdf`,3 分钟读完;按里面步骤把 dmg 装上就行。如果哪里卡住,直接发短信或截屏给我,我帮你看。
3. 留出 30 分钟时间在身边待命(她大概率会问"右键怎么右键"之类的)。
4. **不要催** —— 她有 10 年财务经验,但完全没编程基础,学习节奏由她定。15 章预计 3-6 周。
5. 第一周后做个**用户反馈检查**:让她说三件最讨厌的事 + 三件最喜欢的事,记到 `release-notes/2026-MM-DD-week-1-feedback.md`,作为 v1.1 输入。

**完工判据**:她成功打开 App 并到达 Ch 1。后续学习节奏不是发布完工的一部分。

---

## 完工后的扫尾(Agent 可以帮)

发布完成后,如果你有反馈想转成代码改动,可以再开一个 session,贴反馈进来,Agent 会按现有 testing-as-spec 流程处理(改章节内容、加 checker case、补 quiz 选项)。

---

*最后更新:2026-05-22*
