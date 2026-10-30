// c1's feed, bound to its block's recorded result (L5 plan T4, S4; FD1–FD2). Written before the code, seen failing
// first. Failure modes:
// - FD1: the committed feed isn't byte for byte the text c1-feed-file returned (a hand edit, a final newline, the JSON
//   re-indented), yet the build publishes it → "…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check
//   --update"; an equal file passes;
// - FD2: the course has c1-feed-file but no feed was written → "missing"; no c1-feed-file (before c1 exists) → no check
//   and nothing to publish; a feed file with no block to bind it (a stray, or c1-feed-file renamed) → refused; the
//   schema it ships with is missing → refused.
// The feed's license and attribution (S10; FD3–FD6), checked against critwire's credit, the sample's citation and the
// sample's datasets (feedAttributionErrors; a game copies the feed alone, so it must carry them right):
// - FD3: license, license_url or attribution missing, or not critwire's credit (license, licenseUrl, citation) → one
//   error naming the field;
// - FD4: source isn't the sample's citation (a sample refresh that left the old citation in the SQL);
// - FD5: a credit row that is no sample dataset's (title, publisher, doi), a duplicate, rows out of (title, publisher,
//   doi) order (Postgres' C collation: bytes; a null doi last), a row without its doi key; doi null only for a dataset
//   whose doi is null;
// - FD6: a doc that isn't an object, or has no credit array → errors, never a throw.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FEED, feedAttributionErrors, feedErrors, feedStaleness, type FeedAttribution } from "./feed.ts";
import { renderResult } from "./result.ts";

const TEXT = '{"cells": [{"h3": "a", "weight": 0.5}, {"h3": "b", "weight": 0.5}], "meaning": "records, not its range"}';
const recorded = (text: string) => renderResult(FEED.block, { columns: [FEED.column], rows: [[text]] });
const STALE = `${FEED.file} isn't ${FEED.block}'s result: run pnpm learn:check --update`;

test("FD1 the feed equal to c1-feed-file's recorded result passes", () => {
  assert.deepEqual(feedStaleness(TEXT, recorded(TEXT)), []);
});

test("FD1 a changed byte, an added final newline or re-indented JSON is stale", () => {
  for (const edited of [TEXT.replace("0.5", "0.6"), TEXT + "\n", JSON.stringify(JSON.parse(TEXT), null, 2)]) {
    assert.deepEqual(feedStaleness(edited, recorded(TEXT)), [STALE], edited);
  }
  assert.deepEqual(feedStaleness(TEXT, undefined), [STALE], "no recorded result");
});

test("FD2 with c1-feed-file in the course: a missing feed or schema is refused; a bound one passes", () => {
  assert.deepEqual(feedErrors({ block: true, feed: undefined, recorded: recorded(TEXT), schema: true }), [`${FEED.file} is missing: run pnpm learn:check --update`]);
  assert.deepEqual(feedErrors({ block: true, feed: TEXT, recorded: recorded(TEXT), schema: false }), [`${FEED.schema} is missing: run pnpm learn:port c1`]);
  assert.deepEqual(feedErrors({ block: true, feed: TEXT + " ", recorded: recorded(TEXT), schema: true }), [STALE]);
  assert.deepEqual(feedErrors({ block: true, feed: TEXT, recorded: recorded(TEXT), schema: true }), []);
});

test("FD2 without c1-feed-file: no check; a feed file is refused", () => {
  assert.deepEqual(feedErrors({ block: false, feed: undefined, recorded: undefined, schema: false }), []);
  assert.deepEqual(feedErrors({ block: false, feed: TEXT, recorded: undefined, schema: false }), [`${FEED.file}: no block ${FEED.block} in the course writes it: delete it`]);
});

const DEED = "https://creativecommons.org/licenses/by/4.0/";
const CITATION = "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.x";
const EXPECTED: FeedAttribution = {
  critwire: { license: "CC BY 4.0", licenseUrl: DEED, citation: "critwire (https://critwire.com), CC BY 4.0" },
  sample: { citation: CITATION },
  datasets: [
    { title: "Atlas", publisher: "Dept", doi: "10.1/a" },
    { title: "Atlas", publisher: "Dept", doi: null },
    { title: "Museum", publisher: "M", doi: "10.1/m" },
    { title: "Zoo", publisher: "Z", doi: "10.1/z" },
  ],
};
const doc = (edit: Record<string, unknown> = {}) => ({
  license: "CC BY 4.0", license_url: DEED, attribution: "critwire (https://critwire.com), CC BY 4.0", source: CITATION,
  credit: [{ title: "Atlas", publisher: "Dept", doi: "10.1/a" }, { title: "Atlas", publisher: "Dept", doi: null }, { title: "Museum", publisher: "M", doi: "10.1/m" }],
  ...edit,
});
const F = FEED.file;

test("FD3 a doc with critwire's license, deed and credit, the sample's citation and sample datasets passes", () => {
  assert.deepEqual(feedAttributionErrors(doc(), EXPECTED), []);
  assert.deepEqual(feedAttributionErrors(doc({ credit: [] }), EXPECTED), [], "the list's completeness is the SQL's, bound by datasets_to_credit");
});

test("FD3 license, license_url or attribution missing or not critwire's credit: one error naming the field", () => {
  const { license: _l, license_url: _u, attribution: _a, ...bare } = doc();
  assert.deepEqual(feedAttributionErrors(bare, EXPECTED), [
    `${F}: license is missing, not "CC BY 4.0"`,
    `${F}: license_url is missing, not "${DEED}"`,
    `${F}: attribution is missing, not "critwire (https://critwire.com), CC BY 4.0"`,
  ]);
  assert.deepEqual(feedAttributionErrors(doc({ license: "CC0 1.0" }), EXPECTED), [`${F}: license is "CC0 1.0", not "CC BY 4.0"`]);
  assert.deepEqual(feedAttributionErrors(doc({ license_url: "http://creativecommons.org/licenses/by/4.0/" }), EXPECTED),
    [`${F}: license_url is "http://creativecommons.org/licenses/by/4.0/", not "${DEED}"`]);
  assert.deepEqual(feedAttributionErrors(doc({ attribution: "critwire" }), EXPECTED), [`${F}: attribution is "critwire", not "critwire (https://critwire.com), CC BY 4.0"`]);
});

test("FD4 a source that isn't the sample's citation is an error", () => {
  const old = "GBIF.org (1 January 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.old";
  assert.deepEqual(feedAttributionErrors(doc({ source: old }), EXPECTED), [`${F}: source is ${JSON.stringify(old)}, not ${JSON.stringify(CITATION)}`]);
});

test("FD5 credit rows: unknown, duplicate, out of order, without doi; doi null only where the dataset's is", () => {
  const [a, aNull, m] = doc().credit;
  const fake = { title: "Museum", publisher: "M", doi: "10.1/other" };
  assert.deepEqual(feedAttributionErrors(doc({ credit: [a, fake] }), EXPECTED), [`${F}: credit[1] ${JSON.stringify(fake)} is no sample dataset's (title, publisher, doi)`]);
  const mNull = { ...m, doi: null };
  assert.deepEqual(feedAttributionErrors(doc({ credit: [mNull] }), EXPECTED), [`${F}: credit[0] ${JSON.stringify(mNull)} is no sample dataset's (title, publisher, doi)`]);
  assert.deepEqual(feedAttributionErrors(doc({ credit: [a, m, m] }), EXPECTED), [`${F}: credit[2] repeats credit[1]`]);
  assert.deepEqual(feedAttributionErrors(doc({ credit: [m, a] }), EXPECTED), [`${F}: credit[1] is out of (title, publisher, doi) order`]);
  assert.deepEqual(feedAttributionErrors(doc({ credit: [aNull, a] }), EXPECTED), [`${F}: credit[1] is out of (title, publisher, doi) order`], "a null doi sorts last");
  const { doi: _d, ...noDoi } = m!;
  assert.deepEqual(feedAttributionErrors(doc({ credit: [a, noDoi] }), EXPECTED), [`${F}: credit[1] has no doi`]);
  // Byte order (C collation), not locale: "Zoo" < "atlas".
  const lower = { title: "atlas", publisher: "d", doi: "10.1/l" };
  const z = { title: "Zoo", publisher: "Z", doi: "10.1/z" };
  assert.deepEqual(feedAttributionErrors(doc({ credit: [z, lower] }), { ...EXPECTED, datasets: [...EXPECTED.datasets, lower] }), []);
});

test("FD6 a doc that isn't an object, or has no credit array, gives errors, never a throw", () => {
  for (const bad of [null, [], "feed", 3]) assert.deepEqual(feedAttributionErrors(bad, EXPECTED), [`${F}: not a JSON object`], JSON.stringify(bad));
  assert.deepEqual(feedAttributionErrors(doc({ credit: undefined }), EXPECTED), [`${F}: credit is not an array`]);
  assert.deepEqual(feedAttributionErrors(doc({ credit: [null, "x"] }), EXPECTED), [`${F}: credit[0] is not an object`, `${F}: credit[1] is not an object`]);
});
