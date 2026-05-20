import { loadPyodide, type PyodideInterface } from "pyodide";
import { createRequire } from "node:module";
import type { VirtualFs } from "./virtual-fs";

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Present iff ok === false */
  error?: string;
}

export interface PyodideRunner {
  run(code: string): Promise<RunResult>;
  /**
   * Mirror current vfs contents into Pyodide's in-memory FS so that Python
   * code like `open("invoices.csv")` sees the latest fixture files.
   * Idempotent: calling twice does not error.
   */
  syncFromVfs(): Promise<void>;
}

export interface CreatePyodideRunnerOptions {
  fs: VirtualFs;
  /** Defaults to "/sandbox". Must be an absolute path inside Pyodide FS. */
  mountPoint?: string;
}

/**
 * Resolve the pyodide directory for loadPyodide's `indexURL`.
 *
 * In Node / vitest-node, pyodide's internal `_` function is `path.resolve(t, e)`,
 * so it expects a plain filesystem path — NOT a `file://` URL.  Passing a
 * `file://` URL causes it to be treated as a relative path and prefixed with CWD.
 *
 * In browser contexts pyodide uses `new URL(e, t)` so a `file://` or `https://`
 * URL is correct.  We detect the environment and return accordingly.
 *
 * Uses `createRequire` + `require.resolve` which is reliable in both Node and
 * vitest-node — unlike `import.meta.url` whose resolved value is
 * environment-dependent when vitest transforms the source.
 */
function getPyodideIndexUrl(): string {
  try {
    const require = createRequire(import.meta.url);
    const pyodideJs = require.resolve("pyodide/pyodide.js") as string;
    // Return the directory with a trailing slash (path.resolve is fine with it).
    return pyodideJs.replace(/pyodide\.js$/, "");
  } catch {
    // Fallback: CDN (browser context or resolution failure).
    return "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/";
  }
}

/**
 * Create and initialise a PyodideRunner.
 *
 * Returns a Promise because `loadPyodide` is async.
 * The returned runner's `run()` method never throws — all failures are
 * packaged into the RunResult so callers (chapter checkers) can inspect them.
 */
export async function createPyodideRunner(
  opts: CreatePyodideRunnerOptions
): Promise<PyodideRunner> {
  const { fs, mountPoint = "/sandbox" } = opts;

  const indexURL = getPyodideIndexUrl();
  const pyodide: PyodideInterface = await loadPyodide({ indexURL });

  // Ensure the sandbox directory exists inside Pyodide FS (idempotent).
  try {
    pyodide.FS.mkdir(mountPoint);
  } catch (e: unknown) {
    // errno 17 = EEXIST — directory already exists, that's fine.
    const err = e as { errno?: number };
    if (err?.errno !== 17) throw e;
  }

  // JSON.stringify produces a JS string literal (double-quoted, backslash-escaped)
  // that is also valid Python — prevents syntax breakage if mountPoint contains quotes.
  pyodide.runPython(`import os; os.chdir(${JSON.stringify(mountPoint)})`);

  async function syncFromVfs(): Promise<void> {
    const paths = await fs.list();
    for (const p of paths) {
      const content = await fs.read(p);
      // Support nested paths by creating intermediate directories.
      const fullPath = `${mountPoint}/${p}`;
      const dir = fullPath.slice(0, fullPath.lastIndexOf("/"));
      if (dir && dir !== mountPoint) {
        // Create all intermediate directories.
        const segments = dir.split("/").filter(Boolean);
        let accumulated = "";
        for (const seg of segments) {
          accumulated += `/${seg}`;
          try {
            pyodide.FS.mkdir(accumulated);
          } catch (e: unknown) {
            const err = e as { errno?: number };
            if (err?.errno !== 17) throw e;
          }
        }
      }
      pyodide.FS.writeFile(fullPath, content, { encoding: "utf8" });
    }
  }

  async function run(code: string): Promise<RunResult> {
    let stdout = "";
    let stderr = "";

    pyodide.setStdout({
      batched: (s: string) => {
        stdout += s + "\n";
      },
    });
    pyodide.setStderr({
      batched: (s: string) => {
        stderr += s + "\n";
      },
    });

    try {
      await pyodide.runPythonAsync(code);
      return { ok: true, stdout, stderr };
    } catch (e: unknown) {
      const err = e as Error;
      // Pyodide surfaces Python tracebacks in the JS error message.
      // Any partial stderr captured by the batched handler is already in `stderr`.
      // Append the JS error message to stderr so callers see the full traceback.
      const msg = err?.message ?? String(e);
      if (!stderr.includes(msg)) {
        stderr += msg;
      }
      return { ok: false, stdout, stderr, error: msg };
    }
  }

  return { run, syncFromVfs };
}
