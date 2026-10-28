// pnpm test:db's connection (plan D15): DATABASE_URL from the environment or .env, refused unless it reaches critwire_dev.
import postgres from "postgres";
import { loadEnv, requireEnv } from "./env.ts";

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
