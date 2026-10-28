// Learn's assets (assets.ts; plan D8.6, D11 bundle, S10; R7), written before the code. Failure modes: the self-hosted
// parquet extension differs from its sha256 pin or is missing; the installed @duckdb/duckdb-wasm isn't the version
// site/learn/src/assets.ts pins (the bundle and the vendored engine files would disagree); a file under
// dist/learn/assets/ that is neither under a versioned folder nor content-hashed (its fixed mtime would hide a change from
// deploy's rsync quick check and from Caddy's ETag); a `node:` import in the bundle (esbuild must fail, not stub it);
// two bundles of the same sources differing; a written asset without the fixed mtime.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ASSET_DIRS, BUNDLE_ENTRIES, FIXED_MTIME, assetErrors, bundle, unversionedAssets, writeAssets } from "./assets.ts";

const tmp = mkdtempSync(join(tmpdir(), "critwire-assets-"));
test.after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
const fresh = (): string => { const d = join(tmp, String(++n)); mkdirSync(d, { recursive: true }); return d; };
const write = (path: string, text: string): void => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
const files = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath, e.name))).sort();
function assertHas(got: string[], ...want: (string | RegExp)[]): void {
  for (const w of want)
    assert.ok(got.some((g) => (typeof w === "string" ? g.includes(w) : w.test(g))), `no error with ${w}; got:\n${got.join("\n")}`);
}

const EXT = "v1.5.6/wasm_eh/parquet.duckdb_extension.wasm";

test("the committed extension and the installed duckdb-wasm pass", () => {
  assert.deepEqual(assetErrors(), []);
});

test("an extension whose sha256 differs from its pin is refused", () => {
  const extensions = fresh();
  write(join(extensions, EXT), "not the extension");
  assertHas(assetErrors({ ...ASSET_DIRS, extensions }), /duckdb-ext\/v1\.5\.6\/wasm_eh\/parquet\.duckdb_extension\.wasm: sha256 [0-9a-f]{64}, pinned 33094a01/);
});

test("a missing extension is refused", () => {
  assertHas(assetErrors({ ...ASSET_DIRS, extensions: fresh() }), "parquet.duckdb_extension.wasm: missing");
});

test("an installed @duckdb/duckdb-wasm other than the pin is refused", () => {
  const duckdbWasm = fresh();
  write(join(duckdbWasm, "package.json"), JSON.stringify({ name: "@duckdb/duckdb-wasm", version: "1.33.0" }));
  assertHas(assetErrors({ ...ASSET_DIRS, duckdbWasm }), "@duckdb/duckdb-wasm: installed 1.33.0, site/learn/src/assets.ts pins 1.33.1-dev65.0");
});

test("a missing @duckdb/duckdb-wasm is refused", () => {
  assertHas(assetErrors({ ...ASSET_DIRS, duckdbWasm: fresh() }), "@duckdb/duckdb-wasm: not installed (pnpm install)");
});

test("only versioned or content-hashed paths pass under assets/", () => {
  assert.deepEqual(unversionedAssets([
    "duckdb-1.33.1-dev65.0/duckdb-eh.wasm",
    "duckdb-1.33.1-dev65.0/duckdb-browser-eh.worker.js",
    "duckdb-ext/v1.5.6/wasm_eh/parquet.duckdb_extension.wasm",
    "app-5XHN3RRL.js",
    "learn-Q7ZXK2LM.css",
  ]), []);
  const bad = ["app.js", "duckdb/duckdb-eh.wasm", "duckdb-ext/wasm_eh/parquet.duckdb_extension.wasm", "app-abc.js", "img/logo.svg", "duckdb-eh.wasm"];
  assert.deepEqual(unversionedAssets(bad), bad.map((p) => `dist/learn/assets/${p}: neither in a versioned folder nor content-hashed`));
});

test("a node: import fails the bundle", async () => {
  const dir = fresh();
  write(join(dir, "entry.ts"), 'import { readFileSync } from "node:fs";\nconsole.log(readFileSync);\n');
  await assert.rejects(bundle([join(dir, "entry.ts")], join(dir, "out")), /node:fs/);
});

test("the Learn entries bundle to app-<hash>.js and learn-<hash>.css, the same bytes every time", async () => {
  const [a, b] = [fresh(), fresh()];
  const names = await bundle(BUNDLE_ENTRIES, a);
  assert.deepEqual(await bundle(BUNDLE_ENTRIES, b), names);
  assert.equal(names.length, 2);
  assert.match(names[0], /^app-[A-Z0-9]{8}\.js$/);
  assert.match(names[1], /^learn-[A-Z0-9]{8}\.css$/);
  for (const f of names) assert.ok(readFileSync(join(a, f)).equals(readFileSync(join(b, f))), `${f} differs between two bundles`);
});

test("writeAssets: the engine files, the extension mirror and the bundle, each at the fixed mtime", async () => {
  const out = fresh();
  const urls = await writeAssets(pathToFileURL(`${out}/`));
  const assets = join(out, "learn/assets");
  const got = files(assets);
  assert.deepEqual(got.filter((f) => !/^(app|learn)-/.test(f)), [
    "duckdb-1.33.1-dev65.0/duckdb-browser-eh.worker.js",
    "duckdb-1.33.1-dev65.0/duckdb-eh.wasm",
    `duckdb-ext/${EXT}`,
  ]);
  assert.deepEqual(unversionedAssets(got), []);
  assert.match(urls.js, /^\/learn\/assets\/app-[A-Z0-9]{8}\.js$/);
  assert.match(urls.css, /^\/learn\/assets\/learn-[A-Z0-9]{8}\.css$/);
  assert.ok(got.includes(urls.js.slice("/learn/assets/".length)) && got.includes(urls.css.slice("/learn/assets/".length)));
  for (const f of got) assert.equal(statSync(join(assets, f)).mtime.getTime(), FIXED_MTIME.getTime(), `${f} mtime`);
  assert.ok(readFileSync(join(assets, "duckdb-ext", EXT)).equals(readFileSync(join(ASSET_DIRS.extensions, EXT))));
});
