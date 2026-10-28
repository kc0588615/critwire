// The committed course, read from site/learn/ (plan D2, D8.1, S5): curriculum.json, the setup page and module pages,
// every block file under site/learn/sql/ (setup.sql aside: header-less, run at boot), the diagram names and the
// recorded PostGIS results, checked with course.ts. The one reader the build (readLearnInputs) and learn:check's
// static stage share. Reads only. Tests: course-files.test.ts (the real files), course.test.ts (the rules).
import { readdir, readFile } from "node:fs/promises";
import { BLOCK_DIR, CHECKED_DIR, parseBlock, SETUP_ID, type Block } from "./blocks.ts";
import {
  assembleCourse, CURRICULUM_FILE, DIAGRAM_DIR, MODULE_DIR, pageOrder, parseCurriculum, recordedResults, SETUP_PAGE,
  type CoursePage, type Curriculum, type Page,
} from "./course.ts";

export const SETUP_PAGE_FILE = "site/learn/pages/setup.html";
const root = new URL("../../", import.meta.url);

export interface CourseFiles {
  /** Undefined when curriculum.json has errors (then nothing else is read). */
  curriculum?: Curriculum;
  /** In page order, with their blocks. */
  pages: CoursePage[];
  /** Every rule the files break, recorded results without a block included. */
  errors: string[];
  /** Ran PostGIS blocks without a recorded result: learn:check --update writes them. */
  missing: string[];
}

/** The file names in `dir` (from the repository root); none if the folder doesn't exist yet. */
async function list(dir: string): Promise<string[]> {
  try {
    return (await readdir(new URL(`${dir}/`, root))).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/** The names ending in `ext`, without it. */
const stems = (names: readonly string[], ext: string) => names.filter((n) => n.endsWith(ext)).map((n) => n.slice(0, -ext.length));

const read = (path: string) => readFile(new URL(path, root), "utf8");

/** The course as committed, checked; never throws on a broken rule, only on a read failure. */
export async function readCourse(): Promise<CourseFiles> {
  const errors: string[] = [];
  const moduleFiles = await list(MODULE_DIR);
  for (const n of moduleFiles) if (!n.endsWith(".html")) errors.push(`${MODULE_DIR}/${n}: a module page is <id>.html`);
  const moduleIds = stems(moduleFiles, ".html");
  const parsed = parseCurriculum(CURRICULUM_FILE, await read(CURRICULUM_FILE), new Set(moduleIds));
  if (!parsed.curriculum) return { pages: [], errors: [...errors, ...parsed.errors], missing: [] };

  const pages = new Map<string, Page>();
  if ((await list("site/learn/pages")).includes(`${SETUP_PAGE}.html`)) pages.set(SETUP_PAGE, { id: SETUP_PAGE, file: SETUP_PAGE_FILE, html: await read(SETUP_PAGE_FILE) });
  for (const id of moduleIds) pages.set(id, { id, file: `${MODULE_DIR}/${id}.html`, html: await read(`${MODULE_DIR}/${id}.html`) });

  const blocks = new Map<string, Block>();
  for (const name of await list(BLOCK_DIR)) {
    if (name === `${SETUP_ID}.sql`) continue;
    const { block, errors: lint } = parseBlock(`${BLOCK_DIR}/${name}`, await read(`${BLOCK_DIR}/${name}`));
    errors.push(...lint);
    if (block) blocks.set(block.id, block);
  }

  const course = assembleCourse(pageOrder(parsed.curriculum, pages), blocks, new Set(stems(await list(DIAGRAM_DIR), ".svg")));
  const { missing, orphans } = recordedResults(course.pages, new Set(stems(await list(CHECKED_DIR), ".txt")));
  return { curriculum: parsed.curriculum, pages: course.pages, errors: [...errors, ...course.errors, ...orphans], missing };
}
