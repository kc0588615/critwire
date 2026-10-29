// An ingest's last step: its files into a committed folder (data/learn/, data/raw/gbif-sample/), all or nothing as far
// as the filesystem allows. Each file is first written as <path>.tmp-<pid> beside its target (same filesystem, so
// the rename can't fail for space), then every temp is renamed over its target. A failure while writing the temps
// removes them and any folder this created, leaving the folder as it was; only a failure among the renames (fast,
// same folder) can leave a mix, which the provenance check refuses ("restore with git restore").
import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { childFile } from "../build/paths.ts";

// A file's content: copied from a path, or text.
export type PublishSource = { copy: string } | { text: string };

// Writes `files` (names relative to dest, e.g. clips/cr.tif) into dest, as above.
export async function publishFiles(dest: URL, files: Record<string, PublishSource>): Promise<void> {
  const temps: string[] = [];
  const madeDirs: string[] = [];
  const staged: [string, string][] = [];
  try {
    for (const [name, source] of Object.entries(files)) {
      const to = fileURLToPath(childFile(dest, name));
      const made = await mkdir(dirname(to), { recursive: true });
      if (made) madeDirs.push(made);
      const tmp = `${to}.tmp-${process.pid}`;
      temps.push(tmp);
      if ("copy" in source) await copyFile(source.copy, tmp);
      else await writeFile(tmp, source.text);
      staged.push([tmp, to]);
    }
    for (const [tmp, to] of staged) await rename(tmp, to);
  } catch (e) {
    for (const tmp of temps) await rm(tmp, { force: true });
    for (const dir of madeDirs) await rm(dir, { recursive: true, force: true });
    throw e;
  }
}
