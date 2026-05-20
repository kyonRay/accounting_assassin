// sql.js loads WASM — requires Node environment (same pattern as pyodide-runner.test.ts)
// @vitest-environment node

import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  createAccountingDb,
  type AccountingDb,
} from "@/modules/AccountingDB/index";

vi.setConfig({ testTimeout: 30_000 });

let db: AccountingDb;

beforeAll(async () => {
  db = await createAccountingDb();
  await db.loadSeed(
    "CREATE TABLE t(id INT, name TEXT); INSERT INTO t VALUES(1,'a');"
  );
}, 30_000);

describe("AccountingDb", () => {
  describe("load + query roundtrip", () => {
    it("returns rows with column-keyed objects", async () => {
      const rows = await db.query("SELECT * FROM t");
      expect(rows).toEqual([{ id: 1, name: "a" }]);
    });

    it("empty result returns []", async () => {
      const rows = await db.query("SELECT * FROM t WHERE id = 99");
      expect(rows).toEqual([]);
    });
  });

  describe("parameterized query", () => {
    it("returns matching row for bound param", async () => {
      const rows = await db.query("SELECT * FROM t WHERE id = ?", [1]);
      expect(rows).toEqual([{ id: 1, name: "a" }]);
    });

    it("returns [] for non-matching param", async () => {
      const rows = await db.query("SELECT * FROM t WHERE id = ?", [99]);
      expect(rows).toEqual([]);
    });
  });

  describe("reset()", () => {
    it("clears all data — querying a dropped table throws", async () => {
      const fresh = await createAccountingDb();
      await fresh.loadSeed("CREATE TABLE x(v INT); INSERT INTO x VALUES(42);");
      await fresh.reset();
      await expect(fresh.query("SELECT * FROM x")).rejects.toThrow();
    });
  });

  describe("initialSeed option", () => {
    it("runs seed SQL at creation time", async () => {
      const seeded = await createAccountingDb({
        initialSeed: "CREATE TABLE x(v INT);",
      });
      const rows = await seeded.query(
        "SELECT name FROM sqlite_master WHERE name='x'"
      );
      expect(rows).toEqual([{ name: "x" }]);
    });
  });

  describe("multiple statements in loadSeed", () => {
    it("creates both tables", async () => {
      const fresh = await createAccountingDb();
      await fresh.loadSeed("CREATE TABLE a(v INT); CREATE TABLE b(v INT);");
      const rows = await fresh.query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      expect(rows.map((r) => r.name)).toEqual(["a", "b"]);
    });
  });
});
