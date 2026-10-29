// learn:port (plan D16): a page's blocks from 004's fences to files. Each SQL, Python or Power BI fence becomes its
// block file, byte for byte (site/learn/sql/<id>.<sql|py|m|dax>), and the result fence under a ran block its recorded
// result: PostGIS and Python in site/learn/labs/checked/<id>.txt (learn:check's), DuckDB in e2e/__snapshots__/<id>.txt
// (E2E's), without a final newline. A page is `setup` (004 §0 and §3.1, 3.2, 3.5) or a module (`#### <id> · <slug>` up
// to the next heading of its level or above); py-connect, on the setup page, is every page's helper (L4 plan D4). The
// setup block is compared with site/learn/sql/setup.sql, never written. portPage and checkPort are queries; writePort
// is the one command. Tests: port.test.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BLOCK_DIR, CHECKED_DIR, PY_CONNECT_ID, SETUP_ID, SNAPSHOT_DIR, lintPage, parseBlock, type Block } from "./blocks.ts";
import { lineDiff } from "./result.ts";

export const SETUP_PAGE = "setup";
const SETUP_SECTIONS = [/^## 0\. /, /^### 3\.1 /, /^### 3\.2 /, /^### 3\.5 /];
const MODULE = /^#### ([a-z0-9]+) · /;
const RESULT = /^-- result: (\S+) · /;
const EXT: Record<string, string> = { sql: ".sql", python: ".py", m: ".m", dax: ".dax" };

export interface PortFile {
  page: string;
  /** From the repository root. */
  path: string;
  text: string;
}

interface Fence {
  lang: string;
  /** 0-based lines of the opening and closing fences. */
  open: number;
  close: number;
  body: string[];
}

/** The fences that open in lines [from, to), in order; a fence's own lines are never read as headings or fences. */
function fences(lines: readonly string[], from = 0, to = lines.length): Fence[] {
  const out: Fence[] = [];
  for (let i = from; i < to; i++) {
    const m = /^(`{3,})(\S*)\s*$/.exec(lines[i]!);
    if (!m) continue;
    const close = lines.findIndex((l, j) => j > i && new RegExp(`^${m[1]}\\s*$`).test(l));
    if (close < 0) throw new Error(`004:${i + 1}: unclosed ${m[1]}${m[2]} fence`);
    out.push({ lang: m[2]!, open: i, close, body: lines.slice(i + 1, close) });
    i = close;
  }
  return out;
}

/** Headings outside fences, as [line, level]. */
function headings(lines: readonly string[]): [line: number, level: number][] {
  const inFence = new Set(fences(lines).flatMap((f) => Array.from({ length: f.close - f.open + 1 }, (_, k) => f.open + k)));
  return lines.flatMap((l, i) => {
    const m = /^(#{1,6}) /.exec(l);
    return m && !inFence.has(i) ? [[i, m[1]!.length] as [number, number]] : [];
  });
}

/** The [from, to) line ranges of the sections whose heading passes `match`, each up to the next heading of its level or above. */
function sections(lines: readonly string[], match: (heading: string) => boolean): [number, number][] {
  const hs = headings(lines);
  return hs.flatMap(([line, level], k) => {
    if (!match(lines[line]!)) return [];
    const next = hs.slice(k + 1).find(([, l]) => l <= level);
    return [[line, next ? next[0] : lines.length] as [number, number]];
  });
}

/** Every page 004 defines: setup, then each module in document order. */
export function docPages(doc: string): string[] {
  const lines = doc.split("\n");
  return [SETUP_PAGE, ...headings(lines).flatMap(([line]) => MODULE.exec(lines[line]!)?.[1] ?? [])];
}

/** Where `text` (header lines aside) first differs from `file`, 1-based, or null if equal. */
function differsAt(body: string, file: string): number | null {
  const want = file.split("\n");
  const got = (body + "\n").split("\n");
  const at = want.findIndex((l, i) => l !== got[i]);
  if (at < 0 && got.length === want.length) return null;
  return (at >= 0 ? at : Math.min(got.length, want.length)) + 1;
}

/** The course-wide helpers a page's `# after:` may name: py-connect, from the setup page, on every other page. */
function helpers(doc: string, page: string, setupSql: string): Map<string, Block> {
  if (page === SETUP_PAGE) return new Map();
  const f = portPage(doc, SETUP_PAGE, setupSql).files.find((x) => x.path === `${BLOCK_DIR}/${PY_CONNECT_ID}.py`);
  const b = f && parseBlock(f.path, f.text).block;
  return new Map(b ? [[b.id, b]] : []);
}

/**
 * A page's files from 004 and every error 004's fences show: missing, mismatched or orphan results; a block that fails
 * its parse (named by its fence's line) or its lint; a setup block that differs from `setupSql`.
 */
export function portPage(doc: string, page: string, setupSql: string): { files: PortFile[]; errors: string[] } {
  const lines = doc.split("\n");
  const ranges = sections(lines, page === SETUP_PAGE ? (h) => SETUP_SECTIONS.some((re) => re.test(h)) : (h) => MODULE.exec(h)?.[1] === page);
  if (!ranges.length) return { files: [], errors: [`no page "${page}" in 004 (${docPages(doc).join(", ")})`] };
  const files: PortFile[] = [];
  const errors: string[] = [];
  const blocks: Block[] = [];
  const all = ranges.flatMap(([from, to]) => fences(lines, from, to));
  const claimed = new Set<Fence>();
  const isResult = (f: Fence | undefined) => f?.lang === "text" && RESULT.test(f.body[0] ?? "");
  all.forEach((f, k) => {
    const at = `004:${f.open + 1}`;
    const next = all[k + 1];
    const ext = EXT[f.lang];
    if (!ext) return;
    const text = f.body.join("\n") + "\n";
    const id = /^(?:--|\/\/|#) q: (\S+)$/.exec(f.body[0] ?? "")?.[1];
    if (id === SETUP_ID && ext === ".sql") {
      const n = f.body.findIndex((l) => !/^-- (q|status):/.test(l));
      const line = differsAt(f.body.slice(n).join("\n"), setupSql);
      if (line !== null) errors.push(`${at}: q setup: differs from ${BLOCK_DIR}/setup.sql at line ${line}`);
      return;
    }
    const { block, errors: parse } = parseBlock(`${id ?? "block"}${ext}`, text);
    errors.push(...parse.map((e) => `${at}: ${e}`));
    if (!block) return;
    blocks.push(block);
    files.push({ page, path: `${BLOCK_DIR}/${block.id}${ext}`, text });
    if (block.status !== "ran" || block.engine === "powerbi") return;
    if (!isResult(next)) return void errors.push(`${at}: q ${block.id}: no result block after it`);
    claimed.add(next!);
    const rid = RESULT.exec(next!.body[0]!)![1];
    if (rid !== block.id) return void errors.push(`${at}: q ${block.id}: the result block after it is for "${rid}"`);
    files.push({ page, path: `${block.engine === "duckdb" ? SNAPSHOT_DIR : CHECKED_DIR}/${block.id}.txt`, text: next!.body.join("\n") });
  });
  for (const f of all) if (isResult(f) && !claimed.has(f)) errors.push(`004:${f.open + 1}: orphan result block "${RESULT.exec(f.body[0]!)![1]}"`);
  errors.push(...lintPage(blocks, undefined, helpers(doc, page, setupSql)));
  return { files, errors };
}

const read = (root: string, path: string) => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined);

/** Writes each missing file under `root`; refuses, writing nothing, if any existing one differs. */
export function writePort(files: readonly PortFile[], root: string): { written: number; unchanged: number } {
  const differ = files.filter((f) => ![undefined, f.text].includes(read(root, f.path)));
  if (differ.length) throw new Error(differ.map((f) => `${f.path} differs from 004: not overwritten (learn:port --check ${f.page} shows how)`).join("\n"));
  const missing = files.filter((f) => read(root, f.path) === undefined);
  for (const f of missing) {
    mkdirSync(dirname(join(root, f.path)), { recursive: true });
    writeFileSync(join(root, f.path), f.text);
  }
  return { written: missing.length, unchanged: files.length - missing.length };
}

/** Each file under `root` that is missing or differs from 004, with a line diff (- 004, + the file). */
export function checkPort(files: readonly PortFile[], root: string): string[] {
  return files.flatMap((f) => {
    const now = read(root, f.path);
    if (now === undefined) return [`${f.path}: missing (004 has it)`];
    if (now === f.text) return [];
    return [`${f.path} differs from 004:\n${lineDiff(f.text, now).map((l) => `  ${l}`).join("\n")}`];
  });
}

/** The pages with any block file under `root`: what `--check all` checks. */
export function portedPages(doc: string, setupSql: string, root: string): string[] {
  return docPages(doc).filter((p) => portPage(doc, p, setupSql).files.some((f) => f.path.startsWith(`${BLOCK_DIR}/`) && existsSync(join(root, f.path))));
}
