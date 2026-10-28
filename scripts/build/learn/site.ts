// The Learn site's inputs (plan D8.1): site/learn/'s sources, read and checked before the build writes anything.
// readLearnInputs grows with the steps (ERDs S8, assets S10, diagrams S25); today the course (learn/course-files.ts
// readCourse: the curriculum, the pages' slots, every block file's lint, recorded results without a block). A ran
// PostGIS block without its recorded result fails a plain build and only warns with --draft (D16's loop: learn:check
// --update writes it). Throws naming every error. Writes nothing.
import type { CoursePage, Curriculum } from "../../learn/course.ts";
import { readCourse } from "../../learn/course-files.ts";

export interface LearnInputs {
  curriculum: Curriculum;
  /** In page order, with their blocks. */
  pages: CoursePage[];
}

/** site/learn/'s sources, checked; throws naming every error. */
export async function readLearnInputs({ draft }: { draft: boolean }): Promise<LearnInputs> {
  const { curriculum, pages, errors, missing } = await readCourse();
  if (draft) for (const m of missing) console.warn(`build --draft: ${m}`);
  const all = [...errors, ...(draft ? [] : missing)];
  if (all.length) throw new Error(`site/learn: ${all.length} error(s):\n${all.join("\n")}`);
  return { curriculum: curriculum!, pages };
}
