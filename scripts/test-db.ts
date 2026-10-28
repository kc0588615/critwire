// pnpm test:db's connection (plan D15): DATABASE_URL from the environment or .env, refused unless it reaches critwire_dev.
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { loadEnv, requireEnv } from "./env.ts";
import { LAB_LOCK, LAB_ROLE, pgConnect, urlTarget } from "./learn/pg.ts";

export const testDatabase = "critwire_dev";

// The scratch database's URL; throws naming the database it reached when that isn't critwire_dev.
export async function testDatabaseUrl(): Promise<string> {
  loadEnv();
  const url = requireEnv("DATABASE_URL");
  const sql = postgres(url, { onnotice: () => {} });
  try {
    const [{ name }] = await sql<{ name: string }[]>`select current_database() as name`;
    if (name !== testDatabase) throw new Error(`pnpm test:db runs only on ${testDatabase}, DATABASE_URL reaches ${name}`);
  } finally {
    await sql.end();
  }
  return url;
}

// The test:db lab harness (plan D15): fn runs as critwire_lab (LEARN_PG_URL from the environment or .env) on
// critwire_dev, in a fresh learn_t_ schema it then drops, under the lab lock learn:check holds for its whole run.
export async function withLabSchema(fn: (sql: postgres.Sql, schema: string) => Promise<void>): Promise<void> {
  loadEnv();
  const sql = pgConnect(urlTarget(requireEnv("LEARN_PG_URL"), "LEARN_PG_URL"));
  try {
    const [{ db, user }] = await sql<{ db: string; user: string }[]>`select current_database() as db, current_user as user`;
    if (db !== testDatabase || user !== LAB_ROLE) {
      throw new Error(`lab tests run as ${LAB_ROLE} on ${testDatabase}; LEARN_PG_URL reaches ${user} on ${db}: run pnpm learn:check --setup`);
    }
    await sql`set lock_timeout = '60s'`;
    await sql`select pg_advisory_lock(hashtext(${LAB_LOCK}))`;
    const schema = `learn_t_${randomBytes(6).toString("hex")}`;
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    try {
      await fn(sql, schema);
    } finally {
      await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);
    }
  } finally {
    await sql.end();
  }
}
