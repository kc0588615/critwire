// The Learn site's inputs (plan D8.1): site/learn/'s sources, read and checked before the build writes anything.
// readLearnInputs grows with the steps (SVGs S8, assets S10, diagrams S25); today the course (learn/course-files.ts
// readCourse: the curriculum, the pages' slots, every block file's lint, recorded results without a block) and the ERD
// sources (erd.ts readErds: each parses, schema.mmd keeps v1.mmd, markers, accTitle/accDescr, sources). A ran
// PostGIS block without its recorded result fails a plain build and only warns with --draft (D16's loop: learn:check
// --update writes it). Throws naming every error. Writes nothing.
// assertLabsFresh (plan D6), once the data manifest is written: checked.json against the freshness the build recomputes
// (learn/freshness.ts); a plain build refuses a stale lab, --draft only warns.
import type { CoursePage, Curriculum } from "../../learn/course.ts";
import { readCourse } from "../../learn/course-files.ts";
import { readFreshness, readStamp, staleness } from "../../learn/freshness.ts";
import { readErds, type ErdTexts } from "./erd.ts";

export interface LearnInputs {
  curriculum: Curriculum;
  /** In page order, with their blocks. */
  pages: CoursePage[];
  /** site/learn/erd/'s sources, checked. */
  erds: ErdTexts;
}

/** site/learn/'s sources, checked; throws naming every error. */
export async function readLearnInputs({ draft }: { draft: boolean }): Promise<LearnInputs> {
  const { curriculum, pages, errors, missing } = await readCourse();
  const erds = await readErds();
  if (draft) for (const m of missing) console.warn(`build --draft: ${m}`);
  const all = [...errors, ...erds.errors, ...(draft ? [] : missing)];
  if (all.length) throw new Error(`site/learn: ${all.length} error(s):\n${all.join("\n")}`);
  return { curriculum: curriculum!, pages, erds: erds.texts };
}

/** Throws (warns with `draft`) naming every way checked.json fails to prove the labs `pages` publish; `dist`: the built site. */
export function assertLabsFresh(dist: string, pages: readonly CoursePage[], { draft }: { draft: boolean }): void {
  const errors = staleness(readStamp(), readFreshness(dist, pages));
  if (draft) for (const e of errors) console.warn(`build --draft: ${e}`);
  else if (errors.length) throw new Error(`site/learn/labs: ${errors.length} error(s):\n${errors.join("\n")}`);
}
