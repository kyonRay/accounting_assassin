/**
 * BugReportCard — renders the Ch 8 四段式 bug report template.
 *
 * Spec § 5.4.2 labels (load-bearing — must match exactly):
 *   【期望】 / 【实际】 / 【报错原文】 / 【我试过的】
 *
 * Auto-populate from terminal output (spec § 5.4.2 "自动把当前沙箱/真实环境的报错填进去"):
 *   This is infeasible in the current architecture. Ch 8 is a real-env chapter,
 *   and Tauri's IPC does not capture live terminal stdout. Only the manual paste
 *   flow is implemented here. Tracked as a known deviation in the Ch 8 README.
 */

import { useState } from "react";

export interface BugReportCardProps {
  /** Optional pre-filled text for 【期望】 */
  defaultExpected?: string;
  /** Optional pre-filled text for 【实际】 */
  defaultActual?: string;
  /** Optional pre-filled text for 【我试过的】 */
  defaultTried?: string;
}

export function BugReportCard({
  defaultExpected = "",
  defaultActual = "",
  defaultTried = "",
}: BugReportCardProps) {
  const [expected, setExpected] = useState(defaultExpected);
  const [actual, setActual] = useState(defaultActual);
  const [errorText, setErrorText] = useState("");
  const [tried, setTried] = useState(defaultTried);
  const [copied, setCopied] = useState(false);

  function buildTemplate(): string {
    return [
      "【期望】",
      expected || "（请填写：你希望脚本做什么）",
      "",
      "【实际】",
      actual || "（请填写：实际发生了什么）",
      "",
      "【报错原文】",
      errorText || "（请整段粘贴报错信息，不要删掉英文）",
      "",
      "【我试过的】",
      tried || "（请填写：你已经尝试过的方法）",
    ].join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildTemplate());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable (e.g. non-HTTPS) — fail silently
    }
  }

  const labelClass = "block text-xs font-semibold text-sandbox mb-1 font-mono";
  const textareaClass =
    "w-full border border-graphite/20 rounded p-2 text-sm font-mono bg-white resize-y min-h-[64px] focus:outline-none focus:ring-2 focus:ring-sandbox/40 placeholder:text-muted";

  return (
    <div
      className="my-4 border border-sandbox/20 rounded-lg p-5 bg-sandbox/5"
      data-testid="bug-report-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-sm text-graphite">四段式 Bug 报告模板</div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-medium px-3 py-1.5 rounded bg-sandbox text-white hover:bg-sandbox/90 transition-colors"
        >
          {copied ? "✓ 已复制" : "复制到剪贴板"}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="bugreport-expected" className={labelClass}>【期望】</label>
          <textarea
            id="bugreport-expected"
            className={textareaClass}
            placeholder="我让脚本把 invoices.csv 里的发票按类目汇总到 summary.xlsx"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            aria-label="期望"
          />
        </div>

        <div>
          <label htmlFor="bugreport-actual" className={labelClass}>【实际】</label>
          <textarea
            id="bugreport-actual"
            className={textareaClass}
            placeholder="脚本跑出来 summary.xlsx 是空的，什么都没有"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            aria-label="实际"
          />
        </div>

        <div>
          <label htmlFor="bugreport-error" className={labelClass}>【报错原文】</label>
          <textarea
            id="bugreport-error"
            className={`${textareaClass} min-h-[100px]`}
            placeholder={"Traceback (most recent call last):\n  ...\nUnicodeDecodeError: 'utf-8' codec can't decode byte 0xb7\n\n（整段复制，不要删英文）"}
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            aria-label="报错原文"
          />
          <p className="text-xs text-muted mt-1">
            提示：整段粘贴，不要删掉英文报错——Claude 需要这些细节才能准确定位问题。
          </p>
        </div>

        <div>
          <label htmlFor="bugreport-tried" className={labelClass}>【我试过的】</label>
          <textarea
            id="bugreport-tried"
            className={textareaClass}
            placeholder={"- 我又跑了一次，还是一样\n- 我打开了 invoices.csv，看着挺正常"}
            value={tried}
            onChange={(e) => setTried(e.target.value)}
            aria-label="我试过的"
          />
        </div>
      </div>

      <p className="text-xs text-muted mt-4 leading-relaxed">
        填好后点「复制到剪贴板」，粘给 Claude Code 即可。
        {/* Auto-populate from terminal output is not implemented: Ch 8 is real-env,
            and Tauri IPC does not expose live terminal stdout capture. See README. */}
      </p>
    </div>
  );
}
