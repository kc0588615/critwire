// A published-files fixture (projection.test.ts, star.test.ts): /v1's tables and /learn/data/ as the build writes them,
// from the committed data, in a temp folder removed afterwards. Not a test file, so importing it runs no test.
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { deriveAll, readDeriveInputs } from "../../derive/pipeline.ts";
import { labDataDir, readLabFiles } from "../../learn/lab-files.ts";
import { speciesFile } from "../../species.ts";
import { writeCountries } from "../countries.ts";
import { writeTables } from "../tables.ts";
import { writeLearnData } from "./data.ts";

export const deriveInputs = await readDeriveInputs();
export const derived = deriveAll(deriveInputs);

/** Runs fn on a temp out/ holding /v1's tables and /learn/data/ (with `occurrences` as the sample's rows). */
export async function withDist(fn: (out: URL) => Promise<void>, occurrences = derived.learn.occurrences): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "critwire-learn-dist-"));
  try {
    const out = pathToFileURL(`${dir}/`);
    mkdirSync(join(dir, "v1"));
    await writeTables(speciesFile, new URL("v1/", out));
    await writeCountries(derived.countries.rows, new URL("v1/", out));
    await writeLearnData(new URL("learn/data/", out), { learn: { ...derived.learn, occurrences }, files: await readLabFiles(labDataDir) });
    await fn(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
