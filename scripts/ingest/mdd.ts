// pnpm ingest mdd: the Mammal Diversity Database's country cell for each base mammal (007, Sources; owner's O1 yes, H7).
// Downloads the pinned release file into a temp folder of its own, reads three columns with DuckDB and removes it:
// iucnStatus and extinct are never selected. The Zenodo record's license, version and DOI are checked each run.
// No fs beyond the temp folder: scripts/ingest.ts writes the snapshot.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sqlPath, withOfflineDuckDb } from "../build/duckdb.ts";
import { downloadFile, getJson } from "../http.ts";
import { assertNoIucnData, type MddSnapshot } from "../raw.ts";
import type { BaseSpecies } from "../species.ts";

const DOWNLOAD_TIMEOUT_MS = 300_000;
const OPEN_LICENSE_ID = "cc-by-4.0";

export const MDD_FILE: MddSnapshot["file"] = {
  url: "https://zenodo.org/api/records/21654811/files/MDD_v2.5_6904species.csv/content",
  md5: "533e662fd5b8f66a5f56c191e7efac44",
  bytes: 9_303_589,
};
export interface MddPin { record: string; version: string; doi: string; rows: number; file: MddSnapshot["file"] }
export const MDD_PIN: MddPin = { record: "https://zenodo.org/api/records/21654811", version: "v2.5", doi: "10.5281/zenodo.21654811", rows: 6904, file: MDD_FILE };

// Which base species MDD speaks for: ingest and derive agree through this.
export const isMammal = (s: Pick<BaseSpecies, "taxonomy">) => s.taxonomy.class === "Mammalia";

interface ZenodoRecord { doi?: string; metadata?: { version?: string; publication_date?: string; license?: { id?: string } } }

async function fetchRelease(pin: MddPin): Promise<MddSnapshot["release"]> {
  const { doi, metadata } = await getJson(pin.record) as ZenodoRecord;
  const refuse = (what: string, got: unknown, want: string) => new Error(`mdd: Zenodo's ${what} is ${JSON.stringify(got ?? null)}, pinned ${want}: re-read 007's terms before moving the pin`);
  if (metadata?.license?.id !== OPEN_LICENSE_ID) throw refuse("license", metadata?.license?.id, OPEN_LICENSE_ID);
  if (metadata.version !== pin.version) throw refuse("version", metadata.version, pin.version);
  if (doi !== pin.doi) throw refuse("doi", doi, pin.doi);
  if (!metadata.publication_date) throw new Error("mdd: Zenodo's record has no publication_date");
  return { version: pin.version, issued: metadata.publication_date, doi: pin.doi };
}

// name → { id, places }, every row of the file. Every column is text, so "NA" stays the cell it is and nothing is sniffed.
async function readCells(url: URL, rows: number): Promise<Map<string, { id: string; places: string }>> {
  const read = await withOfflineDuckDb(async (con) => (await con.runAndReadAll(
    `SELECT sciName, id, COALESCE(countryDistribution, '') FROM read_csv(${sqlPath(url)}, header = true, delim = ',', quote = '"', all_varchar = true)`,
  )).getRowsJson() as string[][]);
  if (read.length !== rows) throw new Error(`mdd: ${read.length} rows, pinned ${rows}`);
  const cells = new Map<string, { id: string; places: string }>();
  for (const [name, id, places] of read) {
    if (cells.has(name)) throw new Error(`mdd: duplicate name ${name}`);
    cells.set(name, { id, places });
  }
  return cells;
}

export async function fetchMdd(base: readonly BaseSpecies[], pin: MddPin = MDD_PIN): Promise<Omit<MddSnapshot, "retrieved">> {
  const release = await fetchRelease(pin);
  const dir = await mkdtemp(join(tmpdir(), "critwire-mdd-"));
  try {
    const path = join(dir, "mdd.csv");
    await downloadFile(pin.file.url, path, { sha256: null, md5: pin.file.md5, bytes: pin.file.bytes, timeoutMs: DOWNLOAD_TIMEOUT_MS });
    const cells = await readCells(pathToFileURL(path), pin.rows);
    const species = Object.fromEntries(base.filter(isMammal).map((s) => [s.scientificName, cells.get(s.scientificName.replaceAll(" ", "_")) ?? null]));
    const snapshot = { file: pin.file, release, license: "CC BY 4.0" as const, species };
    assertNoIucnData(snapshot);
    return snapshot;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
