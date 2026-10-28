// DL1–DL3 (plan D6, D15): the sample's download request and its reuse check. Written before the code, seen failing
// first. The fixture is GBIF's stored request for the spike's download 0041824-260928105237408 (creator removed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../json.ts";
import { downloadRequest, sameRequest } from "./download.ts";

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
