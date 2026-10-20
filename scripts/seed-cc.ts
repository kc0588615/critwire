// Seeds data/base.json from Critter Connect profiles (db/content/animals/*.json), open fields only.
// Never copies redList, systems, habitats, range, sources, clues, facts or traits (IUCN data, copyrighted text, game content).
// Usage: pnpm seed:cc <path-to-animals-dir>
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJson, writeJson } from "./json.ts";
import { baseFile, validateBase, type BaseSpecies, type Photo, type Taxonomy } from "./species.ts";

interface CcProfile {
  id: number;
  commonName: string;
  scientificName: string;
  taxonomy: Taxonomy;
  iucnId: number;
  photo?: Photo | null;
}

const dir = process.argv[2];
if (!dir) throw new Error("usage: pnpm seed:cc <path-to-animals-dir>");

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function requireString(value: unknown, field: string, file: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${file}: missing ${field}`);
  return value;
}

function readProfile(raw: unknown, file: string): CcProfile {
  const p = raw as Record<string, any>;
  if (!Number.isInteger(p.id) || p.id < 1) throw new Error(`${file}: bad id`);
  if (!Number.isInteger(p.iucnId)) throw new Error(`${file}: bad iucnId`);
  const t = p.taxonomy ?? {};
  const photo = p.photo == null ? null : {
    url: requireString(p.photo.url, "photo.url", file),
    credit: requireString(p.photo.credit, "photo.credit", file),
    license: requireString(p.photo.license, "photo.license", file),
    page: requireString(p.photo.page, "photo.page", file),
  };
  return {
    id: p.id,
    commonName: requireString(p.commonName, "commonName", file),
    scientificName: requireString(p.scientificName, "scientificName", file),
    taxonomy: {
      class: requireString(t.class, "taxonomy.class", file),
      order: requireString(t.order, "taxonomy.order", file),
      family: requireString(t.family, "taxonomy.family", file),
      genus: requireString(t.genus, "taxonomy.genus", file),
    },
    iucnId: p.iucnId,
    photo,
  };
}

const files = (await readdir(dir)).filter(f => f.endsWith(".json")).sort();
if (!files.length) throw new Error(`${dir}: no profiles`);
const profiles = await Promise.all(
  files.map(async f => readProfile(JSON.parse(await readFile(join(dir, f), "utf8")), f)),
);

const existing: BaseSpecies[] = existsSync(baseFile) ? await readJson(baseFile) : [];
validateBase(existing);
const firstSeed = existing.length === 0;
const byIucn = new Map(existing.map(s => [s.ids.iucn, s]));
const byName = new Map(existing.map(s => [s.scientificName, s]));
const records = new Map(existing.map(s => [s.id, s]));
const matched = new Set<number>();
let nextId = Math.max(0, ...existing.map(s => s.id)) + 1;

for (const p of profiles) {
  const match = byIucn.get(p.iucnId) ?? byName.get(p.scientificName);
  if (match) {
    if (matched.has(match.id)) throw new Error(`${p.scientificName}: matches record ${match.id}, already matched by another profile`);
    matched.add(match.id);
  }
  const id = match?.id ?? (firstSeed ? p.id : nextId++);
  if (!match && records.has(id)) throw new Error(`duplicate id ${id} (${p.scientificName})`);
  records.set(id, {
    id,
    slug: match?.slug ?? slugify(p.commonName),
    scientificName: p.scientificName,
    commonName: p.commonName,
    taxonomy: p.taxonomy,
    ids: { iucn: p.iucnId },
    photo: p.photo ?? null,
    replacedBy: match?.replacedBy ?? null,
  });
}

const base = [...records.values()].sort((a, b) => a.id - b.id);
validateBase(base);

await writeJson(baseFile, base);
console.log(`wrote ${base.length} species to data/base.json`);
