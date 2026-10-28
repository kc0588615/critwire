// The PostGIS loader in PostgreSQL (plan D9.6; port of the spike's LD5–LD9, LD12, plus the real loader's LD10). Written
// before the code, seen failing first. Each case loads with a learner's own command (psqlArgs, childEnv: no password in
// argv) as critwire_lab into a fresh learn_t_ schema (withLabSchema). Failure modes:
// LD5: a wrong expected row count passes, or its failure leaves a half-replaced schema → raises in the DO block, naming
//      the table; the previous schema's rows and md5 unchanged.
// LD6: LD5 without ON_ERROR_STOP (a learner's own psql) commits the half that worked → still atomic.
// LD7: an FK violation loads, or half-loads → fails naming the constraint; previous schema intact.
// LD8: a geometry in another SRID loads → fails validation, naming the column; previous schema intact.
// LD9: the real loader reaches a table outside its schema → only the search_path line mentions public, and after the
//      load nothing in the schema depends on another schema's table.
// LD10: the real loader's bytes change between two generations over the same dist/.
// LD12: a psql in WIN1252 (Windows' console code page) garbles non-ASCII → byte for byte.
// LD13: a learner's view in another schema over the lab schema vanishes on a reload (DROP … CASCADE) → refused, naming
//       it; both schemas intact.
// LD14: an outside foreign key into the lab schema, the same.
// LD15: the guard misses a kind of dependent the cascade drops (materialized view, column of an inside type, default
//       calling an inside function, function over an inside type, trigger running an inside function, policy reading an
//       inside table) → each, alone, refused and named.
// LD16: the guard refuses a clean reload (false positive) over inside views, identity columns, indexes, TOAST, inside
//       FKs, or an unrelated outside table → reloads, the inside extras replaced, the outside table kept.
// LD17: a negative, infinite or NaN uncertainty, a year ≤ 0, or a negative or NaN area loads (SC5) → CHECK violation;
//       NULL (unknown) loads.
// LD18: a LAB_CHECKS violation commits → raises in the DO block, naming the check and its count; previous schema
//       intact; the real loader runs every LAB_CHECKS query.
// LD2/LD3 round-trips: the point loads as POINT(1 2) SRID 4326, every TEXTS value byte for byte.
// The real-loader cases read dist/ (run pnpm build first).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import type postgres from "postgres";
import { loadEnv, requireEnv } from "../../env.ts";
import { childEnv, psqlArgs, urlTarget } from "../../learn/pg.ts";
import { withLabSchema } from "../../test-db.ts";
import { LAB_CHECKS } from "./checks.ts";
import { generateLoader, labLoader } from "./loader.ts";
import { FIXTURE_KEYS, TEXTS, fixtureSpec, withFixture } from "./loader-fixture.ts";

const dist = new URL("../../../dist/", import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "critwire-loader-"));
after(() => rmSync(dir, { recursive: true, force: true }));
loadEnv();
const target = urlTarget(requireEnv("LEARN_PG_URL"), "LEARN_PG_URL");
let n = 0;

// Runs text as a learner does: psql -X -v ON_ERROR_STOP=1 -f <file> (or without the -v), as critwire_lab.
function psqlFile(text: string, opts: { onErrorStop?: boolean; clientEncoding?: string } = {}) {
  const file = join(dir, `l${++n}.sql`);
  writeFileSync(file, text);
  const args = psqlArgs(file).filter((a, i, all) => opts.onErrorStop !== false || (a !== "-v" && all[i - 1] !== "-v"));
  const env = childEnv(target);
  if (opts.clientEncoding) env.PGCLIENTENCODING = opts.clientEncoding;
  return spawnSync("psql", ["-q", ...args], { encoding: "utf8", timeout: 120_000, env });
}

// Every table of the schema with its row count and its rows' md5: "intact" means this is unchanged.
async function fingerprint(sql: postgres.Sql, schema: string): Promise<string> {
  const tables = await sql<{ relname: string }[]>`
    select relname from pg_class where relnamespace = ${schema}::regnamespace and relkind = 'r' order by relname`;
  const parts: string[] = [];
  for (const { relname } of tables) {
    const [{ f }] = await sql.unsafe<{ f: string }[]>(
      `SELECT count(*) || ':' || md5(coalesce(string_agg(t::text, '' ORDER BY t::text), '')) AS f FROM ${schema}.${relname} AS t`);
    parts.push(`${relname}:${f}`);
  }
  return parts.join(" ");
}

// LD5/LD6: the child table's expected row count, 3, changed to 4 in its check and its message.
const WRONG_COUNT = /(FROM child\) <> )3( THEN RAISE EXCEPTION '[^']*expected )3/;

const fixtureLoader = (schema: string, over: Parameters<typeof fixtureSpec>[1] = {}) =>
  withFixture((con) => generateLoader(con, fixtureSpec(schema, over)));

async function loadGood(schema: string) {
  const r = psqlFile(await fixtureLoader(schema));
  assert.equal(r.status, 0, r.stderr);
}

// The real loader over dist/, for schema.
function realLoader(schema: string): Promise<string> {
  if (!existsSync(new URL("learn/data/occurrences.parquet", dist))) throw new Error(`${fileURLToPath(dist)} has no Learn files: run pnpm build first`);
  return labLoader(dist, schema);
}

test("LD2/LD3 the point loads as POINT(1 2) SRID 4326; every text round-trips byte for byte, '' and NULL distinct", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const [p] = await sql.unsafe(`SELECT ST_AsText(geom) || ' ' || ST_SRID(geom) AS p FROM ${schema}.shapes`);
  assert.equal(p!.p, "POINT(1 2) 4326");
  const rows = await sql.unsafe<{ id: number; hex: string | null }[]>(
    `SELECT id, encode(convert_to(s, 'UTF8'), 'hex') AS hex FROM ${schema}.texts ORDER BY id`);
  assert.deepEqual(rows.map((r) => r.hex), TEXTS.map((s) => (s === null ? null : Buffer.from(s, "utf8").toString("hex"))));
}));

test("LD5 a wrong expected row count raises in the DO block, naming the table; the previous schema stays intact", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const before = await fingerprint(sql, schema);
  const good = await fixtureLoader(schema);
  const bad = good.replace(WRONG_COUNT, "$14$24");
  assert.notEqual(bad, good);
  const r = psqlFile(bad);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, new RegExp(`${schema}\\.child: 3 rows, expected 4`));
  assert.equal(await fingerprint(sql, schema), before);
}));

test("LD6 LD5 without ON_ERROR_STOP (a learner's own psql): still atomic", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const before = await fingerprint(sql, schema);
  const bad = (await fixtureLoader(schema)).replace(/^\\set ON_ERROR_STOP on\n/, "").replace(WRONG_COUNT, "$14$24");
  assert.ok(bad.startsWith("BEGIN;"));
  const r = psqlFile(bad, { onErrorStop: false });
  assert.match(r.stderr, /3 rows, expected 4/);
  assert.equal(await fingerprint(sql, schema), before);
}));

test("LD7 an FK violation (unknown parent) fails, naming the constraint; the previous schema stays intact", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const before = await fingerprint(sql, schema);
  const tables = fixtureSpec(schema).tables.map((t) => (t.name === "child" ? { ...t, from: "(SELECT * FROM child UNION ALL SELECT 13, 9)" } : t));
  const r = psqlFile(await fixtureLoader(schema, { tables }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /child_parent_fk/);
  assert.equal(await fingerprint(sql, schema), before);
}));

test("LD8 a geometry with SRID ≠ 4326 fails validation, naming the column; the previous schema stays intact", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const before = await fingerprint(sql, schema);
  const keys = FIXTURE_KEYS.replace("TYPE geometry(Point, 4326) USING ST_GeomFromWKB(decode(geom, 'base64'), 4326)",
    "TYPE geometry USING ST_GeomFromWKB(decode(geom, 'base64'), 3857)");
  assert.notEqual(keys, FIXTURE_KEYS);
  const r = psqlFile(await fixtureLoader(schema, { keys }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, new RegExp(`${schema}\\.shapes\\.geom: 1 geometries with SRID other than 4326`));
  assert.equal(await fingerprint(sql, schema), before);
}));

test("LD12 a psql in WIN1252 (Windows' console code page) still loads non-ASCII byte for byte", () => withLabSchema(async (sql, schema) => {
  const r = psqlFile(await fixtureLoader(schema), { clientEncoding: "WIN1252" });
  assert.equal(r.status, 0, r.stderr);
  const [row] = await sql.unsafe(`SELECT encode(convert_to(s, 'UTF8'), 'hex') AS hex FROM ${schema}.texts WHERE id = 6`);
  assert.equal(row!.hex, Buffer.from(TEXTS[5]!, "utf8").toString("hex"));
}));

// Relations of `schema` whose constraints, rules (views) or own entries depend on a table of another schema.
const DEPENDS_OUTSIDE = (schema: string) => `
  SELECT DISTINCT c.relname || ' -> ' || rn.nspname || '.' || r.relname AS dep
    FROM pg_depend d
    JOIN pg_class r ON d.refclassid = 'pg_class'::regclass AND r.oid = d.refobjid
    JOIN pg_namespace rn ON rn.oid = r.relnamespace
    JOIN pg_class c ON c.oid = CASE d.classid
                                WHEN 'pg_rewrite'::regclass THEN (SELECT ev_class FROM pg_rewrite WHERE oid = d.objid)
                                WHEN 'pg_constraint'::regclass THEN (SELECT conrelid FROM pg_constraint WHERE oid = d.objid)
                                WHEN 'pg_class'::regclass THEN d.objid END
   WHERE c.relnamespace = '${schema}'::regnamespace AND c.oid <> r.oid
     AND rn.nspname NOT IN ('${schema}', 'pg_catalog', 'pg_toast')
   ORDER BY 1`;

test("LD9 the real loader references no public table: text scan, and pg_depend after the load", () => withLabSchema(async (sql, schema) => {
  const text = await realLoader(schema);
  // Outside COPY data and comments, the only mention of public is the search_path line.
  let inData = false;
  const mentions: string[] = [];
  for (const l of text.split("\n")) {
    if (inData) {
      inData = l !== "\\.";
      continue;
    }
    if (/^COPY /.test(l)) inData = true;
    if (/\bpublic\b/i.test(l.replace(/--.*$/, ""))) mentions.push(l);
  }
  assert.deepEqual(mentions, [`SET LOCAL search_path = ${schema}, public;`]);
  const r = psqlFile(text);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual([...await sql.unsafe<{ dep: string }[]>(DEPENDS_OUTSIDE(schema))].map((r) => r.dep), []);
}));

test("LD10 the real loader: two generations over the same dist/ are byte-identical", async () => {
  assert.equal(await realLoader("learn_t_ld10"), await realLoader("learn_t_ld10"));
});

// fn with a second schema, <schema>_o, for a learner's own objects outside the lab schema; dropped afterwards.
async function withOutside(sql: postgres.Sql, schema: string, fn: (out: string) => Promise<void>): Promise<void> {
  const out = `${schema}_o`;
  await sql.unsafe(`CREATE SCHEMA ${out}`);
  try {
    await fn(out);
  } finally {
    await sql.unsafe(`DROP SCHEMA ${out} CASCADE`);
  }
}

// Loads the fixture, runs setup (inside and outside objects), reloads: the reload must fail naming every `named`
// identity, with the lab schema's rows and both schemas' objects unchanged.
async function refusedReload(sql: postgres.Sql, schema: string, setup: (out: string) => string, named: (out: string) => string[]) {
  await loadGood(schema);
  await withOutside(sql, schema, async (out) => {
    await sql.unsafe(setup(out).replaceAll("{s}", schema));
    const objects = async () => [...await sql<{ o: string }[]>`
      select pg_describe_object(classid, objid, objsubid) as o from pg_depend
       where classid <> 0 and pg_describe_object(classid, objid, objsubid) like ${"%" + schema + "%"} order by 1`].map((r) => r.o);
    const before = [await fingerprint(sql, schema), await objects()];
    const r = psqlFile(await fixtureLoader(schema));
    assert.notEqual(r.status, 0, "reload must be refused");
    assert.match(r.stderr, new RegExp(`${schema}: the reload would drop`));
    for (const n of named(out).map((x) => x.replaceAll("{s}", schema))) assert.ok(r.stderr.includes(n), `stderr names ${n}:\n${r.stderr}`);
    assert.deepEqual([await fingerprint(sql, schema), await objects()], before);
  });
}

test("LD13 an outside view over the lab schema: reload refused, naming it; both schemas intact", () => withLabSchema((sql, schema) =>
  refusedReload(sql, schema, (out) => `CREATE VIEW ${out}.v AS SELECT * FROM {s}.parent`, (out) => [`view ${out}.v`])));

test("LD14 an outside foreign key into the lab schema: reload refused, naming it; both schemas intact", () => withLabSchema((sql, schema) =>
  refusedReload(sql, schema, (out) => `CREATE TABLE ${out}.notes (parent_id integer REFERENCES {s}.parent (id))`,
    (out) => [`table constraint notes_parent_id_fkey on ${out}.notes`])));

const INSIDE = `
CREATE TYPE {s}.mood AS ENUM ('calm');
CREATE FUNCTION {s}.one() RETURNS integer LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION {s}.stamp() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';`;
const LD15: [string, (out: string) => string, (out: string) => string][] = [
  ["materialized view", (o) => `CREATE MATERIALIZED VIEW ${o}.mv AS SELECT id FROM {s}.parent`, (o) => `materialized view ${o}.mv`],
  ["column of an inside type", (o) => `CREATE TABLE ${o}.t (id integer, m {s}.mood)`, (o) => `table column ${o}.t.m`],
  ["default calling an inside function", (o) => `CREATE TABLE ${o}.t (x integer DEFAULT {s}.one())`, (o) => `default value for ${o}.t.x`],
  ["function over an inside type", (o) => `CREATE FUNCTION ${o}.f(m {s}.mood) RETURNS integer LANGUAGE sql AS 'SELECT 1'`, (o) => `function ${o}.f({s}.mood)`],
  ["trigger running an inside function", (o) => `CREATE TABLE ${o}.t (x integer); CREATE TRIGGER tr BEFORE INSERT ON ${o}.t FOR EACH ROW EXECUTE FUNCTION {s}.stamp()`, (o) => `trigger tr on ${o}.t`],
  ["policy reading an inside table", (o) => `CREATE TABLE ${o}.t (x integer); CREATE POLICY p ON ${o}.t USING (EXISTS (SELECT 1 FROM {s}.parent))`, (o) => `policy p on ${o}.t`],
];
for (const [kind, setup, named] of LD15) {
  test(`LD15 an outside ${kind}: reload refused, naming it; both schemas intact`, () => withLabSchema((sql, schema) =>
    refusedReload(sql, schema, (out) => INSIDE + ";\n" + setup(out), (out) => [named(out)])));
}

test("LD16 inside views, identity columns, indexes, TOAST and FKs, and an unrelated outside table: the reload succeeds", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const fresh = await fingerprint(sql, schema);
  await withOutside(sql, schema, async (out) => {
    await sql.unsafe(`
      CREATE VIEW ${schema}.parent_names AS SELECT name FROM ${schema}.parent;
      CREATE MATERIALIZED VIEW ${schema}.child_counts AS SELECT parent_id, count(*) FROM ${schema}.child GROUP BY parent_id;
      CREATE TABLE ${schema}.notes (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        parent_id integer REFERENCES ${schema}.parent (id), body text);
      ALTER TABLE ${schema}.notes ALTER COLUMN body SET STORAGE EXTERNAL;
      CREATE INDEX ON ${schema}.notes (parent_id);
      INSERT INTO ${schema}.notes (parent_id, body) VALUES (1, repeat('x', 100000));
      CREATE TABLE ${out}.mine (id integer PRIMARY KEY);
      INSERT INTO ${out}.mine VALUES (1);`);
    const r = psqlFile(await fixtureLoader(schema));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(await fingerprint(sql, schema), fresh);
    const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = '${schema}'::regnamespace AND relname IN ('parent_names', 'child_counts', 'notes')`);
    assert.equal(n, 0);
    const [{ m }] = await sql.unsafe(`SELECT count(*)::int AS m FROM ${out}.mine`);
    assert.equal(m, 1);
  });
}));

const labDdl = readFileSync(new URL("../../../db/learn/lab-ddl.sql", import.meta.url), "utf8");
const OCCURRENCE = (uncertainty: string, year: string) =>
  `INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude, coordinate_uncertainty_m, year) ` +
  `VALUES (1, 1, '00000000-0000-0000-0000-000000000000', 'CC0 1.0', 'OCCURRENCE', 0, 0, ${uncertainty}, ${year})`;
const AREA = (area: string) => `INSERT INTO country_habitats VALUES ('IN', 100, ${area})`;

test("LD17 SC5's CHECKs: negative, ±Infinity or NaN uncertainty, year ≤ 0, negative or NaN area refused; NULL and bounds load", () => withLabSchema(async (sql, schema) => {
  await sql.unsafe(`SET search_path = ${schema}; ${labDdl}`);
  const run = async (stmt: string) => {
    try {
      await sql.unsafe(`SET search_path = ${schema}; ${stmt}`);
      return "ok";
    } catch (e) {
      return (e as { code?: string }).code ?? String(e);
    }
  };
  for (const ok of [OCCURRENCE("NULL", "NULL"), OCCURRENCE("0", "1"), OCCURRENCE("1e7", "2026"), AREA("0"), AREA("12.5")]) {
    assert.equal(await run(`${ok}; TRUNCATE occurrences, country_habitats`), "ok", ok);
  }
  for (const bad of [OCCURRENCE("-1", "NULL"), OCCURRENCE("'Infinity'", "NULL"), OCCURRENCE("'-Infinity'", "NULL"), OCCURRENCE("'NaN'", "NULL"),
    OCCURRENCE("NULL", "0"), OCCURRENCE("NULL", "-5"), AREA("-0.01"), AREA("'NaN'")]) {
    assert.equal(await run(bad), "23514", bad);
  }
}));

test("LD18 a LAB_CHECKS violation raises in the DO block, naming the check and its count; previous schema intact", () => withLabSchema(async (sql, schema) => {
  await loadGood(schema);
  const before = await fingerprint(sql, schema);
  const checks = [{ name: "child_of_two", sql: "SELECT count(*) FROM child WHERE parent_id = 2" }];
  const r = psqlFile(await fixtureLoader(schema, { checks }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, new RegExp(`${schema}: LAB_CHECKS child_of_two: 2 rows break it`));
  assert.equal(await fingerprint(sql, schema), before);
}));

test("LD18 the real loader's DO block runs every LAB_CHECKS query", async () => {
  const text = await realLoader("learn_t_ld18");
  const block = text.slice(text.lastIndexOf("DO $$"));
  for (const c of LAB_CHECKS) {
    assert.ok(block.includes(c.sql), c.name);
    assert.ok(block.includes(`LAB_CHECKS ${c.name}:`), c.name);
  }
});
