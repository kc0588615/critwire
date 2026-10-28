// H4 (plan D14 SC3): an interrupted multi-file derive. Written before the code, seen failing first. Failure mode: one
// derived file differs from derive's output (a run stopped between writes) and the build either passes or refuses
// without naming the file to look at. Each derived file in turn is made to differ, in memory; data/ is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { assertDerivedFiles, deriveAll, derivedFiles, readDeriveInputs, type DeriveResult } from "./pipeline.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("H4 the committed derived files pass; each one that differs is named", async () => {
  const result = deriveAll(await readDeriveInputs());
  await assertDerivedFiles(result);
  const files = derivedFiles(result).map(({ file }) => relative(root, fileURLToPath(file)));
  assert.equal(files.length, 6);
  for (let i = 0; i < files.length; i++) {
    // Empty one file's value: that one differs, the rest match.
    const changed: DeriveResult = { ...result, learn: { ...result.learn } };
    const keys = ["records", "entries", "contributions", "countries", "issuedIds"] as const;
    if (i < keys.length) (changed as unknown as Record<string, unknown>)[keys[i]] = [];
    else changed.learn.contributions = {} as DeriveResult["learn"]["contributions"];
    await assert.rejects(assertDerivedFiles(changed), (e: Error) => e.message === `${files[i]} is stale: run pnpm derive`);
  }
});
