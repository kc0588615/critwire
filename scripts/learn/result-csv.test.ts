// CV1–CV4: the playground's Download CSV (site/learn/src/csv.ts, plan D12, S12): a result as CSV the way DuckDB's
// COPY writes it (header row, `\n` line ends, quotes only where needed, NULL as an empty field). Written before the
// code, seen failing first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { csvText } from "../../site/learn/src/csv.ts";

const res = (columns: string[], rows: unknown[][]) => ({ columns, rows });

test("CV1 a header row of the column names, then one line per row, each ending in \\n", () => {
  assert.equal(csvText(res(["id", "name"], [[1, "Jaguar"], [2, "Ocelot"]])), "id,name\n1,Jaguar\n2,Ocelot\n");
  assert.equal(csvText(res(["id"], [])), "id\n");
});

test("CV2 a field with a comma, a quote, CR or LF is quoted, quotes doubled; the header too", () => {
  assert.equal(csvText(res(["a,b", 'say "hi"'], [["x,y", 'a "b"'], ["line\nbreak", "cr\rhere"]])),
    '"a,b","say ""hi"""\n"x,y","a ""b"""\n"line\nbreak","cr\rhere"\n');
});

test("CV3 NULL is an empty field; an empty string is \"\"", () => {
  assert.equal(csvText(res(["a", "b"], [[null, ""]])), 'a,b\n,""\n');
});

test("CV4 other cells as the page shows them: BigInt digits, lists, structs, DECIMAL text", () => {
  assert.equal(csvText(res(["n", "l", "s", "d"], [[2n ** 60n, ["BR", "AR"], { k: 1 }, "2464.91"]])), 'n,l,s,d\n1152921504606846976,"[BR, AR]",{k: 1},2464.91\n');
});
