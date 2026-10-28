// JSON file io: 2-space JSON plus a newline, written atomically (temp file, then rename).
import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

// A file's text, or null when it doesn't exist.
export async function readOptionalText(url: URL): Promise<string | null> {
  try {
    return await readFile(url, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

// Recursively sorts object keys (code-unit order); arrays keep their order.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
}

// The bytes of every JSON file critwire writes (data/ and dist/). canonical: keys sorted recursively (raw snapshots).
// Otherwise key order is the caller's.
export function formatJson(value: unknown, { canonical = false } = {}): string {
  return JSON.stringify(canonical ? sortKeys(value) : value, null, 2) + "\n";
}

export async function writeJson(url: URL, value: unknown, options: { canonical?: boolean } = {}): Promise<void> {
  const path = fileURLToPath(url);
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, formatJson(value, options));
  await rename(tmp, path);
}
