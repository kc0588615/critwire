// H2 (plan D14 SC3): a truncated JSON file. Written before the code, seen failing first. Failure mode: readJson reports
// "Unexpected end of JSON input" without saying which file, so an interrupted write can't be found.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readJson } from "./json.ts";

test("H2 readJson names the file it can't parse", async () => {
  const dir = mkdtempSync(join(tmpdir(), "critwire-json-"));
  try {
    const path = join(dir, "snapshot.json");
    writeFileSync(path, '{"species": [1, 2');
    await assert.rejects(readJson(pathToFileURL(path)), (e: Error) => e.message.startsWith(`${path}: `) && /JSON/.test(e.message));
    writeFileSync(path, '{"species": [1, 2]}\n');
    assert.deepEqual(await readJson(pathToFileURL(path)), { species: [1, 2] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
