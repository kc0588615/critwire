// pnpm learn:check (plan D10, 004 §7.6): the PostGIS lab's checks. So far only --setup: creates the lab role
// critwire_lab as libpq's default role (a superuser; PGDATABASE names the lab database) and stores LEARN_PG_URL in
// each --env file (default ./.env). --reset-password sets a new password and breaks every checkout's copy not listed.
// Errors print their message only (a driver error carries its statement).
// Usage: PGDATABASE=critwire_dev pnpm learn:check --setup [--env <file>]… [--reset-password]
import { parseArgs } from "node:util";
import { loadEnv } from "./env.ts";
import { libpqTarget } from "./learn/pg.ts";
import { setupLab } from "./learn/setup.ts";

try {
  const { values } = parseArgs({
    options: { setup: { type: "boolean" }, env: { type: "string", multiple: true }, "reset-password": { type: "boolean" } },
    strict: true,
  });
  if (!values.setup) throw new Error("only --setup exists yet (the loader stage comes with S23)");
  loadEnv();
  await setupLab(libpqTarget(process.env), { envFiles: values.env ?? [".env"], resetPassword: values["reset-password"] });
} catch (error) {
  console.error(`learn:check: ${(error as Error).message}`);
  process.exitCode = 1;
}
