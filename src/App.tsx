import { useProgress } from "@/modules/Progress";
import { WelcomeFlow } from "@/components/WelcomeFlow";
import { Sidebar } from "@/components/Sidebar";
import { LessonViewer } from "@/modules/LessonViewer";
import { Terminal, type TerminalApi } from "@/modules/Sandbox";
import { CHAPTERS } from "@/curriculum";

export default function App() {
  const hasCompletedOnboarding = useProgress((s) => s.hasCompletedOnboarding);
  const completeOnboarding = useProgress((s) => s.completeOnboarding);
  const chapters = useProgress((s) => s.chapters);
  const currentChapter = useProgress((s) => s.currentChapter);

  if (!hasCompletedOnboarding) {
    return <WelcomeFlow onComplete={completeOnboarding} />;
  }

  // Progressive disclosure per design § 10.4:
  // hide sidebar until Ch 1 is completed.
  const ch1Completed = chapters["01-ai-tools-vs-chatgpt"]?.status === "completed";
  const sidebarVisible = ch1Completed;

  // Default to Ch 1 on first run (currentChapter is null after onboarding).
  const chapterSlug = currentChapter ?? CHAPTERS[0].slug;

  // Count completed chapters for footer
  const completedCount = Object.values(chapters).filter(
    (c) => c.status === "completed",
  ).length;

  return (
    <div
      className={[
        "h-screen w-screen grid grid-rows-[1fr_32px]",
        sidebarVisible
          ? "grid-cols-[260px_1fr_400px]"
          : "grid-cols-[1fr_400px]",
      ].join(" ")}
    >
      {sidebarVisible && <Sidebar />}

      <main className="row-span-1 bg-white p-8 overflow-y-auto">
        <LessonViewer slug={chapterSlug} />
      </main>

      <aside className="row-span-1 bg-sandbox/5 border-l border-graphite/10 p-4 flex flex-col gap-3">
        <span className="inline-block self-start px-2 py-1 rounded-md bg-sandbox/10 text-sandbox text-xs">
          🧪 沙箱模式
        </span>
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-graphite/10">
          <Terminal
            onInput={(line) => console.log("user:", line)}
            onReady={(api: TerminalApi) =>
              api.writeln("欢迎来到沙箱终端 · 输入命令并按 Enter")
            }
          />
        </div>
      </aside>

      <footer className="col-span-full bg-cream border-t border-graphite/10 px-4 flex items-center text-xs text-muted">
        进度 {completedCount}/15
      </footer>
    </div>
  );
}
