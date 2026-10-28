// The block model (plan D2; spike plan-queries.ts, ported from 004's fences to files). A block file is 004's fence body,
// headers included, named by its id: site/learn/sql/<id>.sql (`-- ` headers) or <id>.m / <id>.dax (Power BI, `// `).
// parseBlock reads one file and lints what one file can show; lintPage lints a page's blocks together (ids, `-- after:`).
// What a statement may do to roles, schemas and settings, the determinism rules and the cleanup pairing are
// privilege.ts's; lintPage applies them with each block's `-- after:` chain.
// Pure. Tests: blocks.test.ts.
import { basename, extname } from "node:path";
import { codeOnly, isolatedRefusal, splitStatements, type Statement } from "../build/learn/sql.ts";
import { LAB_SCHEMA } from "./pg.ts";
import { parsePlanAssertion, type PlanAssertion } from "./plan.ts";
import { blockRuleErrors, cleanupErrors } from "./privilege.ts";

/** The DuckDB schema block: header-less in site/learn/sql/setup.sql, run at boot (004 §0). */
export const SETUP_ID = "setup";
/** 004's PostGIS session block: the runner's session statements, then one SELECT or SHOW (PC1). */
export const PG_SESSION_ID = "pg-session";
export const PG_SESSION: readonly string[] = [`SET search_path = ${LAB_SCHEMA}, public`];
export const PBI_STATUS = "untested: Power BI is Windows-only";
/** Where blocks and their recorded results live, from the repository root. */
export const BLOCK_DIR = "site/learn/sql";
export const CHECKED_DIR = "site/learn/labs/checked";
export const SNAPSHOT_DIR = "e2e/__snapshots__";

export type Engine = "duckdb" | "postgis" | "powerbi";

export interface Block {
  id: string;
  /** The path it was read from, as given. */
  file: string;
  engine: Engine;
  status: "ran" | "untested";
  /** untested: why. */
  reason: string;
  /** `-- after:` earlier blocks of the page, run first in the same transaction, in the order named (not transitive). */
  after: string[];
  /** `-- boot` (PostGIS): run once at connect and committed. */
  boot: boolean;
  /** `-- tx: own` (PostGIS): runs unwrapped. */
  txOwn: boolean;
  /** `-- needs: raster` (PostGIS). */
  needsRaster: boolean;
  /** `-- expect: error <text>`: the text the last statement's error contains. */
  expectError?: string;
  /** `-- plan:` assertions on an EXPLAIN block (plan.ts). */
  plan: PlanAssertion[];
  /** `-- sessions: A, B` (PostGIS): the block runs in these sessions, statement by statement (D5). */
  sessions: string[];
  /** Power BI `// input:` star files. */
  inputs: string[];
  /** The file, byte for byte. */
  text: string;
  /** What the editor shows: the file without its test headers (`-- show: cards` stays). */
  code: string;
  statements: Statement[];
  /** Per statement: its leading `-- fails: <text>` (tx: own and sessions blocks). */
  fails: (string | undefined)[];
  /** Per statement: its leading `-- waits: <why>` (sessions blocks). */
  waits: (string | undefined)[];
  /** Per statement of a sessions block: the window it runs in; [] for other blocks. */
  windows: string[];
}

const ID = /^[a-z0-9-]+$/;
const SESSION = /^[A-Z][A-Za-z0-9]*$/;
const HEADER = /^-- (q|status|params|expect|after|engine|needs|boot|tx|plan|sessions):(?: (.*))?$|^-- (boot)$/;
const PBI_HEADER = /^\/\/ ([a-z]+):(?: (.*))?$/;
const PBI_HEADERS = ["q", "status", "input"];
const STAR_INPUT = /^star\/[a-z_]+\.csv$/;
const ENGINES = ["duckdb", "postgis"];
/** A statement's leading comment lines: `-- fails: <text>`, `-- waits: <why>`, `-- window <name>[: note]`. */
const FAILS = /^-- fails:(.*)$/;
const WAITS = /^-- waits:(.*)$/;
const WINDOW = /^-- window ([A-Za-z0-9_-]+)(?::.*)?$/;
/**
 * The raster API a block may use only under `-- needs: raster` (spike PC3): the raster type, raster-only functions the
 * curriculum uses and the out-db settings. Geometry overloads (ST_Intersects …) aren't listed.
 */
const RASTER_API =
  /\b(raster|postgis_raster_\w+|st_(clip|value|valuecount|summarystats(agg)?|width|height|numbands|band|bandmetadata|metadata|makeemptyraster|addband|asraster|tile|mapalgebra|reclass|dumpaspolygons|pixelas\w+|rastertoworldcoord\w*|worldtorastercoord\w*|setvalues?|setgeoreference|georeference|srid_raster)|postgis\.(enable_outdb_rasters|gdal_enabled_drivers))\b/i;

/** The first match of `re` among a statement's leading comment lines (trimmed), or undefined. */
function leading(s: Statement, re: RegExp): string | undefined {
  for (const line of s.text.split("\n")) {
    const l = line.trim();
    if (!l.startsWith("--")) return undefined;
    const m = re.exec(l);
    if (m) return m[1]!.trim();
  }
  return undefined;
}

/** Splits a comma list; `bad` when an item fails `item`; `twice` for each item named more than once. */
function list(raw: string, item: RegExp): { items: string[]; bad: boolean; twice: string[] } {
  const items = raw.split(",").map((s) => s.trim());
  return { items, bad: items.some((a) => !item.test(a)), twice: [...new Set(items.filter((a, i) => items.indexOf(a) !== i))] };
}

const empty = (id: string, file: string, text: string) => ({
  id, file, text, engine: "duckdb" as Engine, status: "untested" as const, reason: "", after: [], boot: false, txOwn: false, needsRaster: false,
  plan: [], sessions: [], inputs: [], code: "", statements: [], fails: [], waits: [], windows: [],
});

/** One block file: the block (once its id is known) and every error the file alone shows, each naming the file. */
export function parseBlock(file: string, text: string): { block?: Block; errors: string[] } {
  const name = basename(file);
  const ext = extname(name);
  if (![".sql", ".m", ".dax"].includes(ext)) return { errors: [`${file}: a block file is .sql, .m or .dax`] };
  const pbi = ext !== ".sql";
  const h = pbi ? "//" : "--";
  const lines = text.split("\n");
  const errors: string[] = [];
  const headers = new Map<string, string>();
  const plans: [value: string, line: number][] = [];
  let n = 0;
  for (; n < lines.length; n++) {
    const m = (pbi ? PBI_HEADER : HEADER).exec(lines[n]!);
    if (!m) break;
    const key = m[1] ?? m[3]!;
    const value = (m[2] ?? "").trim();
    if (pbi && !PBI_HEADERS.includes(key)) errors.push(`${file}: line ${n + 1}: unknown header \`// ${key}:\` (${PBI_HEADERS.join(", ")})`);
    if (key === "plan") plans.push([value, n + 1]);
    else if (headers.has(key)) errors.push(`${file}: duplicate \`${h} ${key}:\` header`);
    headers.set(key, value);
  }
  const id = headers.get("q");
  if (id === undefined) return { errors: [...errors, `${file}: no \`${h} q:\` header`] };
  if (!ID.test(id)) return { errors: [...errors, `${file}: invalid id "${id}" (want [a-z0-9-]+)`] };
  const q = `${file}: q ${id}`;
  if (name !== id + ext) errors.push(`${q}: the file is named "${name}", not "${id}${ext}"`);
  const code = lines.slice(n).join("\n");
  const block: Block = { ...empty(id, file, text), code };

  if (pbi) {
    block.engine = "powerbi";
    block.reason = PBI_STATUS.slice("untested:".length).trim();
    if (headers.get("status") !== PBI_STATUS) errors.push(`${q}: Power BI can't run here; its status is \`// status: ${PBI_STATUS}\``);
    const raw = headers.get("input");
    if (!raw) errors.push(`${q}: no \`// input:\` header (the star files it reads)`);
    else {
      const { items, twice } = list(raw, STAR_INPUT);
      block.inputs = items;
      for (const i of items) if (!STAR_INPUT.test(i)) errors.push(`${q}: input "${i}" isn't star/<file>.csv`);
      for (const i of twice) errors.push(`${q}: input "${i}" named twice`);
    }
    if (!code.trim()) errors.push(`${q}: no code`);
    return { block, errors };
  }

  const status = headers.get("status");
  if (status === undefined) errors.push(`${q}: no \`-- status:\` header`);
  else if (status === "ran") block.status = "ran";
  else if (status.startsWith("untested:")) {
    block.reason = status.slice("untested:".length).trim();
    if (!block.reason) errors.push(`${q}: \`untested:\` needs a reason`);
  } else errors.push(`${q}: unknown status "${status}" (ran or untested: <reason>)`);

  const engine = headers.get("engine") ?? "duckdb";
  if (ENGINES.includes(engine)) block.engine = engine as Engine;
  else errors.push(`${q}: unknown engine "${engine}" (${ENGINES.join(" or ")})`);
  const pg = block.engine === "postgis";

  if (headers.has("after")) {
    const { items, bad, twice } = list(headers.get("after")!, ID);
    block.after = items;
    if (bad) errors.push(`${q}: \`-- after\` must be a comma-separated list of ids`);
    for (const a of twice) errors.push(`${q}: \`-- after\`: "${a}" named twice`);
  }
  if (headers.has("params")) errors.push(`${q}: \`-- params\` isn't supported: no page binds a learner's input`);
  if (headers.has("expect")) {
    block.expectError = /^error (.+)$/.exec(headers.get("expect")!)?.[1];
    if (!block.expectError) errors.push(`${q}: \`-- expect\` must be "error <text the error contains>"`);
  }
  block.boot = headers.has("boot");
  if (block.boot) {
    if (headers.get("boot")) errors.push(`${q}: \`-- boot\` takes no value`);
    if (!pg) errors.push(`${q}: \`-- boot\` is for engine postgis`);
    if (headers.has("after")) errors.push(`${q}: a \`-- boot\` block has no \`-- after\``);
    if (headers.has("expect")) errors.push(`${q}: a \`-- boot\` block can't expect an error`);
    if (headers.has("tx")) errors.push(`${q}: a \`-- boot\` block can't be \`-- tx: own\``);
  }
  if (headers.has("tx")) {
    block.txOwn = headers.get("tx") === "own";
    if (!block.txOwn) errors.push(`${q}: \`-- tx\` takes \`own\``);
    else if (!pg) errors.push(`${q}: \`-- tx: own\` is for engine postgis`);
    if (headers.has("after")) errors.push(`${q}: a \`-- tx: own\` block has no \`-- after\``);
    if (headers.has("expect")) errors.push(`${q}: a \`-- tx: own\` block can't expect an error`);
  }
  const needs = headers.get("needs");
  block.needsRaster = needs === "raster";
  if (needs !== undefined && !block.needsRaster) errors.push(`${q}: unknown \`-- needs: ${needs}\` (raster)`);
  if (block.needsRaster && !pg) errors.push(`${q}: \`-- needs: raster\` is for engine postgis`);
  if (headers.has("sessions")) {
    const { items, bad, twice } = list(headers.get("sessions")!, SESSION);
    block.sessions = items;
    if (bad) errors.push(`${q}: \`-- sessions:\` must be a comma-separated list of names [A-Z][A-Za-z0-9]*`);
    for (const s of twice) errors.push(`${q}: \`-- sessions:\` names "${s}" twice`);
    if (new Set(items).size < 2) errors.push(`${q}: \`-- sessions:\` names two or more sessions`);
    if (!pg) errors.push(`${q}: \`-- sessions:\` is for engine postgis`);
    for (const k of ["after", "boot", "expect", "tx"]) if (headers.has(k)) errors.push(`${q}: a \`-- sessions:\` block has no \`-- ${k}\``);
  }
  for (const [value, line] of plans) {
    const a = parsePlanAssertion(value, line);
    if (typeof a === "string") errors.push(`${file}: ${a}`);
    else block.plan.push(a);
  }

  try {
    block.statements = splitStatements(code);
    if (!block.statements.length) errors.push(`${q}: no SQL to run`);
  } catch (e) {
    errors.push(`${q}: ${(e as Error).message}`);
  }
  const st = block.statements;
  block.fails = st.map((s) => leading(s, FAILS));
  block.waits = st.map((s) => leading(s, WAITS));
  if (block.sessions.length) {
    let current: string | undefined;
    block.windows = st.map((s) => (current = leading(s, WINDOW) ?? current) ?? "");
  }

  if (id === PG_SESSION_ID && st.length) {
    if (block.status !== "ran" || !pg) errors.push(`${q}: the pg-session block is \`ran\` with \`-- engine: postgis\``);
    const set = st.slice(0, -1).map((s) => s.text);
    if (set.length !== PG_SESSION.length || set.some((s, i) => s !== PG_SESSION[i]) || !/^\s*(select|show)\b/i.test(codeOnly(st.at(-1)!.text)))
      errors.push(`${q}: it must run the runner's session, in order: ${PG_SESSION.join("; ")}; then one SELECT or SHOW of the settings`);
  }
  if (block.status === "ran" && st.length) errors.push(...statementErrors(block, q));
  return { block, errors };
}

/** What a ran block's statements may hold: browser refusals, fails/waits/windows placement, raster, plan assertions. */
function statementErrors(b: Block, q: string): string[] {
  const errors: string[] = [];
  const sessions = b.sessions.length > 0;
  b.statements.forEach((s, i) => {
    const at = `${q}: statement ${s.n}`;
    const refusal = b.engine === "duckdb" ? isolatedRefusal(s.text) : undefined;
    if (refusal) errors.push(`${at}: ${refusal}`);
    const fails = b.fails[i];
    if (fails !== undefined && !b.txOwn && !sessions) errors.push(`${at}: \`-- fails:\` is for \`-- tx: own\` and \`-- sessions:\` blocks (elsewhere, \`-- expect: error\` on the last statement)`);
    else if (fails === "") errors.push(`${at}: \`-- fails:\` needs the text the error contains`);
    const waits = b.waits[i];
    if (waits !== undefined && !sessions) errors.push(`${at}: \`-- waits:\` is for \`-- sessions:\` blocks`);
    else if (waits === "") errors.push(`${at}: \`-- waits:\` needs the reason it waits`);
    const window = leading(s, WINDOW);
    if (window !== undefined && !sessions) errors.push(`${at}: \`-- window\` is for \`-- sessions:\` blocks`);
    else if (window !== undefined && !b.sessions.includes(window)) errors.push(`${at}: window "${window}" isn't in \`-- sessions:\``);
    if (sessions && !b.windows[i]) errors.push(`${q}: statement ${s.n} has no \`-- window <name>\` before it`);
  });
  if (sessions) for (const s of b.sessions) if (b.statements.length && !b.windows.includes(s)) errors.push(`${q}: session "${s}" runs no statement`);

  const raster = b.needsRaster ? undefined : RASTER_API.exec(codeOnly(b.code))?.[0];
  if (raster) errors.push(`${q}: uses the raster API (${raster.toLowerCase()}); add \`-- needs: raster\``);

  const last = b.statements.at(-1);
  const explain = last !== undefined && /^\s*explain\b/i.test(codeOnly(last.text));
  if (b.plan.length && b.engine !== "postgis") errors.push(`${q}: \`-- plan:\` is for engine postgis`);
  else if (b.plan.length && !explain) errors.push(`${q}: \`-- plan:\` is for a block whose last statement is EXPLAIN`);
  else if (explain && b.engine === "postgis") {
    const rows = b.plan.filter((a) => a.kind === "rows").length;
    if (!rows) errors.push(`${q}: an EXPLAIN block needs \`-- plan: rows <n>\` (the top node's actual rows)`);
    if (rows > 1) errors.push(`${q}: more than one \`-- plan: rows\``);
    if (!b.plan.some((a) => a.kind !== "rows")) errors.push(`${q}: an EXPLAIN block needs a \`-- plan: <text>\` or \`-- plan: no <text>\` about its nodes`);
  }
  return errors;
}

/**
 * A page's blocks, in page order, linted together: unique ids; each `-- after:` block on the page, earlier, ran,
 * expecting no error, wrapped, single-session and in the same engine; then each block's privilege rules with its
 * `-- after:` chain (PV1–PV8) and a ran PostGIS block's cleanup (CL1–CL9; a `-- fails:` statement doesn't happen).
 * `bootIds`: ids that run at boot without a file.
 */
export function lintPage(blocks: readonly Block[], bootIds: ReadonlySet<string> = new Set([SETUP_ID])): string[] {
  const errors: string[] = [];
  const first = new Map<string, Block>();
  for (const b of blocks) {
    const seen = first.get(b.id);
    if (seen) errors.push(`${b.file}: duplicate id "${b.id}" (first in ${seen.file})`);
    else first.set(b.id, b);
  }
  blocks.forEach((b, k) => {
    const q = `${b.file}: q ${b.id}: \`-- after\``;
    for (const a of new Set(b.after.filter((a) => ID.test(a)))) {
      const i = blocks.findIndex((x) => x.id === a);
      const named = blocks[i];
      if (bootIds.has(a) || named?.boot) errors.push(`${q}: "${a}" already runs at boot`);
      else if (!named) errors.push(`${q}: unknown block "${a}" (not on this page)`);
      else if (i >= k) errors.push(`${q}: "${a}" comes after it`);
      else if (named.status === "untested") errors.push(`${q}: "${a}" is untested`);
      else if (named.expectError) errors.push(`${q}: "${a}" expects an error`);
      else if (named.txOwn) errors.push(`${q}: "${a}" owns its transaction`);
      else if (named.sessions.length) errors.push(`${q}: "${a}" runs in sessions ${named.sessions.join(", ")}`);
      else if (named.engine !== b.engine) errors.push(`${q}: "${a}" runs in ${named.engine}, not ${b.engine}`);
    }
    const chain = b.after.flatMap((a) => first.get(a)?.statements ?? []);
    const rules = blockRuleErrors(b, chain);
    if (b.engine === "postgis" && b.status === "ran") rules.push(...cleanupErrors(b.id, b.statements.filter((_, i) => b.fails[i] === undefined)));
    errors.push(...rules.map((e) => `${b.file}: ${e}`));
  });
  return errors;
}
