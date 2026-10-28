// /v1/countries.{json,csv,parquet} (002 §6, plan D4/D15): five text columns, the rows of data/countries.json in every
// format, NA (Namibia) kept as text, and every species country code joins (k01). Expectations come from data/.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { csvRows, distPath, openDuckDB, ORIGIN, repoPath, type DuckDB } from "./helpers.ts";

const FILES = ["countries.json", "countries.csv", "countries.parquet"];

let rows: Record<string, string>[];
let columns: string[];
let db: DuckDB;
test.beforeAll(async () => {
  rows = JSON.parse(await readFile(repoPath("data/countries.json"), "utf8")).rows;
  columns = Object.keys(rows[0]);
  db = await openDuckDB();
});
test.afterAll(() => db.close());

test("the three files download with the built bytes", async ({ request }) => {
  for (const file of FILES) {
    const res = await request.get(`/v1/${file}`);
    expect(res.status(), file).toBe(200);
    expect((await res.body()).equals(await readFile(distPath(`v1/${file}`))), file).toBe(true);
  }
});

test("rows: five non-empty text columns, sorted by code, code and name unique", () => {
  expect(columns).toEqual(["code", "name", "continent", "region", "subregion"]);
  for (const r of rows) {
    expect(Object.keys(r), r.code).toEqual(columns);
    for (const c of columns) expect(typeof r[c] === "string" && r[c].trim().length > 0, `${r.code}.${c}`).toBe(true);
  }
  const codes = rows.map((r) => r.code);
  expect(codes).toEqual([...codes].sort());
  expect(new Set(codes).size).toBe(rows.length);
  expect(new Set(rows.map((r) => r.name)).size).toBe(rows.length);
});

test("JSON, Parquet and CSV hold the same rows as data/countries.json, all VARCHAR", async ({ request }) => {
  expect(await (await request.get("/v1/countries.json")).json()).toEqual(rows);

  const parquet = `${ORIGIN}/v1/countries.parquet`;
  const types = await db.rows(`SELECT column_name, column_type FROM (DESCRIBE SELECT * FROM read_parquet('${parquet}'))`);
  expect(types).toEqual(columns.map((column_name) => ({ column_name, column_type: "VARCHAR" })));
  expect(await db.rows(`SELECT * FROM read_parquet('${parquet}')`)).toEqual(rows);

  const csv = `${ORIGIN}/v1/countries.csv`;
  expect(await csvRows(db, csv)).toEqual(rows);
  expect((await (await request.get("/v1/countries.csv")).text()).split("\n")[0]).toBe(columns.join(","));
});

test("NA (Namibia) is the text 'NA' in every format, with DuckDB's default CSV reading", async () => {
  const namibia = rows.find((r) => r.code === "NA");
  expect(namibia).toBeDefined();
  for (const from of [`read_parquet('${ORIGIN}/v1/countries.parquet')`, `read_csv('${ORIGIN}/v1/countries.csv')`, `read_json('${ORIGIN}/v1/countries.json')`]) {
    expect(await db.rows(`SELECT code, name FROM ${from} WHERE code = 'NA'`), from).toEqual([{ code: "NA", name: namibia!.name }]);
  }
});

test("k01: every country code the species use has a row (0 unmatched)", async () => {
  const [k01] = await db.rows(`
    SELECT count(*)::INTEGER AS codes_used, count(c.code)::INTEGER AS with_a_row, (count(*) - count(c.code))::INTEGER AS unmatched
    FROM (SELECT DISTINCT unnest("range".countriesWithOpenRecords) AS country_code FROM read_parquet('${ORIGIN}/v1/species.parquet')) AS used
    LEFT JOIN read_parquet('${ORIGIN}/v1/countries.parquet') AS c ON c.code = used.country_code`);
  expect(k01.codes_used).toBeGreaterThan(0);
  expect(k01).toEqual({ codes_used: k01.codes_used, with_a_row: k01.codes_used, unmatched: 0 });
  console.log(`k01: ${k01.codes_used} codes used, ${k01.unmatched} unmatched`);
});
