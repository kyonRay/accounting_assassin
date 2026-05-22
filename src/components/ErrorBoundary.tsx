import React from "react";
import { useCrashStore } from "@/modules/Progress";

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

/** Custom event the universal StuckButton listens for. Dispatching it
 *  opens the "我卡住了" diagnostic modal, giving the user an escape
 *  hatch even from a screen that itself crashed. */
export const STUCK_EVENT = "aa:open-stuck";

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    useCrashStore.getState().recordCrash(error);
    console.error("App crashed:", error, info);
  }

  reset = () => this.setState({ error: null });

  openStuck = () => {
    window.dispatchEvent(new CustomEvent(STUCK_EVENT));
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-cream p-8"
        >
          <div className="max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-3xl mb-3">🆘</div>
            <h2 className="text-xl font-bold mb-2">App 出了点问题</h2>
            <p className="text-graphite mb-6">
              不用担心,你的进度已经保存。
              下面是程序碰到的具体情况,你可以重启 App 试一次;
              如果还有问题,把这段信息发给老公。
            </p>
            <pre className="text-left text-xs bg-graphite/5 p-3 rounded font-mono whitespace-pre-wrap mb-6">
              {this.state.error.name}: {this.state.error.message}
            </pre>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.reset}
                className="px-6 py-2 bg-sandbox text-white rounded-lg"
              >
                重试
              </button>
              <button
                onClick={this.openStuck}
                data-testid="error-boundary-stuck-btn"
                className="px-6 py-2 border border-graphite/30 text-graphite rounded-lg hover:bg-graphite/5"
              >
                求助 / 卡住了
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
