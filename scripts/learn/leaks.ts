// The leak query and its cleanup (plan D3; spike privilege.ts LEAK_SQL, committedLeak; LK1–LK5, SC7): every learn_
// role and schema but the lab's and A2's, as `role <name>` / `schema <name>`. Of those, the lab role made the roles it
// holds ADMIN OPTION on (PostgreSQL 16 grants it to the creating role) and the schemas it owns: only those are dropped,
// and only under the lab lock (the runner's committed leaks, cleanup.ts's sweep). Anything else is named with the
// superuser's command. Tests: runner.dbtest.ts (LK4), learn-check.dbtest.ts (CU1–CU5).
import type postgres from "postgres";
import { CANARY_SCHEMA, LAB_SCHEMA } from "./pg.ts";

/** Every learn_ role and schema but the lab's and A2's, sorted (roles first): the leak query. */
export async function learnObjects(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`select 'role ' || rolname as name from pg_roles where rolname like 'learn\_%'
    union all select 'schema ' || nspname from pg_namespace
      where nspname like 'learn\_%' and nspname not in (${LAB_SCHEMA}, ${CANARY_SCHEMA}) order by 1`;
  return rows.map((r) => r.name);
}

const parts = (object: string) => object.split(" ") as ["role" | "schema", string];

/** Of `objects`, those the connection's role made: roles it holds ADMIN OPTION on, schemas it owns; in their order. */
export async function labMade(sql: postgres.Sql, objects: readonly string[]): Promise<string[]> {
  if (!objects.length) return [];
  const rows = await sql<{ object: string }[]>`select o as object from unnest(${sql.array([...objects])}::text[]) with ordinality as t (o, n)
    where (split_part(o, ' ', 1) = 'role' and exists (select from pg_auth_members m join pg_roles r on r.oid = m.roleid
        where r.rolname = split_part(o, ' ', 2) and m.member = (select oid from pg_roles where rolname = current_user) and m.admin_option))
      or (split_part(o, ' ', 1) = 'schema' and exists (select from pg_namespace
        where nspname = split_part(o, ' ', 2) and nspowner = (select oid from pg_roles where rolname = current_user)))
    order by n`;
  return rows.map((r) => r.object);
}

/** The superuser's psql command that drops `object` from `database`. */
export function superuserCleanup(object: string, database: string): string {
  const [kind, name] = parts(object);
  const drop = kind === "role" ? `DROP OWNED BY ${name}; DROP ROLE ${name}` : `DROP SCHEMA ${name} CASCADE`;
  return `psql -d ${database} -c '${drop}'`;
}

/** Drops each object, in order (roles before schemas); throws naming every one that failed, with its error. */
export async function dropObjects(sql: postgres.Sql, objects: readonly string[]): Promise<void> {
  const failed: string[] = [];
  for (const object of objects) {
    const [kind, name] = parts(object);
    try {
      if (kind === "role") {
        await sql`drop owned by ${sql(name)}`;
        await sql`drop role ${sql(name)}`;
      } else await sql`drop schema ${sql(name)} cascade`;
    } catch (e) {
      failed.push(`can't drop ${object}: ${(e as Error).message}`);
    }
  }
  if (failed.length) throw new Error(failed.join("\n"));
}
