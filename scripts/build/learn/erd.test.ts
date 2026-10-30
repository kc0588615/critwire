// The build's ERD inputs (erd.ts; plan D10, S7): the four .mmd under site/learn/erd/, each parsed; schema.mmd extends
// v1.mmd unchanged; the drawn three carry accTitle/accDescr; markers name drawn entities only; every dictionary entity
// has a source; each drawn SVG (pnpm erd) carries its source's sha256, so a stale or missing one is refused (S8).
// Written before the code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ERD_NAMES, dictionaries, erdErrors, readErds, svgErrors, type ErdTexts } from "./erd.ts";

const real = async (): Promise<ErdTexts> => (await readErds()).texts;
const errorsWith = (texts: ErdTexts, change: Partial<ErdTexts>) => erdErrors({ ...texts, ...change });
function assertHas(got: string[], ...want: (string | RegExp)[]): void {
  for (const w of want)
    assert.ok(got.some((g) => (typeof w === "string" ? g.includes(w) : w.test(g))), `no error with ${w}; got:\n${got.join("\n")}`);
}

test("the committed ERDs pass every check", async () => {
  const { texts, errors } = await readErds();
  assert.deepEqual(errors, []);
  assert.deepEqual(Object.keys(texts).sort(), [...ERD_NAMES].sort());
});

test("a parse error names the file and line", async () => {
  const t = await real();
  assertHas(errorsWith(t, { lab: t.lab.replace("erDiagram", "flowchart") }), /^site\/learn\/erd\/lab\.mmd: line \d+: the diagram must start with erDiagram/);
});

test("schema.mmd must extend v1.mmd, unchanged", async () => {
  const t = await real();
  assertHas(errorsWith(t, { schema: t.schema.replace("%% extends: v1.mmd\n", "") }), "site/learn/erd/schema.mmd: must name its base: %% extends: v1.mmd");
  assertHas(errorsWith(t, { schema: t.schema.replace("BIGINT gbif_id UK", "INTEGER gbif_id UK") }), "site/learn/erd/schema.mmd: ERD: species differs from v1.mmd: gbif_id is INTEGER, was BIGINT");
});

test("a drawn ERD without accTitle or accDescr fails; v1 needs neither", async () => {
  const t = await real();
  assertHas(errorsWith(t, { star: t.star.replace(/^ *accTitle: .*\n/m, "") }), "site/learn/erd/star.mmd: no accTitle: (the SVG's <title>)");
  assertHas(errorsWith(t, { lab: t.lab.replace(/^ *accDescr: .*\n/m, "") }), "site/learn/erd/lab.mmd: no accDescr: (the SVG's <desc>)");
  assert.equal(/accTitle/.test(t.v1), false);
});

test("a marker naming an undrawn planned entity or a drawn lab-made table fails", async () => {
  const t = await real();
  assertHas(errorsWith(t, { star: t.star.replace("\nerDiagram\n", "\n%% planned: dim_month\nerDiagram\n") }), "site/learn/erd/star.mmd: ERD: dim_month is marked %% planned: but not drawn");
  assertHas(errorsWith(t, { lab: t.lab.replace("%% lab-made: s4_cells,", "%% lab-made: taxa, s4_cells,") }), "site/learn/erd/lab.mmd: ERD: taxa is marked %% lab-made: but drawn in the diagram");
});

test("a dictionary entity without a source fails, naming it", async () => {
  const t = await real();
  const extra = t.star.replace("    fact_records {", "    dim_month {\n        INTEGER month PK\n    }\n    fact_records {");
  assertHas(errorsWith(t, { star: extra }), "site/learn/erd/star.mmd: dim_month has no source");
  assert.throws(() => dictionaries(extra), /dim_month has no source/);
});

test("dictionaries: one per entity, rows as the .mmd writes them (type as written, keys, meaning) plus the source", async () => {
  const t = await real();
  const schema = dictionaries(t.schema);
  assert.deepEqual(schema.map((d) => d.table), ["taxa", "species", "countries", "species_countries", "sources", "species_sources", "datasets", "occurrences"]);
  const occ = schema.find((d) => d.table === "occurrences")!;
  assert.deepEqual(occ.rows.find((r) => r.column === "country_code"), {
    column: "country_code", type: "VARCHAR", key: "FK", meaning: "that code when it is a countries row, else NULL", source: "`country_code_gbif`, when a `countries` row",
  });
  const lab = dictionaries(t.lab, { except: t.schema });
  assert.ok(lab.some((d) => d.table === "occurrences"), "the lab's occurrences has its point, so it differs from schema v2's");
  assert.ok(!lab.some((d) => d.table === "taxa"), "taxa is as in schema v2");
  assert.equal(lab.find((d) => d.table === "occurrences")!.rows.find((r) => r.column === "longitude")!.type, "float8");
  const star = dictionaries(t.star);
  assert.equal(star.find((d) => d.table === "dim_year")!.rows.find((r) => r.column === "decade")!.source, "computed from `year`");
});

test("dictionary sources are plain copy: no mission names, no plan section numbers", async () => {
  const t = await real();
  for (const name of ["schema", "lab", "star"] as const)
    for (const d of dictionaries(t[name]))
      for (const r of d.rows) assert.doesNotMatch(r.source, /\bmission\b|\b[A-Z]\d\b|§/, `${d.table}.${r.column}: ${r.source}`);
});

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const svgFor = (text: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" data-source-sha256="${sha(text)}"><title>t</title></svg>`;

test("svgErrors: each drawn ERD's SVG must carry its .mmd's sha256; a stale, unstamped or missing one is refused", async () => {
  const t = await real();
  const fresh = { schema: svgFor(t.schema), lab: svgFor(t.lab), star: svgFor(t.star) };
  assert.deepEqual(svgErrors(t, fresh), []);
  assert.deepEqual(svgErrors(t, { ...fresh, lab: svgFor(t.lab + "%% edited\n") }), ["site/learn/erd/lab.svg is stale: run pnpm erd"]);
  assert.deepEqual(svgErrors(t, { ...fresh, star: '<svg viewBox="0 0 10 10"></svg>' }), ["site/learn/erd/star.svg is stale: run pnpm erd"]);
  assert.deepEqual(svgErrors(t, { schema: fresh.schema, lab: fresh.lab }), ["site/learn/erd/star.svg: missing: run pnpm erd"]);
});
