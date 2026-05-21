import { invoke } from "@tauri-apps/api/core";

/**
 * Mirror of Rust `AllowedCommand` enum at src-tauri/src/commands/env.rs.
 * When adding a variant: update this union, ALL_COMMANDS in health-check.ts,
 * and AllowedCommand::binary_name() on the Rust side. There is no compile-time
 * check that these stay in sync — a mismatch surfaces only at runtime via a
 * Tauri IPC deserialize error.
 */
export type AllowedCommand = "Python3" | "Claude" | "Brew" | "Git" | "Codex" | "Cursor";

export interface CommandCheck {
  found: boolean;
  path: string | null;
  version: string | null;
}

export interface InitReport {
  workspace: string;
  present: AllowedCommand[];
  missing: AllowedCommand[];
}

/**
 * Mirror of Rust `WorkspaceEntry` at src-tauri/src/diagnostics/report.rs.
 * Contains filename/dirname and size only — NO full paths, NO file content.
 */
export interface WorkspaceEntry {
  name: string;
  kind: "File" | "Directory";
  sizeBytes: number | null;
}

/**
 * Mirror of Rust `ToolReport` at src-tauri/src/diagnostics/report.rs.
 * Contains cmd, found, version — NO path field (privacy: path leaks home dir name).
 */
export interface ToolReport {
  cmd: AllowedCommand;
  found: boolean;
  version: string | null;
}

/**
 * Mirror of Rust `DiagnosticReport` at src-tauri/src/diagnostics/report.rs.
 *
 * Allowlist (exhaustive — nothing else):
 * - appVersion     : cargo package version
 * - osVersion      : macOS product version (e.g. "14.5")
 * - arch           : CPU architecture (e.g. "aarch64")
 * - workspaceExists: whether ~/accounting-learner/ exists
 * - workspaceTopLevel: top-level entries (filename + kind + size) — no content
 * - tools          : tool presence + version — no paths
 * - timestampUtc   : ISO8601 collection time
 */
export interface DiagnosticReport {
  appVersion: string;
  osVersion: string;
  arch: string;
  workspaceExists: boolean;
  workspaceTopLevel: WorkspaceEntry[];
  tools: ToolReport[];
  timestampUtc: string;
}

export function checkCommandExists(cmd: AllowedCommand): Promise<CommandCheck> {
  return invoke<CommandCheck>("check_command_exists", { cmd });
}

export function readUserFile(relPath: string): Promise<string> {
  return invoke<string>("read_user_file", { relPath });
}

export function openTerminalAt(relPath: string): Promise<void> {
  return invoke<void>("open_terminal_at", { relPath });
}

export function initializeRealEnv(): Promise<InitReport> {
  return invoke<InitReport>("initialize_real_env");
}

export function collectDiagnostics(): Promise<DiagnosticReport> {
  return invoke<DiagnosticReport>("collect_diagnostics");
}
