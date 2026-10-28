// Learn's one DuckDB-WASM engine (plan D11; port of the spike's src/engine.ts). Boot:
//   1. HEAD the .wasm, so a missing file fails here instead of hanging instantiate; the worker's `error` races it;
//   2. instantiate the eh build (the only one vendored) and open `:memory:`;
//   3–5. fetch manifest.json and the four files setup.sql reads (cache: no-cache), check each sha256 against the
//      manifest (SC2), and register the checked bytes as buffers, kept for restarts;
//   6. settings: no extension is installed or loaded implicitly; parquet loads from our own mirror;
//   7. setup.sql, then the `setup` performance mark (learn-timing reads it).
// Every statement is streamed and cut at ROW_CAP rows; one script runs at a time. Reset and Stop restart the engine
// (a fresh database, a new generation); a result from an older generation is dropped (Superseded).
import * as duckdb from "@duckdb/duckdb-wasm";
import { scriptStatements, statementError } from "../../../scripts/build/learn/sql.ts";
import SETUP from "../sql/setup.sql";
import { ASSETS, DUCKDB_DIR, DUCKDB_EXT } from "./assets.ts";
import { decimalText } from "./format.ts";

const ENGINE_DIR = `${ASSETS}/${DUCKDB_DIR}`;
const MANIFEST = "/learn/data/manifest.json";

/** The files setup.sql reads, by the name it reads them under, the path they are served at, and their pin in the manifest. */
const DATA_FILES = [
  { name: "species.parquet", path: "/v1/species.parquet", pin: (m: DataManifest) => m.inputs.v1["species.parquet"] },
  { name: "countries.parquet", path: "/v1/countries.parquet", pin: (m: DataManifest) => m.inputs.v1["countries.parquet"] },
  { name: "datasets.csv", path: "/learn/data/datasets.csv", pin: (m: DataManifest) => m.files["datasets.csv"] },
  { name: "occurrences.parquet", path: "/learn/data/occurrences.parquet", pin: (m: DataManifest) => m.files["occurrences.parquet"] },
] as const;

/** The part of manifest.json (scripts/build/learn/data.ts LabManifest) the engine reads. */
interface DataManifest {
  inputs: { v1: Record<string, { sha256: string } | undefined> };
  files: Record<string, { sha256: string } | undefined>;
}

/** Rows a statement keeps; the rest of its result is never read. */
export const ROW_CAP = 10_000;

export interface Result {
  columns: string[];
  rows: unknown[][];
  /** Set when the last statement had more than ROW_CAP rows; `rows` holds the first ROW_CAP. */
  truncated?: true;
}

export type EngineState =
  | { state: "loading"; text: string }
  | { state: "ready" }
  | { state: "failed"; text: string };

/** A run that a restart overtook: its result belongs to an older database and is dropped. */
export class Superseded extends Error {
  constructor() {
    super("the database was restarted");
    this.name = "Superseded";
  }
}

export interface Engine {
  readonly state: EngineState;
  /** Counts boots; Reset and Stop start a new one. */
  readonly generation: number;
  /** Calls `listener` now and on every state change. */
  onChange(listener: (state: EngineState) => void): void;
  /** Runs a script on the current database; rejects with Superseded if a restart comes first. */
  run(sql: string): Promise<Result>;
  /** A fresh database (Reset, Stop): ends any running query and drops the queue. */
  restart(): Promise<void>;
}

const sha256 = async (bytes: Uint8Array) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function get(path: string, init: RequestInit = {}): Promise<Response> {
  const url = location.origin + path;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-cache", ...init });
  } catch {
    throw new Error(`${url} couldn't be reached`);
  }
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res;
}

/** The four files setup.sql reads, each checked against manifest.json (SC2). Throws naming the first that differs. */
async function fetchData(): Promise<Map<string, Uint8Array>> {
  const manifest: DataManifest = await (await get(MANIFEST)).json();
  const files = await Promise.all(DATA_FILES.map(async (f) => {
    const want = f.pin(manifest)?.sha256;
    if (!want) throw new Error(`${MANIFEST} doesn't list ${f.path}`);
    const bytes = new Uint8Array(await (await get(f.path)).arrayBuffer());
    const got = await sha256(bytes);
    if (got !== want) throw new Error(`${f.path} isn't the file /learn/data/ was built from (sha256 ${got}): reload; if it persists, the site is mid-update`);
    return [f.name, bytes] as const;
  }));
  return new Map(files);
}

/** Never fetch an extension implicitly; the ones setup needs load explicitly from our own mirror. */
const settings = () => [
  "SET autoinstall_known_extensions = false",
  "SET autoload_known_extensions = false",
  "SET memory_limit = '512MB'",
  `SET custom_extension_repository = '${location.origin}${ASSETS}/${DUCKDB_EXT.dir}'`,
  ...DUCKDB_EXT.names.map((n) => `LOAD ${n}`),
].join(";\n");

/** Arrow values to plain JS: lists to arrays, structs to objects; BigInt and scalars as they are. */
function plain(v: unknown): unknown {
  if (v === null || typeof v !== "object" || v instanceof Date) return v;
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<unknown>, plain);
  const json = (v as { toJSON?: () => unknown }).toJSON?.();
  if (Array.isArray(json)) return json.map(plain);
  if (json && typeof json === "object") return Object.fromEntries(Object.entries(json).map(([k, x]) => [k, plain(x)]));
  return v;
}

// Arrow's type ids (the format's Schema.fbs enum, stable across versions); arrow-js returns DATE and TIMESTAMP as epoch
// ms, a DECIMAL as its 32-bit words (the scale is on the field), and an ENUM as a dictionary whose cells read back NULL.
const ARROW_DECIMAL = 7;
const ARROW_DATE = 8;
const ARROW_TIMESTAMP = 10;
const ARROW_DICTIONARY = -1;
type ArrowType = { typeId: number; scale?: number };
type ArrowTable = { schema: { fields: { name: string; type: ArrowType }[] }; numRows: number; getChildAt(i: number): { get(r: number): unknown } | null };

/** A DATE or TIMESTAMP cell as DuckDB writes it (`2026-10-20`, `2026-10-20 12:34:56[.789]`), not epoch ms. */
function temporal(typeId: number, v: unknown): unknown {
  if (typeof v !== "number" || (typeId !== ARROW_DATE && typeId !== ARROW_TIMESTAMP)) return v;
  const iso = new Date(v).toISOString();
  return typeId === ARROW_DATE ? iso.slice(0, 10) : iso.slice(0, 23).replace("T", " ").replace(/\.000$/, "");
}

/** A cell from its Arrow vector: DECIMAL, DATE and TIMESTAMP as DuckDB's text, the rest as plain JS. */
function cell(type: ArrowType, v: unknown): unknown {
  if (type.typeId === ARROW_DECIMAL && v !== null && v !== undefined) return decimalText(v as Uint32Array, type.scale!);
  return temporal(type.typeId, plain(v));
}

function toRows(table: ArrowTable): unknown[][] {
  const { fields } = table.schema;
  const enumField = fields.find((f) => f.type.typeId === ARROW_DICTIONARY);
  if (enumField) throw new Error(`column "${enumField.name}" is an ENUM, which reads back as NULL here: CAST it AS VARCHAR`);
  const vectors = fields.map((_, i) => table.getChildAt(i)!);
  return Array.from({ length: table.numRows }, (_, r) => vectors.map((v, i) => cell(fields[i]!.type, v.get(r))));
}

/** Reads a streamed result: keeps its first ROW_CAP rows if `keep`, and stops reading past the cap. */
async function readCapped(conn: duckdb.AsyncDuckDBConnection, reader: AsyncIterable<ArrowTable> & { schema?: { fields: { name: string }[] } }, keep: boolean): Promise<Result> {
  const rows: unknown[][] = [];
  let columns: string[] | undefined;
  let seen = 0;
  for await (const batch of reader) {
    columns ??= batch.schema.fields.map((f) => f.name);
    if (keep) rows.push(...toRows(batch).slice(0, ROW_CAP - rows.length));
    seen += batch.numRows;
    if (seen > ROW_CAP) break;
  }
  // The early break leaves the query pending; cancelSent ends it, and the connection runs the next one.
  if (seen > ROW_CAP) await conn.cancelSent();
  const result: Result = { columns: columns ?? reader.schema?.fields.map((f) => f.name) ?? [], rows };
  if (seen > ROW_CAP) result.truncated = true;
  return result;
}

/** Runs a script statement by statement; the last one's result is kept. Errors read "statement n of m: …". */
async function runOn(conn: duckdb.AsyncDuckDBConnection, sql: string): Promise<Result> {
  const statements = scriptStatements(sql);
  let result: Result = { columns: [], rows: [] };
  for (const s of statements) {
    try {
      result = await readCapped(conn, await conn.send(s.text, true) as never, s === statements.at(-1));
    } catch (e) {
      throw statementError(s, statements.length, (e as Error).message);
    }
  }
  return result;
}

interface Live {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
}

/** Starts the engine (boot steps 1–7) and returns it at once; its state says when it is ready. */
export function startEngine(): Engine {
  const listeners: ((state: EngineState) => void)[] = [];
  let state: EngineState = { state: "loading", text: "Starting the database…" };
  const set = (next: EngineState) => {
    state = next;
    for (const l of listeners) l(state);
  };
  let generation = 0;
  let live: Live | undefined;
  let data: Promise<Map<string, Uint8Array>> | undefined;
  // One script at a time: a second `send` on the connection cancels the first's stream. A restart drops the queue.
  let queue: Promise<unknown> = Promise.resolve();

  /** Boots generation `gen`; a boot a restart overtook terminates its own database. */
  async function boot(gen: number): Promise<void> {
    const current = () => gen === generation;
    set({ state: "loading", text: "Starting the database…" });
    let db: duckdb.AsyncDuckDB | undefined;
    try {
      if (!(await duckdb.getPlatformFeatures()).wasmExceptions)
        throw new Error("this browser lacks WebAssembly exception handling; a current Chrome, Edge, Firefox or Safari has it");
      // The bytes are fetched once per visit, beside the engine's download; a failed fetch is retried on the next boot.
      const files = (data ??= fetchData());
      files.catch(() => (data = undefined));
      const worker = new Worker(`${location.origin}${ENGINE_DIR}/duckdb-browser-eh.worker.js`);
      db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
      // A worker that fails to load only fires `error`; instantiate would wait forever.
      const failed = new Promise<never>((_, reject) => worker.addEventListener("error", () => reject(new Error(`${ENGINE_DIR}/duckdb-browser-eh.worker.js didn't load`))));
      failed.catch(() => {});
      const wasm = `${ENGINE_DIR}/duckdb-eh.wasm`;
      await Promise.race([get(wasm, { method: "HEAD" }), failed]);
      if (!current()) return;
      await Promise.race([db.instantiate(location.origin + wasm, null, (p) => {
        if (!current()) return;
        const mb = (n: number) => (n / 1e6).toFixed(1);
        set({ state: "loading", text: p.bytesTotal > 0 ? `Loading the database: ${mb(p.bytesLoaded)} of ${mb(p.bytesTotal)} MB…` : `Loading the database: ${mb(p.bytesLoaded)} MB…` });
      }), failed]);
      await db.open({ path: ":memory:" });
      if (!current()) return;
      set({ state: "loading", text: "Checking the data…" });
      const bytes = await files;
      if (!current()) return;
      // registerFileBuffer transfers its buffer to the worker, so each boot gets a copy.
      for (const [name, b] of bytes) await db.registerFileBuffer(name, b.slice());
      const conn = await db.connect();
      await runOn(conn, settings());
      if (!current()) return;
      set({ state: "loading", text: "Building the tables…" });
      await runOn(conn, SETUP);
      if (!current()) return;
      performance.mark("setup");
      live = { db, conn };
      db = undefined;
      set({ state: "ready" });
    } catch (e) {
      if (current()) set({ state: "failed", text: `The database couldn't start: ${(e as Error).message}.` });
    } finally {
      // Set only if this boot didn't finish: a failure, or a restart overtook it.
      await db?.terminate();
    }
  }

  const restart = async () => {
    generation++;
    queue = Promise.resolve();
    const old = live;
    live = undefined;
    const booted = boot(generation); // sets "loading" before its first await, so callers see it at once
    await old?.db.terminate();
    await booted;
  };

  void boot(++generation);
  return {
    get state() {
      return state;
    },
    get generation() {
      return generation;
    },
    onChange(listener) {
      listeners.push(listener);
      listener(state);
    },
    run(sql) {
      const gen = generation;
      const next = queue.then(async () => {
        if (gen !== generation) throw new Superseded();
        if (!live) throw new Error("the database isn't ready");
        const result = await runOn(live.conn, sql);
        if (gen !== generation) throw new Superseded();
        return result;
      });
      queue = next.catch(() => {});
      return next;
    },
    restart,
  };
}
