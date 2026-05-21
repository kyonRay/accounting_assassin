import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import * as core from "@tauri-apps/api/core";
import {
  checkCommandExists,
  readUserFile,
  openTerminalAt,
  initializeRealEnv,
} from "@/modules/RealEnvBridge/invoke";

const mockInvoke = vi.mocked(core.invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("checkCommandExists", () => {
  it("calls check_command_exists with the enum variant", async () => {
    mockInvoke.mockResolvedValueOnce({ found: true, path: "/usr/bin/git", version: "git 2.x" });
    await checkCommandExists("Git");
    expect(mockInvoke).toHaveBeenCalledWith("check_command_exists", { cmd: "Git" });
  });

  it("forwards the resolved CommandCheck", async () => {
    const payload = { found: false, path: null, version: null };
    mockInvoke.mockResolvedValueOnce(payload);
    const result = await checkCommandExists("Codex");
    expect(result).toEqual(payload);
  });
});

describe("readUserFile", () => {
  it("calls read_user_file with camelCase relPath", async () => {
    mockInvoke.mockResolvedValueOnce("file contents");
    await readUserFile("ch01/notes.txt");
    expect(mockInvoke).toHaveBeenCalledWith("read_user_file", { relPath: "ch01/notes.txt" });
  });
});

describe("openTerminalAt", () => {
  it("calls open_terminal_at with camelCase relPath", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await openTerminalAt("ch01");
    expect(mockInvoke).toHaveBeenCalledWith("open_terminal_at", { relPath: "ch01" });
  });
});

describe("initializeRealEnv", () => {
  it("calls initialize_real_env with no extra args", async () => {
    const report = { workspace: "/Users/test/accounting-learner", present: ["Git"], missing: ["Codex"] };
    mockInvoke.mockResolvedValueOnce(report);
    const result = await initializeRealEnv();
    expect(mockInvoke).toHaveBeenCalledWith("initialize_real_env");
    expect(result).toEqual(report);
  });
});
