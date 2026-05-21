import { useEffect, useRef, useState } from "react";

type Stage = "splash" | "welcome" | "preparing" | "done";

export interface WelcomeFlowProps {
  onComplete: () => void;
  /** Test override: defaults [3000, 30000, 2000] = 3s → 30s → final 2s beat */
  durations?: { welcome: number; preparing: number; done: number };
}

export function WelcomeFlow({
  onComplete,
  durations = { welcome: 3000, preparing: 30000, done: 2000 },
}: WelcomeFlowProps) {
  const [stage, setStage] = useState<Stage>("splash");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setStage("welcome"), durations.welcome);
    const t2 = setTimeout(
      () => setStage("preparing"),
      durations.welcome + durations.preparing,
    );
    const t3 = setTimeout(() => {
      setStage("done");
      onComplete();
    }, durations.welcome + durations.preparing + durations.done);

    timersRef.current = [t1, t2, t3];
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [durations.welcome, durations.preparing, durations.done, onComplete]);

  return (
    <div
      data-testid="welcome-flow"
      className="h-screen w-screen flex flex-col items-center justify-center bg-cream gap-6"
    >
      {stage === "splash" && (
        <>
          <h1 className="text-5xl font-bold tracking-tight text-graphite">
            记账杀手
          </h1>
          <p className="text-lg text-muted">陪你从零学会用 AI</p>
        </>
      )}

      {stage === "welcome" && (
        <p className="text-xl text-graphite max-w-md text-center leading-relaxed">
          你好,我是记账杀手 · 我会陪你 15 节课,把 AI 真正用起来
        </p>
      )}

      {(stage === "preparing" || stage === "done") && (
        <>
          <p className="text-xl text-graphite">正在准备你的沙箱...</p>
          <span className="flex gap-1 mt-2">
            <span className="w-2 h-2 rounded-full bg-sandbox animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-sandbox animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-sandbox animate-bounce [animation-delay:300ms]" />
          </span>
        </>
      )}
    </div>
  );
}
