// The lab downloads (plan D7; 004 §7.3): /learn/labs/<page>.sql for every page with a PostGIS block, each block as
// learn:check runs it. One assembly, shared by the build (writeLearn, S13; freshness.ts) and learn:check's downloads
// stage, which runs each file on a fresh load. In order: a head comment; pg-session as written; the boot blocks the
// file needs (those its page holds, and those whose CREATE TABLE/VIEW names a runnable block or its `-- after:` block
// uses as a whole word in code: comments and strings don't count), once, committed; then each PostGIS block in page
// order: a ran block in BEGIN … ROLLBACK after its `-- after:` blocks, a `-- tx: own` block verbatim, an untested or
// two-session block commented out under its reason. Pure. Tests: assemble.test.ts.
import { codeOnly } from "../build/learn/sql.ts";
import { PG_SESSION_ID, type Block } from "./blocks.ts";
import { SETUP_PAGE, type CoursePage } from "./course.ts";

/** An error a download's run must show: psql's ERROR lines, in order, each containing its text. */
export interface Announced {
  block: string;
  text: string;
}

export interface Download {
  /** The page it comes from. */
  page: string;
  /** Its file name under /learn/labs/. */
  name: string;
  text: string;
  announced: Announced[];
}

/** The page's download name: setup's is pg-checks.sql (setup.sql is the browser's schema), a module's <id>.sql. */
export const downloadName = (page: string) => (page === SETUP_PAGE ? "pg-checks.sql" : `${page}.sql`);

const trimEnd = (s: string) => s.replace(/\n+$/, "");
const CREATES = /\bcreate\s+(?:or\s+replace\s+)?(?:(?:temp|temporary|unlogged|materialized)\s+)?(?:table|view)\s+(?:if\s+not\s+exists\s+)?(?:[a-z_][a-z0-9_]*\.)?([a-z_][a-z0-9_]*)/gi;

/** The tables and views a boot block creates (lower case). */
const created = (b: Block) => [...codeOnly(b.code).matchAll(CREATES)].map((m) => m[1]!.toLowerCase());

/** Whether `code` names `name` as a whole word outside comments and strings. */
const names = (code: string, name: string) => new RegExp(`(?<![A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`, "i").test(codeOnly(code));

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

/** One page block in its download form. */
function blockPart(b: Block, page: ReadonlyMap<string, Block>): string {
  if (!runnable(b)) {
    const lines = trimEnd(b.text).split("\n");
    const headers = lines.length - trimEnd(b.code).split("\n").length;
    return [
      `-- not run from this file: ${notRunReason(b)}. Run it by hand, as its page says.`,
      ...lines.slice(0, headers),
      ...lines.slice(headers).map((l) => (l ? `-- ${l}` : "--")),
    ].join("\n");
  }
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

/** Every page's download, in page order; throws when PostGIS blocks exist without a pg-session block. */
export function assembleDownloads(pages: readonly CoursePage[]): Download[] {
  const all = pages.flatMap((p) => p.blocks);
  const session = all.find((b) => b.id === PG_SESSION_ID);
  const boots = all.filter((b) => b.boot && b.status === "ran");
  const out: Download[] = [];
  for (const { page, blocks } of pages) {
    const pgBlocks = blocks.filter((b) => b.engine === "postgis" && b.id !== PG_SESSION_ID);
    if (!pgBlocks.length) continue;
    if (!session) throw new Error(`${page.file}: PostGIS blocks, but the course has no pg-session block to start its download`);
    const byId = new Map(blocks.map((b) => [b.id, b]));
    const body = pgBlocks.filter((b) => !b.boot);
    const used = body.filter(runnable).flatMap((b) => [b, ...b.after.flatMap((id) => byId.get(id) ?? [])]).map((b) => b.code);
    const needed = boots.filter((boot) => pgBlocks.includes(boot) || created(boot).some((t) => used.some((code) => names(code, t))));
    const name = downloadName(page.id);
    const parts = [
      head(name),
      trimEnd(session.text),
      ...needed.map((boot) => ["BEGIN;", trimEnd(boot.text), "COMMIT;"].join("\n")),
      ...body.map((b) => blockPart(b, byId)),
    ];
    out.push({ page: page.id, name, text: parts.join("\n\n") + "\n", announced: body.flatMap(announcedBy) });
  }
  return out;
}
