import { LessonViewer } from "@/modules/LessonViewer";
import { Terminal, type TerminalApi } from "@/modules/Sandbox";

export default function App() {
  return (
    <div className="h-screen w-screen grid grid-cols-[260px_1fr_400px] grid-rows-[1fr_32px]">
      <aside className="row-span-1 bg-cream/60 border-r border-graphite/10 p-4">
        <h1 className="text-sm font-bold tracking-wide">课程进度</h1>
        <p className="text-muted text-xs mt-2">侧边栏(占位)</p>
      </aside>
      <main className="row-span-1 bg-white p-8 overflow-y-auto">
        <LessonViewer slug="00-hello" />
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
      <footer className="col-span-3 bg-cream border-t border-graphite/10 px-4 flex items-center text-xs text-muted">
        进度 0/15 · 准备就绪
      </footer>
    </div>
  );
}
