// The PostGIS loader (plan D9.6, 004 §4.3; port of the spike's scripts/loader.ts): one psql script,
// /learn/data/postgis/learn_curriculum.sql, that builds the lab schema with nothing but psql, in one transaction:
//   \set ON_ERROR_STOP on · BEGIN · client_encoding · lock_timeout · the MF4 guard's DO block, which drops the schema ·
//   CREATE SCHEMA · SET LOCAL search_path · db/learn/lab-ddl.sql · COPY … FROM stdin (FORMAT csv) per table ·
//   db/learn/lab-keys.sql · ANALYZE · a DO block that raises (row counts, SRID, LAB_CHECKS) · COMMIT
// Rows come from the build's DuckDB over dist/'s published files (withLabTables). WKB is written as base64 text (a
// third smaller than bytea's hex, csv-safe); lab-keys.sql decodes it into geometry. Rows are ordered by key, so the same
// inputs give the same bytes. Tests: loader.test.ts (LD1–LD4, LD10, LD11), loader.dbtest.ts (LD2/3, LD5–LD10, LD12–LD18).
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DuckDBConnection } from "@duckdb/node-api";
import { LAB_SCHEMA } from "../../learn/pg.ts";
import { sqlText } from "../duckdb.ts";
import { LAB_CHECKS, type LabCheck } from "./checks.ts";
import { LAB_TABLES, withLabTables, type LabTable } from "./projection.ts";
import { codeOnly, splitStatements } from "./sql.ts";

const labDdl = new URL("../../../db/learn/lab-ddl.sql", import.meta.url);
const labKeys = new URL("../../../db/learn/lab-keys.sql", import.meta.url);

export interface LoaderSpec {
  schema: string;
  /** Tables (columns, NOT NULL, CHECK) and views; no keys. */
  ddl: string;
  /** What runs after the rows are in: geometry conversion, keys, indexes. */
  keys: string;
  /** Parents first; `from` defaults to the table's name. */
  tables: readonly LabTable[];
  /** Run in the final DO block; any count above 0 raises. */
  checks: readonly LabCheck[];
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
const CHECK_NAME = /^[a-z0-9_]+$/;
const TABLE_CONSTRAINT = /^(CHECK|CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|EXCLUDE|LIKE)\b/i;
const TX_CONTROL = /^(BEGIN|COMMIT|ROLLBACK|END|ABORT|START|SAVEPOINT|RELEASE|PREPARE)\b/i;
// DuckDB types the CSV writer gives PostgreSQL unchanged (BLOB is handled apart, as WKB).
const PLAIN_TYPE = /^(VARCHAR|INTEGER|BIGINT|SMALLINT|DOUBLE|FLOAT|BOOLEAN|DATE|DECIMAL\(\d+,\d+\))$/;

// Each CREATE TABLE's columns, in order. Only the strict layout lab-ddl.sql uses; anything else throws.
export function ddlColumns(ddl: string): Map<string, string[]> {
  const tables = new Map<string, string[]>();
  for (const { text } of splitStatements(ddl)) {
    const code = codeOnly(text).trim();
    const m = /^CREATE\s+TABLE\s+(\S+)\s*\(/i.exec(code);
    if (!m) continue;
    const name = m[1]!;
    if (!IDENT.test(name)) throw new Error(`lab DDL: table name ${name}: unqualified lower-case names only`);
    const body = code.slice(m[0].length, code.lastIndexOf(")"));
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < body.length; i++) {
      if (body[i] === "(") depth++;
      else if (body[i] === ")") depth--;
      else if (body[i] === "," && depth === 0) items.push(body.slice(start, (start = i + 1) - 1));
    }
    items.push(body.slice(start));
    const cols = items
      .map((s) => s.trim())
      .filter((s) => !TABLE_CONSTRAINT.test(s))
      .map((s) => {
        const col = s.split(/\s+/)[0]!;
        if (!IDENT.test(col)) throw new Error(`lab DDL: ${name}: column ${col}: unquoted lower-case names only`);
        return col;
      });
    if (tables.has(name)) throw new Error(`lab DDL: table ${name} twice`);
    tables.set(name, cols);
  }
  return tables;
}

// Throws unless a hand-written part (DDL, keys) is plain SQL: the loader owns transaction control, COPY and psql
// meta-commands.
function assertPlainSql(text: string, what: string): void {
  for (const { n, text: s } of splitStatements(text)) {
    const code = codeOnly(s).trim();
    const word = /^\S+/.exec(code)?.[0] ?? "";
    if (TX_CONTROL.test(word)) throw new Error(`loader ${what}, statement ${n}: transaction control (${word}); the loader is one transaction`);
    if (/^COPY$/i.test(word)) throw new Error(`loader ${what}, statement ${n}: COPY; the loader writes every COPY itself (FORMAT csv)`);
    if (/^\\|\n\s*\\/.test(code)) throw new Error(`loader ${what}, statement ${n}: a psql meta-command`);
  }
}

// The loader's lines outside COPY data.
function sqlLines(text: string): string[] {
  const out: string[] = [];
  let inData = false;
  for (const line of text.split("\n")) {
    if (inData) inData = line !== "\\.";
    else {
      out.push(line);
      if (/^\s*COPY\b/i.test(line)) inData = true;
    }
  }
  return out;
}

// Throws unless every COPY reads FROM stdin in csv format, where a backslash is plain text (004 F10).
export function assertCsvCopies(text: string): void {
  for (const line of sqlLines(text)) {
    if (/^\s*COPY\b/i.test(line) && !/^COPY [a-z_][a-z0-9_]* \([^)]*\) FROM stdin \(FORMAT csv\);$/.test(line)) {
      throw new Error(`loader: every COPY must read FROM stdin (FORMAT csv): ${line}`);
    }
  }
}

// MF4 (plan D9.6 step 2, 004 §3.2): drops the schema in a DO block that raises, so the transaction changes nothing, if
// the cascade took anything outside it with it. Postgres computes the cascade; the guard only snapshots every object
// outside the schema that has a pg_depend entry (rules, triggers, defaults and policies, which have no schema of their
// own, take their relation's; pg_toast belongs to its table), drops, and names each one no longer there.
function guardBlock(schema: string): string[] {
  return [
    `-- If something of yours outside ${schema} depends on it (a view, a foreign key, a trigger…), the replace would`,
    "-- drop that too: this refuses instead, naming each one, and nothing changes.",
    "DO $guard$",
    "DECLARE",
    "  outside jsonb;",
    "  lost text;",
    "BEGIN",
    `  IF to_regnamespace('${schema}') IS NULL THEN RETURN; END IF;`,
    "  SELECT jsonb_object_agg(k, label) INTO outside FROM (",
    "    SELECT concat_ws(':', d.classid, d.objid, d.objsubid) AS k, o.type || ' ' || o.identity AS label,",
    "           coalesce(o.schema, (SELECT n.nspname FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace",
    "                                WHERE c.oid = CASE d.classid",
    "                                  WHEN 'pg_rewrite'::regclass THEN (SELECT ev_class FROM pg_rewrite WHERE oid = d.objid)",
    "                                  WHEN 'pg_trigger'::regclass THEN (SELECT tgrelid FROM pg_trigger WHERE oid = d.objid)",
    "                                  WHEN 'pg_attrdef'::regclass THEN (SELECT adrelid FROM pg_attrdef WHERE oid = d.objid)",
    "                                  WHEN 'pg_policy'::regclass THEN (SELECT polrelid FROM pg_policy WHERE oid = d.objid)",
    "                                END)) AS owner",
    "      FROM (SELECT DISTINCT classid, objid, objsubid FROM pg_depend) AS d,",
    "           pg_identify_object(d.classid, d.objid, d.objsubid) AS o",
    `  ) AS deps WHERE owner IS DISTINCT FROM '${schema}' AND owner IS DISTINCT FROM 'pg_toast';`,
    `  DROP SCHEMA ${schema} CASCADE;`,
    "  SELECT string_agg(outside ->> k, E'\n  ' ORDER BY outside ->> k) INTO lost FROM (",
    "    SELECT jsonb_object_keys(outside) EXCEPT SELECT concat_ws(':', classid, objid, objsubid) FROM pg_depend",
    "  ) AS gone (k);",
    "  IF lost IS NOT NULL THEN",
    `    RAISE EXCEPTION E'${schema}: the reload would drop these, outside the schema, which depend on it:\n  %', lost`,
    `      USING HINT = 'They are yours, outside ${schema}. Move or drop them, or give the labs a database of their own. Nothing changed.';`,
    "  END IF;",
    "END",
    "$guard$;",
  ];
}

// One table's COPY: its rows as csv, in DDL column order, ordered by key; WKB as base64.
async function copyTable(con: DuckDBConnection, t: LabTable, cols: string[], tmp: string): Promise<{ text: string; rows: bigint; wkb: string[] }> {
  const from = t.from ?? t.name;
  let described: { column_name: string; column_type: string }[];
  try {
    described = (await con.runAndReadAll(`DESCRIBE SELECT * FROM ${from}`)).getRowObjectsJson() as typeof described;
  } catch (e) {
    throw new Error(`loader: ${t.name}: input ${from}: ${(e as Error).message.split("\n")[0]}`);
  }
  const types = new Map(described.map((d) => [d.column_name, d.column_type]));
  for (const c of types.keys()) if (!cols.includes(c)) throw new Error(`loader: ${t.name}: unexpected column ${c} in ${from}`);
  for (const c of cols) if (!types.has(c)) throw new Error(`loader: ${t.name}: input lacks column ${c} (${from})`);
  const wkb: string[] = [];
  const select = cols.map((c) => {
    const type = types.get(c)!;
    if (type === "BLOB") {
      wkb.push(c);
      return `to_base64("${c}") AS "${c}"`;
    }
    if (!PLAIN_TYPE.test(type)) throw new Error(`loader: ${t.name}.${c}: type ${type} has no csv form here`);
    return `"${c}"`;
  });
  const file = join(tmp, `${t.name}.csv`);
  const order = t.key.map((k) => `"${k}"`).join(", ");
  await con.run(`COPY (SELECT ${select.join(", ")} FROM ${from} ORDER BY ${order}) TO ${sqlText(file)} (FORMAT csv, HEADER false)`);
  const data = await readFile(file, "utf8");
  // psql ends COPY data at a line `\.`, even inside a quoted field.
  if (data.split("\n").includes("\\.")) throw new Error(`loader: ${t.name}: a value holds a line "\\." (psql's end of COPY data)`);
  const rows = (await con.runAndReadAll(`SELECT count(*) FROM ${from}`)).getRows()[0]![0] as bigint;
  return { text: `COPY ${t.name} (${cols.join(", ")}) FROM stdin (FORMAT csv);\n${data}\\.\n`, rows, wkb };
}

// The loader's text for spec's tables, read from con (query; it only writes and removes its own temp folder).
export async function generateLoader(con: DuckDBConnection, spec: LoaderSpec): Promise<string> {
  if (!IDENT.test(spec.schema)) throw new Error(`loader: schema ${spec.schema}: lower-case name only`);
  assertPlainSql(spec.ddl, "DDL");
  assertPlainSql(spec.keys, "keys");
  const columns = ddlColumns(spec.ddl);
  for (const t of spec.tables) if (!columns.has(t.name)) throw new Error(`loader: ${t.name}: not in the DDL`);
  for (const name of columns.keys()) if (!spec.tables.some((t) => t.name === name)) throw new Error(`loader: ${name}: no input`);
  for (const c of spec.checks) {
    if (!CHECK_NAME.test(c.name)) throw new Error(`loader: check ${c.name}: lower-case name only`);
    if (c.sql.includes("$")) throw new Error(`loader: check ${c.name}: $ in its SQL could end the DO block`);
  }
  const tmp = await mkdtemp(join(tmpdir(), "critwire-loader-"));
  try {
    const copies: string[] = [];
    const checks: string[] = [];
    for (const t of spec.tables) {
      const { text, rows, wkb } = await copyTable(con, t, columns.get(t.name)!, tmp);
      copies.push(text);
      checks.push(`  IF (SELECT count(*) FROM ${t.name}) <> ${rows} THEN RAISE EXCEPTION '${spec.schema}.${t.name}: % rows, expected ${rows}', (SELECT count(*) FROM ${t.name}); END IF;`);
      for (const c of wkb) {
        const bad = `(SELECT count(*) FROM ${t.name} WHERE ST_SRID(${c}) <> 4326)`;
        checks.push(`  IF ${bad} > 0 THEN RAISE EXCEPTION '${spec.schema}.${t.name}.${c}: % geometries with SRID other than 4326', ${bad}; END IF;`);
      }
    }
    for (const c of spec.checks) {
      checks.push(`  IF (${c.sql}) > 0 THEN RAISE EXCEPTION '${spec.schema}: LAB_CHECKS ${c.name}: % rows break it', (${c.sql}); END IF;`);
    }
    const text = [
      "\\set ON_ERROR_STOP on",
      "BEGIN;",
      `-- critwire Learn: the lab database, schema ${spec.schema}. Written by the build; edits are lost on the next build.`,
      `-- Run: psql -X -v ON_ERROR_STOP=1 -d <database> -f ${spec.schema}.sql   (PostgreSQL 16, PostGIS 3.4 or later)`,
      `-- It replaces the whole schema ${spec.schema}, tables you made there included, in one transaction:`,
      "-- if any step fails, nothing changes.",
      "",
      "-- The file is UTF-8, whatever your terminal's code page (psql on Windows defaults to it, and would garble names).",
      "SET client_encoding = 'UTF8';",
      "-- Waits at most a minute for a lock (a session still reading the old schema), then fails and changes nothing.",
      "SET LOCAL lock_timeout = '60s';",
      ...guardBlock(spec.schema),
      `CREATE SCHEMA ${spec.schema};`,
      `SET LOCAL search_path = ${spec.schema}, public;`,
      "",
      spec.ddl.trim(),
      "",
      ...copies,
      spec.keys.trim(),
      "",
      ...spec.tables.map((t) => `ANALYZE ${t.name};`),
      "",
      "-- Validation: every table has the rows the build wrote, every shape is in SRID 4326, and every rule the keys and",
      "-- CHECKs above can't state holds (each query counts the rows breaking it). Shapes may be invalid on purpose (g2).",
      "DO $$",
      "BEGIN",
      ...checks,
      "END",
      "$$;",
      "",
      "COMMIT;",
      "",
    ].join("\n");
    assertCsvCopies(text);
    return text;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// The lab loader for `schema` over out/'s published files (query).
export async function labLoader(out: URL, schema: string = LAB_SCHEMA): Promise<string> {
  const [ddl, keys] = await Promise.all([readFile(labDdl, "utf8"), readFile(labKeys, "utf8")]);
  return withLabTables(out, (con) => generateLoader(con, { schema, ddl, keys, tables: LAB_TABLES, checks: LAB_CHECKS }));
}
