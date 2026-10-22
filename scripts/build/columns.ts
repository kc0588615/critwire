// The /v1 record shape as DuckDB types (plan §4): one nested spec, in record key order, from which the read_json
// columns, the record key check and the CSV select list are all generated.
import type { Species } from "../species.ts";

// A DuckDB type, a struct (object) or a list of structs ([struct]).
export type Column = string | Columns | readonly [Columns];
export interface Columns { readonly [key: string]: Column }

export const RECORD_COLUMNS = {
  id: "INTEGER",
  slug: "VARCHAR",
  scientificName: "VARCHAR",
  commonName: "VARCHAR",
  taxonomy: { class: "VARCHAR", order: "VARCHAR", family: "VARCHAR", genus: "VARCHAR" },
  ids: { iucn: "INTEGER", gbif: "BIGINT", col: "VARCHAR", wikidata: "VARCHAR", inaturalist: "INTEGER", ncbi: "INTEGER" },
  range: { countriesWithOpenRecords: "VARCHAR[]", status: "VARCHAR" },
  photo: { url: "VARCHAR", credit: "VARCHAR", license: "VARCHAR", page: "VARCHAR" },
  sources: [{
    source: "VARCHAR",
    fields: "VARCHAR[]",
    license: "VARCHAR",
    retrieved: "VARCHAR",
    url: "VARCHAR",
    doi: "VARCHAR",
    release: { key: "INTEGER", alias: "VARCHAR", version: "VARCHAR", issued: "VARCHAR" },
    checklistKey: "VARCHAR",
  }],
  replacedBy: "INTEGER[]",
} as const satisfies Record<keyof Species, Column>;

// Identifiers are always double-quoted, so SQL keywords (order, range, key, …) need no list.
const ident = (key: string) => `"${key.replaceAll('"', '""')}"`;
const text = (value: string) => `'${value.replaceAll("'", "''")}'`;

function duckType(column: Column): string {
  if (typeof column === "string") return column;
  if (Array.isArray(column)) return `${duckType(column[0])}[]`;
  return `STRUCT(${Object.entries(column as Columns).map(([k, c]) => `${ident(k)} ${duckType(c)}`).join(", ")})`;
}

// The read_json columns={…} argument: {'id': 'INTEGER', …}.
export function readJsonColumns(columns: Columns = RECORD_COLUMNS): string {
  return `{${Object.entries(columns).map(([k, c]) => `${text(k)}: ${text(duckType(c))}`).join(", ")}}`;
}

// The CSV select list: every leaf except sources, named by its path in snake_case; lists ;-joined (NULL stays NULL).
export function csvSelect(columns: Columns = RECORD_COLUMNS): string[] {
  const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const leaves = (cols: Columns, path: string[]): string[] => Object.entries(cols).flatMap(([k, c]) => {
    if (Array.isArray(c)) return [];
    const p = [...path, k];
    if (typeof c !== "string") return leaves(c as Columns, p);
    const expr = p.slice(1).reduce((e, f) => `struct_extract(${e}, ${text(f)})`, ident(p[0]));
    return [`${c.endsWith("[]") ? `array_to_string(${expr}, ';')` : expr} AS ${ident(p.map(snake).join("_"))}`];
  });
  return leaves(columns, []);
}

// Throws unless every record's keys match the spec: structs exactly, list elements a subset (a source leaves out
// what it doesn't cite). Needed because read_json silently drops keys the spec lacks.
export function assertRecordKeys(records: readonly unknown[], columns: Columns = RECORD_COLUMNS): void {
  const check = (value: unknown, cols: Columns, path: string, subset: boolean): void => {
    if (value === null) return;
    const keys = Object.keys(value as object);
    const extra = keys.filter((k) => !(k in cols));
    const missing = subset ? [] : Object.keys(cols).filter((k) => !keys.includes(k));
    if (extra.length || missing.length) {
      throw new Error(`data/species.json ${path}: keys differ from scripts/build/columns.ts (extra: ${extra.join(", ") || "none"}; missing: ${missing.join(", ") || "none"})`);
    }
    for (const [k, c] of Object.entries(cols)) {
      const v = (value as Record<string, unknown>)[k];
      if (Array.isArray(c)) ((v ?? []) as unknown[]).forEach((e, i) => check(e, c[0] as Columns, `${path}.${k}[${i}]`, true));
      else if (typeof c !== "string" && v !== undefined) check(v, c as Columns, `${path}.${k}`, false);
    }
  };
  records.forEach((r, i) => check(r, columns, `[${i}]`, false));
}
