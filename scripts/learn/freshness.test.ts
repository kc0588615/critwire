// freshness.ts: checked.json, the build's proof that learn:check ran what it publishes (plan D6; 004 §7.5). Written
// before the code, seen failing first. Failure modes:
// - a change that decides a block's result leaves its key equal, so a stale recorded result ships: its text, a block
//   its `-- after:` chain brings (transitively), a boot block, pg-session, a lab data file, the checker, canary.sql or
//   requirements.txt → each changes the key;
// - a change that can't move a result makes every lab stale (a --draft build's DOIs, file sizes, the star) → no change;
// - a recorded result edited after learn:check keeps its stamp → refused, naming the file;
// - a block without a key, a key without a block, a download changed, missing or extra → refused, naming it;
// - a rerun with nothing changed rewrites checked.json (a date-only diff in every PR) → byte for byte;
// - the checker imports the build's species chain, so every data edit makes every lab stale → its closure is pinned;
// - lab.mmd, the loader or a boot block changes after learn:check checked the lab ERD against them → labErd moves and
//   the build refuses it; a plain block or another data file leaves it alone;
// - GDAL's version (raster blocks) isn't recorded, or a newer one makes every lab stale → recorded, never compared.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseBlock, type Block } from "./blocks.ts";
import type { CoursePage } from "./course.ts";
import { CHECKED_JSON, freshness, importClosure, nextStamp, staleness, type Fresh, type KeyFiles, type Stamp } from "./freshness.ts";

function block(id: string, ...lines: string[]): Block {
  const { block: b, errors } = parseBlock(`site/learn/sql/${id}.sql`, lines.join("\n") + "\n");
  assert.deepEqual(errors, [], id);
  return b!;
}
const pg = (id: string, headers: string[], ...code: string[]) => block(id, `-- q: ${id}`, "-- status: ran", ...headers, "-- engine: postgis", ...code);
const page = (id: string, ...blocks: Block[]): CoursePage => ({ page: { id, file: `site/learn/modules/${id}.html`, html: "" }, slots: [], blocks });

const session = pg("pg-session", [], "SET search_path = learn_curriculum, public;", "SHOW search_path;");
const boot = pg("s4-cells", ["-- boot"], "CREATE TABLE s4_cells (id int);");
const a = pg("d1-a", [], "CREATE TEMP TABLE a AS SELECT 1 AS id;");
const b = pg("d1-b", ["-- after: d1-a"], "CREATE TEMP TABLE b AS SELECT id FROM a;");
const c = pg("d1-c", ["-- after: d1-b"], "SELECT id FROM b;");
const other = pg("d3-x", [], "SELECT 1 AS one;");
const course = (over: Partial<Record<"session" | "boot" | "a" | "b" | "c", Block>> = {}) => [
  page("setup", over.session ?? session),
  page("s4", over.boot ?? boot),
  page("d1", over.a ?? a, over.b ?? b, over.c ?? c),
  page("d3", other),
];
const files: KeyFiles = {
  manifest: {
    "occurrences.csv": { sha256: "a".repeat(64), bytes: 10 },
    "postgis/learn_curriculum.sql": { sha256: "b".repeat(64), bytes: 20 },
    "star/fact_records.csv": { sha256: "c".repeat(64), bytes: 30 },
  },
  checker: { "scripts/learn/runner.ts": "d".repeat(64), "db/learn/canary.sql": "e".repeat(64), "site/learn/labs/requirements.txt": "f".repeat(64) },
  labErd: "erDiagram\n  taxa {\n    INTEGER id PK\n  }\n",
};
const results = (pages: CoursePage[]) => new Map(pages.flatMap((p) => p.blocks).map((x) => [x.id, `-- result: ${x.id}`]));
const fresh = (pages = course(), f: KeyFiles = files) => freshness(pages, f, results(pages));
const key = (id: string, pages = course(), f: KeyFiles = files) => fresh(pages, f).blocks[id]!.key;
const edit = (x: Block, extra: string) => block(x.id, ...x.text.trimEnd().split("\n"), extra);

test("FR1 every ran PostGIS block gets a key and its result's sha256; browser and untested blocks don't", () => {
  const browser = block("f1-a", "-- q: f1-a", "-- status: ran", "SELECT 1 AS one;");
  const later = block("d1-later", "-- q: d1-later", "-- status: untested: later", "-- engine: postgis", "SELECT 1 AS one;");
  const pages = [...course(), page("f1", browser, later)];
  const f = fresh(pages);
  assert.deepEqual(Object.keys(f.blocks), ["d1-a", "d1-b", "d1-c", "d3-x", "pg-session", "s4-cells"]);
  assert.match(f.blocks["d1-c"]!.key, /^[0-9a-f]{64}$/);
  assert.equal(f.blocks["d1-c"]!.result, createHash("sha256").update("-- result: d1-c").digest("hex"));
  assert.deepEqual(Object.keys(f.downloads), ["d1.sql", "d3.sql", "f1.sql", "s4.sql"], "f1: its untested PostGIS block, commented out");
});

test("FR2 the key moves with the block, its after chain (transitively), a boot block and pg-session", () => {
  const base = key("d1-c");
  assert.notEqual(key("d1-c", course({ c: edit(c, "-- a comment") })), base, "its text");
  assert.notEqual(key("d1-c", course({ b: edit(b, "-- a comment") })), base, "its after block");
  assert.notEqual(key("d1-c", course({ a: edit(a, "-- a comment") })), base, "its after block's after block");
  assert.notEqual(key("d1-c", course({ boot: edit(boot, "-- a comment") })), base, "a boot block");
  assert.notEqual(key("d1-c", course({ session: edit(session, "-- a comment") })), base, "pg-session");
  assert.equal(key("d3-x", course({ c: edit(c, "-- a comment") })), key("d3-x"), "another page's block doesn't");
});

test("FR3 the key moves with a lab data file, the checker, canary.sql and requirements.txt; not with sizes or the star", () => {
  const base = key("d1-c");
  const m = files.manifest;
  const with_ = (over: Partial<KeyFiles>) => key("d1-c", course(), { ...files, ...over });
  assert.notEqual(with_({ manifest: { ...m, "occurrences.csv": { sha256: "1".repeat(64), bytes: 10 } } }), base, "a data file");
  assert.notEqual(with_({ manifest: { ...m, "postgis/learn_curriculum.sql": { sha256: "1".repeat(64), bytes: 20 } } }), base, "the loader");
  assert.notEqual(with_({ manifest: { ...m, "biomes.csv": { sha256: "1".repeat(64), bytes: 1 } } }), base, "a new data file");
  for (const path of Object.keys(files.checker)) assert.notEqual(with_({ checker: { ...files.checker, [path]: "1".repeat(64) } }), base, path);
  assert.equal(with_({ manifest: { ...m, "occurrences.csv": { sha256: "a".repeat(64), bytes: 11 } } }), base, "bytes");
  assert.equal(with_({ manifest: { ...m, "star/fact_records.csv": { sha256: "1".repeat(64), bytes: 30 } } }), base, "a star file");
  assert.equal(with_({ manifest: { ...m, "star/dim_year.csv": { sha256: "1".repeat(64), bytes: 1 } } }), base, "a new star file");
});

const stamp = (f: Fresh): Stamp => ({ versions: { postgresql: "16.15", postgis: "3.4.2", geos: "3.12.1", gdal: "3.8.4" }, checked: "2026-10-28", ...f });

test("FR4 a fresh stamp passes; a stale key, an edited result, a missing or orphan key, a changed or missing download are refused", () => {
  const now = fresh();
  assert.deepEqual(staleness(stamp(now), now), []);
  const old = fresh(course({ c: edit(c, "-- before") }));
  assert.deepEqual(staleness(stamp({ ...now, blocks: { ...now.blocks, "d1-c": old.blocks["d1-c"]! } }), now), ["lab d1-c is stale: run pnpm learn:check"]);
  const edited = { ...now.blocks["d1-c"]!, result: "0".repeat(64) };
  assert.deepEqual(staleness(stamp({ ...now, blocks: { ...now.blocks, "d1-c": edited } }), now),
    [`site/learn/labs/checked/d1-c.txt changed after learn:check: run pnpm learn:check`]);
  const { "d3-x": _, ...without } = now.blocks;
  assert.deepEqual(staleness(stamp({ ...now, blocks: without }), now), ["lab d3-x is stale: run pnpm learn:check"]);
  assert.deepEqual(staleness(stamp({ ...now, blocks: { ...now.blocks, gone: now.blocks["d3-x"]! } }), now),
    [`${CHECKED_JSON}: block gone has a key but no ran PostGIS block: run pnpm learn:check`]);
  assert.deepEqual(staleness(stamp({ ...now, downloads: { ...now.downloads, "d1.sql": "0".repeat(64) } }), now), ["download d1.sql is stale: run pnpm learn:check"]);
  const { "d3.sql": __, ...fewer } = now.downloads;
  assert.deepEqual(staleness(stamp({ ...now, downloads: fewer }), now), ["download d3.sql is stale: run pnpm learn:check"]);
  assert.deepEqual(staleness(stamp({ ...now, downloads: { ...now.downloads, "x.sql": "0".repeat(64) } }), now),
    [`${CHECKED_JSON}: download x.sql has a sha256 but no page: run pnpm learn:check`]);
  assert.deepEqual(staleness(undefined, now), [`${CHECKED_JSON}: missing: run pnpm learn:check`]);
});

test("FR5 stale blocks are named five at a time, then counted", () => {
  const pages = [page("setup", session), page("d1", ...Array.from({ length: 7 }, (_, i) => pg(`d1-${i}`, [], `SELECT ${i} AS n;`)))];
  const now = freshness(pages, files, results(pages));
  const errors = staleness(stamp({ ...now, blocks: {} }), now);
  assert.deepEqual(errors, ["lab d1-0, d1-1, d1-2, d1-3, d1-4 and 3 more are stale: run pnpm learn:check"]);
});

test("FR6 nextStamp: nothing changed but the date → undefined; any change → the new stamp, dated today", () => {
  const now = fresh();
  const versions = { postgresql: "16.15", postgis: "3.4.2", geos: "3.12.1", gdal: "3.8.4" };
  const first = nextStamp(null, now, versions, "2026-10-28")!;
  assert.deepEqual(JSON.parse(first), stamp(now));
  assert.ok(first.endsWith("}\n"));
  assert.equal(nextStamp(first, now, versions, "2026-10-29"), undefined);
  const moved = nextStamp(first, now, { ...versions, geos: "3.13.0" }, "2026-10-29")!;
  assert.equal(JSON.parse(moved).checked, "2026-10-29");
  const changed = nextStamp(first, fresh(course({ c: edit(c, "-- x") })), versions, "2026-10-30")!;
  assert.equal(JSON.parse(changed).checked, "2026-10-30");
});

test("FR7 the checker's closure: learn-check.ts's relative imports, nothing from scripts/build/ but the lexer", () => {
  const root = new URL("../../", import.meta.url);
  const closure = importClosure("scripts/learn-check.ts", (path) => readFileSync(new URL(path, root), "utf8"));
  assert.deepEqual(closure.filter((p) => p.startsWith("scripts/build/")), ["scripts/build/learn/sql.ts"]);
  assert.deepEqual(closure, [
    "scripts/build/learn/sql.ts",
    "scripts/env.ts",
    "scripts/json.ts",
    "scripts/learn-check.ts",
    "scripts/learn/assemble.ts",
    "scripts/learn/blocks.ts",
    "scripts/learn/cell.ts",
    "scripts/learn/check.ts",
    "scripts/learn/cleanup.ts",
    "scripts/learn/course-files.ts",
    "scripts/learn/course.ts",
    "scripts/learn/erd-model.ts",
    "scripts/learn/freshness.ts",
    "scripts/learn/leaks.ts",
    "scripts/learn/pg.ts",
    "scripts/learn/plan.ts",
    "scripts/learn/privilege.ts",
    "scripts/learn/python.ts",
    "scripts/learn/record.ts",
    "scripts/learn/result.ts",
    "scripts/learn/runner.ts",
    "scripts/learn/setup.ts",
    "scripts/venv.ts",
  ]);
});

test("FR8 labErd moves with lab.mmd, the loader and a boot block; not with a plain block, another data file or the checker", () => {
  const base = fresh().labErd;
  assert.match(base, /^[0-9a-f]{64}$/);
  const m = files.manifest;
  const with_ = (over: Partial<KeyFiles>, pages = course()) => fresh(pages, { ...files, ...over }).labErd;
  assert.notEqual(with_({ labErd: files.labErd + "%% a comment\n" }), base, "lab.mmd");
  assert.notEqual(with_({ manifest: { ...m, "postgis/learn_curriculum.sql": { sha256: "1".repeat(64), bytes: 20 } } }), base, "the loader");
  assert.notEqual(fresh(course({ boot: edit(boot, "-- a comment") })).labErd, base, "a boot block");
  assert.equal(fresh(course({ c: edit(c, "-- a comment") })).labErd, base, "a plain block");
  assert.equal(with_({ manifest: { ...m, "occurrences.csv": { sha256: "1".repeat(64), bytes: 10 } } }), base, "another data file");
  assert.equal(with_({ checker: { ...files.checker, "scripts/learn/runner.ts": "1".repeat(64) } }), base, "the checker");
  const { "postgis/learn_curriculum.sql": _, ...noLoader } = m;
  assert.throws(() => with_({ manifest: noLoader }), /manifest has no postgis\/learn_curriculum\.sql/);
  const now = fresh();
  assert.deepEqual(staleness(stamp({ ...now, labErd: "0".repeat(64) }), now),
    ["the lab ERD is stale (site/learn/erd/lab.mmd, the loader or a boot block changed): run pnpm learn:check"]);
  const { labErd: __, ...unstamped } = now;
  assert.deepEqual(staleness({ ...stamp(now), ...unstamped, labErd: undefined as unknown as string }, now),
    ["the lab ERD is stale (site/learn/erd/lab.mmd, the loader or a boot block changed): run pnpm learn:check"]);
  assert.equal(JSON.parse(nextStamp(null, now, stamp(now).versions, "2026-10-28")!).labErd, now.labErd);
});

test("FR7 importClosure follows `from` and side-effect imports, relative only, and refuses a missing file", () => {
  const src: Record<string, string> = {
    "scripts/a.ts": `import x from "node:fs";\nimport { y } from "./b.ts";\nimport "./c.ts";\nexport { z } from "./learn/d.ts";\n`,
    "scripts/b.ts": `import type { T } from "./c.ts";\n`,
    "scripts/c.ts": ``,
    "scripts/learn/d.ts": `import { w } from "../b.ts";\n`,
  };
  const read = (p: string) => {
    if (!(p in src)) throw new Error(`ENOENT ${p}`);
    return src[p]!;
  };
  assert.deepEqual(importClosure("scripts/a.ts", read), ["scripts/a.ts", "scripts/b.ts", "scripts/c.ts", "scripts/learn/d.ts"]);
  assert.throws(() => importClosure("scripts/x.ts", read), /ENOENT scripts\/x\.ts/);
});

test("FR9 GDAL's version is recorded in checked.json and never compared", () => {
  const now = fresh();
  const versions = stamp(now).versions;
  assert.equal(JSON.parse(nextStamp(null, now, versions, "2026-10-28")!).versions.gdal, "3.8.4");
  assert.deepEqual(staleness({ ...stamp(now), versions: { ...versions, gdal: "3.12.2" } }, now), []);
  const first = nextStamp(null, now, versions, "2026-10-28")!;
  assert.equal(JSON.parse(nextStamp(first, now, { ...versions, gdal: "3.12.2" }, "2026-10-29")!).versions.gdal, "3.12.2");
});
