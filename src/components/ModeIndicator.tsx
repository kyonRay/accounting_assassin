import { useProgress } from "@/modules/Progress";

export function ModeIndicator() {
  const mode = useProgress((s) => s.mode);

  if (mode === "real") {
    return (
      <span className="inline-block self-start px-2 py-1 rounded-md bg-realenv/10 text-realenv text-xs">
        🛠️ 真实环境
      </span>
    );
  }

  return (
    <span className="inline-block self-start px-2 py-1 rounded-md bg-sandbox/10 text-sandbox text-xs">
      🧪 沙箱模式
    </span>
  );
}
