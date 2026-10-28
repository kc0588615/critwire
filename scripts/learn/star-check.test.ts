// The star's file checks (star-check.ts; plan D9, S9; spike test/powerbi-input.test.ts PB2–PB7 and
// test/star-export.test.ts ST2, ST3, ST5), ported before the code. Failure modes: a Power BI input missing, absent from
// the manifest, or with no manifest; a header out of the manifest's order; a duplicate or NULL primary key; a foreign
// key missing from its dimension or NULL; rows or bytes that differ from the manifest; a dimension without its unknown
// member; `NA` (Namibia) read as NULL; star SQL that names a schema, so it can't run in both engines.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkInput, readCsv, schemaQualified, unknownMemberErrors, type StarManifest } from "./star-check.ts";

const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = (p: string) => {
  const d = mkdtempSync(join(tmpdir(), p));
  dirs.push(d);
  return d;
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const DIM = "code,name\nNA,Namibia\nZZ,Unknown\n";
const FACT = "id,code,n\n1,NA,2.5\n2,ZZ,1\n";

/** A two-file star (dim_x, fact_x) in a temp folder; `edit` changes a file's text or the manifest before writing. */
function star(edit: { dim?: string; fact?: string; manifest?: (m: StarManifest) => void } = {}): string {
  const dir = tmp("pb-star-");
  const dim = edit.dim ?? DIM;
  const fact = edit.fact ?? FACT;
  const m: StarManifest = {
    files: {
      "dim_x.csv": {
        table: "dim_x",
        columns: [{ name: "code", type: "VARCHAR" }, { name: "name", type: "VARCHAR" }],
        primaryKey: ["code"],
        foreignKeys: [],
        rows: 2,
        bytes: Buffer.byteLength(DIM),
        sha256: sha(DIM),
        sources: [],
      },
      "fact_x.csv": {
        table: "fact_x",
        columns: [{ name: "id", type: "INTEGER" }, { name: "code", type: "VARCHAR" }, { name: "n", type: "DOUBLE" }],
        primaryKey: ["id"],
        foreignKeys: [{ columns: ["code"], references: { file: "dim_x.csv", columns: ["code"] } }],
        rows: 2,
        bytes: Buffer.byteLength(FACT),
        sha256: sha(FACT),
        sources: [],
      },
    },
  };
  edit.manifest?.(m);
  writeFileSync(join(dir, "dim_x.csv"), dim);
  writeFileSync(join(dir, "fact_x.csv"), fact);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  return dir;
}
/** The star with fact_x.csv replaced by `fact`, its sha256 and bytes updated in the manifest. */
const withFact = (fact: string) => star({ fact, manifest: (m) => ((m.files["fact_x.csv"]!.sha256 = sha(fact)), (m.files["fact_x.csv"]!.bytes = Buffer.byteLength(fact))) });
const has = (errors: string[], want: RegExp) => assert.ok(errors.some((e) => want.test(e)), `no error matching ${want}; got:\n${errors.join("\n")}`);

test("PB2 an input file that's missing, or absent from the manifest, fails; so does no manifest", async () => {
  const dir = star();
  rmSync(join(dir, "dim_x.csv"));
  has((await checkInput(dir, "star/dim_x.csv")).errors, /dim_x\.csv: missing/);
  has((await checkInput(star(), "star/other.csv")).errors, /other\.csv: not in the manifest/);
  has((await checkInput(tmp("pb-none-"), "star/dim_x.csv")).errors, /manifest\.json/);
  has((await checkInput(star(), "dim_x.csv")).errors, /dim_x\.csv: not star\/<file>\.csv/);
});

test("PB3 a header that differs from the manifest's columns, order included, fails", async () => {
  has((await checkInput(withFact("code,id,n\nNA,1,2.5\nZZ,2,1\n"), "star/fact_x.csv")).errors, /fact_x\.csv: header code,id,n, manifest id,code,n/);
});

test("PB4 a duplicate or NULL primary key fails", async () => {
  has((await checkInput(withFact("id,code,n\n1,NA,2.5\n1,ZZ,1\n"), "star/fact_x.csv")).errors, /fact_x\.csv: primary key \(id\) = \(1\) on 2 rows/);
  has((await checkInput(withFact("id,code,n\n1,NA,2.5\n,ZZ,1\n"), "star/fact_x.csv")).errors, /fact_x\.csv: row 2: primary key column id is NULL/);
});

test("PB5 a foreign-key value missing from its dimension fails, naming the file, column and value; a NULL one too (ST3)", async () => {
  has((await checkInput(withFact("id,code,n\n1,NA,2.5\n2,XX,1\n"), "star/fact_x.csv")).errors, /fact_x\.csv: row 2: code = XX not in dim_x\.csv \(code\)/);
  has((await checkInput(withFact("id,code,n\n1,NA,2.5\n2,,1\n"), "star/fact_x.csv")).errors, /fact_x\.csv: row 2: foreign key code is NULL/);
});

test("PB6 rows, bytes or sha256 different from the manifest fail", async () => {
  has((await checkInput(star({ manifest: (m) => void (m.files["fact_x.csv"]!.rows = 3) }), "star/fact_x.csv")).errors, /fact_x\.csv: 2 rows, manifest 3/);
  const edited = await checkInput(star({ fact: FACT.replace("2.5", "2.75") }), "star/fact_x.csv");
  has(edited.errors, /fact_x\.csv: sha256 [0-9a-f]{12}, manifest [0-9a-f]{12}/);
  has(edited.errors, /fact_x\.csv: \d+ bytes, manifest \d+/);
});

test("PB7 a clean input gives no errors and `-- input: <id> · <file> rows=<n> sha256=<12> keys=ok`", async () => {
  const r = await checkInput(star(), "star/fact_x.csv");
  assert.deepEqual(r.errors, []);
  assert.equal(r.line?.("p-a"), `-- input: p-a · star/fact_x.csv rows=2 sha256=${sha(FACT).slice(0, 12)} keys=ok`);
});

test("ST2 NA (Namibia) stays text under DuckDB read_csv(all_varchar); an empty field is NULL, a quoted one text", async () => {
  const f = join(tmp("st2-"), "dim_country.csv");
  writeFileSync(f, 'country_code,name,note\nNA,Namibia,\nNE,Niger,"a, ""b"""\n');
  const t = await readCsv(f);
  assert.deepEqual(t.header, ["country_code", "name", "note"]);
  assert.deepEqual(t.rows, [["NA", "Namibia", null], ["NE", "Niger", 'a, "b"']]);
});

test("ST3 both dimensions have their unknown member: dim_country ZZ, dim_year -1", () => {
  const ok = new Map([
    ["dim_country.csv", { header: ["country_code", "name"], rows: [["NA", "Namibia"], ["ZZ", "Unknown or outside any country"]] }],
    ["dim_year.csv", { header: ["year"], rows: [["-1"], ["2020"]] }],
  ]);
  assert.deepEqual(unknownMemberErrors(ok), []);
  const bad = new Map([
    ["dim_country.csv", { header: ["country_code", "name"], rows: [["NA", "Namibia"]] }],
    ["dim_year.csv", { header: ["year"], rows: [["2020"]] }],
  ]);
  assert.deepEqual(unknownMemberErrors(bad), ["dim_country.csv: no unknown member (country_code = ZZ)", "dim_year.csv: no unknown member (year = -1)"]);
  assert.deepEqual(unknownMemberErrors(new Map()), ["dim_country.csv: no unknown member (country_code = ZZ)", "dim_year.csv: no unknown member (year = -1)"]);
});

test("ST5 a schema-qualified name (learn_curriculum., public., main.) in star SQL fails; aliases and comments don't", () => {
  assert.deepEqual(schemaQualified("SELECT s.id FROM species AS s -- not public.x\nWHERE s.name <> 'main.y'"), []);
  assert.deepEqual(schemaQualified("SELECT * FROM learn_curriculum.species JOIN public.countries USING (code)"), ["learn_curriculum.", "public."]);
  assert.deepEqual(schemaQualified("CREATE TABLE main.dim_x (k INTEGER)"), ["main."]);
  assert.deepEqual(schemaQualified('SELECT * FROM "public".t'), ['"public".']);
});
