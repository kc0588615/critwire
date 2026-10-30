// pnpm learn:check, the loader stage (plan D10 checks 1–11 and Cleanup), on critwire_dev. Written before the code, seen
// failing first. Each case spawns the CLI as a learner's checkout runs it (cwd = the repo, so .env's DATABASE_URL and
// GBIF_* are loaded into it). The full runs load dist/'s loader into learn_curriculum as critwire_lab (run pnpm build
// first). Failure modes:
// LC1: the live database is reached through the CLI → refused by name before connecting (an unreachable port proves it).
// LC2: a name that isn't critwire reaches critwire (a pooler alias) → refused by current_database(); only a pooler can
//      make the two differ, so the post-connect assertion is called directly.
// LC3: a role without CREATEROLE, or without createrole_self_grant set and inherit, runs the loader and fails in the
//      labs → refused before the lock, naming --setup.
// V2, V3 (plan L4 D7, MF5): a superuser lab role, or one with CREATE on public, runs the labs with more than a learner's
//      privileges and hides a block that needs them → refused before the lock, naming --setup.
// LC4: two runs overlap (each drops the other's schema) → the second is refused while the lock is held, and loads nothing.
// LC5: a load that gives other row counts than the manifest's tables, or a loader whose sha256 isn't the manifest's,
//      passes → refused, naming the table and both counts, or the file; a clean run loads twice and exits 0.
// LC6: the loader isn't one transaction, so a failure late in the load keeps part of it, or the forced failure fails
//      somewhere other than the duplicate key, or the injection site moved → refused naming the changed table, the
//      failure, or "loader layout changed" (before any load); a clean run reports psql's exit at the duplicate id.
// LC7: the load changes learn_spatial (A2's schema) → the canary before ≠ after, refused naming the table.
// LC8: the run leaves a learn_ role or schema behind → refused, naming each (a loader's leak named as the loader's, before any block).
// LC9: SIGINT mid-load leaves the lock held, psql's statement running, the half-made schema, its temp file or a role
//      → the run stops naming the signal; afterwards the lock is free, no critwire_lab backend, the old schema's counts,
//      no temp file and no new learn_ object. A check failing after the lock releases it and removes its temp file too.
// LC10: a child psql gets DATABASE_URL, GBIF_* or LEARN_PG_URL, or the password in argv → a psql wrapper on PATH
//       records every child's environment and argv: none of them.
// Cleanup (plan D3, S4; SC7 error paths, R13), on every exit in order: stop the run's sessions, sweep, then unlock.
// CU1: SIGINT mid-block leaves the block's backend running, its committed role, or the lock → none of them after.
// CU2: the lock is freed before the sweep, so a second run starts and the sweep drops its objects → a second learn:check
//      while the sweep runs is refused; the lab role's new schema is gone afterwards and the lock free.
// CU3: the sweep drops what another role made → a superuser-made learn_t_ role is named with its cleanup command and
//      kept; the lab role's new role is dropped; what was there at the start is never touched.
// CU4: a recorded session that can't be stopped is ignored → the cleanup fails naming its pid; the lock is still freed.
// CU5: the cleanup connection is lost (the lock went with it) and the sweep runs anyway → nothing dropped; every new
//      object is named with its cleanup command.
// Blocks stage live (plan S5): L1's special pg-role-smoke step stays beside the blocks stage, so the block runs twice
// and its two definitions drift → a clean run names pg-role-smoke from the blocks stage only.
// LM1: --module runs another page too, or writes a recorded result → setup's blocks printed, the files untouched.
// LM2: --module --update writes a partial run, or an unknown page silently checks nothing → both refused.
// Downloads (plan D7, S6; 004 §7.6): each assembled file runs as a learner runs it, psql -X -f, no ON_ERROR_STOP.
// DL1: an error the file doesn't announce, an announced one that doesn't happen, or the right errors in the wrong order
//      pass (psql exits 0 either way) → each refused, naming the file and the first unexpected error.
// DL2: a clean run skips the downloads, or leaves checked.json unwritten or rewritten with nothing changed → the
//      setup page's pg-checks.sql runs after a fresh load with a leak check, and checked.json stays byte for byte.
// Lab ERD (plan D10, S8): site/learn/erd/lab.mmd against learn_curriculum after the boot blocks.
// LE1: the lab gains a column the ERD lacks (a boot block's ALTER), or the ERD a column the lab lacks, and the run
//      passes → refused before any other block runs, naming the column; a clean run reports the match.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadEnv, requireEnv } from "./env.ts";
import { parseBlock } from "./learn/blocks.ts";
import { assertConnectedNotLive, assertDownloadRun, CANARY_SCHEMA, checkLab } from "./learn/check.ts";
import { takeLabLock } from "./learn/cleanup.ts";
import { LAB_LOCK, libpqTarget, pgConnect, urlTarget } from "./learn/pg.ts";
import { pythonApp } from "./learn/python.ts";
import { RUNNER_APP } from "./learn/runner.ts";
import { testDatabase } from "./test-db.ts";

const repo = fileURLToPath(new URL("..", import.meta.url));
const dist = join(repo, "dist");
const LOADER = "postgis/learn_curriculum.sql";
const dir = mkdtempSync(join(tmpdir(), "critwire-learn-check-"));
loadEnv();
const labUrl = requireEnv("LEARN_PG_URL");
const admin = pgConnect(libpqTarget({ PGDATABASE: testDatabase }));
const made: { roles: string[]; schemas: string[] } = { roles: [], schemas: [] };
after(async () => {
  for (const s of made.schemas) await admin.unsafe(`DROP SCHEMA IF EXISTS ${s} CASCADE`);
  for (const r of made.roles) {
    const [role] = await admin`select 1 from pg_roles where rolname = ${r}`;
    if (role) await admin.unsafe(`DROP OWNED BY ${r}; DROP ROLE ${r}`);
  }
  await admin.end();
  rmSync(dir, { recursive: true, force: true });
});

const fresh = (prefix: string) => `learn_t_${prefix}_${randomBytes(4).toString("hex")}`;

// Starts the CLI with the test's environment over process.env; `done` resolves with its exit code and output.
function start(args: string[], env: Record<string, string> = {}) {
  const child = spawn(process.execPath, ["--import", "tsx", join(repo, "scripts/learn-check.ts"), ...args],
    { cwd: repo, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  return { child, done };
}
const cli = (args: string[], env: Record<string, string> = {}) => start(args, env).done;

// Polls `ok` every 100 ms; throws naming `what` after `ms` (default 10 s).
async function waitFor(what: string, ok: () => Promise<boolean>, ms = 10_000) {
  for (const until = Date.now() + ms; !(await ok()); await new Promise((r) => setTimeout(r, 100))) {
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
  }
}

// A dist/ whose learn/data/ links dist's files (the Python blocks read them through LEARN_BASE) except the manifest
// and the loader, written here: the loader changed by `loader` (it must change), and the manifest edited by `edit`;
// the loader's sha256 and bytes in the manifest follow the new loader.
function tamperedDist(name: string, { loader: change, edit = (m: Manifest) => m }:
  { loader?: (s: string) => string; edit?: (m: Manifest) => Manifest } = {}) {
  const out = join(dir, name);
  mkdirSync(join(out, "learn/data/postgis"), { recursive: true });
  for (const sub of ["", "postgis"]) {
    for (const f of readdirSync(join(dist, "learn/data", sub))) {
      const rel = join(sub, f);
      if (![LOADER, "manifest.json", "postgis"].includes(rel)) symlinkSync(join(dist, "learn/data", rel), join(out, "learn/data", rel));
    }
  }
  const original = readFileSync(join(dist, "learn/data", LOADER), "utf8");
  const loader = change ? change(original) : original;
  if (change && loader === original) throw new Error(`tamperedDist ${name}: the loader edit changed nothing`);
  writeFileSync(join(out, "learn/data", LOADER), loader);
  const manifest = JSON.parse(readFileSync(join(dist, "learn/data/manifest.json"), "utf8")) as Manifest;
  manifest.files[LOADER]!.sha256 = createHash("sha256").update(loader).digest("hex");
  manifest.files[LOADER]!.bytes = Buffer.byteLength(loader);
  writeFileSync(join(out, "learn/data/manifest.json"), JSON.stringify(edit(manifest)));
  return out;
}
interface Manifest { files: Record<string, { sha256: string; bytes: number; tables?: Record<string, number> }> }
const manifestTables = () =>
  (JSON.parse(readFileSync(join(dist, "learn/data/manifest.json"), "utf8")) as Manifest).files[LOADER]!.tables!;

// Throws unless the lab lock is free (taken and given back at once).
async function assertLockFree() {
  const [{ locked }] = await admin<{ locked: boolean }[]>`select pg_try_advisory_lock(hashtext(${LAB_LOCK})) as locked`;
  if (locked) await admin`select pg_advisory_unlock(hashtext(${LAB_LOCK}))`;
  assert.equal(locked, true, "the lab lock is free");
}

const labBackends = async () => (await admin<{ n: number }[]>`select count(*)::int as n
  from pg_stat_activity where usename = 'critwire_lab' and datname = ${testDatabase}`)[0]!.n;

// Every learn_ role and schema, as learn:check's leak check lists them.
async function learnObjects(): Promise<string[]> {
  const rows = await admin<{ name: string }[]>`select 'role ' || rolname as name from pg_roles where rolname like 'learn\_%'
    union all select 'schema ' || nspname from pg_namespace where nspname like 'learn\_%' order by 1`;
  return rows.map((r) => r.name);
}

async function labCounts(): Promise<Record<string, number>> {
  const tables = await admin<{ relname: string }[]>`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'learn_curriculum' and c.relkind = 'r' order by 1`;
  const counts: Record<string, number> = {};
  for (const { relname } of tables) counts[relname] = Number((await admin.unsafe(`select count(*) as n from learn_curriculum.${relname}`))[0]!.n);
  return counts;
}

// A LOGIN role with a password, CONNECT on critwire_dev, and its URL.
async function loginRole(prefix: string, attrs = "") {
  const role = fresh(prefix);
  made.roles.push(role);
  const password = randomBytes(16).toString("hex");
  await admin.unsafe(`CREATE ROLE ${role} LOGIN ${attrs} PASSWORD '${password}'`);
  await admin.unsafe(`GRANT CONNECT ON DATABASE ${testDatabase} TO ${role}`);
  return { role, url: `postgres://${role}:${password}@127.0.0.1:5432/${testDatabase}` };
}

test("LC1 critwire is refused by name before connecting", async () => {
  const r = await cli([], { LEARN_PG_URL: "postgres://critwire_lab:senpass@127.0.0.1:1/critwire" });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /refusing database critwire \(from LEARN_PG_URL\)/);
  assert.ok(!r.stderr.includes("senpass") && !r.stderr.includes("ECONNREFUSED"), r.stderr);
});

test("LC2 the connected database is refused when it is critwire, whatever the name asked for", () => {
  assert.throws(() => assertConnectedNotLive("critwire"), /refusing database critwire \(current_database\(\)\)/);
  assert.doesNotThrow(() => assertConnectedNotLive(testDatabase));
});

test("LC3 a role without CREATEROLE, or without createrole_self_grant, is refused naming --setup", async () => {
  const plain = await loginRole("lc3");
  const r1 = await cli([], { LEARN_PG_URL: plain.url });
  assert.equal(r1.code, 1);
  assert.match(r1.stderr, new RegExp(`${plain.role}.*CREATEROLE.*--setup`));
  await admin.unsafe(`ALTER ROLE ${plain.role} CREATEROLE`);
  const r2 = await cli([], { LEARN_PG_URL: plain.url });
  assert.equal(r2.code, 1);
  assert.match(r2.stderr, /createrole_self_grant.*--setup/);
});

test("V2 a superuser lab role is refused before the lock, naming --setup", async () => {
  const su = await loginRole("v2", "SUPERUSER CREATEROLE");
  await admin.unsafe(`ALTER ROLE ${su.role} SET createrole_self_grant = 'set, inherit'`);
  const r = await cli([], { LEARN_PG_URL: su.url });
  assert.equal(r.code, 1);
  assert.match(r.stderr, new RegExp(`${su.role} is a superuser: the labs run with a learner's privileges: run pnpm learn:check --setup`));
  assert.doesNotMatch(r.stdout, /lab lock taken/);
});

test("V3 a lab role with CREATE on public is refused before the lock, naming --setup", async () => {
  const role = await loginRole("v3", "CREATEROLE");
  await admin.unsafe(`ALTER ROLE ${role.role} SET createrole_self_grant = 'set, inherit'`);
  await admin.unsafe(`GRANT CREATE ON SCHEMA public TO ${role.role}`);
  const r = await cli([], { LEARN_PG_URL: role.url });
  assert.equal(r.code, 1);
  assert.match(r.stderr, new RegExp(`${role.role} has CREATE on schema public: the labs run with a learner's privileges: run pnpm learn:check --setup`));
  assert.doesNotMatch(r.stdout, /lab lock taken/);
});

test("LC4 a run is refused while the lab lock is held, and loads nothing", async () => {
  const before = await labCounts();
  const holder = pgConnect(libpqTarget({ PGDATABASE: testDatabase }));
  try {
    await holder`select pg_advisory_lock(hashtext(${LAB_LOCK}))`;
    const r = await cli([]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /lab lock .*held/);
  } finally {
    await holder.end();
  }
  assert.deepEqual(await labCounts(), before);
});

test("LC5 a loader whose sha256 isn't the manifest's is refused before any load", async () => {
  const out = tamperedDist("sha");
  writeFileSync(join(out, "learn/data", LOADER), readFileSync(join(out, "learn/data", LOADER), "utf8") + "-- edited\n");
  const r = await cli(["--dist", out]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /postgis\/learn_curriculum\.sql.*sha256.*manifest/);
  assert.doesNotMatch(r.stdout, /load 1/);
});

test("LC5 row counts other than the manifest's tables are refused, naming the table and both counts", async () => {
  const out = tamperedDist("counts", { edit: (m) => { m.files[LOADER]!.tables!.biomes! += 1; return m; } });
  const expected = manifestTables().biomes!;
  const r = await cli(["--dist", out]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, new RegExp(`biomes.*${expected}.*${expected + 1}|biomes.*${expected + 1}.*${expected}`));
});

test("LC7 a load that changes the canary schema is refused, naming the table", async () => {
  const canary = fresh("canary");
  made.schemas.push(canary);
  await admin.unsafe(`CREATE SCHEMA ${canary} AUTHORIZATION critwire_lab; CREATE TABLE ${canary}.t (x integer);
    INSERT INTO ${canary}.t VALUES (1); ALTER TABLE ${canary}.t OWNER TO critwire_lab`);
  const out = tamperedDist("canary", { loader: (s) => s + `INSERT INTO ${canary}.t VALUES (2);\n` });
  const r = await cli(["--dist", out, "--canary-schema", canary]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, new RegExp(`${canary}\\.t: rows or values changed`));
});

test("LC7 a canary schema other than learn_spatial or a learn_t_ fixture is refused", async () => {
  const r = await cli(["--canary-schema", "public"]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /canary schema public: learn_spatial or a learn_t_ test fixture only/);
});

test("LC8 a run that leaves a learn_ role or schema behind is refused, naming each", async () => {
  const leak = fresh("leak");
  made.roles.push(leak);
  made.schemas.push(leak);
  const out = tamperedDist("leak", {
    loader: (s) => s + `SELECT 'CREATE ROLE ${leak}' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${leak}') \\gexec\nCREATE SCHEMA IF NOT EXISTS ${leak};\n`,
  });
  const r = await cli(["--dist", out]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, new RegExp(`the loader left behind.*role ${leak}`, "s"));
  assert.match(r.stderr, new RegExp(`schema ${leak}`));
});

const PK = "ALTER TABLE occurrences ADD PRIMARY KEY (id);\n";

test("LC6 a loader without its occurrences injection site is refused as layout changed, before any load", async () => {
  const out = tamperedDist("layout", { loader: (s) => s.replace("COPY occurrences (", "COPY learn_curriculum.occurrences (") });
  const r = await cli(["--dist", out]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /loader layout changed/);
  assert.doesNotMatch(r.stdout, /load 1/);
});

test("LC6 a loader whose failure keeps part of the load is refused, naming the changed table", async () => {
  // COMMIT mid-load (SET LOCAL's search_path ends with it): the rows copied so far, the duplicate included, are kept.
  const out = tamperedDist("partial", { loader: (s) => s.replace(PK, `COMMIT;\nBEGIN;\nSET LOCAL search_path = learn_curriculum, public;\n${PK}`) });
  const r = await cli(["--dist", out]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /load 2: 16 tables = manifest/);
  assert.match(r.stderr, /forced failure: .*changed learn_curriculum.*learn_curriculum\.occurrences: rows or values changed/s);
});

// occurrence_habitats' foreign key needs occurrences' primary key, so it goes with it.
const HABITAT_FK = "ALTER TABLE occurrence_habitats ADD FOREIGN KEY (occurrence_id) REFERENCES occurrences (id);\n";

test("LC6 a forced failure that fails elsewhere than the duplicate key is refused", async () => {
  const out = tamperedDist("elsewhere", { loader: (s) => {
    assert.ok(s.includes(PK) && s.includes(HABITAT_FK));
    return s.replace(PK, "").replace(HABITAT_FK, "");
  } });
  const r = await cli(["--dist", out]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /load 2: 16 tables = manifest/);
  assert.match(r.stderr, /forced failure: psql exit 3, not at the duplicate key id=\d+/);
});

test("LC9 SIGINT mid-load stops the run; lock, backend, schema, temp file and roles are as before", async () => {
  const tmp = mkdtempSync(join(dir, "tmp-"));
  const [counts, objects] = [await labCounts(), await learnObjects()];
  const blocker = pgConnect(libpqTarget({ PGDATABASE: testDatabase }));
  let r;
  try {
    // The loader's DROP waits on this lock, so the signal lands mid-load whatever the machine's speed.
    r = await blocker.begin(async (tx) => {
      await tx`LOCK TABLE learn_curriculum.species IN ACCESS SHARE MODE`;
      const run = start([], { TMPDIR: tmp });
      await waitFor("the loader to wait on the lock", async () => (await admin<{ n: number }[]>`select count(*)::int as n
        from pg_stat_activity where usename = 'critwire_lab' and datname = ${testDatabase} and wait_event_type = 'Lock'`)[0]!.n > 0);
      run.child.kill("SIGINT");
      return run.done;
    });
  } finally {
    await blocker.end();
  }
  assert.equal(r.code, 1);
  assert.match(r.stderr, /interrupted by SIGINT/);
  await waitFor("no critwire_lab backend", async () => (await labBackends()) === 0);
  await assertLockFree();
  assert.deepEqual(await labCounts(), counts);
  assert.deepEqual(await learnObjects(), objects);
  assert.deepEqual(readdirSync(tmp).filter((n) => !n.startsWith("tsx-")), []); // tsx keeps its cache in TMPDIR
});

test("LC9 a check failing after the lock releases it and removes its temp file", async () => {
  const out = tamperedDist("fails", { edit: (m) => { m.files[LOADER]!.tables!.biomes! += 1; return m; } });
  const tmp = mkdtempSync(join(dir, "tmp-"));
  const saved = process.env.TMPDIR;
  process.env.TMPDIR = tmp;
  try {
    await assert.rejects(checkLab(urlTarget(labUrl, "LEARN_PG_URL"), { dist: out, canarySchema: CANARY_SCHEMA }), /row counts differ/);
  } finally {
    if (saved === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = saved;
  }
  assert.deepEqual(readdirSync(tmp), []);
  await assertLockFree();
});

test("LC5 + LC10 + DL2 a clean run loads twice to the manifest's counts, runs pg-checks.sql, stamps checked.json, and no child psql sees a secret", async () => {
  const bin = join(dir, "bin");
  mkdirSync(bin);
  // One file per call: the runner reads watched schemas with concurrent psql calls, whose appends to one file interleave.
  const dump = join(dir, "psql-calls");
  mkdirSync(dump);
  writeFileSync(join(bin, "psql"), `#!/bin/sh\n{ env; printf 'ARGV %s\\n' "$*"; } > "$(mktemp '${dump}/call-XXXXXX')"\nexec /usr/bin/psql "$@"\n`);
  chmodSync(join(bin, "psql"), 0o755);
  const r = await cli([], { PATH: `${bin}:${process.env.PATH}`, GBIF_USERNAME: "senuser", GBIF_PASSWORD: "senpass", DATABASE_URL: "postgres://sen" });
  assert.equal(r.code, 0, r.stderr);
  const tables = manifestTables();
  assert.match(r.stdout, /load 1: 16 tables = manifest/);
  assert.match(r.stdout, /load 2: 16 tables = manifest/);
  assert.match(r.stdout, /forced failure: psql exit 3 at the duplicate key id=\d+, 16 tables unchanged/);
  assert.doesNotMatch(r.stdout, /pg-role-smoke: 0 left/, "no special pg-role-smoke step");
  assert.match(r.stdout, /learn:check: static: \d+ page\(s\), \d+ block\(s\) parsed and linted/);
  assert.match(r.stdout, /learn:check: q pg-role-smoke: ok/);
  assert.match(r.stdout, /learn:check: q pg-tx-smoke: ok/);
  assert.match(r.stdout, /canary: learn_spatial unchanged/);
  assert.match(r.stdout, /leak check \(the loader\): nothing left/);
  assert.match(r.stdout, /leak check \(the run\): nothing left/);
  assert.match(r.stdout, /learn:check: download pg-checks\.sql: fresh load, then the file: 0 ERROR line\(s\), as announced/);
  assert.match(r.stdout, /leak check \(download pg-checks\.sql\): nothing left/);
  assert.match(r.stdout, /learn:check: lab ERD: site\/learn\/erd\/lab\.mmd = learn_curriculum \(\d+ tables\)/);
  assert.match(r.stdout, /learn:check: (wrote|unchanged:) site\/learn\/labs\/checked\/checked\.json/);
  assert.deepEqual(await labCounts(), Object.fromEntries(Object.entries(tables).sort(([a], [b]) => a.localeCompare(b))));
  const calls = readdirSync(dump).map((f) => readFileSync(join(dump, f), "utf8"));
  assert.ok(calls.length >= 4, `${calls.length} psql calls`);
  const password = decodeURIComponent(new URL(labUrl).password);
  for (const call of calls) {
    assert.doesNotMatch(call, /^(DATABASE_URL|GBIF_[A-Z_]*|LEARN_PG_URL)=/m);
    const argv = /^ARGV (.*)$/m.exec(call)![1]!;
    assert.ok(!argv.includes(password) && !argv.includes("postgres://"), argv);
  }
  const [{ n }] = await admin`select count(*)::int as n from pg_roles where rolname = 'learn_smoke'`;
  assert.equal(n, 0);
});

const labTarget = () => urlTarget(labUrl, "LEARN_PG_URL");

// Every recorded result with its text and mtime, to prove a run wrote nothing.
const recorded = (d: string) => readdirSync(d).sort().map((f) => [f, readFileSync(join(d, f), "utf8"), statSync(join(d, f)).mtimeMs]);

test("LM1 --module setup runs the static checks, the loader and the setup page's blocks, prints them and writes nothing", async () => {
  const checked = join(repo, "site/learn/labs/checked");
  const before = recorded(checked);
  const r = await cli(["--module", "setup"]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /load 2: 16 tables = manifest/);
  assert.match(r.stdout, /learn:check: q pg-role-smoke:\n  -- result: pg-role-smoke · 1 row · sha256 fcfe7fd06dfa\n  learn_smoke_left\n  0\n/);
  assert.match(r.stdout, /learn:check: q pg-session:\n  -- result: pg-session · 1 row · sha256 791623fd72db\n  search_path\n  learn_curriculum, public\n/);
  assert.match(r.stdout, /learn:check: q pg-role-smoke: ok/);
  assert.match(r.stdout, /learn:check: download pg-checks\.sql: fresh load, then the file: 0 ERROR line\(s\), as announced/);
  assert.doesNotMatch(r.stdout, /wrote|checked\.json/);
  assert.deepEqual(recorded(checked), before);
});

test("LM2 --module with --update, or an unknown page, is refused before connecting", async () => {
  const up = await cli(["--module", "setup", "--update"]);
  assert.equal(up.code, 1);
  assert.match(up.stderr, /--module never writes: drop --update/);
  const unknown = await cli(["--module", "zz"]);
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /--module zz: no such page \(setup(, [a-z0-9]+)*\)/);
});

test("CU1 SIGINT mid-block: no run backend, the block's committed role swept, the lock free", async () => {
  const role = fresh("cu1");
  made.roles.push(role);
  const { block } = parseBlock("cu1.sql", ["-- q: cu1", "-- status: ran", "-- engine: postgis", "-- tx: own", `CREATE ROLE ${role};`, "SELECT pg_sleep(60) IS NULL AS slept"].join("\n"));
  const objects = await learnObjects();
  const stop = new AbortController();
  const run = checkLab(labTarget(), { dist, canarySchema: CANARY_SCHEMA, blocks: [block!], signal: stop.signal });
  try {
    // After the loader stage's three loads.
    await waitFor("the block to sleep", async () => (await admin<{ n: number }[]>`select count(*)::int as n from pg_stat_activity
      where usename = 'critwire_lab' and application_name = ${RUNNER_APP} and wait_event = 'PgSleep'`)[0]!.n > 0, 120_000);
  } finally {
    stop.abort(new Error("interrupted by SIGINT; nothing kept"));
  }
  await assert.rejects(run, /interrupted by SIGINT/);
  assert.equal(await labBackends(), 0);
  assert.deepEqual(await learnObjects(), objects);
  await assertLockFree();
});

test("CU2 a second learn:check while the sweep runs is refused; the sweep drops the lab role's schema, then frees the lock", async () => {
  const lock = await takeLabLock(labTarget(), testDatabase, { app: pythonApp() });
  const schema = fresh("cu2");
  made.schemas.push(schema);
  const lab = pgConnect(labTarget());
  await lab.unsafe(`CREATE SCHEMA ${schema}; CREATE TABLE ${schema}.t (x int)`);
  await lab.end();
  const blocker = pgConnect(libpqTarget({ PGDATABASE: testDatabase }));
  let releasing: Promise<void> | undefined;
  let second;
  try {
    second = await blocker.begin(async (tx) => {
      await tx.unsafe(`LOCK TABLE ${schema}.t IN ACCESS SHARE MODE`);
      releasing = lock.release();
      await waitFor("the sweep to wait on the table", async () => (await admin<{ n: number }[]>`select count(*)::int as n
        from pg_stat_activity where usename = 'critwire_lab' and wait_event_type = 'Lock'`)[0]!.n > 0);
      return cli([]);
    });
  } finally {
    await blocker.end();
  }
  await releasing;
  assert.equal(second.code, 1);
  assert.match(second.stderr, /lab lock .*held/);
  assert.ok(!(await learnObjects()).includes(`schema ${schema}`));
  await assertLockFree();
});

test("CU3 the sweep drops the lab role's new role; a superuser's is named with its cleanup command and kept", async () => {
  const before = fresh("cu3old");
  made.roles.push(before);
  await admin.unsafe(`CREATE ROLE ${before}`);
  const lock = await takeLabLock(labTarget(), testDatabase, { app: pythonApp() });
  const [ours, theirs] = [fresh("cu3lab"), fresh("cu3su")];
  made.roles.push(ours, theirs);
  const lab = pgConnect(labTarget());
  await lab.unsafe(`CREATE ROLE ${ours}`);
  await lab.end();
  await admin.unsafe(`CREATE ROLE ${theirs}`);
  await assert.rejects(lock.release(), (e: Error) => {
    assert.equal(e.message, `cleanup: role ${theirs} is new but the lab role didn't make it, so as the superuser run: psql -d ${testDatabase} -c 'DROP OWNED BY ${theirs}; DROP ROLE ${theirs}'`);
    return true;
  });
  const now = await learnObjects();
  assert.ok(!now.includes(`role ${ours}`), "the lab role's role was dropped");
  assert.ok(now.includes(`role ${theirs}`) && now.includes(`role ${before}`), "the others were kept");
  await assertLockFree();
});

test("CU4 a recorded session that can't be stopped fails the cleanup, named; the lock is still freed", async () => {
  const other = pgConnect(libpqTarget({ PGDATABASE: testDatabase }), { connection: { application_name: RUNNER_APP } });
  try {
    const [{ pid }] = await other<{ pid: number }[]>`select pg_backend_pid() as pid`;
    const lock = await takeLabLock(labTarget(), testDatabase, { app: pythonApp() });
    lock.record(pid);
    await assert.rejects(lock.release(), new RegExp(`^Error: cleanup: session ${pid} still runs: permission denied`));
    await assertLockFree();
  } finally {
    await other.end();
  }
});

test("CU5 a lost cleanup connection drops nothing and names every new object", async () => {
  const lock = await takeLabLock(labTarget(), testDatabase, { app: pythonApp() });
  const ours = fresh("cu5");
  made.roles.push(ours);
  const lab = pgConnect(labTarget());
  await lab.unsafe(`CREATE ROLE ${ours}`);
  await lab.end();
  await admin`select pg_terminate_backend(${lock.pid}, 10000)`;
  await assert.rejects(lock.release(), (e: Error) => {
    assert.match(e.message, /^cleanup: the cleanup connection was lost, and the lab lock with it, so nothing was dropped; as the superuser run:\n/);
    assert.match(e.message, new RegExp(`psql -d ${testDatabase} -c 'DROP OWNED BY ${ours}; DROP ROLE ${ours}'`));
    return true;
  });
  assert.ok((await learnObjects()).includes(`role ${ours}`), "kept");
  await assertLockFree();
});

// A file of `sql` in the test folder, run by assertDownloadRun as the lab role with `announced`.
async function runFile(name: string, sql: string, announced: { block: string; text: string }[]) {
  const file = join(dir, name);
  writeFileSync(file, sql);
  await assertDownloadRun(labTarget(), file, { name, announced });
}

test("DL1 an unannounced error, a missing announced one, or errors in the wrong order fail, naming the file", async () => {
  await runFile("ok.sql", "SELECT 1;\nSELECT 1/0;\nSELECT 'x'::int;\n", [{ block: "q-a", text: "division by zero" }, { block: "q-b", text: "invalid input syntax" }]);
  await assert.rejects(runFile("extra.sql", "SELECT 1/0;\n", []), /download extra\.sql: ERROR line 1 isn't announced: .*division by zero/);
  await assert.rejects(runFile("missing.sql", "SELECT 1;\n", [{ block: "q-a", text: "division by zero" }]),
    /download missing\.sql: q-a's announced error "division by zero" didn't happen \(0 ERROR lines\)/);
  await assert.rejects(runFile("order.sql", "SELECT 'x'::int;\nSELECT 1/0;\n", [{ block: "q-a", text: "division by zero" }, { block: "q-b", text: "invalid input syntax" }]),
    /download order\.sql: ERROR line 1 isn't q-a's announced "division by zero": .*invalid input syntax/);
});

test("LE1 a lab column the ERD lacks, or an ERD column the lab lacks, fails the lab ERD check before any other block, named", async () => {
  const lab = readFileSync(join(repo, "site/learn/erd/lab.mmd"), "utf8");
  const scratch = "scratch_le1";
  const { block: boot } = parseBlock("le1-boot.sql", ["-- q: le1-boot", "-- status: ran", "-- engine: postgis", "-- boot",
    `ALTER TABLE occurrences ADD COLUMN ${scratch} integer;`, `SELECT count(*) AS n FROM occurrences WHERE ${scratch} IS NULL`].join("\n"));
  const { block: later } = parseBlock("le1-later.sql", ["-- q: le1-later", "-- status: ran", "-- engine: postgis", "SELECT pg_sleep(30) IS NULL AS slept"].join("\n"));
  const started = Date.now();
  try {
    await assert.rejects(checkLab(labTarget(), { dist, canarySchema: CANARY_SCHEMA, blocks: [later!, boot!], labErd: lab }),
      (e: Error) => {
        assert.match(e.message, /lab ERD: site\/learn\/erd\/lab\.mmd differs from learn_curriculum:\n {2}ERD: occurrences\.scratch_le1 is in the database \(integer\) but not in the ERD/);
        return true;
      });
    assert.ok(Date.now() - started < 30_000, "refused before le1-later ran");
  } finally {
    await admin.unsafe(`ALTER TABLE learn_curriculum.occurrences DROP COLUMN IF EXISTS ${scratch}`);
  }
  const fewer = lab.replace(/^ *float8 longitude .*\n/m, "");
  assert.notEqual(fewer, lab);
  await assert.rejects(checkLab(labTarget(), { dist, canarySchema: CANARY_SCHEMA, labErd: fewer }),
    /lab ERD: site\/learn\/erd\/lab\.mmd differs from learn_curriculum:\n {2}ERD: occurrences\.longitude is in the database \(double precision\) but not in the ERD/);
  await assertLockFree();
});
