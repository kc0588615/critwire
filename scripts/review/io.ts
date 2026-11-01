// Writes a text file atomically (temp file, then rename). Here, not in scripts/json.ts: json.ts is in learn-check's import
// closure, whose hashes key every lab, so editing it would make plain pnpm build refuse them (plan Decisions, S1).
import { link, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { UNFINISHED_ACCEPT } from "./accept.ts";

export async function writeText(url: URL, text: string): Promise<void> {
  const path = fileURLToPath(url);
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, text);
  await rename(tmp, path);
}

// Takes the backup for one accept: link, unlike rename, fails when the backup exists, so one run at a time holds it. Then
// the target must still be the bytes this run read: a holder only frees the backup after writing, so a run that read before
// that write fails here (A14, A15). The backup stays the only marker: no lock to recover (docs/recovery.md).
export async function claimBackup(backupUrl: URL, targetUrl: URL, expected: string): Promise<void> {
  const backup = fileURLToPath(backupUrl);
  const tmp = `${backup}.tmp-${process.pid}`;
  await writeFile(tmp, expected);
  try {
    await link(tmp, backup);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new Error(UNFINISHED_ACCEPT);
    throw e;
  } finally {
    await unlink(tmp);
  }
  if ((await readFile(targetUrl, "utf8")) !== expected) {
    await unlink(backupUrl);
    throw new Error(`${fileURLToPath(targetUrl)} changed since this run read it, nothing written: re-run`);
  }
}
