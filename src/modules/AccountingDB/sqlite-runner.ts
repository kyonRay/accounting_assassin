import initSqlJs, { type Database } from "sql.js";
import { createRequire } from "node:module";
import path from "node:path";

export type SqlValue = string | number | null | Uint8Array;

export type Row = Record<string, SqlValue>;

export interface AccountingDb {
  loadSeed(sql: string): Promise<void>;
  query(sql: string, params?: SqlValue[]): Promise<Row[]>;
  reset(): Promise<void>;
}

export interface CreateAccountingDbOptions {
  initialSeed?: string;
}

function getSqlJsWasmDir(): string {
  try {
    const require_ = createRequire(import.meta.url);
    const sqlJsMainFile = require_.resolve("sql.js") as string;
    return path.dirname(sqlJsMainFile);
  } catch {
    return "";
  }
}

async function freshDb(): Promise<Database> {
  const wasmDir = getSqlJsWasmDir();
  const SQL = await initSqlJs({
    locateFile: (file) =>
      wasmDir ? path.join(wasmDir, file) : file,
  });
  return new SQL.Database();
}

export async function createAccountingDb(
  opts?: CreateAccountingDbOptions
): Promise<AccountingDb> {
  let db = await freshDb();

  if (opts?.initialSeed) {
    db.run(opts.initialSeed);
  }

  function execRows(sql: string, params?: SqlValue[]): Row[] {
    if (params && params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params as Parameters<typeof stmt.bind>[0]);
      const rows: Row[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Row);
      }
      stmt.free();
      return rows;
    }

    const results = db.exec(sql);
    if (results.length === 0) return [];

    const { columns, values } = results[results.length - 1];
    return values.map((row) => {
      const obj: Row = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i] as SqlValue;
      }
      return obj;
    });
  }

  return {
    async loadSeed(sql) {
      db.run(sql);
    },

    async query(sql, params) {
      return execRows(sql, params);
    },

    async reset() {
      db.close();
      db = await freshDb();
    },
  };
}
