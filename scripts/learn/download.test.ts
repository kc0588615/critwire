// DL1–DL3 (plan D6, D15): the sample's download request and its reuse check. DL8–DL14's pure half: decideDownload,
// which row a run takes (no POST while one may already exist) and the download POST's key parser. Written before the
// code, seen failing first. The fixture is GBIF's stored request for the spike's download 0041824-260928105237408
// (creator removed). Failure modes of decideDownload:
// DL8: a run with no intent and no --new POSTs (only --new may create a download).
// DL9: an intent with a key POSTs again instead of resuming that key.
// DL10–DL12: an intent without a key (the POST's outcome unknown) POSTs again, or adopts a download created before
//      the POST or for another request, or picks one of two matches, or gives up without saying why → list first; one
//      match adopts; two refuse naming both; none refuses (never a POST).
// DL14: while an intent exists, --download <other key> runs, or an intent for another request (ids.gbif changed
//      since) resumes into a download today's request refuses forever → both refuse naming the intent file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../json.ts";
import { classifyPost } from "../gbif/register.ts";
import { decideDownload, downloadRequest, parseDownloadKey, sameRequest, type DownloadDecideInput, type DownloadIntent } from "./download.ts";

const ECHO = await readJson<Record<string, any>>(new URL("../fixtures/gbif-sample-request.json", import.meta.url));
const KEYS: number[] = ECHO.predicate.predicates[0].values.map(Number);
const clone = <T>(v: T): T => structuredClone(v);

test("DL1 the builder equals the spike's stored predicate for its 73 keys, in any input order", () => {
  assert.equal(KEYS.length, 73);
  const built = downloadRequest([...KEYS].reverse());
  assert.deepEqual(
    { format: built.format, checklistKey: built.checklistKey, predicate: built.predicate },
    { format: ECHO.format, checklistKey: ECHO.checklistKey, predicate: ECHO.predicate },
  );
  assert.equal(built.sendNotification, false);
  assert.equal("creator" in built, false);
});

test("DL1 sameRequest accepts GBIF's full echo (sendNotification, type, extensions are not compared)", () => {
  assert.equal(sameRequest(ECHO, downloadRequest(KEYS)), true);
  assert.equal(sameRequest(downloadRequest(KEYS), downloadRequest(KEYS)), true);
});

test("DL1 the builder refuses no keys and a duplicate key", () => {
  assert.throws(() => downloadRequest([]), /no ids\.gbif/);
  assert.throws(() => downloadRequest([KEYS[0], KEYS[1], KEYS[0]]), new RegExp(`ids\\.gbif ${KEYS[0]} twice`));
});

test("DL2 an echo missing a checklistKey refuses (top level or on TAXON_KEY)", () => {
  const top = clone(ECHO);
  delete top.checklistKey;
  assert.equal(sameRequest(top, downloadRequest(KEYS)), false);
  const taxon = clone(ECHO);
  delete taxon.predicate.predicates[0].checklistKey;
  assert.equal(sameRequest(taxon, downloadRequest(KEYS)), false);
  const other = clone(ECHO);
  other.predicate.predicates[0].checklistKey = "7ddf754f-d193-4cc9-b351-99906754a03b";
  assert.equal(sameRequest(other, downloadRequest(KEYS)), false);
});

test("DL3 a stored request that differs from the built one refuses reuse", () => {
  const built = downloadRequest(KEYS);
  assert.equal(sameRequest(ECHO, downloadRequest([...KEYS, 9999999])), false, "a species added");
  assert.equal(sameRequest(ECHO, downloadRequest(KEYS.slice(1))), false, "a species removed");
  const variants: ((r: Record<string, any>) => void)[] = [
    (r) => { r.format = "DWCA"; },
    (r) => { r.predicate.predicates[1].values = ["CC0_1_0"]; },
    (r) => { r.predicate.predicates[5].values.push("LIVING_SPECIMEN"); },
    (r) => { r.predicate.predicates.reverse(); },
    (r) => { r.predicate.predicates.pop(); },
    (r) => { r.predicate.predicates[2].value = "false"; },
  ];
  for (const change of variants) {
    const stored = clone(ECHO);
    change(stored);
    assert.equal(sameRequest(stored, built), false, change.toString());
  }
});

const BUILT = downloadRequest(KEYS);
const FILE = "/state/critwire/gbif-sample-download-intent.json";
const STARTED = "2026-10-28T09:00:00.000Z";
const K1 = "0000001-261028090000001";
const K2 = "0000002-261028090000002";
const intent = (key: string | null, request = BUILT): DownloadIntent => ({ request, startedAt: STARTED, searchCount: 394532, key });
const listed = (key: string, created: string, request: object = ECHO) => ({ key, created, request, status: "RUNNING" });
const decideWith = (over: Partial<DownloadDecideInput>) =>
  decideDownload({ args: { mode: "new" }, intent: null, built: BUILT, listing: null, intentFile: FILE, ...over });

test("DL8 with no intent, only --new posts; a plain run or --download reuses", () => {
  assert.deepEqual(decideWith({}), { action: "post" });
  assert.deepEqual(decideWith({ args: { mode: "reuse", key: null } }), { action: "reuse", key: null });
  assert.deepEqual(decideWith({ args: { mode: "reuse", key: K1 } }), { action: "reuse", key: K1 });
});

test("DL9 an intent with a key resumes it, whatever the args; never a POST", () => {
  for (const args of [{ mode: "new" }, { mode: "reuse", key: null }, { mode: "reuse", key: K1 }] as const) {
    assert.deepEqual(decideWith({ args, intent: intent(K1) }), { action: "resume", key: K1 }, JSON.stringify(args));
  }
});

test("DL10 an intent without a key lists first, then adopts the one download of its request created since startedAt − 5 min", () => {
  assert.deepEqual(decideWith({ intent: intent(null) }), { action: "list" });
  assert.deepEqual(decideWith({ args: { mode: "reuse", key: null }, intent: intent(null) }), { action: "list" });
  const listing = [
    listed(K1, "2026-10-28T08:55:00.000+00:00"), // 5 min before startedAt: counts
    listed("0000003-261028090000003", "2026-10-28T08:54:59.000+00:00"), // earlier: another run's
    listed("0000004-261028090000004", "2026-10-28T09:01:00.000+00:00", downloadRequest(KEYS.slice(1))), // another request
  ];
  assert.deepEqual(decideWith({ intent: intent(null), listing }), { action: "adopt", key: K1 });
});

test("DL11 two matching downloads refuse, naming both", () => {
  const d = decideWith({ intent: intent(null), listing: [listed(K1, "2026-10-28T09:00:01Z"), listed(K2, "2026-10-28T09:00:02Z")] });
  assert.equal(d.action, "refuse");
  assert.match((d as { reason: string }).reason, new RegExp(`${K1}.*${K2}`));
});

test("DL12 no matching download refuses: a POST may have created one; delete the intent only when sure", () => {
  for (const listing of [[], [listed(K1, "2026-10-28T08:00:00Z")]]) {
    const d = decideWith({ intent: intent(null), listing });
    assert.equal(d.action, "refuse");
    assert.match((d as { reason: string }).reason, new RegExp(`POST at ${STARTED} may have created a download.*re-run later.*delete ${FILE} only when sure nothing was created`));
  }
});

test("DL14 while an intent exists, --download of another key refuses, and an intent for another request refuses", () => {
  for (const key of [K1, null]) {
    const d = decideWith({ args: { mode: "reuse", key: K2 }, intent: intent(key) });
    assert.equal(d.action, "refuse", String(key));
    assert.match((d as { reason: string }).reason, new RegExp(`${FILE}.*--download ${K2}`));
  }
  for (const key of [K1, null]) {
    const d = decideWith({ intent: intent(key, downloadRequest(KEYS.slice(1))), listing: [listed(K1, "2026-10-28T09:00:01Z")] });
    assert.equal(d.action, "refuse", String(key));
    assert.match((d as { reason: string }).reason, new RegExp(`${FILE} is for another request.*${STARTED}`));
  }
});

test("DL13 the download POST's key: 200/201 with a bare key is created; classifyPost's other rules unchanged", () => {
  assert.deepEqual(parseDownloadKey(`${K1}\n`), { key: K1 });
  for (const body of ["", "{}", JSON.stringify({ key: K1 }), `${K1} ${K2}`, "0041824-26092810523740"]) assert.equal(parseDownloadKey(body), null, body);
  assert.deepEqual(classifyPost({ status: 201, body: K1 }, parseDownloadKey), { kind: "created", key: K1 });
  assert.equal(classifyPost({ status: 201, body: "nope" }, parseDownloadKey).kind, "ambiguous");
  assert.equal(classifyPost({ status: 400, body: "bad predicate" }, parseDownloadKey).kind, "rejected");
  assert.equal(classifyPost({ error: "timeout" }, parseDownloadKey).kind, "ambiguous");
});
