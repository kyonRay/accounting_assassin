import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import * as core from "@tauri-apps/api/core";
import { runHealthCheck } from "@/modules/RealEnvBridge/health-check";

const mockInvoke = vi.mocked(core.invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

function makeCheck(found: boolean, version?: string, path?: string) {
  return { found, path: path ?? null, version: version ?? null };
}

describe("runHealthCheck", () => {
  it("partitions commands into present and missing based on found flag", async () => {
    // Python3 and Git found; rest not found
    mockInvoke.mockImplementation((_cmd, args) => {
      const cmd = (args as { cmd: string }).cmd;
      if (cmd === "Python3") return Promise.resolve(makeCheck(true, "Python 3.11.0", "/usr/bin/python3"));
      if (cmd === "Git") return Promise.resolve(makeCheck(true, "git 2.39.0", "/usr/bin/git"));
      return Promise.resolve(makeCheck(false));
    });

    const snapshot = await runHealthCheck();

    expect(snapshot.present).toHaveLength(2);
    expect(snapshot.present.map((p) => p.cmd)).toContain("Python3");
    expect(snapshot.present.map((p) => p.cmd)).toContain("Git");

    expect(snapshot.missing).toHaveLength(4);
    expect(snapshot.missing).toContain("Claude");
    expect(snapshot.missing).toContain("Brew");
    expect(snapshot.missing).toContain("Codex");
    expect(snapshot.missing).toContain("Cursor");
  });

  it("includes version and path in present entries", async () => {
    mockInvoke.mockImplementation((_cmd, args) => {
      const cmd = (args as { cmd: string }).cmd;
      if (cmd === "Git") return Promise.resolve(makeCheck(true, "git 2.39.0", "/usr/bin/git"));
      return Promise.resolve(makeCheck(false));
    });

    const snapshot = await runHealthCheck();
    const gitEntry = snapshot.present.find((p) => p.cmd === "Git");
    expect(gitEntry).toBeDefined();
    expect(gitEntry?.version).toBe("git 2.39.0");
    expect(gitEntry?.path).toBe("/usr/bin/git");
  });

  it("places a rejected invoke into missing instead of throwing", async () => {
    // Claude invoke rejects; all others return not found
    mockInvoke.mockImplementation((_cmd, args) => {
      const cmd = (args as { cmd: string }).cmd;
      if (cmd === "Claude") return Promise.reject(new Error("command not registered"));
      return Promise.resolve(makeCheck(false));
    });

    const snapshot = await runHealthCheck();
    expect(snapshot.missing).toContain("Claude");
    expect(snapshot.present).toHaveLength(0);
  });

  it("all commands found → missing is empty", async () => {
    mockInvoke.mockResolvedValue(makeCheck(true, "1.0.0", "/usr/local/bin/x"));
    const snapshot = await runHealthCheck();
    expect(snapshot.missing).toHaveLength(0);
    expect(snapshot.present).toHaveLength(6);
  });
});
