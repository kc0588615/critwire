// learn:check's forced-failure loader (plan D10 check 9, A18; LC6 pure). Written before the code, seen failing first.
// Failure modes:
// - the extra row lands somewhere other than the occurrences COPY, or isn't a duplicate id → the load fails elsewhere
//   or not at all, and the check proves nothing → the first data row repeated right before that COPY's `\.`, the rest
//   byte for byte, and its id returned;
// - the loader's layout changed (no site, two sites, no `\.`, no rows to copy) → refused, "loader layout changed".
import assert from "node:assert/strict";
import { test } from "node:test";
import { forcedFailureLoader } from "./check.ts";

const COPY = "COPY occurrences (id, species_id, license) FROM stdin (FORMAT csv);";
const loader = (...lines: string[]) => lines.join("\n") + "\n";
const clean = loader("BEGIN;", "COPY species (id) FROM stdin (FORMAT csv);", "1", "\\.", "", COPY, "77,1,CC0 1.0", "78,1,CC BY 4.0", "\\.", "COMMIT;");

test("LC6 the first occurrences row is repeated before that COPY's end, the rest unchanged", () => {
  const forced = forcedFailureLoader(clean);
  assert.equal(forced.id, "77");
  assert.equal(forced.loader, loader("BEGIN;", "COPY species (id) FROM stdin (FORMAT csv);", "1", "\\.", "", COPY,
    "77,1,CC0 1.0", "78,1,CC BY 4.0", "77,1,CC0 1.0", "\\.", "COMMIT;"));
});

test("LC6 a loader without exactly one occurrences COPY with rows and an end is refused as layout changed", () => {
  for (const changed of [
    clean.replace(COPY, COPY.replace("COPY occurrences", "COPY learn_curriculum.occurrences")),
    clean + loader(COPY, "79,1,CC0 1.0", "\\."),
    loader(COPY, "77,1,CC0 1.0"),
    loader(COPY, "\\."),
    loader(COPY.replace("(id, ", "(species_id, id, "), "1,77,CC0 1.0", "\\."),
  ]) assert.throws(() => forcedFailureLoader(changed), /loader layout changed/, changed);
});
