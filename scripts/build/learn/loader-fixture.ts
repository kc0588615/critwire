// The loader tests' fixture (loader.test.ts, loader.dbtest.ts): four small tables in an offline DuckDB, and their DDL
// and keys. Not a test file, so importing it runs no test.
import type { DuckDBConnection } from "@duckdb/node-api";
import { withOfflineDuckDb } from "../duckdb.ts";
import type { LoaderSpec } from "./loader.ts";

// POINT(1 2) as little-endian WKB.
export const POINT_WKB = "0101000000000000000000F03F0000000000000040";
// LD3's values: every character that breaks a text-format COPY, plus '' and NULL.
export const TEXTS: (string | null)[] = ["back\\slash \\N \\x01 \\.", 'quote " and ""', "comma, here", "tab\there", "new\nline\r\n", "é ü 日本 🦘", "", null, " lead and trail "];

export const FIXTURE_DDL = `
CREATE TABLE parent (id integer NOT NULL, name text NOT NULL);
CREATE TABLE child (id integer NOT NULL, parent_id integer NOT NULL);
CREATE TABLE texts (id integer NOT NULL, s text);
CREATE TABLE shapes (id integer NOT NULL, geom text NOT NULL);
`;
export const FIXTURE_KEYS = `
ALTER TABLE shapes ALTER COLUMN geom TYPE geometry(Point, 4326) USING ST_GeomFromWKB(decode(geom, 'base64'), 4326);
ALTER TABLE parent ADD PRIMARY KEY (id);
ALTER TABLE child ADD PRIMARY KEY (id);
ALTER TABLE child ADD CONSTRAINT child_parent_fk FOREIGN KEY (parent_id) REFERENCES parent (id);
ALTER TABLE texts ADD PRIMARY KEY (id);
ALTER TABLE shapes ADD PRIMARY KEY (id);
`;
export const fixtureSpec = (schema: string, over: Partial<LoaderSpec> = {}): LoaderSpec => ({
  schema,
  ddl: FIXTURE_DDL,
  keys: FIXTURE_KEYS,
  tables: [
    { name: "parent", key: ["id"] },
    { name: "child", key: ["id"] },
    { name: "texts", key: ["id"] },
    { name: "shapes", key: ["id"] },
  ],
  checks: [],
  ...over,
});

// Runs fn on an offline DuckDB holding the fixture's four tables (rows deliberately out of key order).
export function withFixture<T>(fn: (con: DuckDBConnection) => Promise<T>): Promise<T> {
  return withOfflineDuckDb(async (con) => {
    const lit = (s: string | null) => (s === null ? "NULL" : `'${s.replaceAll("'", "''")}'`);
    await con.run("CREATE TABLE parent AS SELECT * FROM (VALUES (2, 'two'), (1, 'one')) v(id, name)");
    await con.run("CREATE TABLE child AS SELECT * FROM (VALUES (12, 2), (10, 1), (11, 2)) v(id, parent_id)");
    await con.run(`CREATE TABLE texts AS SELECT * FROM (VALUES ${TEXTS.map((s, i) => `(${i + 1}, ${lit(s)}::VARCHAR)`).join(", ")}) v(id, s)`);
    await con.run(`CREATE TABLE shapes AS SELECT 1 AS id, from_hex('${POINT_WKB}') AS geom`);
    return fn(con);
  });
}
