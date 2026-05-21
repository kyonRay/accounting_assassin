import { useProgress } from "@/modules/Progress";
import {
  PARTS_IN_ORDER,
  computeChapterStates,
  type DisplayStatus,
  type ChapterMeta,
} from "@/curriculum";

export function Sidebar() {
  const chapters = useProgress((s) => s.chapters);
  const currentChapter = useProgress((s) => s.currentChapter);
  const setCurrentChapter = useProgress((s) => s.setCurrentChapter);

  const states = computeChapterStates(chapters, currentChapter);

  // Group by part
  const byPart = new Map<string, typeof states>();
  for (const s of states) {
    const list = byPart.get(s.meta.part) ?? [];
    list.push(s);
    byPart.set(s.meta.part, list);
  }

  return (
    <aside
      data-testid="sidebar"
      className="h-full overflow-y-auto bg-cream/60 border-r border-graphite/10 p-4 space-y-5"
    >
      <h1 className="text-sm font-bold tracking-wide">课程进度</h1>

      {PARTS_IN_ORDER.map((part) => {
        const items = byPart.get(part) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={part}>
            <h2 className="text-xs font-semibold text-muted mb-2">{part}</h2>
            <ul className="space-y-1">
              {items.map(({ meta, display }) => (
                <ChapterRow
                  key={meta.slug}
                  meta={meta}
                  display={display}
                  onSelect={() => setCurrentChapter(meta.slug)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}

function ChapterRow({
  meta,
  display,
  onSelect,
}: {
  meta: ChapterMeta;
  display: DisplayStatus;
  onSelect: () => void;
}) {
  const disabled = display === "locked";

  const icon =
    display === "completed"
      ? "✓"
      : display === "current"
        ? "●"
        : display === "available"
          ? "○"
          : "🔒";

  const iconColor =
    display === "completed"
      ? "text-done"
      : display === "current" && meta.mode === "sandbox"
        ? "text-sandbox"
        : display === "current" && meta.mode === "real"
          ? "text-realenv"
          : "text-muted";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={[
          "w-full text-left text-sm py-1.5 px-2 rounded-md flex items-center gap-2",
          disabled
            ? "text-muted cursor-not-allowed"
            : "hover:bg-graphite/5 cursor-pointer",
          display === "current" && !disabled ? "bg-graphite/5 font-medium" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={display === "current" ? "page" : undefined}
      >
        <span
          className={`w-5 inline-flex justify-center ${iconColor}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="flex-1">
          <span className="text-muted mr-1">
            {String(meta.num).padStart(2, "0")}
          </span>
          {meta.title}
        </span>
        {meta.hasQuiz && (
          <span
            title="本章包含小测验"
            aria-label="本章包含小测验"
            className="text-xs"
          >
            🎯
          </span>
        )}
      </button>
    </li>
  );
}
