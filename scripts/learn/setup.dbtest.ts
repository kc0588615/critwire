// learn:check --setup on critwire_dev (plan D10, SC7). Written before the code, seen failing first. Each case runs on its
// own learn_t_ role and schema and temp .env files, never on critwire_lab. Failure modes:
// LS1: the role lacks a privilege the labs need (LOGIN, CREATEROLE, createrole_self_grant, CONNECT, CREATE, TEMPORARY,
//      the schema's ownership) or holds one it mustn't (superuser, CREATE on public), or the written URL doesn't
//      connect as it → each checked; a role with CREATE on public is refused and the whole setup rolls back.
// LS2: a second run resets the password (breaking every other checkout's copy) or rewrites the file → hash and bytes kept.
// LS3: a non-superuser half-runs the setup, or the live database is set up → refused (critwire before connecting).
// LS4: the .env rewrite changes another line or the mode, or a value reaches the output → one line appended, mode
//      kept, no password or URL in anything printed.
// LS5: an existing role and a listed file with no working URL is "fixed" by a silent reset → refused, naming the file
//      and --reset-password, nothing changed; with --reset-password every listed file gets the new URL, the old fails.
// Harness: critwire_lab itself, through the repo .env's LEARN_PG_URL, creates and drops a learn_t_ schema under the lab lock.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { after, mock, test } from "node:test";
import postgres from "postgres";
import { testDatabase, withLabSchema } from "../test-db.ts";
import { libpqTarget, pgConnect, urlTarget, type PgTarget } from "./pg.ts";
import { setupLab } from "./setup.ts";

const dir = mkdtempSync(join(tmpdir(), "critwire-setup-"));
const admin: PgTarget = libpqTarget({ PGDATABASE: testDatabase });
const adminSql = pgConnect(admin);
const made: string[] = [];
after(async () => {
  for (const name of made) {
    await adminSql.unsafe(`DROP SCHEMA IF EXISTS ${name} CASCADE`);
    const [role] = await adminSql`select 1 from pg_roles where rolname = ${name}`;
    if (role) await adminSql.unsafe(`DROP OWNED BY ${name}; DROP ROLE ${name}`);
  }
  await adminSql.end();
  rmSync(dir, { recursive: true, force: true });
});

// A fresh learn_t_ role name, its schema (created as the admin, like the spike's leftover) and an .env file.
async function fresh(contents = "A=1\n") {
  const name = `learn_t_setup_${randomBytes(4).toString("hex")}`;
  made.push(name);
  await adminSql.unsafe(`CREATE SCHEMA ${name}`);
  const file = join(dir, `${name}.env`);
  writeFileSync(file, contents, { mode: 0o600 });
  return { role: name, schema: name, file };
}

// Runs setupLab with everything it prints captured.
async function run(target: PgTarget, options: Parameters<typeof setupLab>[1]) {
  const lines: string[] = [];
  const capture = (...args: unknown[]) => { lines.push(args.map(String).join(" ")); };
  const mocks = (["log", "error", "warn", "info"] as const).map((m) => mock.method(console, m, capture));
  try {
    await setupLab(target, options);
  } finally {
    for (const m of mocks) m.mock.restore();
  }
  return lines.join("\n");
}

const urlIn = (file: string) => parseEnv(readFileSync(file, "utf8")).LEARN_PG_URL;
const passwordHash = async (role: string) => (await adminSql`select rolpassword from pg_authid where rolname = ${role}`)[0]?.rolpassword;

async function whoAt(url: string | undefined) {
  assert.ok(url, "no LEARN_PG_URL");
  const sql = pgConnect(urlTarget(url, "LEARN_PG_URL"));
  try {
    return (await sql<{ user: string; db: string }[]>`select current_user as user, current_database() as db`)[0];
  } finally {
    await sql.end();
  }
}

test("LS1 a new role gets exactly the lab's privileges and a URL that connects as it", async () => {
  const { role, schema, file } = await fresh();
  await run(admin, { envFiles: [file], role, schema });
  const [r] = await adminSql`select rolcanlogin, rolcreaterole, rolsuper, rolcreatedb, rolconfig,
      has_database_privilege(rolname, current_database(), 'CONNECT') as connect,
      has_database_privilege(rolname, current_database(), 'CREATE') as create,
      has_database_privilege(rolname, current_database(), 'TEMPORARY') as temp,
      has_schema_privilege(rolname, 'public', 'CREATE') as public_create,
      (select pg_get_userbyid(nspowner) from pg_namespace where nspname = ${schema}) as owner
    from pg_roles where rolname = ${role}`;
  assert.deepEqual({ ...r }, { rolcanlogin: true, rolcreaterole: true, rolsuper: false, rolcreatedb: false,
    rolconfig: ["createrole_self_grant=set, inherit"], connect: true, create: true, temp: true, public_create: false, owner: role });
  assert.deepEqual({ ...(await whoAt(urlIn(file))) }, { user: role, db: testDatabase });
});

test("LS1 a role with CREATE on public is refused and the setup rolls back", async () => {
  const { role, schema, file } = await fresh();
  await run(admin, { envFiles: [file], role, schema });
  await adminSql.unsafe(`GRANT CREATE ON SCHEMA public TO ${role}`);
  await adminSql.unsafe(`ALTER SCHEMA ${schema} OWNER TO CURRENT_USER`);
  const hash = await passwordHash(role);
  const bytes = readFileSync(file, "utf8");
  await assert.rejects(run(admin, { envFiles: [file], role, schema, resetPassword: true }), /CREATE on schema public/);
  assert.equal(await passwordHash(role), hash);
  assert.equal(readFileSync(file, "utf8"), bytes);
  const [{ owner }] = await adminSql`select pg_get_userbyid(nspowner) as owner from pg_namespace where nspname = ${schema}`;
  assert.notEqual(owner, role);
  await adminSql.unsafe(`REVOKE CREATE ON SCHEMA public FROM ${role}`);
});

test("LS2 a second run keeps the password and the file", async () => {
  const { role, schema, file } = await fresh();
  await run(admin, { envFiles: [file], role, schema });
  const hash = await passwordHash(role);
  const bytes = readFileSync(file, "utf8");
  const output = await run(admin, { envFiles: [file], role, schema });
  assert.equal(await passwordHash(role), hash);
  assert.equal(readFileSync(file, "utf8"), bytes);
  assert.match(output, /password unchanged/);
  assert.deepEqual({ ...(await whoAt(urlIn(file))) }, { user: role, db: testDatabase });
});

test("LS3 a non-superuser is refused before any change; critwire is refused before connecting", async () => {
  const { role, schema, file } = await fresh();
  await run(admin, { envFiles: [file], role, schema });
  const other = await fresh();
  await assert.rejects(run(urlTarget(urlIn(file)!, "LEARN_PG_URL"), { envFiles: [other.file], role: other.role, schema: other.schema }),
    new RegExp(`superuser.*${role}`));
  assert.equal((await adminSql`select 1 from pg_roles where rolname = ${other.role}`).length, 0);
  await assert.rejects(run({ ...admin, host: "/nonexistent", database: "critwire", source: "PGDATABASE" },
    { envFiles: [other.file], role: other.role, schema: other.schema }), /critwire.*PGDATABASE/);
});

test("LS4 the rewrite appends one line, keeps every other byte and the mode, and prints no value", async () => {
  const original = "# keep\r\nA=1\r\nB = two words\n# LEARN_PG_URL=commented\nC=3";
  const { role, schema, file } = await fresh(original);
  chmodSync(file, 0o640);
  const second = join(dir, `${role}-second.env`);
  writeFileSync(second, "LEARN_PG_URL=stale\n", { mode: 0o600 });
  const output = await run(admin, { envFiles: [file, second], role, schema });
  const url = urlIn(file)!;
  assert.equal(readFileSync(file, "utf8"), `${original}\nLEARN_PG_URL=${url}\n`);
  assert.equal(readFileSync(second, "utf8"), `LEARN_PG_URL=${url}\n`);
  assert.equal(statSync(file).mode & 0o777, 0o640);
  assert.equal(statSync(second).mode & 0o777, 0o600);
  const password = decodeURIComponent(new URL(url).password);
  assert.ok(password.length >= 32);
  assert.ok(!output.includes(password) && !output.includes(url), "output leaks the password or URL");
});

test("LS5 an existing role with no working URL is refused unless --reset-password", async () => {
  const { role, schema, file } = await fresh();
  await run(admin, { envFiles: [file], role, schema });
  const oldUrl = urlIn(file)!;
  const hash = await passwordHash(role);
  const missing = join(dir, `${role}-missing.env`);
  writeFileSync(missing, "A=1\n", { mode: 0o600 });
  const wrong = join(dir, `${role}-wrong.env`);
  const wrongUrl = oldUrl.replace(/:[^:@/]+@/, ":wrongpassword@");
  writeFileSync(wrong, `LEARN_PG_URL=${wrongUrl}\n`, { mode: 0o600 });
  for (const f of [missing, wrong]) {
    const bytes = readFileSync(f, "utf8");
    await assert.rejects(run(admin, { envFiles: [file, f], role, schema }),
      (e: Error) => e.message.includes(f) && e.message.includes("--reset-password") && !e.message.includes("wrongpassword"));
    assert.equal(readFileSync(f, "utf8"), bytes);
    assert.equal(await passwordHash(role), hash);
  }
  await run(admin, { envFiles: [file, missing, wrong], role, schema, resetPassword: true });
  assert.notEqual(await passwordHash(role), hash);
  const newUrl = urlIn(file)!;
  assert.notEqual(newUrl, oldUrl);
  assert.equal(urlIn(missing), newUrl);
  assert.equal(urlIn(wrong), newUrl);
  assert.deepEqual({ ...(await whoAt(newUrl)) }, { user: role, db: testDatabase });
  await assert.rejects(whoAt(oldUrl), /password authentication failed/);
});

test("harness: critwire_lab creates and drops a learn_t_ schema under the lab lock", async () => {
  let made = "";
  await withLabSchema(async (sql: postgres.Sql, schema: string) => {
    made = schema;
    const [{ user, owner }] = await sql<{ user: string; owner: string }[]>`select current_user as user,
      (select pg_get_userbyid(nspowner) from pg_namespace where nspname = ${schema}) as owner`;
    assert.deepEqual({ user, owner }, { user: "critwire_lab", owner: "critwire_lab" });
  });
  assert.match(made, /^learn_t_/);
  assert.equal((await adminSql`select 1 from pg_namespace where nspname = ${made}`).length, 0);
});
