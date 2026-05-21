import { checkCommandExists, type AllowedCommand } from "./invoke";

// Keep in sync with AllowedCommand union in invoke.ts.
const ALL_COMMANDS: AllowedCommand[] = [
  "Python3",
  "Claude",
  "Brew",
  "Git",
  "Codex",
  "Cursor",
];

export interface HealthSnapshot {
  present: Array<{ cmd: AllowedCommand; version: string | null; path: string | null }>;
  missing: AllowedCommand[];
}

export async function runHealthCheck(): Promise<HealthSnapshot> {
  const results = await Promise.all(
    ALL_COMMANDS.map(async (cmd) => {
      try {
        const check = await checkCommandExists(cmd);
        return { cmd, check };
      } catch {
        // A rejected invoke means the command is unreachable — treat as missing.
        return { cmd, check: { found: false, path: null, version: null } };
      }
    }),
  );

  const present: HealthSnapshot["present"] = [];
  const missing: AllowedCommand[] = [];

  for (const { cmd, check } of results) {
    if (check.found) {
      present.push({ cmd, version: check.version, path: check.path });
    } else {
      missing.push(cmd);
    }
  }

  return { present, missing };
}
