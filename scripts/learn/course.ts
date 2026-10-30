// The course's shape (plan D2, D8.1; 004 §2, §7.5): site/learn/curriculum.json (tracks, modules, prerequisites,
// built or planned), the pages' block slots, and the page order learn:check, the build and E2E share: the setup page,
// then the built modules in curriculum order. Each page's blocks are linted together (blocks.ts lintPage); a PostGIS
// block's `-- after:` may also name a ran PostGIS block on a page in its scope (afterScope: its module's prerequisites,
// transitively; 004 §0). Pure. Tests: course.test.ts.
import { lintPage, SETUP_ID, BLOCK_DIR, CHECKED_DIR, PY_CONNECT_ID, type Block } from "./blocks.ts";

export const CURRICULUM_FILE = "site/learn/curriculum.json";
export const MODULE_DIR = "site/learn/modules";
export const DIAGRAM_DIR = "site/learn/diagrams";
/** The setup page's id (/learn/setup/); it comes first in page order. */
export const SETUP_PAGE = "setup";
/** Tool codes, as 004 §2 badges them: browser, PostgreSQL with PostGIS, Python, Power BI Desktop. */
export const TOOLS = ["B", "PG", "Py", "PBI"] as const;

export interface Track {
  /** The URL segment: /learn/<id>/. */
  id: string;
  title: string;
}

export interface Module {
  /** f1 … c1: names its blocks (`d3-plan`) and its page file. */
  id: string;
  /** The URL segment: /learn/<track>/<slug>/. */
  slug: string;
  title: string;
  track: string;
  tools: (typeof TOOLS)[number][];
  hours: number;
  /** Modules listed above it. */
  prereqs: string[];
  /** built: site/learn/modules/<id>.html exists and the map links it; planned: listed unlinked, "in preparation". */
  state: "built" | "planned";
  skill: string;
  questions: string[];
}

export interface Curriculum {
  tracks: Track[];
  modules: Module[];
}

/** A page's HTML fragment: the setup page or a module's. */
export interface Page {
  id: string;
  file: string;
  html: string;
}

export const SLOT_KINDS = ["block", "exercise", "skip", "diagram"] as const;
export interface Slot {
  kind: (typeof SLOT_KINDS)[number];
  /** A block id (block, exercise, skip) or a diagram name. */
  name: string;
  /** `{{exercise:<id> in order}}`: the answer must match row order too. */
  inOrder: boolean;
  /** The slot as written. */
  text: string;
}

const TRACK_KEYS = ["id", "title"];
const MODULE_KEYS = ["id", "slug", "title", "track", "tools", "hours", "prereqs", "state", "skill", "questions"];
const MODULE_ID = /^[a-z][0-9]+$/;
const NAME = /^[a-z0-9-]+$/;

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const sameKeys = (o: Record<string, unknown>, keys: string[]) => Object.keys(o).length === keys.length && keys.every((k) => k in o);
const text = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const texts = (x: unknown): x is string[] => Array.isArray(x) && x.length > 0 && x.every(text);

/** One track's shape errors. */
function trackErrors(t: unknown, at: string): string[] {
  if (!isObject(t) || !sameKeys(t, TRACK_KEYS)) return [`${at}: a track's keys must be ${TRACK_KEYS.join(", ")}`];
  const errors: string[] = [];
  if (typeof t.id !== "string" || !NAME.test(t.id)) errors.push(`${at}: track id "${String(t.id)}" (want [a-z0-9-]+)`);
  if (!text(t.title)) errors.push(`${at}: track ${String(t.id)}: title must be non-empty text`);
  return errors;
}

/** One module's shape errors. */
function moduleErrors(m: unknown, at: string): string[] {
  if (!isObject(m)) return [`${at}: a module must be an object`];
  if (typeof m.id !== "string" || !MODULE_ID.test(m.id)) return [`${at}: module id "${String(m.id)}" (want [a-z][0-9]+)`];
  const q = `${at}: module ${m.id}`;
  if (!sameKeys(m, MODULE_KEYS)) return [`${q}: keys must be ${MODULE_KEYS.join(", ")}`];
  const errors: string[] = [];
  if (typeof m.slug !== "string" || !NAME.test(m.slug)) errors.push(`${q}: slug "${String(m.slug)}" (want [a-z0-9-]+)`);
  for (const k of ["title", "track", "skill"] as const) if (!text(m[k])) errors.push(`${q}: ${k} must be non-empty text`);
  if (!Array.isArray(m.tools) || !m.tools.length || !m.tools.every((t) => (TOOLS as readonly unknown[]).includes(t)) || new Set(m.tools).size !== m.tools.length)
    errors.push(`${q}: tools must be a non-empty list of ${TOOLS.join(", ")}`);
  if (typeof m.hours !== "number" || !(m.hours > 0)) errors.push(`${q}: hours must be a positive number`);
  if (!Array.isArray(m.prereqs) || !m.prereqs.every((p) => typeof p === "string")) errors.push(`${q}: prereqs must be a list of module ids`);
  if (m.state !== "built" && m.state !== "planned") errors.push(`${q}: state "${String(m.state)}" (built or planned)`);
  if (!texts(m.questions)) errors.push(`${q}: questions must be a non-empty list of text`);
  return errors;
}

/** The first prerequisite cycle, as ids from a module back to itself; undefined if none. */
function findCycle(modules: readonly Module[]): string[] | undefined {
  const by = new Map(modules.map((m) => [m.id, m]));
  const done = new Set<string>();
  const visit = (id: string, path: string[]): string[] | undefined => {
    const at = path.indexOf(id);
    if (at >= 0) return [...path.slice(at), id];
    if (done.has(id)) return undefined;
    for (const p of by.get(id)?.prereqs ?? []) {
      const cycle = visit(p, [...path, id]);
      if (cycle) return cycle;
    }
    done.add(id);
    return undefined;
  };
  for (const m of modules) {
    const cycle = visit(m.id, []);
    if (cycle) return cycle;
  }
  return undefined;
}

/**
 * curriculum.json's text, checked: its shape; unique track ids, module ids and slugs; known tracks, each with a module;
 * prerequisites known, named once, acyclic and listed above their module; a page for every built module and none for a
 * planned one. `pages`: the ids of site/learn/modules/<id>.html. Errors name `file`.
 */
export function parseCurriculum(file: string, json: string, pages: ReadonlySet<string>): { curriculum?: Curriculum; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { errors: [`${file}: not JSON`] };
  }
  if (!isObject(raw) || !sameKeys(raw, ["tracks", "modules"]) || !Array.isArray(raw.tracks) || !Array.isArray(raw.modules))
    return { errors: [`${file}: keys must be tracks, modules (both lists)`] };
  const shape = [...raw.tracks.flatMap((t) => trackErrors(t, file)), ...raw.modules.flatMap((m) => moduleErrors(m, file))];
  if (shape.length) return { errors: shape };
  const curriculum = raw as unknown as Curriculum;
  const { tracks, modules } = curriculum;
  const errors: string[] = [];

  const trackIds = new Set<string>();
  for (const t of tracks) {
    if (trackIds.has(t.id)) errors.push(`${file}: duplicate track id "${t.id}"`);
    trackIds.add(t.id);
  }
  const index = new Map<string, number>();
  const slugs = new Map<string, string>();
  modules.forEach((m, i) => {
    const q = `${file}: module ${m.id}`;
    if (index.has(m.id)) errors.push(`${file}: duplicate module id "${m.id}"`);
    else index.set(m.id, i);
    const other = slugs.get(m.slug);
    if (other !== undefined && other !== m.id) errors.push(`${q}: duplicate slug "${m.slug}" (also ${other})`);
    else slugs.set(m.slug, m.id);
    if (!trackIds.has(m.track)) errors.push(`${q}: unknown track "${m.track}"`);
    const page = `${MODULE_DIR}/${m.id}.html`;
    if (m.state === "built" && !pages.has(m.id)) errors.push(`${q} is built but ${page} doesn't exist`);
    if (m.state === "planned" && pages.has(m.id)) errors.push(`${q} is planned but ${page} exists`);
  });
  for (const t of tracks) if (!modules.some((m) => m.track === t.id)) errors.push(`${file}: track ${t.id} has no modules`);
  for (const id of pages) if (!index.has(id)) errors.push(`${MODULE_DIR}/${id}.html: no module ${id} in ${file}`);

  const cycle = findCycle(modules);
  if (cycle) errors.push(`${file}: prerequisites form a cycle: ${cycle.join(" → ")}`);
  modules.forEach((m, i) => {
    const q = `${file}: module ${m.id}`;
    for (const p of new Set(m.prereqs.filter((p, k) => m.prereqs.indexOf(p) !== k))) errors.push(`${q}: prerequisite "${p}" named twice`);
    for (const p of new Set(m.prereqs)) {
      const at = index.get(p);
      if (at === undefined) errors.push(`${q}: unknown prerequisite "${p}"`);
      else if (!cycle && at > i) errors.push(`${q}: prerequisite "${p}" is listed after it`);
    }
  });
  return errors.length ? { errors } : { curriculum, errors };
}

const SLOT = /\{\{([a-z]+):([^{}]*)\}\}/g;

/** A page's block slots, in order (`{{kind:name[ in order]}}`); a layout slot without a colon (`{{title}}`) isn't one. */
export function pageSlots(file: string, html: string): { slots: Slot[]; errors: string[] } {
  const slots: Slot[] = [];
  const errors: string[] = [];
  for (const [slot, kind, arg] of html.matchAll(SLOT)) {
    if (!(SLOT_KINDS as readonly string[]).includes(kind!)) {
      errors.push(`${file}: unknown slot kind "${kind}" in ${slot} (${SLOT_KINDS.join(", ")})`);
      continue;
    }
    const inOrder = arg!.endsWith(" in order");
    const name = inOrder ? arg!.slice(0, -" in order".length) : arg!;
    if (inOrder && kind !== "exercise" && kind !== "skip") errors.push(`${file}: ${slot}: \`in order\` is for exercise and skip slots`);
    else if (!NAME.test(name)) errors.push(`${file}: ${slot}: invalid name "${name}"`);
    else slots.push({ kind: kind as Slot["kind"], name, inOrder, text: slot });
  }
  return { slots, errors };
}

/** The pages in page order: the setup page (if any), then each built module's. Throws if a built module has no page. */
export function pageOrder(curriculum: Curriculum, pages: ReadonlyMap<string, Page>): Page[] {
  const setup = pages.get(SETUP_PAGE);
  const modules = curriculum.modules.filter((m) => m.state === "built").map((m) => {
    const page = pages.get(m.id);
    if (!page) throw new Error(`module ${m.id} is built but has no page`);
    return page;
  });
  return setup ? [setup, ...modules] : modules;
}

export interface CoursePage {
  page: Page;
  slots: Slot[];
  /** The blocks its block, exercise and skip slots name, in slot order. */
  blocks: Block[];
}

/**
 * The pages a page's PostGIS `-- after:` may reach besides its own (004 §0): its module's prerequisites, transitively;
 * none for the setup page. Throws, naming the page, on an unknown page or prerequisite, or a cycle (named): never an
 * empty scope for a broken curriculum.
 */
export function afterScope(curriculum: Curriculum, pageId: string): Set<string> {
  if (pageId === SETUP_PAGE) return new Set();
  const by = new Map(curriculum.modules.map((m) => [m.id, m]));
  if (!by.has(pageId)) throw new Error(`afterScope ${pageId}: no page ${pageId} in the curriculum`);
  const scope = new Set<string>();
  const visit = (id: string, path: readonly string[]) => {
    for (const p of by.get(id)!.prereqs) {
      if (path.includes(p)) throw new Error(`afterScope ${pageId}: prerequisites form a cycle: ${[...path.slice(path.indexOf(p)), p].join(" → ")}`);
      if (!by.has(p)) throw new Error(`afterScope ${pageId}: module ${id}: unknown prerequisite "${p}"`);
      if (scope.has(p)) continue;
      scope.add(p);
      visit(p, [...path, p]);
    }
  };
  visit(pageId, [pageId]);
  return scope;
}

/** Every page's blocks by id: the one resolver of `-- after:` for the runner, the downloads and the keys. */
export const courseBlocks = (pages: readonly CoursePage[]): Map<string, Block> => new Map(pages.flatMap((p) => p.blocks).map((b) => [b.id, b]));

/**
 * The pages (in page order) with their blocks, and every error: a bad slot, a slot without its block file or
 * diagram, a block on two pages, a block file no page uses (setup.sql runs at boot and needs none), and each page's
 * lint (lintPage: ids, `-- after:` earlier on the same page, a PostGIS block on a page of its afterScope, or py-connect
 * from the setup page; privilege, cleanup). Two passes, so the lint doesn't depend on page order: every page's blocks
 * first, then each page's lint. `diagrams`: the names in site/learn/diagrams/.
 */
export function assembleCourse(curriculum: Curriculum, pages: readonly Page[], blocks: ReadonlyMap<string, Block>, diagrams: ReadonlySet<string>): { pages: CoursePage[]; errors: string[] } {
  const errors: string[] = [];
  const usedOn = new Map<string, string>();
  const out = pages.map((page): CoursePage => {
    const { slots, errors: slotErrors } = pageSlots(page.file, page.html);
    errors.push(...slotErrors);
    const onPage: Block[] = [];
    for (const s of slots) {
      const at = `${page.file}: ${s.text}`;
      if (s.kind === "diagram") {
        if (!diagrams.has(s.name)) errors.push(`${at}: no diagram ${DIAGRAM_DIR}/${s.name}.svg`);
        continue;
      }
      const b = blocks.get(s.name);
      if (!b) {
        errors.push(`${at}: no block file ${BLOCK_DIR}/${s.name}.sql (.py, .m, .dax)`);
        continue;
      }
      const other = usedOn.get(b.id);
      if (other !== undefined) {
        errors.push(`${at}: block ${b.id} is already on ${other}`);
        continue;
      }
      usedOn.set(b.id, page.file);
      onPage.push(b);
    }
    return { page, slots, blocks: onPage };
  });
  const connect = blocks.get(PY_CONNECT_ID);
  const byPage = new Map(out.map((p) => [p.page.id, p.blocks]));
  for (const { page, blocks: onPage } of out) {
    const scope = afterScope(curriculum, page.id);
    const pgHelpers = [...scope].flatMap((id) => byPage.get(id) ?? []).filter((b) => b.engine === "postgis");
    const helpers = new Map([...(connect ? [connect] : []), ...pgHelpers].map((b) => [b.id, b]));
    errors.push(...lintPage(onPage, undefined, helpers));
  }
  for (const b of blocks.values()) if (b.id !== SETUP_ID && !usedOn.has(b.id)) errors.push(`${b.file}: no page uses block ${b.id}`);
  return { pages: out, errors };
}

/**
 * The recorded PostGIS and Python results against the course: `missing`, each ran PostGIS or Python block on a page
 * without checked/<id>.txt; `orphans`, each recorded id (`recorded`: the .txt names) no such block on a page owns.
 */
export function recordedResults(pages: readonly CoursePage[], recorded: ReadonlySet<string>): { missing: string[]; orphans: string[] } {
  const ran = new Set(pages.flatMap((p) => p.blocks).filter((b) => (b.engine === "postgis" || b.engine === "python") && b.status === "ran").map((b) => b.id));
  return {
    missing: [...ran].filter((id) => !recorded.has(id)).map((id) => `${CHECKED_DIR}/${id}.txt: no recorded result for q ${id}: run pnpm learn:check --update`),
    orphans: [...recorded].filter((id) => !ran.has(id)).sort().map((id) => `${CHECKED_DIR}/${id}.txt: no ran PostGIS or Python block ${id} on a page`),
  };
}
