// currentDoi tests (plan §5 Derive). Failure modes first:
// R1: no registration yields a DOI → null.
// R2: a registration whose counts differ from the contributions (a key extra or missing, a count changed) is cited as
//     if current, so the DOI points at counts it never recorded → null.
// R3: a registration whose counts equal the contributions is not cited → its DOI.
import assert from "node:assert/strict";
import { test } from "node:test";
import { currentDoi, type Contributions, type Registration } from "./derived-dataset.ts";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const CONTRIBUTIONS: Contributions = {
  retrieved: "2026-10-21", records: 7,
  taxa: [{ taxonKey: 10, speciesIds: [1], records: 7, url: "https://api.gbif.org/v1/occurrence/search?taxonKey=10" }],
  datasets: { [A]: 3, [B]: 4 },
};
function registration(relatedDatasets: Record<string, number>): Registration {
  return {
    doi: "10.15468/dd.abc123", citation: "GBIF.org (21 October 2026) Filtered export of GBIF occurrence data https://doi.org/10.15468/dd.abc123",
    title: "critwire", description: "contributions-sha256: 00", sourceUrl: "https://github.com/kc0588615/critwire/tree/0/data",
    createdBy: "dinobytes215", contributionsSha256: "00", records: 7, relatedDatasets,
  };
}

test("R1 no registration → null", () => {
  assert.equal(currentDoi(CONTRIBUTIONS, null), null);
});

test("R2 an extra key, a missing key or a different count → null", () => {
  assert.equal(currentDoi(CONTRIBUTIONS, registration({ [A]: 3, [B]: 4, "cccccccc-0000-4000-8000-000000000003": 1 })), null);
  assert.equal(currentDoi(CONTRIBUTIONS, registration({ [A]: 3 })), null);
  assert.equal(currentDoi(CONTRIBUTIONS, registration({ [A]: 3, [B]: 5 })), null);
  assert.equal(currentDoi({ ...CONTRIBUTIONS, datasets: {} }, registration({})), null);
});

test("R3 equal counts → the DOI, whatever the key order", () => {
  assert.equal(currentDoi(CONTRIBUTIONS, registration({ [B]: 4, [A]: 3 })), "10.15468/dd.abc123");
});
