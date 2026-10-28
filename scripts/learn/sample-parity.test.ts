// Parity (plan D6, DoD "the sample is the spike's"): the published occurrences, written by the build's own writer from
// the committed sample, hold the spike's 40,395 records with the spike's values. Written before the writer, seen
// failing first. A difference is a bug in the port, never a new number: only a new download may change SPIKE_SAMPLE
// (004 §9). Also: the writer's bytes are the same on a second run, and its CSV reads back to the same rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { sqlText, withOfflineDuckDb } from "../build/duckdb.ts";
import { writeOccurrences } from "../build/learn/data.ts";
import { deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import { OCCURRENCE_COLUMNS } from "../derive/sample.ts";

// From SP/site/learn/data/occurrences.parquet (the spike's published file), by digest() below, once.
const SPIKE_SAMPLE = {
  rows: 40395,
  md5: "14053395313b37af5596089238d9a5a5",
  columns: [
    ["id", "BIGINT"], ["species_id", "INTEGER"], ["dataset_key", "VARCHAR"], ["license", "VARCHAR"], ["basis_of_record", "VARCHAR"],
    ["longitude", "DOUBLE"], ["latitude", "DOUBLE"], ["coordinate_uncertainty_m", "DOUBLE"], ["country_code_gbif", "VARCHAR"],
    ["country_code", "VARCHAR"], ["year", "INTEGER"], ["month", "INTEGER"],
  ],
};

// Rows, an md5 over every column as text (NULL as \N), ordered by id, and the column types, of a table expression.
async function digest(from: string) {
  const text = OCCURRENCE_COLUMNS.map((c) => `coalesce(CAST(${c} AS VARCHAR), '\\N')`).join(", ");
  return withOfflineDuckDb(async (con) => {
    const [[rows, md5]] = (await con.runAndReadAll(
      `SELECT count(*)::INTEGER, md5(string_agg(concat_ws(',', ${text}), chr(10) ORDER BY id)) FROM ${from}`)).getRows();
    const columns = (await con.runAndReadAll(`SELECT column_name, column_type FROM (DESCRIBE SELECT * FROM ${from})`)).getRows();
    return { rows, md5, columns };
  });
}
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

test("parity: occurrences.parquet = the spike's (40,395 rows, md5, types); a rerun writes the same bytes; the CSV reads back equal", async () => {
  const { learn } = deriveAll(await readDeriveInputs());
  const [a, b] = [mkdtempSync(join(tmpdir(), "critwire-parity-")), mkdtempSync(join(tmpdir(), "critwire-parity-"))];
  try {
    await writeOccurrences(learn.occurrences, pathToFileURL(`${a}/`));
    await writeOccurrences(learn.occurrences, pathToFileURL(`${b}/`));
    assert.deepEqual(await digest(`read_parquet(${sqlText(join(a, "occurrences.parquet"))})`), SPIKE_SAMPLE);
    for (const f of ["occurrences.parquet", "occurrences.csv"]) assert.equal(sha256(join(a, f)), sha256(join(b, f)), f);
    const types = `{${SPIKE_SAMPLE.columns.map(([c, t]) => `${c}: '${t}'`).join(", ")}}`;
    const csv = await digest(`read_csv(${sqlText(join(a, "occurrences.csv"))}, header = true, columns = ${types})`);
    assert.deepEqual(csv, SPIKE_SAMPLE);
    assert.equal(readFileSync(join(a, "occurrences.csv"), "utf8").split("\n", 1)[0], OCCURRENCE_COLUMNS.join(","));
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});
