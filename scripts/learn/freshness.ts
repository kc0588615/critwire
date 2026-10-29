// checked.json (plan D6; 004 §7.5): what learn:check last proved, so the build can refuse a lab it didn't run.
// - Each ran PostGIS block's key: a sha256 over every input that decides its result: the texts of the block, its
//   `-- after:` blocks (transitively), every boot block and pg-session (by id, sorted); the lab data files' sha256s
//   (the manifest's `files`, outside star/: its dois, sizes and the star don't move a lab result); the checker's own
//   sources (learn-check.ts's relative-import closure), db/learn/canary.sql and requirements.txt. Each input enters as
//   `name\0sha256`, so none can blur into another.
// - Each block's result: the sha256 of site/learn/labs/checked/<id>.txt, so a result edited later loses its stamp.
// - Each download's sha256 as assembled (assemble.ts).
// - labErd: a sha256 over what decides the lab ERD check (learn:check compares lab.mmd with learn_curriculum after the
//   boot blocks): lab.mmd, the loader's sha256 and the boot blocks' texts.
// - The versions it ran on (PostgreSQL, PostGIS, GEOS, GDAL) and the date: recorded, never compared. The date moves
//   only with something else.
// learn:check writes it (nextStamp) once every stage passed; the build compares (staleness). readFreshness reads the
// inputs; the rest is pure. Tests: freshness.test.ts.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { formatJson } from "../json.ts";
import { assembleDownloads } from "./assemble.ts";
import { CHECKED_DIR, PG_SESSION_ID, type Block } from "./blocks.ts";
import type { CoursePage } from "./course.ts";
import { LAB_ERD } from "./erd-model.ts";

export const CHECKED_JSON = `${CHECKED_DIR}/checked.json`;
/** The checker whose source closure enters every key, and the files it reads besides its sources. */
export const CHECKER_ENTRY = "scripts/learn-check.ts";
export const CHECKER_FILES = ["db/learn/canary.sql", "site/learn/labs/requirements.txt"];
const MANIFEST = "learn/data/manifest.json";
/** The loader, as the data manifest's `files` names it. */
export const LOADER = "postgis/learn_curriculum.sql";

export interface Versions {
  postgresql: string;
  postgis: string;
  geos: string;
  /** PostGIS raster's GDAL (raster blocks). */
  gdal: string;
}

/** What learn:check proves and the build recomputes. */
export interface Fresh {
  blocks: Record<string, { key: string; result: string }>;
  downloads: Record<string, string>;
  /** The lab ERD check's inputs, hashed. */
  labErd: string;
}

export interface Stamp extends Fresh {
  versions: Versions;
  /** The UTC date of the last run that changed anything else. */
  checked: string;
}

/** The files besides blocks that enter every key. */
export interface KeyFiles {
  /** The data manifest's `files` (sha256 used, the rest ignored). */
  manifest: Readonly<Record<string, { sha256: string } & Record<string, unknown>>>;
  /** Each checker file's sha256, by repository path. */
  checker: Readonly<Record<string, string>>;
  /** lab.mmd's text (labErd only). */
  labErd: string;
}

const sha256 = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
const sorted = <T>(o: Readonly<Record<string, T>>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** A ran PostGIS block: one learn:check runs and stamps. */
const isLab = (b: Block) => b.engine === "postgis" && b.status === "ran";

/** `b`'s `-- after:` blocks on its page, transitively. */
function afterChain(b: Block, page: ReadonlyMap<string, Block>, seen = new Set<string>()): Set<string> {
  for (const id of b.after) {
    if (seen.has(id)) continue;
    seen.add(id);
    const a = page.get(id);
    if (a) afterChain(a, page, seen);
  }
  return seen;
}

/** Every block's freshness key and result sha256, and every download's sha256. `results`: checked/<id>.txt by id. */
export function freshness(pages: readonly CoursePage[], files: KeyFiles, results: ReadonlyMap<string, string>): Fresh {
  const all = new Map(pages.flatMap((p) => p.blocks).map((b) => [b.id, b]));
  const labs = [...all.values()].filter(isLab);
  if (labs.length && !all.has(PG_SESSION_ID)) throw new Error(`the course has no ${PG_SESSION_ID} block`);
  const shared = [...labs.filter((b) => b.boot).map((b) => b.id), PG_SESSION_ID];
  const fileEntries = [
    ...Object.entries(files.manifest).filter(([path]) => !path.startsWith("star/")).map(([path, f]) => `learn/data/${path}\0${f.sha256}`),
    ...Object.entries(files.checker).map(([path, sha]) => `${path}\0${sha}`),
  ].sort();
  const blocks: Fresh["blocks"] = {};
  for (const { blocks: onPage } of pages) {
    const page = new Map(onPage.map((b) => [b.id, b]));
    for (const b of onPage.filter(isLab)) {
      const ids = [...new Set([b.id, ...afterChain(b, page), ...shared])].sort();
      const entries = [...ids.map((id) => `block ${id}\0${sha256(all.get(id)?.text ?? "")}`), ...fileEntries];
      const result = results.get(b.id);
      blocks[b.id] = { key: sha256(entries.join("\n")), result: result === undefined ? "" : sha256(result) };
    }
  }
  const downloads = Object.fromEntries(assembleDownloads(pages).map((d) => [d.name, sha256(d.text)]));
  const loader = files.manifest[LOADER];
  if (!loader) throw new Error(`the data manifest has no ${LOADER}: run pnpm build`);
  const boots = [...all.values()].filter((x) => isLab(x) && x.boot).map((x) => `block ${x.id}\0${sha256(x.text)}`).sort();
  const labErd = sha256([`${LAB_ERD}\0${sha256(files.labErd)}`, `learn/data/${LOADER}\0${loader.sha256}`, ...boots].join("\n"));
  return { blocks: sorted(blocks), downloads: sorted(downloads), labErd };
}

/** Lists ids: all of them up to five, else the first five and a count. */
function named(ids: readonly string[]): string {
  return ids.length <= 5 ? ids.join(", ") : `${ids.slice(0, 5).join(", ")} and ${ids.length - 5} more`;
}

/** Every way `stamp` (checked.json, undefined if missing) fails to prove `now`; [] when it's fresh. */
export function staleness(stamp: Stamp | undefined, now: Fresh): string[] {
  const again = "run pnpm learn:check";
  if (!stamp) return [`${CHECKED_JSON}: missing: ${again}`];
  const errors: string[] = [];
  const stale = Object.keys(now.blocks).filter((id) => stamp.blocks[id]?.key !== now.blocks[id]!.key);
  if (stale.length) errors.push(`lab ${named(stale)} ${stale.length === 1 ? "is" : "are"} stale: ${again}`);
  for (const [id, { result }] of Object.entries(now.blocks)) {
    const had = stamp.blocks[id];
    if (had && had.key === now.blocks[id]!.key && had.result !== result) errors.push(`${CHECKED_DIR}/${id}.txt changed after learn:check: ${again}`);
  }
  for (const id of Object.keys(stamp.blocks)) if (!(id in now.blocks)) errors.push(`${CHECKED_JSON}: block ${id} has a key but no ran PostGIS block: ${again}`);
  for (const [name, sha] of Object.entries(now.downloads)) if (stamp.downloads[name] !== sha) errors.push(`download ${name} is stale: ${again}`);
  for (const name of Object.keys(stamp.downloads)) if (!(name in now.downloads)) errors.push(`${CHECKED_JSON}: download ${name} has a sha256 but no page: ${again}`);
  if (stamp.labErd !== now.labErd) errors.push(`the lab ERD is stale (${LAB_ERD}, the loader or a boot block changed): ${again}`);
  return errors;
}

/** checked.json's new text, dated `today`; undefined when only the date would change (`old`: its text, null if none). */
export function nextStamp(old: string | null, now: Fresh, versions: Versions, today: string): string | undefined {
  const text = (checked: string) => formatJson({ versions, checked, blocks: now.blocks, downloads: now.downloads, labErd: now.labErd } satisfies Stamp);
  if (old !== null) {
    const was = (JSON.parse(old) as Partial<Stamp>).checked;
    if (typeof was === "string" && text(was) === old) return undefined;
  }
  return text(today);
}

const IMPORT = /^\s*(?:import|export)\b[^;]*?\bfrom\s+"(\.{1,2}\/[^"]+)"|^\s*import\s+"(\.{1,2}\/[^"]+)"/gm;

/** `entry`'s relative-import closure (repository paths, sorted, itself included); `read` gives a file's text. */
export function importClosure(entry: string, read: (path: string) => string): string[] {
  const seen = new Set<string>();
  const visit = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    for (const m of read(path).matchAll(IMPORT)) visit(normalize(join(dirname(path), m[1] ?? m[2]!)));
  };
  visit(entry);
  return [...seen].sort();
}

const root = new URL("../../", import.meta.url);
/** checked.json's location. */
export const STAMP_FILE = new URL(CHECKED_JSON, root);
const readRepo = (path: string) => readFileSync(new URL(path, root));

/** The checker's sources (its closure) and the files it reads, each with its sha256. */
function checkerFiles(): Record<string, string> {
  const paths = [...importClosure(CHECKER_ENTRY, (p) => readRepo(p).toString("utf8")), ...CHECKER_FILES];
  return Object.fromEntries(paths.map((p) => [p, sha256(readRepo(p))]));
}

/** checked/<id>.txt for each lab block that has one (the build's star reads its blocks' too). */
export function readRecorded(pages: readonly CoursePage[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const b of pages.flatMap((p) => p.blocks).filter(isLab)) {
    const file = new URL(`${CHECKED_DIR}/${b.id}.txt`, root);
    if (existsSync(file)) out.set(b.id, readFileSync(file, "utf8"));
  }
  return out;
}

/** The inputs, from the repository and `dist` (the built site's data manifest), and the freshness they give. */
export function readFreshness(dist: string, pages: readonly CoursePage[]): Fresh {
  const manifest = (JSON.parse(readFileSync(join(dist, MANIFEST), "utf8")) as { files: KeyFiles["manifest"] }).files;
  return freshness(pages, { manifest, checker: checkerFiles(), labErd: readRepo(LAB_ERD).toString("utf8") }, readRecorded(pages));
}

/** checked.json as committed, or undefined if there is none. */
export function readStamp(): Stamp | undefined {
  return existsSync(STAMP_FILE) ? (JSON.parse(readFileSync(STAMP_FILE, "utf8")) as Stamp) : undefined;
}
