// The /v1 contract (L3 plan §7.1): contracts/v1.json, hand-written, is the normative definition of every /v1 field and
// CSV column; the writers (columns.ts, countries.ts) and the data are checked against it, never the other way round.
// Pure. Entries are add-only: a removal, a retype, a CSV reorder or an unreviewed definition edit needs /v2.
// Declared nullability (`null`) is a promise, never inferred from the data; only a declared non-null field holding a
// null (or absent) fails. A null or absent parent hides its members; list elements are never null.
import { createHash } from "node:crypto";
import { formatJson } from "../json.ts";
import type { Column, Columns } from "./columns.ts";

// type: DuckDB type ("STRUCT" for a struct, "STRUCT[]" for a list of structs). means: what the value is, its unit or
// format, an identifier's namespace. values: a closed set; pattern: per value or list element; source (+ checklistKey):
// the sources[] entry that must cite every non-null value. sha: 12 hex of sha256 over the entry without sha, as
// canonical JSON (formatJson's: keys sorted, 2-space, newline).
export interface ContractEntry {
  type: string;
  null: boolean;
  means: string;
  values?: string[];
  pattern?: string;
  source?: string;
  checklistKey?: string;
  sha: string;
}
// species: keyed by dotted path (sources[].release.key); countries: by column. speciesCsv, countriesCsv: column order.
export interface V1Contract {
  species: Record<string, ContractEntry>;
  countries: Record<string, ContractEntry>;
  speciesCsv: string[];
  countriesCsv: string[];
}
// The writers' shapes and the data about to be published. The countries CSV is every country column, in order.
export interface V1Inputs {
  recordColumns: Columns;
  csvColumns: readonly string[];
  countryColumns: Readonly<Record<string, string>>;
  species: readonly unknown[];
  countries: readonly unknown[];
}
export interface V1Check { problems: string[]; additions: string[] }

export const contractFile = new URL("../../contracts/v1.json", import.meta.url);

const V2 = "needs /v2 (plan 001, Access)";
const KEYS = new Set(["type", "null", "means", "values", "pattern", "source", "checklistKey", "sha"]);
const SHOWN = 5;

export function entrySha(entry: Omit<ContractEntry, "sha">): string {
  const { sha: _, ...rest } = entry as ContractEntry;
  return createHash("sha256").update(formatJson(rest, { canonical: true })).digest("hex").slice(0, 12);
}

// Every path in a writer spec and its type: structs as STRUCT, lists of structs as STRUCT[] with members under "[]".
export function columnPaths(columns: Columns, prefix = ""): Record<string, string> {
  const paths: Record<string, string> = {};
  for (const [key, column] of Object.entries(columns) as [string, Column][]) {
    const path = prefix + key;
    if (typeof column === "string") paths[path] = column;
    else if (Array.isArray(column)) Object.assign(paths, { [path]: "STRUCT[]" }, columnPaths(column[0] as Columns, `${path}[].`));
    else Object.assign(paths, { [path]: "STRUCT" }, columnPaths(column as Columns, `${path}.`));
  }
  return paths;
}

// Every occurrence of a path's value in a row (undefined = absent); none under a null or absent parent.
function occurrences(row: unknown, path: string): unknown[] {
  const parts = path.split(".");
  let level: unknown[] = [row];
  parts.forEach((part, i) => {
    const key = part.replace(/\[\]$/, "");
    level = level.flatMap((v) => {
      const x = (v as Record<string, unknown>)[key];
      if (i === parts.length - 1) return [x];
      if (x === null || x === undefined) return [];
      return part.endsWith("[]") ? (x as unknown[]).filter((e) => e !== null) : [x];
    });
  });
  return level;
}

// What's wrong with an entry's form, or null.
function malformed(entry: ContractEntry, cited: boolean): string | null {
  const extra = Object.keys(entry).filter((k) => !KEYS.has(k));
  if (extra.length) return `unknown key ${extra.join(", ")}`;
  if (typeof entry.type !== "string" || !entry.type) return "type must be a DuckDB type";
  if (typeof entry.null !== "boolean") return "null must be true or false";
  if (typeof entry.means !== "string" || !entry.means.trim()) return "means must say what the value is";
  if (entry.values !== undefined && !(Array.isArray(entry.values) && entry.values.length && entry.values.every((v) => typeof v === "string"))) return "values must be a list of strings";
  if (entry.pattern !== undefined) {
    try { new RegExp(entry.pattern, "u"); } catch { return `pattern ${JSON.stringify(entry.pattern)} isn't a regular expression`; }
  }
  if (entry.source !== undefined && (!cited || typeof entry.source !== "string")) return cited ? "source must be a sources[].source name" : "source applies to species fields only";
  if (entry.checklistKey !== undefined && entry.source === undefined) return "checklistKey needs source";
  return null;
}

// "record 3" / "records 1, 2, …".
function rowList(noun: string, rows: string[]): string {
  const shown = rows.slice(0, SHOWN).join(", ") + (rows.length > SHOWN ? ", …" : "");
  return `${noun}${rows.length > 1 ? "s" : ""} ${shown}`;
}

// One /v1 table. writer: its paths and types; rowName, noun: how a problem names a row; cited: rows carry sources[].
interface Table {
  label: string;
  entries: Record<string, ContractEntry>;
  writer: Readonly<Record<string, string>>;
  rows: readonly unknown[];
  rowName: (row: unknown) => string;
  noun: string;
  cited: boolean;
}

// The writer's paths against the entries, then the data against them. CSV columns are checked by the caller.
function checkTable({ label, entries, writer, rows, rowName, noun, cited }: Table, check: V1Check): void {
  const fail = (path: string, change: string, hint = "") => check.problems.push(`${label} ${path}: ${change}: ${V2}${hint}`);
  for (const path of Object.keys(writer)) if (!Object.hasOwn(entries, path)) check.additions.push(`${label} ${path}: add to contracts/v1.json to freeze`);
  for (const [path, entry] of Object.entries(entries)) {
    const form = malformed(entry, cited);
    if (form) { check.problems.push(`${label} ${path}: malformed entry (${form})`); continue; }
    const sha = entrySha(entry);
    if (typeof entry.sha !== "string") check.problems.push(`${label} ${path}: no sha: set "sha": "${sha}"`);
    else if (entry.sha !== sha) {
      fail(path, `definition changed (sha ${entry.sha} ≠ ${sha})`,
        `; if the owner reviewed it as the same meaning (a wording fix), set sha to ${sha} in the commit that records the review under Decisions`);
    }
    if (!Object.hasOwn(writer, path)) { fail(path, "removed from the writer"); continue; }
    if (writer[path] !== entry.type) fail(path, `type ${entry.type} → ${writer[path]}`);

    // Data: kind of break → offending values and rows, so each break is one problem.
    const breaks = new Map<string, { values: Set<string>; rows: string[] }>();
    const note = (kind: string, row: string, value?: unknown) => {
      const b = breaks.get(kind) ?? { values: new Set<string>(), rows: [] };
      if (value !== undefined) b.values.add(JSON.stringify(value));
      if (!b.rows.includes(row)) b.rows.push(row);
      breaks.set(kind, b);
    };
    const pattern = entry.pattern === undefined ? null : new RegExp(entry.pattern, "u");
    for (const row of rows) {
      const name = rowName(row);
      for (const value of occurrences(row, path)) {
        if (value === null || value === undefined) {
          if (!entry.null) note("null", name);
          continue;
        }
        const elements = Array.isArray(value) ? value : [value];
        if (elements.some((e) => e === null || e === undefined)) note("element", name);
        for (const e of elements.filter((e) => e !== null && e !== undefined)) {
          if (entry.values && !entry.values.includes(e as string)) note("values", name, e);
          if (pattern && !(typeof e === "string" && pattern.test(e))) note("pattern", name, e);
        }
        if (entry.source !== undefined && !citedBy(row, path, entry)) note("source", name);
      }
    }
    for (const [kind, { values, rows: where }] of breaks) {
      const shown = [...values].slice(0, SHOWN).join(", ");
      const at = rowList(noun, where);
      fail(path, {
        null: `null or absent in ${at}, declared non-null`,
        element: `null element in ${at}`,
        values: `${shown} not in values in ${at}`,
        pattern: `${shown} doesn't match ${entry.pattern} in ${at}`,
        source: `not cited by ${entry.source}${entry.checklistKey ? ` (checklist ${entry.checklistKey})` : ""} in ${at}`,
      }[kind]!);
    }
  }
}

// A record's sources[] cites the path (or a group holding it) from the entry's source and checklist.
function citedBy(row: unknown, path: string, entry: ContractEntry): boolean {
  const sources = ((row as { sources?: unknown }).sources ?? []) as ({ source?: string; fields?: string[]; checklistKey?: string } | null)[];
  return sources.some((s) => s !== null && s.source === entry.source &&
    (entry.checklistKey === undefined || s.checklistKey === entry.checklistKey) &&
    (s.fields ?? []).some((f) => f === path || path.startsWith(`${f}.`)));
}

// A contract CSV list must be a prefix of the writer's; the rest are additions.
function checkCsv(label: string, contract: readonly string[], writer: readonly string[], check: V1Check): void {
  if (contract.some((c, i) => writer[i] !== c)) {
    check.problems.push(`${label}: columns ${contract.join(",")} are not a prefix of the writer's ${writer.join(",")}: ${V2}`);
    return;
  }
  for (const c of writer.slice(contract.length)) check.additions.push(`${label} ${c}: add to contracts/v1.json to freeze`);
}

export function checkV1Contract(contract: V1Contract, inputs: V1Inputs): V1Check {
  const check: V1Check = { problems: [], additions: [] };
  checkTable({
    label: "/v1/species", entries: contract.species, writer: columnPaths(inputs.recordColumns), rows: inputs.species,
    rowName: (r) => String((r as { id: unknown }).id), noun: "record", cited: true,
  }, check);
  checkCsv("/v1/species.csv", contract.speciesCsv, inputs.csvColumns, check);
  checkTable({
    label: "/v1/countries", entries: contract.countries, writer: inputs.countryColumns, rows: inputs.countries,
    rowName: (r) => String((r as { code: unknown }).code), noun: "row", cited: false,
  }, check);
  checkCsv("/v1/countries.csv", contract.countriesCsv, Object.keys(inputs.countryColumns), check);
  return check;
}
