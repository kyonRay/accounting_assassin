import { useState } from "react";
import { useProgress } from "@/modules/Progress";
import { initializeRealEnv, type InitReport } from "@/modules/RealEnvBridge";

export interface ModeTransitionProps {
  onConfirm: () => void;
  onCancel: () => void;
}

type TransitionState =
  | { stage: "idle" }
  | { stage: "initializing" }
  | { stage: "success"; report: InitReport }
  | { stage: "failure"; error: Error };

export function ModeTransition({ onConfirm, onCancel }: ModeTransitionProps) {
  const setMode = useProgress((s) => s.setMode);
  const [state, setState] = useState<TransitionState>({ stage: "idle" });

  async function handleStart() {
    setState({ stage: "initializing" });
    try {
      const report = await initializeRealEnv();
      setState({ stage: "success", report });
    } catch (e) {
      setState({
        stage: "failure",
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  function handleEnterReal() {
    setMode("real");
    onConfirm();
  }

  return (
    <div
      data-testid="mode-transition"
      className="h-screen w-screen flex flex-col items-center justify-center bg-cream px-6"
    >
      <div className="max-w-lg w-full bg-white rounded-2xl border border-graphite/10 shadow-sm p-8 flex flex-col gap-6">
        {state.stage === "idle" && (
          <>
            <h2 className="text-2xl font-bold text-graphite">
              你准备从沙箱进入真实环境了
            </h2>
            <div className="text-graphite/80 text-sm leading-relaxed space-y-3">
              <p>
                接下来,应用会在你的电脑上创建一个「作业本」文件夹
                （<code className="bg-graphite/5 px-1 rounded font-mono text-xs">~/accounting-learner/</code>
                ），从这里开始,AI 会看到你的真实文件。
              </p>
              <p>
                沙箱里学的内容还在,但课程会在你的真实电脑上继续。
                <br />
                <span className="text-muted text-xs">
                  注意:这是单向切换。进入真实环境后,只能通过设置手动重置。
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStart}
                className="flex-1 bg-realenv text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-realenv/90 transition-colors"
              >
                准备好了,开始
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 border border-graphite/20 text-graphite text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-graphite/5 transition-colors"
              >
                再回沙箱看看
              </button>
            </div>
          </>
        )}

        {state.stage === "initializing" && (
          <>
            <h2 className="text-2xl font-bold text-graphite">
              正在准备你的作业本…
            </h2>
            <div className="flex items-center gap-3 text-muted text-sm">
              <span
                className="w-4 h-4 border-2 border-realenv border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              正在创建工作区并检查已安装的工具…
            </div>
          </>
        )}

        {state.stage === "success" && (
          <>
            <h2 className="text-2xl font-bold text-graphite">
              你的作业本已经准备好了。
            </h2>
            <p className="text-graphite/80 text-sm">
              工作区路径：
              <code className="bg-graphite/5 px-1 rounded font-mono text-xs">
                {state.report.workspace}
              </code>
            </p>

            {state.report.present.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-done mb-1">✓ 已安装的工具</p>
                <ul className="text-sm text-graphite/80 space-y-0.5">
                  {state.report.present.map((cmd) => (
                    <li key={cmd} className="font-mono text-xs">
                      {cmd}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {state.report.missing.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted mb-1">
                  ⚠️ 尚未安装的工具
                </p>
                <ul className="text-sm text-graphite/60 space-y-0.5">
                  {state.report.missing.map((cmd) => (
                    <li key={cmd} className="font-mono text-xs">
                      {cmd}
                      <span className="ml-2 text-muted not-italic">
                        — 第 5 章会引导你安装
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm font-mono">
              {state.report.aaOcrInstalled ? (
                <span className="text-done">aa-ocr 工具: 已链接 ✓</span>
              ) : (
                <span className="text-muted">
                  aa-ocr 工具: 未找到（dev: 跑 cargo build --bin aa-ocr 后重试）
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleEnterReal}
              className="bg-realenv text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-realenv/90 transition-colors"
            >
              进入真实环境
            </button>
          </>
        )}

        {state.stage === "failure" && (
          <>
            <h2 className="text-2xl font-bold text-graphite">
              初始化遇到了问题
            </h2>
            <p className="text-graphite/80 text-sm">
              创建工作区时发生了错误。请检查磁盘权限后重试。
            </p>
            <details className="text-xs text-muted border border-graphite/10 rounded p-3">
              <summary className="cursor-pointer font-medium mb-1">
                原始错误信息（英文）
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono">
                {state.error.message}
              </pre>
            </details>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStart}
                className="flex-1 bg-realenv text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-realenv/90 transition-colors"
              >
                重试
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 border border-graphite/20 text-graphite text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-graphite/5 transition-colors"
              >
                再回沙箱
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
