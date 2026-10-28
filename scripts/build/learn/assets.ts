// Learn's assets (plan D8.6, D11 bundle; R7): dist/learn/assets/ holds the vendored engine files
// (duckdb-<version>/), the self-hosted extension mirror (duckdb-ext/<duckdb version>/), and the esbuild bundle
// (app-<hash>.js, learn-<hash>.css). Every file gets a fixed mtime of 2000-01-01, so Caddy's ETag (mtime + size) and
// Last-Modified don't change between builds; a path that is neither versioned nor content-hashed is refused, because
// with a fixed mtime a changed file of the same size would slip past deploy's rsync quick check.
// assetErrors (readLearnInputs, before anything is written): the extension's sha256 against its pin, and the installed
// @duckdb/duckdb-wasm against site/learn/src/assets.ts's pin. Tests: assets.test.ts.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, readdir, utimes } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSETS, DUCKDB_DIR, DUCKDB_EXT, DUCKDB_WASM, extensionFile } from "../../../site/learn/src/assets.ts";

export const FIXED_MTIME = new Date("2000-01-01T00:00:00Z");

/** Each extension's sha256 (the spike's downloads/SOURCES.md); a committed file that differs is refused. */
const EXTENSION_SHA256: Record<string, string> = {
  parquet: "33094a01b3a1dc27c4158f4c1fa13c45c240eea6ba07197a19a1925f002ca473",
};

const repo = new URL("../../../", import.meta.url);
const repoPath = (path: string) => fileURLToPath(new URL(path, repo));

export interface AssetDirs {
  /** The committed mirror, site/learn/duckdb-ext/. */
  extensions: string;
  /** The installed package. */
  duckdbWasm: string;
}

export const ASSET_DIRS: AssetDirs = {
  extensions: repoPath(`site/learn/${DUCKDB_EXT.dir}/`),
  duckdbWasm: repoPath(`node_modules/${DUCKDB_WASM.pkg}/`),
};

/** The bundle's entries: the app and its one stylesheet. */
export const BUNDLE_ENTRIES = [repoPath("site/learn/src/app.ts"), repoPath("site/learn/src/learn.css")];

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Every way the committed extensions or the installed engine differ from their pins. Reads only. */
export function assetErrors(dirs: AssetDirs = ASSET_DIRS): string[] {
  const errors: string[] = [];
  for (const name of DUCKDB_EXT.names) {
    const file = extensionFile(name);
    const label = `site/learn/${DUCKDB_EXT.dir}/${file}`;
    const pin = EXTENSION_SHA256[name];
    const path = join(dirs.extensions, file);
    if (!pin) errors.push(`${label}: no sha256 pin in scripts/build/learn/assets.ts`);
    else if (!existsSync(path)) errors.push(`${label}: missing`);
    else {
      const got = sha256(readFileSync(path));
      if (got !== pin) errors.push(`${label}: sha256 ${got}, pinned ${pin}`);
    }
  }
  const pkg = join(dirs.duckdbWasm, "package.json");
  if (!existsSync(pkg)) errors.push(`${DUCKDB_WASM.pkg}: not installed (pnpm install)`);
  else {
    const { version } = JSON.parse(readFileSync(pkg, "utf8"));
    if (version !== DUCKDB_WASM.version) errors.push(`${DUCKDB_WASM.pkg}: installed ${version}, site/learn/src/assets.ts pins ${DUCKDB_WASM.version}`);
  }
  return errors;
}

// A folder named for a version (duckdb-1.33.1-dev65.0, v1.5.6), or a file named for its content (app-5XHN3RRL.js).
const VERSIONED = /^(?:[a-z][a-z0-9_]*-)*v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/;
const HASHED = /^[a-z][a-z0-9_]*-[A-Z0-9]{8}\.(?:js|css)$/;

/** One error per path (relative to dist/learn/assets/) that is neither in a versioned folder nor content-hashed. */
export function unversionedAssets(paths: readonly string[]): string[] {
  return paths
    .filter((p) => {
      const parts = p.split("/");
      return !(parts.slice(0, -1).some((s) => VERSIONED.test(s)) || (parts.length === 1 && HASHED.test(p)));
    })
    .map((p) => `dist/learn/assets/${p}: neither in a versioned folder nor content-hashed`);
}

/**
 * esbuild: ESM, minified, for the browser, `[name]-[hash]`, `.sql` as text. A `node:` import fails (platform browser,
 * nothing external). Returns the files it wrote to `outdir`, sorted, as esbuild reports them.
 */
export async function bundle(entryPoints: string[], outdir: string): Promise<string[]> {
  const { metafile } = await build({
    entryPoints,
    outdir,
    absWorkingDir: fileURLToPath(repo),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    entryNames: "[name]-[hash]",
    loader: { ".sql": "text" },
    metafile: true,
    logLevel: "silent",
  });
  return Object.keys(metafile.outputs).map((f) => relative(outdir, join(fileURLToPath(repo), f))).sort();
}

/** The bundle's URLs, for the pages' {{js}} and {{css}}. */
export interface BundleUrls {
  js: string;
  css: string;
}

/** Writes dist/learn/assets/ (see the top of this file) and returns the bundle's URLs. Throws on an unversioned path. */
export async function writeAssets(out: URL, dirs: AssetDirs = ASSET_DIRS): Promise<BundleUrls> {
  const assets = fileURLToPath(new URL(`${ASSETS.slice(1)}/`, out));
  const copies: [string, string][] = [
    ...DUCKDB_WASM.files.map((f): [string, string] => [join(dirs.duckdbWasm, "dist", f), join(assets, DUCKDB_DIR, f)]),
    ...DUCKDB_EXT.names.map((n): [string, string] => [join(dirs.extensions, extensionFile(n)), join(assets, DUCKDB_EXT.dir, extensionFile(n))]),
  ];
  for (const [from, to] of copies) {
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
  }
  const bundled = await bundle(BUNDLE_ENTRIES, assets);
  const files = (await readdir(assets, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile())
    .map((e) => relative(assets, join(e.parentPath, e.name)))
    .sort();
  const errors = unversionedAssets(files);
  if (errors.length) throw new Error(`learn assets: ${errors.length} error(s):\n${errors.join("\n")}`);
  for (const f of files) await utimes(join(assets, f), FIXED_MTIME, FIXED_MTIME);
  const url = (ext: string) => {
    const found = bundled.filter((f) => f.endsWith(ext));
    if (found.length !== 1) throw new Error(`learn assets: the bundle wrote ${found.length} ${ext} files: ${bundled.join(", ")}`);
    return `${ASSETS}/${found[0]}`;
  };
  return { js: url(".js"), css: url(".css") };
}
