// loadEnv tests (MF1, plan D11). Failure modes first:
// G4: a variable set in both the environment and .env with different values is overridden silently (nobody knows which
//     database a CLI used), or the log line leaks a value or part of one (a password, host, user or database name from
//     a URL) → one line per such variable naming it and the winning source, and no sentinel fragment anywhere in the
//     output; the environment's value wins; a variable only in .env is set; an equal value logs nothing.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, mock, test } from "node:test";
import { loadEnv } from "./env.ts";

const dir = mkdtempSync(join(tmpdir(), "critwire-env-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const url = (s: string) => `postgres://sentuser${s}:sentpass${s}@senthost${s}:5432/sentdb${s}`;
const fragments = ["A", "B"].flatMap((s) => [`sentuser${s}`, `sentpass${s}`, `senthost${s}`, `sentdb${s}`, `sentgbif${s}`]);
const overridden = ["DATABASE_URL", "LEARN_PG_URL", "GBIF_PASSWORD"];
const names = [...overridden, "CRITWIRE_T_ONLY_FILE", "CRITWIRE_T_SAME"];

test("G4 overrides are logged by name and source only, never a value", () => {
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  const file = join(dir, ".env");
  writeFileSync(file, [`DATABASE_URL=${url("B")}`, `LEARN_PG_URL=${url("B")}`, "GBIF_PASSWORD=sentgbifB",
    "CRITWIRE_T_ONLY_FILE=from-file", "CRITWIRE_T_SAME=same", ""].join("\n"));
  Object.assign(process.env, { DATABASE_URL: url("A"), LEARN_PG_URL: url("A"), GBIF_PASSWORD: "sentgbifA", CRITWIRE_T_SAME: "same" });
  delete process.env.CRITWIRE_T_ONLY_FILE;
  const lines: string[] = [];
  const capture = (...args: unknown[]) => { lines.push(args.map(String).join(" ")); };
  const mocks = (["log", "error", "warn", "info"] as const).map((m) => mock.method(console, m, capture));
  let env: Record<string, string | undefined>;
  try {
    loadEnv(file);
  } finally {
    for (const m of mocks) m.mock.restore();
    env = Object.fromEntries(names.map((n) => [n, process.env[n]]));
    for (const n of names) if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n];
  }
  assert.deepEqual(lines.sort(), overridden.map((n) => `env: ${n} from the environment (overrides ${file})`).sort());
  const output = lines.join("\n");
  for (const f of fragments) assert.ok(!output.includes(f), `output leaks ${f}`);
  assert.deepEqual(env, { DATABASE_URL: url("A"), LEARN_PG_URL: url("A"), GBIF_PASSWORD: "sentgbifA",
    CRITWIRE_T_ONLY_FILE: "from-file", CRITWIRE_T_SAME: "same" });
});
