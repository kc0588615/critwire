// Writes a text file atomically (temp file, then rename). Here, not in scripts/json.ts: json.ts is in learn-check's import
// closure, whose hashes key every lab, so editing it would make plain pnpm build refuse them (plan Decisions, S1).
import { rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function writeText(url: URL, text: string): Promise<void> {
  const path = fileURLToPath(url);
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, text);
  await rename(tmp, path);
}
