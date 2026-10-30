// c1's feed, bound to its block's recorded result (L5 plan T4, S4; FD1–FD2). Written before the code, seen failing
// first. Failure modes:
// - FD1: the committed feed isn't byte for byte the text c1-feed-file returned (a hand edit, a final newline, the JSON
//   re-indented), yet the build publishes it → "…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check
//   --update"; an equal file passes;
// - FD2: the course has c1-feed-file but no feed was written → "missing"; no c1-feed-file (before c1 exists) → no check
//   and nothing to publish; a feed file with no block to bind it (a stray, or c1-feed-file renamed) → refused; the
//   schema it ships with is missing → refused.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FEED, feedErrors, feedStaleness } from "./feed.ts";
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
