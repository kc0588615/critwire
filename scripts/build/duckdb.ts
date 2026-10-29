// The build's DuckDB (plan D9.2): in memory, one thread, extension autoload and autoinstall off, so any extension use
// fails instead of reaching for the network, and fixed writer options keep the bytes identical across builds.
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { fileURLToPath } from "node:url";

// A SQL string literal.
export const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`;
// A file URL as a SQL string literal.
export const sqlPath = (url: URL) => sqlText(fileURLToPath(url));

// Runs fn on a fresh offline connection, closed afterwards.
export async function withOfflineDuckDb<T>(fn: (con: DuckDBConnection) => Promise<T>): Promise<T> {
  const db = await DuckDBInstance.create(":memory:", {
    threads: "1",
    autoinstall_known_extensions: "false",
    autoload_known_extensions: "false",
  });
  const con = await db.connect();
  try {
    // Parquet's own setting, unknown at create time: GeoParquet read as plain WKB, never converted (plan D9.2).
    await con.run("SET enable_geoparquet_conversion = false");
    return await fn(con);
  } finally {
    con.closeSync();
    db.closeSync();
  }
}

export type ColumnType = "BIGINT" | "INTEGER" | "VARCHAR" | "DOUBLE" | "BLOB";

// Creates table `name` with `types`' columns, in their order, and appends `rows` (null = NULL).
export async function createTable<R>(con: DuckDBConnection, name: string, types: Record<keyof R & string, ColumnType>, rows: readonly R[]): Promise<void> {
  const columns = Object.keys(types) as (keyof R & string)[];
  await con.run(`CREATE TABLE ${name} (${columns.map((c) => `${c} ${types[c]}`).join(", ")})`);
  const appender = await con.createAppender(name);
  for (const r of rows) {
    for (const c of columns) {
      const v = r[c];
      if (v === null) appender.appendNull();
      else if (types[c] === "BIGINT") appender.appendBigInt(BigInt(v as number));
      else if (types[c] === "INTEGER") appender.appendInteger(v as number);
      else if (types[c] === "DOUBLE") appender.appendDouble(v as number);
      else if (types[c] === "BLOB") appender.appendBlob(v as Uint8Array);
      else appender.appendVarchar(v as string);
    }
    appender.endRow();
  }
  appender.closeSync();
}
