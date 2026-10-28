// The Learn site's inputs (plan D8.1): site/learn/'s sources, read and checked before the build writes anything.
// readLearnInputs grows with the steps (slots and blocks S5, ERDs S8, assets S10, diagrams S25); today the curriculum
// (course.ts parseCurriculum) against the module pages present. Throws naming every error. Writes nothing.
import { readdir, readFile } from "node:fs/promises";
import { CURRICULUM_FILE, MODULE_DIR, parseCurriculum, type Curriculum } from "../../learn/course.ts";

const root = new URL("../../../", import.meta.url);

export interface LearnInputs {
  curriculum: Curriculum;
}

/** The ids of site/learn/modules/<id>.html (none before the first module page). */
async function modulePages(): Promise<Set<string>> {
  let names: string[];
  try {
    names = await readdir(new URL(`${MODULE_DIR}/`, root));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    throw e;
  }
  const ids = new Set<string>();
  for (const name of names) {
    if (!name.endsWith(".html")) throw new Error(`${MODULE_DIR}/${name}: a module page is <id>.html`);
    ids.add(name.slice(0, -".html".length));
  }
  return ids;
}

/** site/learn/'s sources, checked; throws naming every error. */
export async function readLearnInputs(): Promise<LearnInputs> {
  const { curriculum, errors } = parseCurriculum(CURRICULUM_FILE, await readFile(new URL(CURRICULUM_FILE, root), "utf8"), await modulePages());
  if (errors.length) throw new Error(`site/learn: ${errors.length} error(s):\n${errors.join("\n")}`);
  return { curriculum: curriculum! };
}
