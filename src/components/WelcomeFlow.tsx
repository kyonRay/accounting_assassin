import { useEffect, useRef, useState, useCallback } from "react";

type Stage = "splash" | "welcome" | "preparing" | "done";

export interface WelcomeFlowProps {
  onComplete: () => void;
  /**
   * Auto-advance fallback durations (ms). User can click 「继续」 to
   * advance sooner; timers are upper bounds.
   *
   * - splash:    visual breath, no button. Default 1500ms.
   * - welcome:   greeting screen, has button. Default 8000ms.
   * - preparing: ritual screen, has button. Default 30000ms.
   */
  durations?: { splash?: number; welcome?: number; preparing?: number };
}

const DEFAULT_DURATIONS = { splash: 1500, welcome: 8000, preparing: 30000 } as const;

export function WelcomeFlow({ onComplete, durations }: WelcomeFlowProps) {
  const d = { ...DEFAULT_DURATIONS, ...durations };
  const [stage, setStage] = useState<Stage>("splash");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear current timer when stage changes / unmounts
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const advance = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStage((s) =>
      s === "splash" ? "welcome"
      : s === "welcome" ? "preparing"
      : s === "preparing" ? "done"
      : s,
    );
  }, []);

  // Auto-advance fallback timer per stage
  useEffect(() => {
    if (stage === "done") return;
    const dur =
      stage === "splash" ? d.splash
      : stage === "welcome" ? d.welcome
      : d.preparing;
    timerRef.current = setTimeout(advance, dur);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage, advance, d.splash, d.welcome, d.preparing]);

  // Call onComplete once when reaching done
  useEffect(() => {
    if (stage === "done") onComplete();
  }, [stage, onComplete]);

  return (
    <div
      data-testid="welcome-flow"
      className="h-screen w-screen flex flex-col items-center justify-center bg-cream gap-6 px-6"
    >
      {stage === "splash" && (
        <>
          <h1 className="text-5xl font-bold tracking-tight text-graphite">记账杀手</h1>
          <p className="text-lg text-muted">陪你从零学会用 AI</p>
        </>
      )}

      {stage === "welcome" && (
        <>
          <p className="text-xl text-graphite max-w-md text-center leading-relaxed">
            你好,我是记账杀手 · 我会陪你 15 节课,把 AI 真正用起来
          </p>
          <ContinueButton onClick={advance} />
        </>
      )}

      {stage === "preparing" && (
        <>
          <p className="text-xl text-graphite">正在准备你的沙箱…</p>
          <span className="flex gap-1 mt-2" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-sandbox animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-sandbox animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-sandbox animate-bounce [animation-delay:300ms]" />
          </span>
          <ContinueButton onClick={advance} />
        </>
      )}
    </div>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 px-5 py-2 rounded-lg bg-sandbox text-white text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-sandbox/40"
    >
      继续 →
    </button>
  );
}
