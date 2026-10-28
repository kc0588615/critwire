// CF1 (plan D9.2): childFile, the one guard on every computed output path. Written before the code, seen failing
// first. Failure modes: a name escapes its folder (.., an absolute path, a backslash), names the folder itself (empty,
// ".", "/"), or is read by URL parsing as something else (?, #, %), so a file lands somewhere other than its name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { childFile } from "./paths.ts";

const dir = new URL("file:///tmp/critwire-dist/v1/");

test("CF1 childFile refuses a name outside its folder, the folder itself, or one URL parsing would change", () => {
  for (const name of ["", ".", "..", "../x.json", "a/../../x", "/", "/etc/passwd", "a//b", "a/", "a\\b", "x?y", "x#y", "%2e%2e", "a b", "é.json"]) {
    assert.throws(() => childFile(dir, name), (e: Error) => e.message.includes(JSON.stringify(name)), name);
  }
});

test("CF1 childFile refuses a folder URL without a trailing slash", () => {
  assert.throws(() => childFile(new URL("file:///tmp/critwire-dist/v1"), "species.json"), /end with \//);
});

test("CF1 childFile resolves a plain name or relative path inside its folder", () => {
  assert.equal(childFile(dir, "species.json").href, "file:///tmp/critwire-dist/v1/species.json");
  assert.equal(childFile(dir, "species/12.json").href, "file:///tmp/critwire-dist/v1/species/12.json");
  assert.equal(childFile(dir, "species/red-panda.json").href, "file:///tmp/critwire-dist/v1/species/red-panda.json");
  assert.equal(childFile(dir, "postgis/learn_curriculum.sql").href, "file:///tmp/critwire-dist/v1/postgis/learn_curriculum.sql");
});
