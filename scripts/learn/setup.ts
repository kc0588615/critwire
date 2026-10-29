// learn:check --setup (plan D10, SC7): creates the lab role once, as a superuser, and stores its URL. Idempotent:
// the role gets LOGIN, CREATEROLE, createrole_self_grant = 'set, inherit', CONNECT, CREATE and TEMPORARY on the
// database, and the lab schema if it exists; it must not have CREATE on public. All of it is one transaction, so a
// refusal changes nothing. A password is set only when the role is created or with resetPassword, because a reset
// breaks every other checkout's LEARN_PG_URL; otherwise each listed file must already hold a working one. The password
// is sent as a SCRAM verifier (as psql's \password does), so it reaches neither the server log nor any output.
// Tests: setup.dbtest.ts (LS1–LS5).
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { writeEnvLine } from "../env.ts";
import { assertNotLive, LAB_ROLE, LAB_SCHEMA, LIVE_DATABASE, pgConnect, urlTarget, type PgTarget } from "./pg.ts";

/** The host the stored URL names: scram over TCP (pg_hba), unlike the admin's peer socket. */
const LAB_HOST = "127.0.0.1";
const URL_NAME = "LEARN_PG_URL";

export interface SetupOptions {
  envFiles: string[];
  resetPassword?: boolean;
  /** Tests pass learn_t_ names; learn:check uses the defaults. */
  role?: string;
  schema?: string;
}

// The name as an SQL identifier; only plain lowercase names are accepted, so no quoting is needed.
function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`${name} isn't a plain lowercase SQL name`);
  return name;
}

// PostgreSQL's SCRAM-SHA-256 verifier for a password (RFC 5802, 4096 iterations, as libpq's PQencryptPasswordConn).
function scramVerifier(password: string): string {
  const salt = randomBytes(16);
  const salted = pbkdf2Sync(password, salt, 4096, 32, "sha256");
  const hmac = (key: Buffer, text: string) => createHmac("sha256", key).update(text).digest();
  const stored = createHash("sha256").update(hmac(salted, "Client Key")).digest();
  return `SCRAM-SHA-256$4096:${salt.toString("base64")}$${stored.toString("base64")}:${hmac(salted, "Server Key").toString("base64")}`;
}

const fix = (role: string) =>
  `copy the ${URL_NAME} line from a checkout where it works, or re-run with --reset-password and every checkout's .env listed (--env each); ${role}'s password is unchanged`;

// Throws, naming the file and the fix, unless its LEARN_PG_URL connects as role to database.
async function assertWorkingUrl(file: string, role: string, database: string): Promise<void> {
  const url = parseEnv(readFileSync(file, "utf8"))[URL_NAME];
  if (!url) throw new Error(`${file} has no ${URL_NAME} and ${role} exists: ${fix(role)}`);
  let reached: string;
  try {
    const sql = pgConnect(urlTarget(url, `${URL_NAME} in ${file}`));
    try {
      const [who] = await sql<{ user: string; db: string }[]>`select current_user as user, current_database() as db`;
      reached = `${who.user} on ${who.db}`;
    } finally {
      await sql.end();
    }
  } catch (error) {
    throw new Error(`${URL_NAME} in ${file} doesn't connect (${(error as Error).message}): ${fix(role)}`);
  }
  if (reached !== `${role} on ${database}`) throw new Error(`${URL_NAME} in ${file} reaches ${reached}, not ${role} on ${database}: ${fix(role)}`);
}

export async function setupLab(admin: PgTarget, { envFiles, resetPassword = false, role = LAB_ROLE, schema = LAB_SCHEMA }: SetupOptions): Promise<void> {
  if (envFiles.length === 0) throw new Error("--setup needs at least one --env file");
  for (const file of envFiles) if (!existsSync(file)) throw new Error(`${file} doesn't exist: create it (mode 600) or list another --env file`);
  assertNotLive(admin);
  const sql = pgConnect(admin);
  let password: string | undefined;
  let database: string;
  try {
    const [who] = await sql<{ db: string; user: string; rolsuper: boolean }[]>`select current_database() as db,
      current_user as user, rolsuper from pg_roles where rolname = current_user`;
    database = who.db;
    if (database === LIVE_DATABASE) throw new Error(`refusing database ${LIVE_DATABASE} (current_database()): it's the live build's database`);
    if (!who.rolsuper) throw new Error(`--setup needs a superuser (libpq's default role); ${who.user} isn't one`);
    for (const extension of ["postgis", "postgis_raster"]) if ((await sql`select 1 from pg_extension where extname = ${extension}`).length === 0) {
      throw new Error(`${extension} isn't installed in ${database}: CREATE EXTENSION ${extension} there as the superuser, then re-run`);
    }
    const exists = (await sql`select 1 from pg_roles where rolname = ${role}`).length > 0;
    if (exists && !resetPassword) for (const file of envFiles) await assertWorkingUrl(file, role, database);
    if (!exists || resetPassword) password = randomBytes(24).toString("hex");
    const r = ident(role);
    const passwordClause = password ? ` PASSWORD '${scramVerifier(password)}'` : "";
    const schemaExists = await sql.begin(async (tx) => {
      await tx.unsafe(`${exists ? "ALTER" : "CREATE"} ROLE ${r} LOGIN CREATEROLE NOSUPERUSER NOCREATEDB${passwordClause}`);
      await tx.unsafe(`ALTER ROLE ${r} SET createrole_self_grant = 'set, inherit'`);
      await tx.unsafe(`GRANT CONNECT, CREATE, TEMPORARY ON DATABASE ${ident(database)} TO ${r}`);
      const has = (await tx`select 1 from pg_namespace where nspname = ${schema}`).length > 0;
      if (has) await tx.unsafe(`ALTER SCHEMA ${ident(schema)} OWNER TO ${r}`);
      const [{ create }] = await tx<{ create: boolean }[]>`select has_schema_privilege(${role}, 'public', 'CREATE') as create`;
      if (create) throw new Error(`${role} has CREATE on schema public: REVOKE it (from ${role} and from PUBLIC) as the superuser, then re-run; nothing changed`);
      return has;
    });
    console.log(`setup: role ${role} ${!exists ? "created" : password ? "exists, password reset" : "exists, password unchanged"}`);
    console.log(`setup: ${role} has LOGIN, CREATEROLE, createrole_self_grant = 'set, inherit', CONNECT, CREATE, TEMPORARY on ${database}`);
    console.log(`setup: schema ${schema} ${schemaExists ? `owned by ${role}` : "absent (the loader creates it)"}`);
  } finally {
    await sql.end();
  }
  if (!password) {
    for (const file of envFiles) console.log(`setup: ${URL_NAME} in ${file} connects as ${role}`);
    return;
  }
  const url = `postgres://${role}:${password}@${LAB_HOST}:${admin.port}/${database}`;
  for (const file of envFiles) {
    try {
      writeEnvLine(file, URL_NAME, url);
    } catch (error) {
      throw new Error(`${URL_NAME} not written to ${file} (${(error as Error).message}): ${role}'s new password is lost; re-run with --reset-password`);
    }
    console.log(`setup: ${URL_NAME} written to ${file}`);
  }
}
