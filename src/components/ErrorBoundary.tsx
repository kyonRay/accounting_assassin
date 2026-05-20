import React from "react";

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // TODO Task 4.4: route to diagnostic report / stuck-button
    console.error("App crashed:", error, info);
  }

  reset = () => this.setState({ error: null });

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
            <button
              onClick={this.reset}
              className="px-6 py-2 bg-sandbox text-white rounded-lg"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
