// Pyodide loads WASM + Python stdlib — this is inherently a Node environment
// concern that jsdom cannot provide (fetch/TextDecoder differences in jsdom 29
// cause WASM instantiation to fail). Overriding to "node" per-file is
// explicitly permitted by the project constraints.
// @vitest-environment node

import { describe, it, expect, beforeAll, vi } from "vitest";
import { createVirtualFs } from "@/modules/Sandbox/virtual-fs";
import { createPyodideRunner, type PyodideRunner } from "@/modules/Sandbox/pyodide-runner";

// Loading Pyodide (WASM + Python stdlib) takes several seconds on first call.
// Share one runner instance across all tests in this file.
vi.setConfig({ testTimeout: 60_000 });

let runner: PyodideRunner;

beforeAll(async () => {
  const fs = createVirtualFs();
  runner = await createPyodideRunner({ fs });
}, 60_000);

describe("PyodideRunner", () => {
  describe("run()", () => {
    it("arithmetic + stdout capture: print(1 + 1) → stdout contains '2'", async () => {
      const result = await runner.run("print(1 + 1)");
      expect(result.ok).toBe(true);
      expect(result.stdout).toContain("2");
    });

    it("multiline + variable persistence within one run call: x=5; print(x*2) → stdout has '10'", async () => {
      const result = await runner.run("x = 5\nprint(x * 2)");
      expect(result.ok).toBe(true);
      expect(result.stdout).toContain("10");
    });

    it("error propagation: 1/0 → ok=false, stderr has ZeroDivisionError", async () => {
      const result = await runner.run("1/0");
      expect(result.ok).toBe(false);
      expect(result.stderr).toContain("ZeroDivisionError");
      expect(result.error).toBeDefined();
    });

    it("run() never throws — exceptions are packaged into RunResult", async () => {
      // Should not throw even for syntax errors
      await expect(runner.run("def (")).resolves.toMatchObject({
        ok: false,
      });
    });

    it("stderr capture: writing to sys.stderr ends up in stderr field", async () => {
      const result = await runner.run(
        "import sys\nsys.stderr.write('hello_stderr\\n')"
      );
      expect(result.ok).toBe(true);
      expect(result.stderr).toContain("hello_stderr");
    });
  });

  describe("syncFromVfs()", () => {
    it("files written to VirtualFs are visible to Python open() after syncFromVfs", async () => {
      const fs = createVirtualFs();
      await fs.write("greeting.txt", "hello from vfs");

      const localRunner = await createPyodideRunner({ fs, mountPoint: "/sandbox2" });
      await localRunner.syncFromVfs();

      const result = await localRunner.run(
        "print(open('greeting.txt').read())"
      );
      expect(result.ok).toBe(true);
      expect(result.stdout).toContain("hello from vfs");
    });

    it("syncFromVfs is idempotent: calling twice does not error", async () => {
      const fs = createVirtualFs();
      await fs.write("data.csv", "col\n1\n2\n");

      const localRunner = await createPyodideRunner({ fs, mountPoint: "/sandbox3" });
      // Call twice — second call must not throw.
      await localRunner.syncFromVfs();
      await expect(localRunner.syncFromVfs()).resolves.toBeUndefined();
    });
  });
});
