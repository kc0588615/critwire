// The Learn site's inputs (plan D8.1): site/learn/'s sources, read and checked before the build writes anything.
// readLearnInputs grows with the steps (SVGs S8, assets S10, diagrams S25); today the course (learn/course-files.ts
// readCourse: the curriculum, the pages' slots, every block file's lint, recorded results without a block) and the ERD
// sources (erd.ts readErds: each parses, schema.mmd keeps v1.mmd, markers, accTitle/accDescr, sources), the star's
// blocks and Power BI inputs (star.ts starBlocks, starInputErrors), and the engine pins (assets.ts assetErrors). A ran
// PostGIS block without its recorded result fails a plain build and only warns with --draft (D16's loop: learn:check
// --update writes it). Throws naming every error. Writes nothing.
// assertLabsFresh (plan D6), once the data manifest is written: checked.json against the freshness the build recomputes
// (learn/freshness.ts); a plain build refuses a stale lab, --draft only warns.
// writeLearn (plan D8.6, D12), last: the Learn site under dist/learn/: its assets; the lab downloads (labs/<page>.sql,
// assemble.ts, the files learn:check ran and checked.json stamps); the drawn ERDs (schema/<name>.svg); then the pages
// (pages.ts: the schema pages from the ERD sources), which read checked.json and the star manifest writeStar wrote.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assembleDownloads } from "../../learn/assemble.ts";
import type { CoursePage, Curriculum } from "../../learn/course.ts";
import { readCourse } from "../../learn/course-files.ts";
import { parseErd } from "../../learn/erd-model.ts";
import { readFreshness, readRecorded, readStamp, staleness } from "../../learn/freshness.ts";
import type { StarManifest } from "../../learn/star-check.ts";
import { DUCKDB_EXT, DUCKDB_WASM } from "../../../site/learn/src/assets.ts";
import { assetErrors, writeAssets } from "./assets.ts";
import { learnPages, readTemplates, writePages } from "./pages.ts";
import { DRAWN_ERDS, readErds, type ErdSvgs, type ErdTexts } from "./erd.ts";
import { starBlocks, starInputErrors, type StarBlock } from "./star.ts";

export interface LearnInputs {
  curriculum: Curriculum;
  /** In page order, with their blocks. */
  pages: CoursePage[];
  /** site/learn/erd/'s sources, checked. */
  erds: ErdTexts;
  /** Their committed SVGs, each current. */
  svgs: ErdSvgs;
  /** The blocks writeStar runs, in order. */
  star: StarBlock[];
}

/** site/learn/'s sources, checked; throws naming every error. */
export async function readLearnInputs({ draft }: { draft: boolean }): Promise<LearnInputs> {
  const { curriculum, pages, errors, missing } = await readCourse();
  const erds = await readErds();
  const star = starBlocks(pages);
  if (draft) for (const m of missing) console.warn(`build --draft: ${m}`);
  const all = [...errors, ...erds.errors, ...star.errors, ...starInputErrors(pages), ...assetErrors(), ...(draft ? [] : missing)];
  if (all.length) throw new Error(`site/learn: ${all.length} error(s):\n${all.join("\n")}`);
  return { curriculum: curriculum!, pages, erds: erds.texts, svgs: erds.svgs, star: star.blocks };
}

/** Throws (warns with `draft`) naming every way checked.json fails to prove the labs `pages` publish; `dist`: the built site. */
export function assertLabsFresh(dist: string, pages: readonly CoursePage[], { draft }: { draft: boolean }): void {
  const errors = staleness(readStamp(), readFreshness(dist, pages));
  if (draft) for (const e of errors) console.warn(`build --draft: ${e}`);
  else if (errors.length) throw new Error(`site/learn/labs: ${errors.length} error(s):\n${errors.join("\n")}`);
}

/** Writes the Learn site under `out` (dist/): the assets, the downloads, the ERD SVGs, then the pages. */
export async function writeLearn(out: URL, { curriculum, pages, erds, svgs }: LearnInputs, { draft }: { draft: boolean }): Promise<void> {
  const bundle = await writeAssets(out);
  console.log(`learn assets: engine ${DUCKDB_WASM.version}, extensions ${DUCKDB_EXT.names.join(", ")}, bundle ${bundle.js} ${bundle.css}`);

  const downloads = assembleDownloads(pages);
  const labs = new URL("learn/labs/", out);
  await mkdir(labs, { recursive: true });
  for (const d of downloads) await writeFile(new URL(d.name, labs), d.text);
  console.log(`learn labs: ${downloads.map((d) => d.name).join(", ")}`);

  const schema = new URL("learn/schema/", out);
  await mkdir(schema, { recursive: true });
  for (const n of DRAWN_ERDS) await writeFile(new URL(`${n}.svg`, schema), svgs[n]!);

  const star = (JSON.parse(await readFile(new URL("learn/data/star/manifest.json", out), "utf8")) as StarManifest).files;
  const html = learnPages({
    curriculum,
    pages,
    downloads: new Map(downloads.map((d) => [d.page, d.name])),
    templates: await readTemplates(),
    erds,
    context: {
      recorded: readRecorded(pages),
      stamp: readStamp(),
      star,
      draft,
      erdTitles: { schema: parseErd(erds.schema).title!, lab: parseErd(erds.lab).title! },
    },
  });
  await writePages(out, bundle, html);
  console.log(`learn html: ${html.map((p) => `/learn/${p.dir}`).join(", ")}`);
}
