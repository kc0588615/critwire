// pnpm learn:check (plan D10, 004 §7.6): the PostGIS lab's checks.
// Default: learn/check.ts's stages (connect, loader, blocks, end) as the lab role, LEARN_PG_URL or else libpq's PG*
// settings, never DATABASE_URL; the blocks stage checks each PostGIS block against site/learn/labs/checked/<id>.txt.
// --update runs each block twice and writes its result once both runs agree and every block passed. --dist names the
// built site (default dist); --canary-schema a learn_t_ fixture instead of learn_spatial (tests only).
// --setup: creates the lab role critwire_lab as libpq's default role (a superuser; PGDATABASE names the lab database)
// and stores LEARN_PG_URL in each --env file (default ./.env). --reset-password sets a new password and breaks every
// checkout's copy not listed.
// SIGINT/SIGTERM during the check cancels the running psql or block statement and cleans up (temp loader; the run's
// sessions stopped, the lab role's new objects swept, then the lock freed: learn/cleanup.ts); exit 1.
// Errors print their message only (a driver error carries its statement).
// Usage: pnpm learn:check [--update] [--dist <dir>]
//        PGDATABASE=critwire_dev pnpm learn:check --setup [--env <file>]… [--reset-password]
import { parseArgs } from "node:util";
import { loadEnv } from "./env.ts";
import { CANARY_SCHEMA, checkLab } from "./learn/check.ts";
import { labTarget, libpqTarget } from "./learn/pg.ts";
import { setupLab } from "./learn/setup.ts";

try {
  const { values } = parseArgs({
    options: {
      setup: { type: "boolean" }, env: { type: "string", multiple: true }, "reset-password": { type: "boolean" },
      update: { type: "boolean" }, dist: { type: "string", default: "dist" }, "canary-schema": { type: "string", default: CANARY_SCHEMA },
    },
    strict: true,
  });
  loadEnv();
  if (values.setup) {
    await setupLab(libpqTarget(process.env), { envFiles: values.env ?? [".env"], resetPassword: values["reset-password"] });
  } else {
    const stop = new AbortController();
    for (const s of ["SIGINT", "SIGTERM"] as const) process.once(s, () => stop.abort(new Error(`interrupted by ${s}; nothing kept`)));
    await checkLab(labTarget(process.env), { dist: values.dist, canarySchema: values["canary-schema"], update: values.update, signal: stop.signal });
    console.log("learn:check: ok");
  }
} catch (error) {
  console.error(`learn:check: ${(error as Error).message}`);
  process.exitCode = 1;
}
