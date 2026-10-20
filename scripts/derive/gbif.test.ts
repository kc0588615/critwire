// GBIF rule tests (plan §7). Failure modes first:
// G7: a LICENSE facet containing CC_BY_NC_4_0 (or any license outside CC0 1.0 / CC BY 4.0), a missing LICENSE facet,
//     or license counts that don't sum to `count` → throws (the country list must come only from CC0 and CC BY records).
import assert from "node:assert/strict";
import { test } from "node:test";
import { assertOpenLicenses, type GbifOccurrenceResponse } from "../raw.ts";

function occurrences(count: number, licenses: Record<string, number> | null): GbifOccurrenceResponse {
  const facets = [{ field: "COUNTRY", counts: [{ name: "CA", count: 1 }] }];
  if (licenses) facets.unshift({ field: "LICENSE", counts: Object.entries(licenses).map(([name, n]) => ({ name, count: n })) });
  return { count, facets };
}

test("G7 assertOpenLicenses throws on a non-open license or counts that don't sum to count", () => {
  assert.throws(() => assertOpenLicenses(occurrences(1409, { CC0_1_0: 365, CC_BY_4_0: 944, CC_BY_NC_4_0: 100 })), /CC_BY_NC_4_0/);
  assert.throws(() => assertOpenLicenses(occurrences(10, { UNSPECIFIED: 10 })), /UNSPECIFIED/);
  assert.throws(() => assertOpenLicenses(occurrences(1310, { CC0_1_0: 365, CC_BY_4_0: 944 })), /1309.*1310|1310.*1309/);
  assert.throws(() => assertOpenLicenses(occurrences(5, null)), /LICENSE/);
  assert.doesNotThrow(() => assertOpenLicenses(occurrences(1309, { CC0_1_0: 365, CC_BY_4_0: 944 })));
  assert.doesNotThrow(() => assertOpenLicenses({ count: 0, facets: [] }));
});
