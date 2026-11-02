// Where the Learn bundle finds its engine (plan D11): one pin, shared by the bundle and the build, which vendors these
// files and refuses an installed @duckdb/duckdb-wasm of another version (scripts/build/learn/assets.ts). Each path under
// /learn/assets/ is versioned, so a new version never reuses a URL (R7).

export const ASSETS = "/learn/assets";

/** The engine: the exception-handling (eh) build only; a browser without wasm exception handling gets a notice. */
export const DUCKDB_WASM = {
  pkg: "@duckdb/duckdb-wasm",
  version: "1.33.1-dev65.0",
  files: ["duckdb-eh.wasm", "duckdb-browser-eh.worker.js"],
} as const;

/** The engine files' folder under ASSETS. */
export const DUCKDB_DIR = `duckdb-${DUCKDB_WASM.version}`;

/**
 * DuckDB extensions, self-hosted as a mirror with extensions.duckdb.org's layout
 * (`<repo>/<duckdb version>/<platform>/<name>.duckdb_extension.wasm`), committed under site/learn/duckdb-ext/.
 * duckdb-wasm links only core_functions statically, so even read_parquet is an extension.
 */
export const DUCKDB_EXT = { dir: "duckdb-ext", duckdbVersion: "v1.5.6", platform: "wasm_eh", names: ["parquet"] } as const;

/** Each extension's path under the mirror's folder (DUCKDB_EXT.dir). */
export const extensionFile = (name: string): string =>
  `${DUCKDB_EXT.duckdbVersion}/${DUCKDB_EXT.platform}/${name}.duckdb_extension.wasm`;

/**
 * The data files a page fetches and registers: the four setup.sql reads and the one lesson blocks read in place, by the
 * name they are read under and the path they are served at. The page has no other file, so the listing-block guard runs
 * over exactly these (scripts/build/learn/projection.ts withBrowserTables).
 */
export const DATA_FILES = [
  { name: "species.parquet", path: "/v1/species.parquet" },
  { name: "countries.parquet", path: "/v1/countries.parquet" },
  { name: "datasets.csv", path: "/learn/data/datasets.csv" },
  { name: "occurrences.parquet", path: "/learn/data/occurrences.parquet" },
  { name: "range-listings.parquet", path: "/v1/range-listings.parquet" },
] as const;
