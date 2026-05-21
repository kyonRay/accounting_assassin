import {
  readTextFile,
  writeTextFile,
  exists,
  remove,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

// Writes to macOS:
//   ~/Library/Application Support/com.kyong.accounting-assassin/
// Boundary per design spec § 2.5.1 — App-private state ONLY,
// never user documents.
const APP_DATA_DIR = { baseDir: BaseDirectory.AppLocalData } as const;

const tauriStorage: StateStorage = {
  async getItem(name) {
    try {
      const mainFile = `${name}.json`;
      if (await exists(mainFile, APP_DATA_DIR)) {
        try {
          const text = await readTextFile(mainFile, APP_DATA_DIR);
          // Probe-parse: if the main file contains corrupt JSON, fall through
          // to .bak instead of returning garbage to zustand. Without this check,
          // zustand would silently discard an unparseable string and use the
          // initial state — losing the user's backup recovery entirely.
          JSON.parse(text);
          return text;
        } catch {
          // corrupt main file — fall through to .bak
        }
      }
      const bakFile = `${name}.json.bak`;
      if (await exists(bakFile, APP_DATA_DIR)) {
        try {
          const text = await readTextFile(bakFile, APP_DATA_DIR);
          // Probe-parse .bak as well; if both are corrupt return null.
          JSON.parse(text);
          return text;
        } catch {
          // both corrupt
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  async setItem(name, value) {
    // Write main file first; .bak is a hot mirror so the most recent
    // good state is always recoverable (spec § 8.2).
    await writeTextFile(`${name}.json`, value, APP_DATA_DIR);
    await writeTextFile(`${name}.json.bak`, value, APP_DATA_DIR);
  },

  async removeItem(name) {
    try {
      await remove(`${name}.json`, APP_DATA_DIR);
    } catch {
      /* ignore */
    }
    try {
      await remove(`${name}.json.bak`, APP_DATA_DIR);
    } catch {
      /* ignore */
    }
  },
};

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const progressStorage = isTauri
  ? createJSONStorage(() => tauriStorage)
  : createJSONStorage(() => localStorage);

/** @internal — test hook only, do not use in production code */
export const __tauriStorageForTests = tauriStorage;
