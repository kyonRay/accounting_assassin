import { invoke } from "@tauri-apps/api/core";

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
