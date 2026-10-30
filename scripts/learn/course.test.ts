// course.ts: site/learn/curriculum.json, the pages' block slots and page order (plan D2, D8.1; 004 §2, §7.5). Written
// before the code, seen failing first. Failure modes: the map links a module that has no page, or hides one that has;
// a prerequisite is unknown, circular or listed below its module, so working down the map meets a module that needs a
// later one; two modules share a URL; a slot names no file, or a block file sits on no page, so a page shows a hole or
// a tested block never reaches a learner; a block runs after one from another page that the learner may never open;
// the committed curriculum drifts from 004 §2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parseBlock, type Block } from "./blocks.ts";
import { afterScope, assembleCourse, courseBlocks, pageOrder, pageSlots, parseCurriculum, recordedResults, type Curriculum, type Module, type Page } from "./course.ts";

const tracks = [
  { id: "foundations", title: "Foundations" },
  { id: "database-architecture", title: "Database architecture" },
];
const mod = (id: string, over: Record<string, unknown> = {}) => ({
  id, slug: `m-${id}`, title: `Module ${id}`, track: id.startsWith("f") ? "foundations" : "database-architecture",
  tools: ["B"], hours: 1, prereqs: [], state: "planned", skill: "SELECT", questions: ["Which?"], ...over,
});
const text = (modules: unknown[], t: unknown = tracks) => JSON.stringify({ tracks: t, modules });
const parse = (modules: unknown[], pages: string[] = [], t: unknown = tracks) => parseCurriculum("curriculum.json", text(modules, t), new Set(pages));
function has(errors: string[], ...want: string[]) {
  for (const w of want) assert.ok(errors.some((e) => e.includes(w)), `missing ${JSON.stringify(w)} in\n${errors.join("\n") || "(none)"}`);
}

test("CU1 a valid curriculum parses: tracks and modules in order", () => {
  const { curriculum, errors } = parse([mod("f1"), mod("f2", { prereqs: ["f1"], state: "built" }), mod("d1", { prereqs: ["f2"], tools: ["B", "PG"] })], ["f2"]);
  assert.deepEqual(errors, []);
  assert.deepEqual(curriculum!.modules.map((m) => [m.id, m.state]), [["f1", "planned"], ["f2", "built"], ["d1", "planned"]]);
  assert.deepEqual(curriculum!.tracks.map((t) => t.id), ["foundations", "database-architecture"]);
});

test("CU2 an unknown prerequisite, a cycle, a prerequisite listed after its module", () => {
  has(parse([mod("f1", { prereqs: ["f0"] })]).errors, 'curriculum.json: module f1: unknown prerequisite "f0"');
  has(parse([mod("f1", { prereqs: ["f2"] }), mod("f2", { prereqs: ["f1"] })]).errors, "curriculum.json: prerequisites form a cycle: f1 → f2 → f1");
  has(parse([mod("f1", { prereqs: ["f1"] })]).errors, "prerequisites form a cycle: f1 → f1");
  has(parse([mod("f1", { prereqs: ["f2"] }), mod("f2")]).errors, 'curriculum.json: module f1: prerequisite "f2" is listed after it');
  has(parse([mod("f1"), mod("f2", { prereqs: ["f1", "f1"] })]).errors, 'module f2: prerequisite "f1" named twice');
});

test("CU3 an unknown track, a duplicate id or slug, a track without modules", () => {
  has(parse([mod("f1", { track: "gis" })]).errors, 'curriculum.json: module f1: unknown track "gis"');
  has(parse([mod("f1"), mod("f1", { slug: "other" })]).errors, 'curriculum.json: duplicate module id "f1"');
  has(parse([mod("f1"), mod("f2", { slug: "m-f1" })]).errors, 'curriculum.json: module f2: duplicate slug "m-f1" (also f1)');
  has(parse([mod("f1")], [], [...tracks, { id: "foundations", title: "Again" }]).errors, 'curriculum.json: duplicate track id "foundations"');
  has(parse([mod("f1")]).errors, "curriculum.json: track database-architecture has no modules");
});

test("CU4 built needs a page, planned has none, and every page is a module's", () => {
  has(parse([mod("f1", { state: "built" })]).errors, "curriculum.json: module f1 is built but site/learn/modules/f1.html doesn't exist");
  has(parse([mod("f1")], ["f1"]).errors, "curriculum.json: module f1 is planned but site/learn/modules/f1.html exists");
  has(parse([mod("f1")], ["f9"]).errors, "site/learn/modules/f9.html: no module f9 in curriculum.json");
  has(parse([mod("f1", { state: "done" })]).errors, 'module f1: state "done" (built or planned)');
});

test("CU5 the shape: exact keys and types, ids and slugs as in URLs, known tools, hours, questions", () => {
  has(parseCurriculum("curriculum.json", "{", new Set()).errors, "curriculum.json: not JSON");
  has(parseCurriculum("curriculum.json", JSON.stringify({ tracks }), new Set()).errors, "curriculum.json: keys must be tracks, modules");
  has(parse([mod("f1", { extra: 1 })]).errors, "curriculum.json: module f1: keys must be id, slug, title, track, tools, hours, prereqs, state, skill, questions");
  has(parse([mod("F1")]).errors, 'curriculum.json: module id "F1" (want [a-z][0-9]+)');
  has(parse([mod("f1", { slug: "Select It" })]).errors, 'module f1: slug "Select It" (want [a-z0-9-]+)');
  has(parse([mod("f1", { tools: [] })]).errors, "module f1: tools must be a non-empty list of B, PG, Py, PBI");
  has(parse([mod("f1", { tools: ["B", "Excel"] })]).errors, "module f1: tools must be a non-empty list of B, PG, Py, PBI");
  has(parse([mod("f1", { hours: 0 })]).errors, "module f1: hours must be a positive number");
  has(parse([mod("f1", { questions: [] })]).errors, "module f1: questions must be a non-empty list of text");
  has(parse([mod("f1", { title: "" })]).errors, "module f1: title must be non-empty text");
  has(parse([mod("f1")], [], [{ id: "Foundations", title: "F" }]).errors, 'track id "Foundations" (want [a-z0-9-]+)');
});

test("CU6 the committed curriculum is 004 §2: 7 tracks, 33 modules, 68 hours, all planned until their page lands", () => {
  const file = new URL("../../site/learn/curriculum.json", import.meta.url);
  const pages = new Set(readdirSync(new URL("../../site/learn/modules/", import.meta.url)).map((n) => n.replace(/\.html$/, "")));
  const { curriculum, errors } = parseCurriculum("site/learn/curriculum.json", readFileSync(file, "utf8"), pages);
  assert.deepEqual(errors, []);
  const c = curriculum!;
  assert.deepEqual(c.tracks.map((t) => t.id), ["foundations", "database-architecture", "gis-in-sql", "spatial-statistics", "etl", "power-bi", "capstone"]);
  assert.equal(c.modules.length, 33);
  const hours = (track: string) => c.modules.filter((m) => m.track === track).reduce((s, m) => s + m.hours, 0);
  assert.deepEqual(c.tracks.map((t) => hours(t.id)), [6.0, 12.0, 12.5, 12.5, 10.0, 7.0, 8.0]);
  assert.deepEqual(c.modules.map((m) => m.id).join(" "), "f1 f2 f3 f4 d1 d2 d3 d4 d5 d6 g1 g2 g3 g4 g5 g6 g7 s1 s2 s3 s4 s5 s6 e1 e2 e3 e4 e5 p1 p2 p3 p4 c1");
  const by = new Map(c.modules.map((m) => [m.id, m]));
  assert.deepEqual([by.get("d6")!.slug, by.get("d6")!.prereqs, by.get("d6")!.tools], ["star", ["d2", "d4"], ["PG", "B"]]);
  assert.deepEqual([by.get("c1")!.slug, by.get("c1")!.prereqs, by.get("c1")!.tools], ["game-feed", ["s5", "e4", "p4"], ["PG", "Py", "PBI"]]);
  assert.deepEqual(c.modules.filter((m) => m.state === "built").map((m) => m.id), c.modules.map((m) => m.id).filter((id) => pages.has(id)));
  assert.deepEqual(by.get("f3")!.questions, ["Which animals were recorded in Brazil?", "Which have no records at all?", "How many records fall in each 10° box?"]);
});

// ---------------------------------------------------------------------------------------------------------------
// Slots and pages

const blockFile = (id: string, ...lines: string[]): Block => {
  const { block, errors } = parseBlock(`site/learn/sql/${id}.sql`, [`-- q: ${id}`, ...lines].join("\n") + "\n");
  assert.deepEqual(errors, [], id);
  return block!;
};
const pyFile = (id: string, ...lines: string[]): Block => {
  const { block, errors } = parseBlock(`site/learn/sql/${id}.py`, [`# q: ${id}`, ...lines].join("\n") + "\n");
  assert.deepEqual(errors, [], id);
  return block!;
};
const ran = (id: string, ...h: string[]) => blockFile(id, "-- status: ran", ...h, "SELECT 1 AS a");
const pageOf = (id: string, html: string): Page => ({ id, file: `site/learn/modules/${id}.html`, html });
const blocks = (...bs: Block[]) => new Map(bs.map((b) => [b.id, b]));
/** A curriculum built by hand (past parseCurriculum): `[id, prereqs]` pairs, in order. */
const cur = (...ms: [string, string[]?][]): Curriculum => ({ tracks, modules: ms.map(([id, prereqs = []]) => mod(id, { prereqs }) as unknown as Module) });
/** A curriculum of the given modules, none with prerequisites. */
const flat = (...ids: string[]) => cur(...ids.map((id): [string] => [id]));

test("SL1 slots: block, exercise and skip name a block, diagram names a diagram; `in order` only on exercise and skip", () => {
  const { slots, errors } = pageSlots("p.html", "<p>{{title}}</p>{{block:f1-a}} {{exercise:f1-ex in order}} {{skip:f1-skip}} {{diagram:grain}}");
  assert.deepEqual(errors, []);
  assert.deepEqual(slots.map((s) => [s.kind, s.name, s.inOrder]), [["block", "f1-a", false], ["exercise", "f1-ex", true], ["skip", "f1-skip", false], ["diagram", "grain", false]]);
  has(pageSlots("p.html", "{{widget:f1-a}}").errors, 'p.html: unknown slot kind "widget" in {{widget:f1-a}} (block, exercise, skip, diagram)');
  has(pageSlots("p.html", "{{block:f1-a in order}}").errors, "p.html: {{block:f1-a in order}}: `in order` is for exercise and skip slots");
  has(pageSlots("p.html", "{{block:F1 A}}").errors, 'p.html: {{block:F1 A}}: invalid name "F1 A"');
});

test("SL2 page order: the setup page, then built modules in curriculum order", () => {
  const c: Curriculum = parseCurriculum("c.json", text([mod("f1", { state: "built" }), mod("f2", { state: "planned" }), mod("d1", { state: "built" })]), new Set(["f1", "d1"])).curriculum!;
  const pages = new Map([pageOf("d1", ""), pageOf("f1", ""), { id: "setup", file: "site/learn/pages/setup.html", html: "" }].map((p) => [p.id, p]));
  assert.deepEqual(pageOrder(c, pages).map((p) => p.id), ["setup", "f1", "d1"]);
  assert.throws(() => pageOrder(c, new Map([["setup", pages.get("setup")!]])), /module f1 is built but has no page/);
});

test("SL3 a slot without a file, a block on two pages, a block file no page uses; setup.sql needs no slot", () => {
  const all = blocks(ran("f1-a"), ran("f1-b"), ran("orphan"), blockFile("setup", "-- status: ran", "CREATE TABLE t (id int)"));
  const { errors } = assembleCourse(flat("f1", "f2"), [pageOf("f1", "{{block:f1-a}} {{block:f1-x}} {{diagram:nope}}"), pageOf("f2", "{{block:f1-a}} {{block:f1-b}}")], all, new Set());
  has(
    errors,
    "site/learn/modules/f1.html: {{block:f1-x}}: no block file site/learn/sql/f1-x.sql (.py, .m, .dax)",
    "site/learn/modules/f1.html: {{diagram:nope}}: no diagram site/learn/diagrams/nope.svg",
    "site/learn/modules/f2.html: {{block:f1-a}}: block f1-a is already on site/learn/modules/f1.html",
    "site/learn/sql/orphan.sql: no page uses block orphan",
  );
  assert.ok(!errors.some((e) => e.includes("setup.sql")), errors.join("\n"));
});

test("SL4 a page's blocks are linted together, in slot order; a browser block can't name another page's", () => {
  const all = blocks(ran("f1-a"), ran("f2-b", "-- after: f1-a"));
  has(assembleCourse(cur(["f1"], ["f2", ["f1"]]), [pageOf("f1", "{{block:f1-a}}"), pageOf("f2", "{{block:f2-b}}")], all, new Set()).errors, 'q f2-b: `-- after`: unknown block "f1-a" (not on this page or a prerequisite\'s)');
  const { pages, errors } = assembleCourse(flat("f1"), [pageOf("f1", "{{block:f1-a}} {{exercise:f2-b}}")], all, new Set(["grain"]));
  assert.deepEqual(errors, []);
  assert.deepEqual(pages.map((p) => [p.page.id, p.blocks.map((b) => b.id)]), [["f1", ["f1-a", "f2-b"]]]);
  has(assembleCourse(flat("f1"), [pageOf("f1", "{{block:f2-b}} {{block:f1-a}}")], all, new Set()).errors, 'q f2-b: `-- after`: "f1-a" comes after it');
});

test("SL5 the page lint includes the privilege and cleanup rules", () => {
  const all = blocks(blockFile("d5-a", "-- status: ran", "-- engine: postgis", "CREATE ROLE reporter;", "SELECT 1 AS a"));
  has(assembleCourse(flat("d5"), [pageOf("d5", "{{block:d5-a}}")], all, new Set()).errors, "site/learn/sql/d5-a.sql: q d5-a: statement 1 names role reporter");
});

test("SL6 recorded results: a ran PostGIS or Python block without checked/<id>.txt, and a .txt no ran PostGIS or Python block owns", () => {
  const all = blocks(
    ran("d1-a", "-- engine: postgis"), ran("d1-b", "-- engine: postgis"), ran("d1-c"),
    blockFile("d1-d", "-- status: untested: needs two sessions", "-- engine: postgis", "SELECT 1 AS a"),
    pyFile("d1-py", "# status: ran", "print(1)"), pyFile("d1-pu", "# status: untested: ArcGIS Pro", "import arcpy"),
  );
  const { pages, errors } = assembleCourse(flat("d1"), [pageOf("d1", "{{block:d1-a}} {{block:d1-b}} {{block:d1-c}} {{block:d1-d}} {{block:d1-py}} {{block:d1-pu}}")], all, new Set());
  assert.deepEqual(errors, []);
  const { missing, orphans } = recordedResults(pages, new Set(["d1-a", "d1-c", "d1-d", "d1-pu", "gone"]));
  assert.deepEqual(missing, [
    "site/learn/labs/checked/d1-b.txt: no recorded result for q d1-b: run pnpm learn:check --update",
    "site/learn/labs/checked/d1-py.txt: no recorded result for q d1-py: run pnpm learn:check --update",
  ]);
  assert.deepEqual(orphans, [
    "site/learn/labs/checked/d1-c.txt: no ran PostGIS or Python block d1-c on a page",
    "site/learn/labs/checked/d1-d.txt: no ran PostGIS or Python block d1-d on a page",
    "site/learn/labs/checked/d1-pu.txt: no ran PostGIS or Python block d1-pu on a page",
    "site/learn/labs/checked/gone.txt: no ran PostGIS or Python block gone on a page",
  ]);
  assert.deepEqual(recordedResults(pages, new Set(["d1-a", "d1-b", "d1-py"])), { missing: [], orphans: [] });
});

test("PY5 through the course: a Python block on any page may name py-connect, from the setup page", () => {
  const all = blocks(pyFile("py-connect", "# status: ran", "def connect(): pass"), pyFile("s4-a", "# status: ran", "# after: py-connect", "print(1)"));
  const setup: Page = { id: "setup", file: "site/learn/pages/setup.html", html: "{{block:py-connect}}" };
  assert.deepEqual(assembleCourse(flat("s4"), [setup, pageOf("s4", "{{block:s4-a}}")], all, new Set()).errors, []);
  has(assembleCourse(flat("s4"), [pageOf("s4", "{{block:s4-a}}")], blocks(all.get("s4-a")!), new Set()).errors, 'q s4-a: `# after`: unknown block "py-connect" (not on this page or a prerequisite\'s)');
});

// ---------------------------------------------------------------------------------------------------------------
// Cross-page `-- after:` (L5 plan T1, S1; 004 §0). Failure modes: a block names a block on a page the learner may
// not have opened (not a prerequisite, transitively); a cycle or self-reference in a hand-built curriculum loops or
// returns an empty scope silently; the lint depends on page order, so a page listed before its prerequisite's page
// is refused; the course's id resolver misses a page's block.

test("XS1 afterScope: a module's prerequisites, transitively; setup and a module without prerequisites → none", () => {
  const file = new URL("../../site/learn/curriculum.json", import.meta.url);
  const pages = new Set(readdirSync(new URL("../../site/learn/modules/", import.meta.url)).map((n) => n.replace(/\.html$/, "")));
  const c = parseCurriculum("site/learn/curriculum.json", readFileSync(file, "utf8"), pages).curriculum!;
  assert.deepEqual([...afterScope(c, "p3")].sort(), ["d1", "d2", "d3", "d4", "d6", "f1", "f2", "f3", "p1", "p2"]);
  assert.deepEqual([...afterScope(c, "setup")], []);
  assert.deepEqual([...afterScope(c, "f1")], []);
});

test("XS2 afterScope throws, naming the page: an unknown page, a module naming itself, a prerequisite cycle (named)", () => {
  assert.throws(() => afterScope(flat("f1"), "f9"), /afterScope f9: no page f9 in the curriculum/);
  assert.throws(() => afterScope(cur(["f1", ["f1"]]), "f1"), /afterScope f1: prerequisites form a cycle: f1 → f1/);
  assert.throws(() => afterScope(cur(["f1", ["f2"]], ["f2", ["f1"]], ["f3", ["f2"]]), "f3"), /afterScope f3: prerequisites form a cycle: f2 → f1 → f2/);
  assert.throws(() => afterScope(cur(["f1", ["f0"]]), "f1"), /afterScope f1: module f1: unknown prerequisite "f0"/);
});

const pgRan = (id: string, ...h: string[]) => ran(id, "-- engine: postgis", ...h);

test("XS3 courseBlocks: every page's blocks by id, the union of assembleCourse's pages", () => {
  const all = blocks(pgRan("f1-a"), pgRan("f2-a"), ran("f2-b"));
  const { pages, errors } = assembleCourse(flat("f1", "f2"), [pageOf("f1", "{{block:f1-a}}"), pageOf("f2", "{{block:f2-a}} {{block:f2-b}}")], all, new Set());
  assert.deepEqual(errors, []);
  const by = courseBlocks(pages);
  assert.deepEqual([...by.keys()], ["f1-a", "f2-a", "f2-b"]);
  for (const p of pages) for (const b of p.blocks) assert.equal(by.get(b.id), b);
});

test("XS4 a page listed before its prerequisite's page may name that page's ran PostGIS block: the lint doesn't depend on page order", () => {
  const all = blocks(pgRan("d6-a"), pgRan("p3-a", "-- after: d6-a"));
  const c = cur(["d6"], ["p3", ["d6"]]);
  const d6 = pageOf("d6", "{{block:d6-a}}");
  const p3 = pageOf("p3", "{{block:p3-a}}");
  assert.deepEqual(assembleCourse(c, [d6, p3], all, new Set()).errors, []);
  assert.deepEqual(assembleCourse(c, [p3, d6], all, new Set()).errors, []);
  const far = blocks(pgRan("f1-a"), pgRan("d6-a"), pgRan("p3-a", "-- after: f1-a"));
  assert.deepEqual(assembleCourse(cur(["f1"], ["d6", ["f1"]], ["p3", ["d6"]]), [pageOf("p3", "{{block:p3-a}}"), d6, pageOf("f1", "{{block:f1-a}}")], far, new Set()).errors, [], "transitively");
});

test("XS5 a block on a page outside the scope (unrelated, or a dependent page) is unknown", () => {
  const all = blocks(pgRan("d6-a", "-- after: p3-a"), pgRan("p3-a"), pgRan("g1-a"), pgRan("p4-a", "-- after: g1-a"));
  const c = cur(["d6"], ["g1"], ["p3", ["d6"]], ["p4", ["p3"]]);
  const { errors } = assembleCourse(c, [pageOf("d6", "{{block:d6-a}}"), pageOf("g1", "{{block:g1-a}}"), pageOf("p3", "{{block:p3-a}}"), pageOf("p4", "{{block:p4-a}}")], all, new Set());
  has(errors,
    'site/learn/sql/d6-a.sql: q d6-a: `-- after`: unknown block "p3-a" (not on this page or a prerequisite\'s)',
    'site/learn/sql/p4-a.sql: q p4-a: `-- after`: unknown block "g1-a" (not on this page or a prerequisite\'s)');
  assert.equal(errors.length, 2, errors.join("\n"));
});
