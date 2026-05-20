import type { ReactNode } from "react";

export interface CalloutProps {
  type: "tip" | "warn" | "insight";
  title?: string;
  children: ReactNode;
}

const CONFIG = {
  tip: {
    icon: "🌿",
    container: "bg-done/5 border-l-4 border-done",
    titleClass: "text-done",
  },
  warn: {
    icon: "⚠️",
    container: "bg-realenv/5 border-l-4 border-realenv",
    titleClass: "text-realenv",
  },
  insight: {
    icon: "💡",
    container: "bg-sandbox/5 border-l-4 border-sandbox",
    titleClass: "text-sandbox",
  },
} as const;

export function Callout({ type, title, children }: CalloutProps) {
  const { icon, container, titleClass } = CONFIG[type];

  return (
    <div className={`${container} rounded-r-md p-4 my-4`}>
      {title && (
        <div className={`${titleClass} font-semibold text-sm mb-1`}>
          <span aria-hidden="true">{icon}</span>{" "}
          <span>{title}</span>
        </div>
      )}
      {!title && (
        <span aria-hidden="true" className="mr-1">{icon}</span>
      )}
      <div className="text-graphite text-sm leading-relaxed">{children}</div>
    </div>
  );
}
