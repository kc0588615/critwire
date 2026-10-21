// JSON file io for data/: 2-space JSON plus a newline, written atomically (temp file, then rename).
import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

// Recursively sorts object keys (code-unit order); arrays keep their order.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
}

// canonical: keys sorted recursively (raw snapshots). Otherwise key order is the caller's.
export async function writeJson(url: URL, value: unknown, { canonical = false } = {}): Promise<void> {
  const path = fileURLToPath(url);
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(canonical ? sortKeys(value) : value, null, 2) + "\n");
  await rename(tmp, path);
}
