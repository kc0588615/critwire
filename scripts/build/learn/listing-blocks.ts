// The listing-block guard (plan 2026-11-02-critwire-learn-range-lessons, Target design 2). /v1/range-listings.parquet is
// the one file a lesson block reads that no lab table is built from, so no lab key sees it and `pnpm e2e`, which deploy
// doesn't run, is the only other thing comparing those results: without this, a refreshed file publishes prose and
// snapshots that disagree with the block. listingBlocks (before the db load, both modes) finds the blocks reading the
// file, in the one spelling supported, and refuses every other way to reach it; assertListingBlocks (after the star)
// runs each in Node DuckDB over a browser's tables and files, as published. Both engines render through the same code,
// and the rules here keep their values and order the same. Out of scripts/learn/ so that no lab key moves.
// Tests: listing-blocks.test.ts.
import { existsSync, readFileSync } from "node:fs";
import type { DuckDBConnection, DuckDBResultReader } from "@duckdb/node-api";
import { SNAPSHOT_DIR, type Block } from "../../learn/blocks.ts";
import type { CoursePage } from "../../learn/course.ts";
import { lineDiff, renderResult } from "../../learn/result.ts";
import { codeOnly, readsOnly } from "./sql.ts";
import { withBrowserTables } from "./projection.ts";
import { asResult } from "./star.ts";

/** The only way a block may reach the file; holding it is what makes a block a listing block. */
const FILE = "read_parquet('range-listings.parquet')";
/** The file with only its mammal rows: curated rows can't be mammals (scripts/derive/range-curated.ts). */
const MAMMAL_ROWS = `(SELECT * FROM ${FILE} WHERE speciesId IN (SELECT species_id FROM species_taxonomy WHERE class = 'Mammalia'))`;
const NAME = /range[-_ ]?listings/i;
/** A parquet reader whose argument isn't one plain literal: an expression or a list can spell any file. */
const OPEN_READER = /\b(read_parquet|parquet_scan)\s*\((?!\s*'[^'*?\[\]]+'\s*[,)])/i;
/** A glob in a data file's literal: `*.parquet` resolves to every file the engine registered. */
const GLOB = /'[^'\n]*[*?\[][^'\n]*\.(parquet|csv|json)'/i;
/** The cell types Node DuckDB and the browser hand to cellText as the same value. */
const SAME_ON_BOTH = new Set(["VARCHAR", "INTEGER", "BIGINT", "DOUBLE"]);

export interface ListingBlock {
  block: Block;
  /** Its page's id. */
  page: string;
}

/** Why a block holding FILE can't be trusted to the guard's one read-only run. */
function plainErrors(b: Block): string[] {
  const errors: string[] = [];
  if (b.engine !== "duckdb") errors.push(`must be a browser block, not ${b.engine}`);
  if (b.status !== "ran") errors.push("must be ran");
  if (b.after.length) errors.push("has an `after:`, so its result depends on more than its text");
  if (b.expectError !== undefined) errors.push("has an `expect:`");
  if (b.engine === "duckdb") {
    if (b.statements.length !== 1) errors.push("must be one statement");
    if (!b.statements.every((s) => readsOnly(s.text))) errors.push("must be read-only");
  }
  return errors;
}

/** Every way a block's text reaches the file other than FILE, read in any engine: an editor prints comments too. */
function reachErrors(b: Block): string[] {
  const errors: string[] = [];
  if (NAME.test(b.text.replaceAll(FILE, ""))) errors.push(`names another form of range-listings; the only one supported is ${FILE}`);
  if (OPEN_READER.test(b.text) || GLOB.test(b.text)) errors.push("can reach a file without its name (a reader's argument must be one plain literal, with no glob)");
  return errors;
}

/** The course's listing blocks, each with its page, and every rule a block breaks (query). */
export function listingBlocks(pages: readonly CoursePage[]): { blocks: ListingBlock[]; errors: string[] } {
  const all = pages.flatMap((p) => p.blocks.map((block): ListingBlock => ({ block, page: p.page.id })));
  const named = (b: Block, why: string) => `q ${b.id}: ${why}`;
  const blocks = all.filter(({ block }) => block.text.includes(FILE));
  const ids = new Set(blocks.map(({ block }) => block.id));
  return {
    blocks,
    errors: [
      ...all.flatMap(({ block }) => reachErrors(block).map((e) => named(block, e))),
      ...blocks.flatMap(({ block }) => plainErrors(block).map((e) => named(block, e))),
      ...all.flatMap(({ block }) => block.after.filter((a) => ids.has(a)).map((a) => named(block, `runs after ${a}, a listing block, so its result depends on the file while its text doesn't name it`))),
    ],
  };
}

/** Whether the query itself is ordered: an ORDER BY outside every parenthesis, so not a window's, an aggregate's or a CTE's. */
function ordersItself(statement: string): boolean {
  const code = codeOnly(statement).replace(/"(?:[^"]|"")*"/g, "");
  let depth = 0;
  for (const [token] of code.matchAll(/[()]|\border\s+by\b/gi)) {
    if (token === "(") depth++;
    else if (token === ")") depth--;
    else if (depth === 0) return true;
  }
  return false;
}

const rendered = (id: string, r: DuckDBResultReader) => renderResult(id, asResult(r));

/** Faults in the block itself: a type or an order the two engines could differ on, or rows a curated correction moves. */
async function blockFaults(con: DuckDBConnection, id: string, text: string, now: DuckDBResultReader): Promise<string[]> {
  const faults: string[] = [];
  const names = now.columnNames();
  now.columnTypes().forEach((type, i) => {
    if (!SAME_ON_BOTH.has(String(type))) faults.push(`cell type of ${names[i]} is ${String(type)}; allowed: ${[...SAME_ON_BOTH].join(", ")}`);
  });
  if (now.currentRowCount > 1 && !ordersItself(text)) faults.push(`returns ${now.currentRowCount} rows and has no ORDER BY of its own`);
  try {
    const mammals = await con.runAndReadAll(text.replaceAll(FILE, MAMMAL_ROWS));
    if (rendered(id, mammals) !== rendered(id, now)) faults.push("reads non-mammal rows; a curated correction would move it");
  } catch (e) {
    faults.push(`doesn't run over mammal rows alone: ${(e as Error).message}`);
  }
  return faults;
}

/** The snapshot's finding for one block, or undefined when equal. */
function snapshotFault(id: string, now: string, recorded: string | undefined): string | undefined {
  const file = `${SNAPSHOT_DIR}/${id}.txt`;
  if (recorded === undefined) return `q ${id}: no snapshot (${file}); its result:\n${now}`;
  if (recorded === now) return undefined;
  return `q ${id}: result differs from its snapshot (${file}): put it in 004, the snapshot and the page's prose, one commit:\n${lineDiff(recorded, now).join("\n")}`;
}

/** The blocks' recorded results, by id, from e2e/__snapshots__/. */
export function readSnapshots(blocks: readonly ListingBlock[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const { block } of blocks) {
    const file = new URL(`../../../${SNAPSHOT_DIR}/${block.id}.txt`, import.meta.url);
    if (existsSync(file)) out.set(block.id, readFileSync(file, "utf8"));
  }
  return out;
}

/**
 * Runs each block in Node DuckDB over the tables and files a browser gets from `out`, and throws naming every fault.
 * A fault in the block refuses in both modes. A result unlike `recorded` (id to snapshot text) refuses a plain build and
 * only warns with `draft`, printing the result, which is how an author gets the text for 004's fence.
 */
export async function assertListingBlocks(out: URL, blocks: readonly ListingBlock[], { recorded, draft }: {
  recorded: ReadonlyMap<string, string>; draft: boolean;
}): Promise<void> {
  if (!blocks.length) return;
  const faults: string[] = [];
  const snapshots: string[] = [];
  await withBrowserTables(out, async (con) => {
    for (const { block: { id, statements } } of blocks) {
      const text = statements[0]!.text;
      let now: DuckDBResultReader;
      try {
        now = await con.runAndReadAll(text);
      } catch (e) {
        faults.push(`q ${id}: doesn't run in a browser's tables: ${(e as Error).message}`);
        continue;
      }
      faults.push(...(await blockFaults(con, id, text, now)).map((f) => `q ${id}: ${f}`));
      const snapshot = snapshotFault(id, rendered(id, now), recorded.get(id));
      if (snapshot) snapshots.push(snapshot);
    }
  });
  if (draft) for (const s of snapshots) console.warn(`build --draft: ${s}`);
  const errors = [...faults, ...(draft ? [] : snapshots)];
  if (errors.length) throw new Error(`listing blocks: ${errors.length} error(s):\n${errors.join("\n")}`);
}
