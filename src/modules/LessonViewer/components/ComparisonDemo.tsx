import type { ReactNode } from "react";

export interface ComparisonDemoProps {
  leftTitle: string;
  rightTitle: string;
  left: ReactNode;
  right: ReactNode;
}

export function ComparisonDemo({
  leftTitle,
  rightTitle,
  left,
  right,
}: ComparisonDemoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
      {/* Left card: neutral gray */}
      <div className="rounded-lg border border-graphite/15 bg-graphite/5 p-4">
        <div className="font-semibold text-sm text-graphite mb-3">{leftTitle}</div>
        <div className="text-sm text-graphite leading-relaxed">{left}</div>
      </div>

      {/* Right card: sandbox/blue tint — reinforces "new tool we're learning" */}
      <div className="rounded-lg border border-sandbox/30 bg-sandbox/5 p-4">
        <div className="font-semibold text-sm text-sandbox mb-3">{rightTitle}</div>
        <div className="text-sm text-graphite leading-relaxed">{right}</div>
      </div>
    </div>
  );
}
