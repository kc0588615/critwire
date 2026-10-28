// Mirror load tests on critwire_dev (MF1, plan D11). Failure modes first:
// G2: a load with CRITWIRE_DB_TARGET missing, or naming another database, runs db/schema.sql's DROP first → refuses
//     before any DDL: public.species keeps its oid and rows.
// G3: the guard refuses the matching target too → the load rebuilds public.species (new oid) with every species.
// G4: loadDatabase logs the URL or part of it → its output is exactly "loading into <current_database()>".
// SC3 (plan D14):
// G5: another session holds critwire.load and the wait is unbounded (lock_timeout not applied to advisory waits) →
//     a short lock timeout refuses, naming the lock, and public.species is untouched.
// G6: the insert fails after db/schema.sql's DROP → the transaction rolls back: same oid, same rows.
// G7: two concurrent loads interleave (or one fails on the other's DROP) → both wait on critwire.load, then both succeed.
import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import postgres from "postgres";
import { loadDatabase } from "./db.ts";
import { readJson } from "./json.ts";
import { speciesFile, type Species } from "./species.ts";
import { testDatabase, testDatabaseUrl } from "./test-db.ts";

let url: string;
let sql: postgres.Sql;
let species: Species[];
const savedTarget = process.env.CRITWIRE_DB_TARGET;

const table = async () => {
  const [row] = await sql<{ oid: number; n: number }[]>`select 'public.species'::regclass::oid::int as oid,
    (select count(*)::int from public.species) as n`;
  return row;
};

before(async () => {
  url = await testDatabaseUrl();
  sql = postgres(url, { onnotice: () => {} });
  species = await readJson<Species[]>(speciesFile);
  process.env.CRITWIRE_DB_TARGET = testDatabase;
  await loadDatabase(url, species);
});
after(async () => {
  if (savedTarget === undefined) delete process.env.CRITWIRE_DB_TARGET; else process.env.CRITWIRE_DB_TARGET = savedTarget;
  await sql.end();
});

test("G2 a missing target refuses before any DDL", async () => {
  const before = await table();
  delete process.env.CRITWIRE_DB_TARGET;
  try {
    await assert.rejects(loadDatabase(url, species), /CRITWIRE_DB_TARGET not set/);
  } finally {
    process.env.CRITWIRE_DB_TARGET = testDatabase;
  }
  assert.deepEqual(await table(), before);
});

test("G2 a wrong target refuses before any DDL, naming both databases", async () => {
  const before = await table();
  process.env.CRITWIRE_DB_TARGET = "critwire_t_other";
  try {
    await assert.rejects(loadDatabase(url, species), (error: Error) =>
      error.message.includes(testDatabase) && error.message.includes("critwire_t_other"));
  } finally {
    process.env.CRITWIRE_DB_TARGET = testDatabase;
  }
  assert.deepEqual(await table(), before);
});

test("G3 the matching target rebuilds public.species; G4 its only output is the database name", async () => {
  const before = await table();
  const lines: string[] = [];
  const capture = (...args: unknown[]) => { lines.push(args.map(String).join(" ")); };
  const mocks = (["log", "error", "warn", "info"] as const).map((m) => mock.method(console, m, capture));
  try {
    await loadDatabase(url, species);
  } finally {
    for (const m of mocks) m.mock.restore();
  }
  const now = await table();
  assert.notEqual(now.oid, before.oid);
  assert.equal(now.n, species.length);
  assert.deepEqual(lines, [`loading into ${testDatabase}`]);
});

// A dedicated connection holding critwire.load (session level) until release().
async function holdLoadLock() {
  const holder = await sql.reserve();
  await holder`select pg_advisory_lock(hashtext('critwire.load'))`;
  return async () => {
    await holder`select pg_advisory_unlock(hashtext('critwire.load'))`;
    holder.release();
  };
}

const advisoryWaiters = async () => {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from pg_locks
    where locktype = 'advisory' and not granted and database = (select oid from pg_database where datname = current_database())`;
  return n;
};

test("G5 a held load lock refuses after the lock timeout, naming the lock", { timeout: 20_000 }, async () => {
  const before = await table();
  const release = await holdLoadLock();
  const load = loadDatabase(url, species, { lockTimeoutMs: 300 });
  try {
    const unbounded = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("no refusal within 5 s")), 5_000));
    await assert.rejects(Promise.race([load, unbounded]), /critwire\.load.*300 ms/);
  } finally {
    await release();
    await load.catch(() => {});
  }
  assert.deepEqual(await table(), before);
});

test("G6 an insert failing after the DROP leaves the previous table and rows", async () => {
  const before = await table();
  await assert.rejects(loadDatabase(url, [...species, species[0]]), /duplicate key/);
  assert.deepEqual(await table(), before);
});

test("G7 two concurrent loads wait on the lock in turn and both succeed", { timeout: 30_000 }, async () => {
  const release = await holdLoadLock();
  let loads: Promise<void>[];
  try {
    loads = [loadDatabase(url, species), loadDatabase(url, species)];
    const deadline = Date.now() + 10_000;
    while ((await advisoryWaiters()) < 2) {
      assert.ok(Date.now() < deadline, "both loads should wait on critwire.load");
      await new Promise((r) => setTimeout(r, 50));
    }
  } finally {
    await release();
  }
  await Promise.all(loads);
  assert.equal((await table()).n, species.length);
});
