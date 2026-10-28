// The 50 MB cap (plan D9.9, 004 §4.4), on dist/learn/data/ and on the committed lab data.
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const LEARN_CAP = 50_000_000;
const n = (bytes: number) => bytes.toLocaleString("en-US");

// Every file below dir (its path relative to dir, sorted) with its size in bytes. Throws for anything that isn't a
// regular file or a folder (a symlink would be served, or counted, as something else).
export async function fileSizes(dir: URL): Promise<Record<string, number>> {
  const root = fileURLToPath(dir);
  const sizes: Record<string, number> = {};
  const entries = (await readdir(root, { recursive: true, withFileTypes: true }))
    .map((e) => ({ e, path: join(e.parentPath, e.name) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const { e, path } of entries) {
    const name = relative(root, path);
    if (e.isDirectory()) continue;
    if (!e.isFile()) throw new Error(`${name} isn't a regular file (in ${root})`);
    sizes[name] = (await stat(path)).size;
  }
  return sizes;
}

export const totalBytes = (sizes: Record<string, number>) => Object.values(sizes).reduce((a, b) => a + b, 0);

// Throws when sizes add up to more than cap, naming label, the total, the cap and the five largest files.
export function assertCap(label: string, sizes: Record<string, number>, cap: number = LEARN_CAP): void {
  const total = totalBytes(sizes);
  if (total <= cap) return;
  const largest = Object.entries(sizes).sort(([, a], [, b]) => b - a).slice(0, 5).map(([f, b]) => `${f} ${n(b)}`).join(", ");
  throw new Error(`${label}: ${n(total)} bytes, over the ${n(cap)}-byte cap (largest: ${largest}); ` +
    "004 §4.4 gives the order of cuts, and a cut is a design change");
}
