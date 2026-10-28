// learn:check's PostgreSQL connection (plan D10, SC7): LEARN_PG_URL if set, else libpq's PG* settings; never
// DATABASE_URL. The live database critwire is refused by name before connecting. A child psql gets an explicit
// environment (PATH, HOME and the target's PG* values), so no password reaches argv and no DATABASE_URL or GBIF_* leaks.
// Tests: pg.test.ts (LC1, LC10).
import { userInfo } from "node:os";
import postgres from "postgres";

export const LIVE_DATABASE = "critwire";
/** The role labs run as (SC7); created by learn:check --setup. */
export const LAB_ROLE = "critwire_lab";
/** The schema the loader replaces; --setup hands it to LAB_ROLE. */
export const LAB_SCHEMA = "learn_curriculum";
/** A2's schema: only the canary reads it; the leak query skips it. */
export const CANARY_SCHEMA = "learn_spatial";
/** learn:check and the test:db lab harness hold this advisory lock for their whole run. */
export const LAB_LOCK = "critwire.learn";
/** libpq's compiled-in socket directory on Debian and Ubuntu. */
export const SOCKET_DIR = "/var/run/postgresql";

type Env = Record<string, string | undefined>;

/** Where a connection goes; `source` names where the database name came from, for refusals. */
export interface PgTarget {
  host: string;
  port: number;
  user: string;
  password: string | undefined;
  database: string;
  source: string;
}

const DEFAULT_DATABASE = "the user name (libpq's default)";

/** Throws, naming the source, when the database is the live build's; returns the target. */
export function assertNotLive(target: PgTarget): PgTarget {
  if (target.database === LIVE_DATABASE) {
    throw new Error(`refusing database ${LIVE_DATABASE} (from ${target.source}): it's the live build's database; labs use critwire_dev`);
  }
  return target;
}

/** libpq's PG* settings and defaults (socket, 5432, the OS user, database = user); refuses critwire. */
export function libpqTarget(env: Env): PgTarget {
  const user = env.PGUSER || userInfo().username;
  return assertNotLive({
    host: env.PGHOST || SOCKET_DIR,
    port: Number(env.PGPORT || 5432),
    user,
    password: env.PGPASSWORD,
    database: env.PGDATABASE || user,
    source: env.PGDATABASE ? "PGDATABASE" : DEFAULT_DATABASE,
  });
}

/** A postgres:// URL's parts, decoded; libpq's defaults fill what it omits. Refusals name `name`, never the URL. */
export function urlTarget(url: string, name: string): PgTarget {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`${name} isn't a URL`);
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") throw new Error(`${name}: scheme isn't postgres or postgresql`);
  if (u.search || u.hash) throw new Error(`${name} has parameters: not supported, give host, port, user, password and database only`);
  const user = decodeURIComponent(u.username) || userInfo().username;
  const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
  return assertNotLive({
    host: u.hostname || SOCKET_DIR,
    port: Number(u.port || 5432),
    user,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: database || user,
    source: database ? name : DEFAULT_DATABASE,
  });
}

/** The lab's target: LEARN_PG_URL if set, else libpq's settings. */
export function labTarget(env: Env): PgTarget {
  return env.LEARN_PG_URL ? urlTarget(env.LEARN_PG_URL, "LEARN_PG_URL") : libpqTarget(env);
}

/** One connection to the target, notices dropped; `options` adds to or replaces postgres.js's (onclose, connection). */
export function pgConnect(target: PgTarget, options: postgres.Options<{}> = {}): postgres.Sql {
  const { host, port, user, password, database } = target;
  return postgres({ host, port, user, pass: password, database, max: 1, connect_timeout: 10, onnotice: () => {}, ...options });
}

/** A child psql's whole environment: PATH, HOME, the target's PG* values and, if given, PGOPTIONS. */
export function childEnv(target: PgTarget, parent: Env = process.env, pgOptions?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: parent.PATH, HOME: parent.HOME,
    PGHOST: target.host, PGPORT: String(target.port), PGUSER: target.user, PGDATABASE: target.database,
  };
  if (target.password !== undefined) env.PGPASSWORD = target.password;
  if (pgOptions !== undefined) env.PGOPTIONS = pgOptions;
  return env;
}

/** psql's argv for a file, as a learner runs the loader; the connection comes from childEnv only. */
export function psqlArgs(file: string): string[] {
  return ["-X", "-v", "ON_ERROR_STOP=1", "-f", file];
}
