// The lab downloads (plan D7; 004 §7.3): /learn/labs/<page>.sql for every page with a PostGIS block, each block as
// learn:check runs it, and <page>.py and <page>.ipynb for every page with a Python block other than py-connect (L4 plan
// §5). One assembly, shared by the build (writeLearn, S13; freshness.ts), learn:check's downloads stage, which runs each
// file on a fresh load, and E2E; each consumer splits by `kind`. The .sql, in order: a head comment; pg-session as
// written; the boot blocks the file needs (those its page holds, and those whose CREATE TABLE/VIEW names a runnable
// block or its `-- after:` block uses as a whole word in code: comments and strings don't count), once, committed; then
// each PostGIS block in page order: a ran block in BEGIN … ROLLBACK after its `-- after:` blocks, a `-- tx: own` block
// verbatim, an untested or two-session block commented out under its reason. The .py and the .ipynb come from one cell
// list (pythonCells): py-connect; the boot blocks a ran Python block names as a whole word outside `#` lines (the SQL
// sits in Python strings), each run through connect() and committed; then each Python block once, in page order, an
// untested one commented out (.py) or a Markdown cell (.ipynb). Pure. Tests: assemble.test.ts, notebook.test.ts.
import { codeOnly } from "../build/learn/sql.ts";
import { PG_SESSION_ID, PY_CONNECT_ID, type Block } from "./blocks.ts";
import { SETUP_PAGE, type CoursePage } from "./course.ts";
import { notebook, type Cell } from "./notebook.ts";

/** An error a download's run must show: psql's ERROR lines, in order, each containing its text. */
export interface Announced {
  block: string;
  text: string;
}

export type DownloadKind = "sql" | "py" | "ipynb";

export interface Download {
  /** The page it comes from. */
  page: string;
  /** Its file name under /learn/labs/. */
  name: string;
  /** How it runs: sql with psql, py with python, ipynb not at all (its code cells are the .py's). */
  kind: DownloadKind;
  text: string;
  /** sql: the ERROR lines its run must show; [] for the others. */
  announced: Announced[];
  /** py: its run's limit, its ran blocks' timeouts plus 60 s per boot block. */
  timeoutMs?: number;
}

/** A page's download name: setup's .sql is pg-checks.sql (setup.sql is the browser's schema), else <page>.<kind>. */
export const downloadName = (page: string, kind: DownloadKind = "sql") => (page === SETUP_PAGE && kind === "sql" ? "pg-checks.sql" : `${page}.${kind}`);

/** Each page's download names by kind; throws on a page with two of one kind. */
export function pageDownloads(downloads: readonly Download[]): Map<string, Partial<Record<DownloadKind, string>>> {
  const out = new Map<string, Partial<Record<DownloadKind, string>>>();
  for (const d of downloads) {
    const names = out.get(d.page) ?? {};
    if (names[d.kind] !== undefined) throw new Error(`${d.page}: two ${d.kind} downloads (${names[d.kind]}, ${d.name})`);
    out.set(d.page, { ...names, [d.kind]: d.name });
  }
  return out;
}

const trimEnd = (s: string) => s.replace(/\n+$/, "");
const CREATES = /\bcreate\s+(?:or\s+replace\s+)?(?:(?:temp|temporary|unlogged|materialized)\s+)?(?:table|view)\s+(?:if\s+not\s+exists\s+)?(?:[a-z_][a-z0-9_]*\.)?([a-z_][a-z0-9_]*)/gi;

/** The tables and views a boot block creates (lower case). */
const created = (b: Block) => [...codeOnly(b.code).matchAll(CREATES)].map((m) => m[1]!.toLowerCase());

const word = (name: string) => new RegExp(`(?<![A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`, "i");
/** SQL: whether `code` names `name` as a whole word outside comments and strings. */
const sqlNames = (code: string, name: string) => word(name).test(codeOnly(code));
/** Python: whether `code` names `name` as a whole word outside `#` lines (the SQL is in strings, so they count). */
const pyNames = (code: string, name: string) => word(name).test(code.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n"));

/** The boot blocks, in order, that create a table or view one of `codes` names (`uses`: the engine's word test). */
const bootsNeeded = (boots: readonly Block[], codes: readonly string[], uses: (code: string, name: string) => boolean) =>
  boots.filter((boot) => created(boot).some((t) => codes.some((code) => uses(code, t))));

const runnable = (b: Block) => b.status === "ran" && !b.sessions.length;

/** Why a block isn't run from its file. */
const notRunReason = (b: Block) => (b.status === "untested" ? b.reason : `it needs one psql window per session (${b.sessions.join(", ")})`);

function head(name: string): string {
  return [
    `-- critwire Learn: /learn/labs/${name}`,
    "-- Run it after the lab loader (/learn/data/postgis/learn_curriculum.sql), on the same database:",
    `--   psql -X -d <your database> -f ${name}`,
    "-- Without ON_ERROR_STOP: some blocks fail on purpose, and say so in their `-- expect: error` or `-- fails:` line.",
    "-- Each block runs as its page shows it, in BEGIN … ROLLBACK after the blocks its `-- after:` line names, so it",
    "-- changes nothing; a `-- tx: own` block runs as written.",
  ].join("\n");
}

/** The line that says why a block isn't run from its file. */
const notRunLine = (reason: string) => `not run from this file: ${reason}. Run it by hand, as its page says.`;

/** A block not run from its file: the not-run line behind `mark`, its headers as written, then each code line behind `mark`. */
function commentedOut(b: Block, reason: string, mark: "--" | "#"): string {
  const lines = trimEnd(b.text).split("\n");
  const headers = lines.length - trimEnd(b.code).split("\n").length;
  return [`${mark} ${notRunLine(reason)}`, ...lines.slice(0, headers), ...lines.slice(headers).map((l) => (l ? `${mark} ${l}` : mark))].join("\n");
}

/** One page block in its download form. */
function blockPart(b: Block, page: ReadonlyMap<string, Block>): string {
  if (!runnable(b)) return commentedOut(b, notRunReason(b), "--");
  if (b.txOwn) return trimEnd(b.text);
  const after = b.after.map((id) => {
    const a = page.get(id);
    if (!a) throw new Error(`q ${b.id}: \`-- after\`: no block ${id} on its page`);
    return `-- runs first: ${id}\n${trimEnd(a.code)}`;
  });
  return ["BEGIN;", ...after, trimEnd(b.text), "ROLLBACK;"].join("\n");
}

/** A runnable block's announced errors: its `-- fails:` texts, then its `-- expect: error`. */
const announcedBy = (b: Block): Announced[] =>
  runnable(b) ? [...b.fails, b.expectError].filter((t): t is string => t !== undefined).map((text) => ({ block: b.id, text })) : [];

/** Every page's downloads, in page order (.sql, .py, .ipynb); throws when a file's first block (pg-session, py-connect) is missing. */
export function assembleDownloads(pages: readonly CoursePage[]): Download[] {
  const all = pages.flatMap((p) => p.blocks);
  const boots = all.filter((b) => b.boot && b.status === "ran");
  return pages.flatMap((p) => [...sqlDownload(p, all, boots), ...pythonDownloads(p, all, boots)]);
}

/** A page's .sql: none without a PostGIS block other than pg-session. */
function sqlDownload({ page, blocks }: CoursePage, all: readonly Block[], boots: readonly Block[]): Download[] {
  const pgBlocks = blocks.filter((b) => b.engine === "postgis" && b.id !== PG_SESSION_ID);
  if (!pgBlocks.length) return [];
  const session = all.find((b) => b.id === PG_SESSION_ID);
  if (!session) throw new Error(`${page.file}: PostGIS blocks, but the course has no pg-session block to start its download`);
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const body = pgBlocks.filter((b) => !b.boot);
  const used = body.filter(runnable).flatMap((b) => [b, ...b.after.flatMap((id) => byId.get(id) ?? [])]).map((b) => b.code);
  const named = bootsNeeded(boots, used, sqlNames);
  const needed = boots.filter((boot) => pgBlocks.includes(boot) || named.includes(boot));
  const name = downloadName(page.id);
  const parts = [
    head(name),
    trimEnd(session.text),
    ...needed.map((boot) => ["BEGIN;", trimEnd(boot.text), "COMMIT;"].join("\n")),
    ...body.map((b) => blockPart(b, byId)),
  ];
  return [{ page: page.id, name, kind: "sql", text: parts.join("\n\n") + "\n", announced: body.flatMap(announcedBy) }];
}

/** One part of a Python download: a code cell, or an untested block. */
type PyPart = { id: string; role: "connect" | "boot" | "block"; code: string } | { id: string; untested: Block };

/** The head the .py comments and the notebook's first cell says: what the file is, and how to run it. */
const pyHead = (name: string, run: string) => [
  `critwire Learn: /learn/labs/${name}`,
  "Run it after the lab loader (/learn/data/postgis/learn_curriculum.sql), on the same database, in the environment",
  "/learn/labs/requirements.txt pins (the setup page, /learn/setup/, gives the uv commands):",
  run,
  "It connects with libpq's PG* variables (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD) and reads the lab data from",
  "LEARN_BASE (default https://critwire.com). Each block runs once, in page order, after py-connect and the boot setup;",
  "an untested block is commented out under its reason.",
];

/**
 * A page's Python cells, in order: py-connect; each boot block a ran Python block names, through connect() (its SQL in
 * one """ string, so `"""` and `\` are refused); then each Python block of the page but py-connect. Throws on a
 * block line starting `# %%` (the .py's cell marker).
 */
function pythonParts(name: string, blocks: readonly Block[], connect: Block, boots: readonly Block[]): PyPart[] {
  for (const b of [connect, ...blocks]) {
    const at = trimEnd(b.text).split("\n").findIndex((l) => l.startsWith("# %%"));
    if (at >= 0) throw new Error(`${name}: q ${b.id}: line ${at + 1} starts with "# %%", the .py's cell marker`);
  }
  const needed = bootsNeeded(boots, blocks.filter((b) => b.status === "ran").map((b) => b.code), pyNames);
  return [
    { id: connect.id, role: "connect", code: trimEnd(connect.text) },
    ...needed.map((boot) => {
      const sql = trimEnd(boot.text);
      if (sql.includes('"""') || sql.includes("\\")) throw new Error(`${name}: boot block ${boot.id}: its SQL holds """ or \\, which a Python """ string changes`);
      return { id: boot.id, role: "boot" as const, code: ["with connect() as conn:", '    conn.execute("""', sql, '""")'].join("\n") };
    }),
    ...blocks.map((b): PyPart => (b.status === "ran" ? { id: b.id, role: "block", code: trimEnd(b.text) } : { id: b.id, untested: b })),
  ];
}

/** A page's .py and .ipynb: none without a Python block other than py-connect. */
function pythonDownloads({ page, blocks }: CoursePage, all: readonly Block[], boots: readonly Block[]): Download[] {
  const own = blocks.filter((b) => b.engine === "python" && b.id !== PY_CONNECT_ID);
  if (!own.length) return [];
  const connect = all.find((b) => b.id === PY_CONNECT_ID);
  if (!connect) throw new Error(`${page.file}: Python blocks, but the course has no py-connect block to start its download`);
  const py = downloadName(page.id, "py");
  const ipynb = downloadName(page.id, "ipynb");
  const parts = pythonParts(py, own, connect, boots);
  const pyText = [
    pyHead(py, `  python ${py}`).map((l) => `# ${l}`).join("\n"),
    ...parts.map((p) => ("untested" in p ? `# %% ${p.id}\n${commentedOut(p.untested, p.untested.reason, "#")}` : `# %% ${p.role === "boot" ? "boot: " : ""}${p.id}\n${p.code}`)),
  ].join("\n\n") + "\n";
  const cells: Cell[] = [
    { id: "about", type: "markdown", source: pyHead(ipynb, "Open it in Jupyter or VS Code, with the environment's Python as its kernel.").join("\n") },
    ...parts.flatMap((p): Cell[] => {
      if ("untested" in p) return [
        { id: `${p.id}-md`, type: "markdown", source: `## ${p.id}` },
        { id: p.id, type: "markdown", source: [notRunLine(p.untested.reason), "", "```python", trimEnd(p.untested.text), "```"].join("\n") },
      ];
      const code: Cell = { id: p.id, type: "code", source: p.code };
      return p.role === "block" ? [{ id: `${p.id}-md`, type: "markdown", source: `## ${p.id}` }, code] : [code];
    }),
  ];
  const ran = [connect, ...own.filter((b) => b.status === "ran")];
  const boot = parts.filter((p) => "role" in p && p.role === "boot").length;
  const timeoutMs = ran.reduce((ms, b) => ms + b.timeoutS * 1000, 0) + boot * 60_000;
  return [
    { page: page.id, name: py, kind: "py", text: pyText, announced: [], timeoutMs },
    { page: page.id, name: ipynb, kind: "ipynb", text: notebook(cells), announced: [] },
  ];
}
