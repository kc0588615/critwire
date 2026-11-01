// /v1/range-listings.{json,csv,parquet} (007, Contract). Expectations come from data/, never the build's code.
//
// The conflict test (plan F7, E11) is the suite's one isolated check, so its ways to fail come first:
// Must find: native-or-pre-1500 vs introduced; native + absent vs introduced + present; introduced + present vs introduced + absent.
// Must not find: a pair where one row has an area; native vs native-or-pre-1500; uncertain vs introduced.
// JS and SQL differing on any of them.
import { expect, test } from "@playwright/test";
import { rangeConflicts, type ConflictRow } from "../scripts/derive/listings.ts";

const row = (speciesId: number, country: string, origin: ConflictRow["origin"], presence: ConflictRow["presence"], sourceKey: string, area: string | null = null): ConflictRow =>
  ({ speciesId, country, area, origin, presence, sourceKey });

// 007's six cases, one species each.
const FIXED_ROWS: ConflictRow[] = [
  row(1, "KE", "native-or-pre-1500", "present", "mdd"), row(1, "KE", "introduced", "present", "a"),
  row(2, "KZ", "native", "absent", "a"), row(2, "KZ", "introduced", "present", "b"),
  row(3, "US", "introduced", "absent", "a"), row(3, "US", "introduced", "present", "b"),
  row(4, "US", "native", "present", "curated"), row(4, "US", "introduced", "present", "a", "Hawaii"),
  row(5, "BR", "native", "present", "curated"), row(5, "BR", "native-or-pre-1500", "present", "mdd"),
  row(6, "BR", "uncertain", "present", "a"), row(6, "BR", "introduced", "present", "b"),
];
const FIXED_FOUND = [{ speciesId: 1, country: "KE" }, { speciesId: 2, country: "KZ" }, { speciesId: 3, country: "US" }];

test("conflict rule on fixed rows: rangeConflicts finds exactly 007's three", () => {
  expect(rangeConflicts(FIXED_ROWS).map(({ speciesId, country }) => ({ speciesId, country }))).toEqual(FIXED_FOUND);
});
