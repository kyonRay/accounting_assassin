import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export interface TerminalApi {
  write: (text: string) => void;
  writeln: (text: string) => void;
  clear: () => void;
  focus: () => void;
}

export interface TerminalProps {
  prompt?: string;
  onInput: (line: string) => void;
  onReady?: (api: TerminalApi) => void;
  className?: string;
}

const XTERM_THEME = {
  background: "#1E1E2E",
  foreground: "#E4E4E7",
  cursor: "#FFFFFF",
  black: "#3F3F46",
  brightBlack: "#52525B",
  red: "#F87171",
  green: "#86EFAC",
  yellow: "#FCD34D",
  blue: "#93C5FD",
  magenta: "#C4B5FD",
  cyan: "#67E8F9",
  white: "#E4E4E7",
  selectionBackground: "#3F3F46",
};

const HISTORY_LIMIT = 100;

export function Terminal({
  prompt = "$ ",
  onInput,
  onReady,
  className,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lineBufferRef = useRef<string>("");
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  // Keep stable refs for callbacks so the onData handler never re-registers
  const onInputRef = useRef<(line: string) => void>(onInput);
  const promptRef = useRef<string>(prompt);

  useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  // Build stable api object once
  const apiRef = useRef<TerminalApi | null>(null);

  const getApi = useCallback((): TerminalApi => {
    if (apiRef.current) return apiRef.current;
    apiRef.current = {
      write(text: string) {
        xtermRef.current?.write(text);
      },
      writeln(text: string) {
        xtermRef.current?.writeln(text);
      },
      clear() {
        xtermRef.current?.clear();
        xtermRef.current?.write(promptRef.current);
      },
      focus() {
        xtermRef.current?.focus();
      },
    };
    return apiRef.current;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: XTERM_THEME,
      fontFamily: '"JetBrains Mono", "SF Mono", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Print the initial prompt
    term.write(promptRef.current);

    // Handle keyboard input via onData (raw character / escape sequences)
    const dataDisposable = term.onData((data: string) => {
      const code = data.charCodeAt(0);

      if (data === "\r") {
        // Enter key
        const line = lineBufferRef.current;
        lineBufferRef.current = "";
        historyIdxRef.current = -1;

        // Push non-empty lines into history
        if (line.trim().length > 0) {
          historyRef.current.unshift(line);
          if (historyRef.current.length > HISTORY_LIMIT) {
            historyRef.current.pop();
          }
        }

        term.write("\r\n");
        onInputRef.current(line);
        term.write(promptRef.current);
      } else if (data === "\x7f") {
        // Backspace
        if (lineBufferRef.current.length > 0) {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1);
          term.write("\b \b");
        }
      } else if (data === "\x1b[A") {
        // Up arrow — previous history
        const history = historyRef.current;
        if (history.length === 0) return;
        const nextIdx = Math.min(
          historyIdxRef.current + 1,
          history.length - 1
        );
        historyIdxRef.current = nextIdx;
        const entry = history[nextIdx];
        // Erase current buffer on screen
        term.write("\b \b".repeat(lineBufferRef.current.length));
        lineBufferRef.current = entry;
        term.write(entry);
      } else if (data === "\x1b[B") {
        // Down arrow — next history (or empty)
        const history = historyRef.current;
        const nextIdx = historyIdxRef.current - 1;
        // Erase current buffer on screen
        term.write("\b \b".repeat(lineBufferRef.current.length));
        if (nextIdx < 0) {
          historyIdxRef.current = -1;
          lineBufferRef.current = "";
        } else {
          historyIdxRef.current = nextIdx;
          const entry = history[nextIdx];
          lineBufferRef.current = entry;
          term.write(entry);
        }
      } else if (data.startsWith("\x1b")) {
        // Other escape sequences — ignore
      } else if (code >= 32 && code <= 126) {
        // Printable ASCII
        lineBufferRef.current += data;
        term.write(data);
      }
      // All other control chars are ignored
    });

    // ResizeObserver keeps terminal sized to its container
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // fitAddon may throw if terminal is disposed
      }
    });
    resizeObserver.observe(containerRef.current);

    // Expose the api
    onReady?.(getApi());

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — onInput and prompt changes handled via refs

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
