// data/learn/ (plan D3, D5): the committed lab data files and their provenance files. shapes.json is pnpm ingest
// shapes'; habitat.json the habitat stand-ins' (L3's ingest habitat takes it over). Each lists its files' bytes and
// sha256, and every other file in data/learn/ must be listed by exactly one of them.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { readJson } from "../json.ts";

export const labDataDir = new URL("../../data/learn/", import.meta.url);
export const PROVENANCE_FILES = ["shapes.json", "habitat.json"] as const;
export interface Provenance { files: Record<string, { bytes: number; sha256: string; rows: number }> }
export interface LabFile { name: string; bytes: number; sha256: string; provenance: (typeof PROVENANCE_FILES)[number] }

// Every data file in dir, sorted by name, as its provenance file records it. Throws, naming the file, for one whose
// bytes or sha256 differ (a hand edit or a half-finished copy), one no provenance file lists, one listed but missing,
// and one listed by both.
export async function readLabFiles(dir: URL = labDataDir): Promise<LabFile[]> {
  const listed = new Map<string, Omit<LabFile, "name">>();
  for (const provenance of PROVENANCE_FILES) {
    const { files } = await readJson<Provenance>(new URL(provenance, dir));
    for (const [name, { bytes, sha256 }] of Object.entries(files)) {
      const other = listed.get(name);
      if (other) throw new Error(`data/learn/${name} is listed by both ${other.provenance} and ${provenance}`);
      listed.set(name, { bytes, sha256, provenance });
    }
  }
  const present = (await readdir(dir, { withFileTypes: true }))
    .filter((e) => !(PROVENANCE_FILES as readonly string[]).includes(e.name))
    .map((e) => {
      if (!e.isFile()) throw new Error(`data/learn/${e.name} isn't a file`);
      return e.name;
    });
  const unlisted = present.filter((n) => !listed.has(n));
  if (unlisted.length) throw new Error(`data/learn/{${unlisted.join(",")}}: listed by neither ${PROVENANCE_FILES.join(" nor ")}`);
  const missing = [...listed.keys()].filter((n) => !present.includes(n));
  if (missing.length) throw new Error(`data/learn/{${missing.join(",")}} missing (listed in ${missing.map((n) => listed.get(n)!.provenance).join(", ")})`);
  const files: LabFile[] = [];
  for (const name of present.sort()) {
    const want = listed.get(name)!;
    const bytes = await readFile(new URL(name, dir));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== want.bytes || sha256 !== want.sha256) {
      throw new Error(`data/learn/${name}: ${bytes.length} bytes, sha256 ${sha256}; ${want.provenance} records ${want.bytes} bytes, sha256 ${want.sha256} ` +
        "(hand-edited or half-copied: re-run the ingest that writes it)");
    }
    files.push({ name, ...want });
  }
  return files;
}
