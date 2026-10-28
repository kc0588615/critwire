// H5 (plan D9.1, D14 SC3): the build's DOI gate, pure. Written before the code, seen failing first. Failure modes:
// a plain build publishes without a current DOI for one target, or its refusal doesn't say which target and how to
// refresh it; --draft refuses (it must lift the DOI checks, and only those: freshness is derive's, before the gate).
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertDois } from "./inputs.ts";

test("H5 a plain build refuses a missing or stale DOI, naming each target and its refresh", () => {
  assert.throws(() => assertDois({ countries: "10.15468/dd.ky9cyt", "learn-sample": null }, { draft: false }),
    (e: Error) => /learn-sample/.test(e.message) && /--target learn-sample/.test(e.message) && !/countries/.test(e.message) && /--draft/.test(e.message));
  assert.throws(() => assertDois({ countries: null, "learn-sample": "10.15468/dd.x" }, { draft: false }),
    (e: Error) => /countries/.test(e.message) && /pnpm gbif:register\b/.test(e.message) && !/learn-sample/.test(e.message));
  assert.throws(() => assertDois({ countries: null, "learn-sample": null }, { draft: false }), /countries.*learn-sample/s);
});

test("H5 --draft passes without DOIs; a plain build passes with both", () => {
  assert.doesNotThrow(() => assertDois({ countries: null, "learn-sample": null }, { draft: true }));
  assert.doesNotThrow(() => assertDois({ countries: "10.15468/dd.ky9cyt", "learn-sample": "10.15468/dd.x" }, { draft: false }));
});
