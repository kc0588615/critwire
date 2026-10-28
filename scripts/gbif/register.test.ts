// gbif:register core tests (plan §6, §12). A real POST mints a public DOI, so these paths can't be exercised live.
// Failure modes first; RG1–RG8 are the decision-table rows in precedence order:
// RG1: a registration with the same counts is registered again (a second DOI) → verify against registration.json.
// RG2: verify keeps a leftover intent of the run that wrote registration.json, so later runs refuse forever → verify
//      deletes an intent with the registration's hash, and keeps one with another hash.
// RG3: a registration with other counts is updated or re-posted (GBIF can't change a DOI's counts) → refuse, naming
//      the DOI refresh.
// RG4: an intent for another hash is ignored, so its possibly minted DOI is orphaned → refuse, naming its sourceUrl,
//      before any listing.
// RG5: a POST that minted a DOI before a crash is posted again → 1 listed with this hash → adopt it, against the intent.
//      Datasets without this hash's line (other work by the same user) don't count.
// RG6: duplicates already on GBIF get a third → more than 1 listed → refuse, naming every DOI.
// RG7: a POST whose outcome is unknown (intent, nothing listed yet) is posted again → refuse, naming the intent file.
// RG8: nothing registered, no intent → post. Registration missing and no listing yet → list first.
// P1: a lost or unclear POST outcome is taken as rejected (intent deleted, a second POST may mint a duplicate) or as
//     created → only 200/201 with a DOI is created; 4xx except 408/429 is rejected; the rest is ambiguous.
// B1: a read-back that differs from what was sent passes silently, or a cosmetic difference blocks a minted DOI forever
//     → counts, createdBy, the hash line and sourceUrl are hard errors; title and the rest of description are warnings.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Registration } from "./derived-dataset.ts";
import {
  classifyPost, decide, hashLine, readBackErrors, type DecideInput, type DerivedDatasetRecord, type DerivedDatasetRequest,
  type Intent,
} from "./register.ts";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const HASH = "1".repeat(64);
const OTHER = "2".repeat(64);
const DATASETS = { [A]: 3, [B]: 4 };
const INTENT_FILE = "/state/critwire/gbif-register-intent.json";
const SOURCE = (sha: string) => `https://github.com/kc0588615/critwire/tree/${sha}/data`;

const request = (hash: string, sourceUrl = SOURCE("a".repeat(40))): DerivedDatasetRequest => ({
  title: "critwire: countries", description: `about\n${hashLine(hash)}`, sourceUrl, relatedDatasets: DATASETS,
});
const intent = (hash: string): Intent => ({ contributionsSha256: hash, request: request(hash), startedAt: "2026-10-21T07:00:00.000Z" });
const registration = (relatedDatasets: Record<string, number>, hash = HASH): Registration => ({
  doi: "10.15468/dd.reg001", citation: "GBIF.org (21 October 2026) Filtered export", title: "critwire: countries",
  description: `about\n${hashLine(hash)}`, sourceUrl: SOURCE("a".repeat(40)), createdBy: "dinobytes215",
  contributionsSha256: hash, records: 7, relatedDatasets,
});
const listed = (doi: string, hash: string): DerivedDatasetRecord => ({
  doi, title: "critwire: countries", description: `about\n${hashLine(hash)}`, sourceUrl: SOURCE("a".repeat(40)),
  citation: `GBIF.org Filtered export https://doi.org/${doi}`, createdBy: "dinobytes215",
});
const input = (over: Partial<DecideInput>): DecideInput => ({
  registration: null, contributionsSha256: HASH, datasets: DATASETS, intent: null, listing: null, intentFile: INTENT_FILE,
  ...over,
});

test("RG1 a registration with the same counts → verify against it, whatever the listing", () => {
  const reg = registration({ [B]: 4, [A]: 3 }, OTHER);
  const d = decide(input({ registration: reg, listing: [listed("10.15468/dd.x", HASH), listed("10.15468/dd.y", HASH)] }));
  assert.deepEqual(d, { action: "verify", expected: reg, deleteIntent: false });
});

test("RG2 verify deletes a leftover intent with the registration's hash, and keeps one with another hash", () => {
  const reg = registration(DATASETS);
  assert.deepEqual(decide(input({ registration: reg, intent: intent(HASH) })), { action: "verify", expected: reg, deleteIntent: true });
  assert.deepEqual(decide(input({ registration: reg, intent: intent(OTHER) })), { action: "verify", expected: reg, deleteIntent: false });
});

test("RG3 a registration with other counts → refuse, naming the DOI refresh", () => {
  for (const counts of [{ [A]: 3 } as Record<string, number>, { [A]: 3, [B]: 5 }, { ...DATASETS, "cccccccc-0000-4000-8000-000000000003": 1 }]) {
    const d = decide(input({ registration: registration(counts), intent: intent(HASH), listing: [] }));
    assert.equal(d.action, "refuse");
    assert.match((d as { reason: string }).reason, /can't change a DOI's counts.*GBIF DOI refresh/);
  }
});

test("RG4 an intent for another hash → refuse naming its sourceUrl, before any listing", () => {
  const other = { ...intent(OTHER), request: request(OTHER, SOURCE("b".repeat(40))) };
  for (const listing of [null, [], [listed("10.15468/dd.x", HASH)]]) {
    const d = decide(input({ intent: other, listing }));
    assert.equal(d.action, "refuse");
    assert.match((d as { reason: string }).reason, new RegExp(`${SOURCE("b".repeat(40))}.*${INTENT_FILE}`));
  }
});

test("RG5 exactly 1 listed with this hash → adopt it, against the intent if any", () => {
  const others = [listed("10.15468/dd.o1", OTHER), { ...listed("10.15468/dd.o2", HASH), description: `x ${hashLine(HASH)}` }];
  const listing = [...others, listed("10.15468/dd.one", HASH)];
  assert.deepEqual(decide(input({ listing })), { action: "adopt", doi: "10.15468/dd.one", expected: null });
  assert.deepEqual(decide(input({ listing, intent: intent(HASH) })), { action: "adopt", doi: "10.15468/dd.one", expected: request(HASH) });
});

test("RG6 more than 1 listed with this hash → refuse, naming every DOI", () => {
  const d = decide(input({ listing: [listed("10.15468/dd.one", HASH), listed("10.15468/dd.two", HASH)], intent: intent(HASH) }));
  assert.equal(d.action, "refuse");
  assert.match((d as { reason: string }).reason, /10\.15468\/dd\.one.*10\.15468\/dd\.two.*handoff/);
});

test("RG7 0 listed with an intent → refuse, naming the POST time and the intent file", () => {
  const d = decide(input({ listing: [listed("10.15468/dd.o1", OTHER)], intent: intent(HASH) }));
  assert.equal(d.action, "refuse");
  assert.match((d as { reason: string }).reason, new RegExp(`2026-10-21T07:00:00.000Z.*re-run later.*${INTENT_FILE}`));
});

test("RG8 0 listed, no intent → post; not listed yet → list first", () => {
  assert.deepEqual(decide(input({ listing: [listed("10.15468/dd.o1", OTHER)] })), { action: "post" });
  assert.deepEqual(decide(input({ listing: [] })), { action: "post" });
  assert.deepEqual(decide(input({})), { action: "list" });
  assert.deepEqual(decide(input({ intent: intent(HASH) })), { action: "list" });
});

test("P1 classifyPost: only 200/201 with a DOI is created; 4xx except 408/429 rejected; the rest ambiguous", () => {
  const doiBody = JSON.stringify({ doi: "10.15468/dd.new001", title: "t" });
  assert.deepEqual(classifyPost({ status: 201, body: doiBody }), { kind: "created", doi: "10.15468/dd.new001" });
  assert.deepEqual(classifyPost({ status: 200, body: doiBody }), { kind: "created", doi: "10.15468/dd.new001" });
  for (const status of [400, 401, 403, 404, 409, 415, 422]) {
    const c = classifyPost({ status, body: "x".repeat(400) });
    assert.equal(c.kind, "rejected", `${status}`);
    assert.match((c as { reason: string }).reason, new RegExp(`HTTP ${status}: x{300}$`));
  }
  const ambiguous = [
    { status: 408, body: "" }, { status: 429, body: "" }, { status: 500, body: "" }, { status: 502, body: "" },
    { status: 503, body: "" }, { status: 204, body: "" }, { status: 201, body: "not json" }, { status: 201, body: "{}" },
    { status: 200, body: JSON.stringify({ doi: "" }) }, { status: 201, body: JSON.stringify({ doi: "nope" }) },
    { status: 201, body: "null" }, { status: 302, body: "" }, { error: "timeout" }, { error: "network ECONNRESET" },
  ];
  for (const outcome of ambiguous) assert.equal(classifyPost(outcome).kind, "ambiguous", JSON.stringify(outcome));
});

test("B1 readBackErrors: counts, createdBy, hash line and sourceUrl are hard; title and description are warnings", () => {
  const expected = request(HASH);
  const record = { ...listed("10.15468/dd.one", HASH), title: expected.title, description: expected.description };
  const usages = [{ datasetKey: B, numberRecords: 4 }, { datasetKey: A, numberRecords: 3 }];
  const check = (over: Partial<Parameters<typeof readBackErrors>[0]>) =>
    readBackErrors({ expected, record, usages, datasets: DATASETS, createdBy: "dinobytes215", hash: HASH, expectedDownloadDoi: null, ...over });

  assert.deepEqual(check({}), { hard: [], warnings: [] });
  assert.deepEqual(check({ expected: null }), { hard: [], warnings: [] });

  const hard = (over: Partial<Parameters<typeof readBackErrors>[0]>, pattern: RegExp) => {
    const { hard } = check(over);
    assert.equal(hard.length, 1, JSON.stringify(hard));
    assert.match(hard[0], pattern);
  };
  hard({ usages: [{ datasetKey: A, numberRecords: 3 }] }, /counts/);
  hard({ usages: [...usages, { datasetKey: "cccccccc-0000-4000-8000-000000000003", numberRecords: 1 }] }, /counts/);
  hard({ usages: [{ datasetKey: A, numberRecords: 3 }, { datasetKey: B, numberRecords: 5 }] }, /counts/);
  hard({ usages: [...usages, { datasetKey: A, numberRecords: 3 }] }, /twice.*aaaaaaaa/);
  hard({ createdBy: "someone" }, /createdBy/);
  hard({ hash: OTHER }, /contributions-sha256/);
  hard({ record: { ...record, sourceUrl: SOURCE("c".repeat(40)) } }, /sourceUrl/);

  const titled = check({ record: { ...record, title: "GBIF edited" } });
  assert.deepEqual(titled.hard, []);
  assert.equal(titled.warnings.length, 1);
  assert.match(titled.warnings[0], /title/);
  const described = check({ record: { ...record, description: `edited\n${hashLine(HASH)}` } });
  assert.deepEqual(described.hard, []);
  assert.equal(described.warnings.length, 1);
  assert.match(described.warnings[0], /description/);
});
