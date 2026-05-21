/**
 * DebugFlowchart — renders the Ch 8 § 5.4.3 debug + rollback workflow
 * as a styled visual diagram (Option A: pure HTML/CSS, no SVG).
 *
 * This component is self-contained (no props). The flowchart content is
 * fixed from the spec — it's intentionally a static "poster" the learner
 * can refer back to.
 */

function Arrow() {
  return (
    <div className="flex justify-center my-1 text-graphite/40 text-xl select-none" aria-hidden="true">
      ↓
    </div>
  );
}

interface StepBoxProps {
  label: string;
  body?: string;
  variant?: "default" | "decision" | "success" | "danger";
}

function StepBox({ label, body, variant = "default" }: StepBoxProps) {
  const variantClass = {
    default: "bg-white border border-graphite/15 text-graphite",
    decision: "bg-sandbox/5 border border-sandbox/30 text-graphite",
    success: "bg-done/5 border border-done/40 text-graphite",
    danger: "bg-realenv/5 border border-realenv/30 text-graphite",
  }[variant];

  const labelClass = {
    default: "font-semibold text-graphite",
    decision: "font-semibold text-sandbox",
    success: "font-semibold text-done",
    danger: "font-semibold text-realenv",
  }[variant];

  return (
    <div className={`rounded-lg px-4 py-3 shadow-sm ${variantClass}`}>
      <div className={`text-sm ${labelClass}`}>{label}</div>
      {body && <div className="text-xs text-muted mt-1 leading-relaxed">{body}</div>}
    </div>
  );
}

interface BranchProps {
  leftLabel: string;
  leftContent: React.ReactNode;
  rightLabel: string;
  rightContent: React.ReactNode;
}

function Branch({ leftLabel, leftContent, rightLabel, rightContent }: BranchProps) {
  return (
    <div className="my-2">
      {/* Branch separator */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 border-t border-graphite/20" />
        <span className="text-xs text-muted px-2">分支</span>
        <div className="flex-1 border-t border-graphite/20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <div className="text-xs text-done font-semibold text-center">{leftLabel}</div>
          {leftContent}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs text-realenv font-semibold text-center">{rightLabel}</div>
          {rightContent}
        </div>
      </div>
    </div>
  );
}

export function DebugFlowchart() {
  return (
    <div
      className="my-6 max-w-lg mx-auto"
      data-testid="debug-flowchart"
      aria-label="Ch 8 调试工作流程图"
    >
      <div className="bg-cream rounded-xl border border-graphite/10 p-5 shadow-sm">
        <div className="text-center text-base font-bold text-graphite mb-4">
          🐛 出 Bug 了 — 标准处理流程
        </div>

        {/* Step 1 */}
        <StepBox
          label="出 Bug 了"
          body="脚本报错 / 输出不对 / 文件没生成"
        />
        <Arrow />

        {/* Step 2 */}
        <StepBox
          label="深呼吸 — Bug 是对话，不是失败"
          body="报错信息是线索，不是指责。冷静读，按步骤来。"
          variant="decision"
        />
        <Arrow />

        {/* Step 3 */}
        <StepBox
          label="【事前快照】git commit -am 'before retry'"
          body="先存档，后动刀。这一步保护你可以随时回退。"
          variant="default"
        />
        <Arrow />

        {/* Step 4 */}
        <StepBox
          label="看 traceback 最后一行"
          body="从下往上读：最后一行是报错类型，上面几行是出错位置。"
        />
        <Arrow />

        {/* Step 5 */}
        <StepBox
          label="用四段式模板整理信息"
          body="【期望】【实际】【报错原文】【我试过的】——点 App 一键复制"
          variant="decision"
        />
        <Arrow />

        {/* Step 6 */}
        <StepBox
          label="粘给 Claude Code，让它解释 + 修复"
          body="完整模板，不删英文报错——Claude 需要这些细节才能准确修复"
        />
        <Arrow />

        {/* Step 7 */}
        <StepBox
          label="AI 改完代码 → 自己跑一遍验证"
          body="'再跑一遍' 原则：不信 AI 说修好了，要亲眼跑通才算"
        />
        <Arrow />

        {/* Branch */}
        <Branch
          leftLabel="✓ 修好了"
          leftContent={
            <StepBox
              label="git status → git commit 快照，继续"
              body="每次修复后立刻存档，形成良好习惯"
              variant="success"
            />
          }
          rightLabel="✗ 没修好 / 改坏了"
          rightContent={
            <div className="flex flex-col gap-2">
              <StepBox
                label="git status → git diff"
                body="看看 AI 改了哪些地方，决定要不要保留"
                variant="danger"
              />
              <Arrow />
              <div className="bg-realenv/5 border border-realenv/20 rounded-lg px-3 py-2">
                <div className="text-xs font-semibold text-realenv mb-1">三选一：</div>
                <ul className="text-xs text-graphite space-y-1">
                  <li>• 全不要 → <code className="bg-graphite/5 px-1 rounded font-mono">git restore .</code></li>
                  <li>• 部分要 → 跟 AI 细化，重试 ≤ 3 次</li>
                  <li>• 完全卡 → 「我卡住了」+ 通知老公</li>
                </ul>
              </div>
              <div className="mt-1 p-2 bg-graphite/5 rounded text-xs text-muted">
                ⚠️ 禁用 <code className="font-mono">git checkout .</code>——
                会静默丢弃所有未提交修改
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
