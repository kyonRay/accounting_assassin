export { createVirtualFs, type VirtualFs } from "./virtual-fs";
export { Terminal, type TerminalApi, type TerminalProps } from "./Terminal";
export {
  createFakeClaude,
  type FakeClaude,
  type FakeClaudeResponse,
  type FakeClaudeSession,
  type FakeClaudeTurn,
  type FakeToolCall,
} from "./fake-claude";
// pyodide-runner is an async-loading internal; consumers import directly when needed.
