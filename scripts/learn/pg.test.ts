// learn:check's connection (plan D10, SC7). Written before the code, seen failing first. Failure modes:
// LC1: the live database critwire is reached because the name comes from somewhere the check didn't look → refused
//      before connecting, by name, from LEARN_PG_URL, from PGDATABASE, and from libpq's default (the user name), with
//      the source named and no value of the URL in the message.
// LC1 (parse): a URL with parameters, another scheme or no parse is taken half-understood → refused, no value shown.
// LC10: a child psql inherits DATABASE_URL, GBIF_*, LEARN_PG_URL or the caller's PG* settings, or gets the password
//       or URL in argv (visible in ps) → its environment is exactly PATH, HOME and the target's PG* values; argv holds
//       only the file.
import assert from "node:assert/strict";
import { test } from "node:test";
import { childEnv, labTarget, libpqTarget, psqlArgs } from "./pg.ts";

const noValue = (pattern: RegExp, ...fragments: string[]) => (error: Error) =>
  pattern.test(error.message) && fragments.every((f) => !error.message.includes(f));

test("LC1 critwire is refused by name from LEARN_PG_URL", () => {
  assert.throws(() => labTarget({ LEARN_PG_URL: "postgres://senuser:senpass@senhost:5432/critwire" }),
    noValue(/critwire.*LEARN_PG_URL/, "senuser", "senpass", "senhost"));
});

test("LC1 critwire is refused by name from PGDATABASE", () => {
  assert.throws(() => labTarget({ PGDATABASE: "critwire", PGUSER: "someone" }), /critwire.*PGDATABASE/);
});

test("LC1 critwire is refused by name from libpq's default database (the user name)", () => {
  assert.throws(() => labTarget({ PGUSER: "critwire" }), /critwire.*user name/);
  assert.throws(() => labTarget({ LEARN_PG_URL: "postgres://critwire:senpass@127.0.0.1:5432" }),
    noValue(/critwire.*user name/, "senpass"));
});

test("LC1 a URL with parameters, another scheme or no parse is refused without showing it", () => {
  assert.throws(() => labTarget({ LEARN_PG_URL: "postgres://u:senpass@h:5432/critwire_dev?sslmode=disable" }), noValue(/parameters/, "senpass", "sslmode"));
  assert.throws(() => labTarget({ LEARN_PG_URL: "mysql://u:senpass@h/critwire_dev" }), noValue(/scheme/, "senpass"));
  assert.throws(() => labTarget({ LEARN_PG_URL: "postgres://u:senpass@/critwire_dev" }), noValue(/isn't a URL/, "senpass"));
});

test("LC1 a lab URL resolves to its parts, decoded; libpq's defaults fill the rest", () => {
  assert.deepEqual(labTarget({ LEARN_PG_URL: "postgresql://critwire_lab:a%40b@127.0.0.1:5433/critwire_dev", PGDATABASE: "critwire" }),
    { host: "127.0.0.1", port: 5433, user: "critwire_lab", password: "a@b", database: "critwire_dev", source: "LEARN_PG_URL" });
  assert.deepEqual(libpqTarget({ PGUSER: "me", PGDATABASE: "critwire_dev" }),
    { host: "/var/run/postgresql", port: 5432, user: "me", password: undefined, database: "critwire_dev", source: "PGDATABASE" });
  assert.deepEqual(libpqTarget({ PGHOST: "db", PGPORT: "6432", PGUSER: "me", PGPASSWORD: "pw" }),
    { host: "db", port: 6432, user: "me", password: "pw", database: "me", source: "the user name (libpq's default)" });
});

test("LC10 a child psql gets PATH, HOME and the target's PG* values only, and argv only the file", () => {
  const parent = {
    PATH: "/bin", HOME: "/home/x", DATABASE_URL: "postgres://senA", GBIF_USERNAME: "senB", GBIF_PASSWORD: "senC",
    LEARN_PG_URL: "postgresql://critwire_lab:senD@127.0.0.1:5432/critwire_dev", PGPASSWORD: "senE", PGSERVICE: "senF",
  };
  const target = labTarget(parent);
  assert.deepEqual(childEnv(target, parent), {
    PATH: "/bin", HOME: "/home/x", PGHOST: "127.0.0.1", PGPORT: "5432", PGUSER: "critwire_lab", PGPASSWORD: "senD", PGDATABASE: "critwire_dev",
  });
  assert.deepEqual(childEnv(target, parent, "-c lock_timeout=30000").PGOPTIONS, "-c lock_timeout=30000");
  const { PGPASSWORD: _, ...withoutPassword } = childEnv({ ...target, password: undefined }, parent);
  assert.equal("PGPASSWORD" in withoutPassword, false);
  const argv = psqlArgs("/tmp/loader.sql");
  assert.deepEqual(argv, ["-X", "-v", "ON_ERROR_STOP=1", "-f", "/tmp/loader.sql"]);
  for (const f of ["senD", "critwire_lab", "127.0.0.1"]) assert.ok(!argv.join(" ").includes(f));
});
