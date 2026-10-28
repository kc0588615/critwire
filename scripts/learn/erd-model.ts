// The ERD model (plan D10; the spike's erd-model.ts, ported). Pure: parses the strict Mermaid `erDiagram` subset
// site/learn/erd/*.mmd use, and lists every way an ERD drifts from a catalog (tables, columns, types, keys, lines),
// from the base it extends (`%% extends:`), or from a copy embedded in a plan. One drift check serves the three
// drawn ERDs, each checked in one place: schema.mmd against the browser's DuckDB catalog (E2E, META_SQL), lab.mmd
// against learn_curriculum (learn:check, PG_META_SQL), star.mmd against the star manifest (the build, starMeta).
// `%% lab-made:` tables aren't drawn and may exist; `%% planned:` entities are drawn and must not exist yet.
// Anything outside the subset fails with its line, so no check skips a line it doesn't understand.
// Tests: erd-model.test.ts (RQE1–5, RE1–5, EG1–4).
import type { Result } from "./result.ts";

export type Key = "PK" | "FK" | "UK";

export interface ErdAttribute {
  /** Upper-cased, as compared. */
  type: string;
  /** As the .mmd writes it (the lab's are PostgreSQL's lower-case names), as dictionaries show it. */
  written: string;
  name: string;
  keys: Set<Key>;
  comment: string;
}

export interface ErdEntity {
  name: string;
  attributes: ErdAttribute[];
  line: number;
}

/** A one-to-many line, or one-to-zero-or-one (`||--o|`): `many` holds the foreign key to `one`. */
export interface ErdRelationship {
  one: string;
  many: string;
  /** The one side is "zero or one" (the FK may be NULL), not "exactly one". */
  optional: boolean;
  /** `||--o|`: at most one `many` row per `one` row (the FK is the child's PK or UNIQUE); absent on a many line. */
  unique?: true;
  /** As written, e.g. `taxa ||--o{ species`. */
  drawn: string;
  label: string;
  line: number;
}

export interface Erd {
  entities: ErdEntity[];
  relationships: ErdRelationship[];
  /** `accTitle:`, the SVG's `<title>`. */
  title?: string;
  /** `accDescr:`, the SVG's `<desc>`. */
  description?: string;
}

const NAME = "[A-Za-z_][A-Za-z0-9_]*";
const ENTITY_OPEN = new RegExp(`^(${NAME})\\s*\\{$`);
const ATTRIBUTE = new RegExp(`^(${NAME})\\s+(${NAME})((?:\\s+(?:PK|FK|UK)(?:\\s*,\\s*(?:PK|FK|UK))*)?)(?:\\s+"([^"]*)")?$`);
// Left markers |o || }o }| ; right markers o| || o{ |{ ; identifying -- or non-identifying ..
const RELATIONSHIP = new RegExp(`^(${NAME})\\s+(\\|o|\\|\\||\\}o|\\}\\|)(--|\\.\\.)(o\\||\\|\\||o\\{|\\|\\{)\\s+(${NAME})\\s*:\\s*(?:"([^"]*)"|(${NAME}))$`);
const ACCESSIBLE = /^(accTitle|accDescr):\s*(\S.*)$/;

export function parseErd(text: string): Erd {
  const erd: Erd = { entities: [], relationships: [] };
  const { entities, relationships } = erd;
  let header = false;
  let open: ErdEntity | undefined;
  text.split("\n").forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (!line || line.startsWith("%%")) return;
    const fail = (why: string): never => {
      throw new Error(`line ${n}: ${why}: ${line}`);
    };
    if (!header) {
      if (line !== "erDiagram") fail("the diagram must start with erDiagram");
      header = true;
      return;
    }
    if (open) {
      if (line === "}") return void (open = undefined);
      const m = ATTRIBUTE.exec(line) ?? fail(`not an attribute ("TYPE name [PK|FK|UK, …] ["comment"]")`);
      const keys = new Set((m[3] ?? "").split(",").map((k) => k.trim()).filter(Boolean) as Key[]);
      if (open.attributes.some((a) => a.name === m[2])) fail(`${open.name}.${m[2]} twice`);
      open.attributes.push({ type: m[1]!.toUpperCase(), written: m[1]!, name: m[2]!, keys, comment: m[4] ?? "" });
      return;
    }
    const acc = ACCESSIBLE.exec(line);
    if (acc) {
      const field = acc[1] === "accTitle" ? "title" : "description";
      if (erd[field] !== undefined) fail(`${acc[1]} twice`);
      erd[field] = acc[2]!.trim();
      return;
    }
    const e = ENTITY_OPEN.exec(line);
    if (e) {
      if (e[1] === "accTitle" || e[1] === "accDescr") fail(`write ${e[1]}: on one line; its block form isn't in the subset`);
      if (entities.some((x) => x.name === e[1])) fail(`${e[1]} is defined twice`);
      entities.push((open = { name: e[1]!, attributes: [], line: n }));
      return;
    }
    const r = RELATIONSHIP.exec(line) ?? fail("not accTitle:, accDescr:, an entity, an attribute block or a relationship");
    const [, a, left, , right, b, quoted, word] = r as unknown as string[];
    const drawn = `${a} ${left}${r[3]}${right} ${b}`;
    const manyLeft = left!.startsWith("}");
    const manyRight = right!.endsWith("{");
    if (manyLeft && manyRight) fail(`${drawn} is many-to-many; draw it through a junction table`);
    // One-to-zero-or-one only as `||--o|` (or `|o--||`): the `o` side is the child holding the FK.
    const childRight = left === "||" && right === "o|";
    const childLeft = left === "|o" && right === "||";
    if (!manyLeft && !manyRight && !childRight && !childLeft) fail(`${drawn} is one-to-one; the subset draws only ||--o| (zero or one child)`);
    const unique = !manyLeft && !manyRight;
    const parentLeft = manyRight || childRight;
    const oneMarker = parentLeft ? left! : right!;
    relationships.push({
      one: parentLeft ? a! : b!,
      many: parentLeft ? b! : a!,
      optional: !unique && oneMarker.includes("o"),
      ...(unique ? { unique: true as const } : {}),
      drawn,
      label: quoted ?? word!,
      line: n,
    });
  });
  if (!header) throw new Error("line 1: the diagram must start with erDiagram");
  if (open) throw new Error(`line ${open.line}: "${open.name} {" is never closed`);
  return erd;
}

export interface DbColumn {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
}

export interface DbConstraint {
  table: string;
  type: "PRIMARY KEY" | "UNIQUE" | "FOREIGN KEY";
  columns: string[];
  references?: string;
}

export interface DbMeta {
  tables: string[];
  views: string[];
  columns: DbColumn[];
  constraints: DbConstraint[];
}

/** The DuckDB catalog queries (the browser's schema, E2E), run on the pristine database; `dbMeta` reads their results. */
export const META_SQL = [
  "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name",
  "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'main' ORDER BY table_name, ordinal_position",
  "SELECT table_name, constraint_type, constraint_column_names, referenced_table FROM duckdb_constraints() WHERE schema_name = 'main' AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY') ORDER BY table_name, constraint_index",
] as const;

/**
 * The same three queries for PostgreSQL, on the session's schema (`current_schema()`: the lab session puts
 * learn_curriculum first). A user-defined type (geometry, raster) is named by its type, not `USER-DEFINED`.
 */
export const PG_META_SQL = [
  "SELECT table_name::text, table_type::text FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name",
  `SELECT table_name::text, column_name::text, (CASE WHEN data_type = 'USER-DEFINED' THEN udt_name ELSE data_type END)::text AS data_type, is_nullable::text
     FROM information_schema.columns WHERE table_schema = current_schema() ORDER BY table_name, ordinal_position`,
  `SELECT t.relname::text AS table_name,
          CASE c.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE' ELSE 'FOREIGN KEY' END AS constraint_type,
          ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k (attnum, n)
                JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.n) AS constraint_column_names,
          r.relname::text AS referenced_table
     FROM pg_constraint AS c
     JOIN pg_class AS t ON t.oid = c.conrelid
     LEFT JOIN pg_class AS r ON r.oid = c.confrelid
    WHERE t.relnamespace = current_schema()::regnamespace AND c.contype IN ('p', 'u', 'f')
    ORDER BY t.relname, c.conname`,
] as const;

/** The catalog from META_SQL's or PG_META_SQL's results, in their order. */
export function dbMeta([tables, columns, constraints]: readonly Result[]): DbMeta {
  const s = (v: unknown) => String(v);
  return {
    tables: tables!.rows.filter((r) => r[1] === "BASE TABLE").map((r) => s(r[0])),
    views: tables!.rows.filter((r) => r[1] === "VIEW").map((r) => s(r[0])),
    columns: columns!.rows.map((r) => ({ table: s(r[0]), column: s(r[1]), type: s(r[2]), nullable: r[3] === "YES" })),
    constraints: constraints!.rows.map((r) => ({
      table: s(r[0]),
      type: s(r[1]) as DbConstraint["type"],
      columns: (r[2] as unknown[]).map(s),
      ...(r[3] === null ? {} : { references: s(r[3]) }),
    })),
  };
}

const SYNONYMS: Record<string, string> = {
  INT: "INTEGER", INT4: "INTEGER", SIGNED: "INTEGER",
  INT8: "BIGINT", LONG: "BIGINT",
  TEXT: "VARCHAR", STRING: "VARCHAR", CHAR: "VARCHAR", BPCHAR: "VARCHAR", "CHARACTER VARYING": "VARCHAR",
  FLOAT8: "DOUBLE", "DOUBLE PRECISION": "DOUBLE", NUMERIC: "DECIMAL",
};
/** DECIMAL(12,2) → DECIMAL: Mermaid types are bare words, so the ERD shows the type without its precision. */
const normType = (t: string) => {
  const u = t.toUpperCase().replace(/\(.*\)$/, "");
  return SYNONYMS[u] ?? u;
};

const KEY_WORDS: Record<Key, { constraint: DbConstraint["type"]; is: string; isnt: string }> = {
  PK: { constraint: "PRIMARY KEY", is: "is in the primary key", isnt: "isn't in the primary key" },
  FK: { constraint: "FOREIGN KEY", is: "is in a foreign key", isnt: "isn't in a foreign key" },
  UK: { constraint: "UNIQUE", is: "is unique", isnt: "isn't unique" },
};

/** Every difference between the ERD and the catalog, as `ERD: …` lines; [] when they match. */
export function erdDrift(erd: Erd, db: DbMeta): string[] {
  const out: string[] = [];
  const drift = (s: string) => out.push(`ERD: ${s}`);
  const drawnTables = new Set([...erd.entities.map((e) => e.name), ...erd.relationships.flatMap((r) => [r.one, r.many])]);

  for (const t of drawnTables)
    if (db.views.includes(t)) drift(`"${t}" is a view; the ERD shows tables only`);
    else if (!db.tables.includes(t)) drift(`"${t}" is in the ERD but not a table in the database`);
  for (const t of db.tables) if (!drawnTables.has(t)) drift(`table "${t}" is in the database but not in the ERD`);

  // RQE2, RQE3: attributes and their key markers, for tables on both sides.
  for (const e of erd.entities.filter((x) => db.tables.includes(x.name))) {
    const cols = db.columns.filter((c) => c.table === e.name);
    for (const c of cols) {
      const a = e.attributes.find((x) => x.name === c.column);
      if (!a) {
        drift(`${e.name}.${c.column} is in the database (${c.type}) but not in the ERD`);
        continue;
      }
      if (normType(a.type) !== normType(c.type)) drift(`${e.name}.${c.column} is ${normType(a.type)} in the ERD but ${normType(c.type)} in the database`);
      for (const k of Object.keys(KEY_WORDS) as Key[]) {
        const w = KEY_WORDS[k];
        const inDb = db.constraints.some((x) => x.table === e.name && x.type === w.constraint && x.columns.includes(c.column));
        if (inDb && !a.keys.has(k)) drift(`${e.name}.${c.column} ${w.is} but not marked ${k}`);
        if (!inDb && a.keys.has(k)) drift(`${e.name}.${c.column} is marked ${k} but ${w.isnt}`);
      }
    }
    for (const a of e.attributes) if (!cols.some((c) => c.column === a.name)) drift(`${e.name}.${a.name} is in the ERD but not in the database`);
  }

  // RQE4: each relationship is one foreign key (many → one), and the one side's optionality is its nullability.
  const fks = db.constraints.filter((c) => c.type === "FOREIGN KEY");
  const used = new Set<DbConstraint>();
  for (const r of erd.relationships) {
    const fk = fks.find((c) => !used.has(c) && c.table === r.many && c.references === r.one);
    if (!fk) {
      drift(`relationship ${r.drawn} (line ${r.line}) has no foreign key ${r.many} → ${r.one}`);
      continue;
    }
    used.add(fk);
    const nullable = fk.columns.filter((col) => db.columns.find((c) => c.table === fk.table && c.column === col)?.nullable);
    const cols = fk.columns.map((c) => `${fk.table}.${c}`).join(", ");
    if (r.optional && !nullable.length) drift(`${r.drawn} (line ${r.line}) says zero or one, but ${cols} is NOT NULL`);
    if (!r.optional && nullable.length) drift(`${r.drawn} (line ${r.line}) says exactly one, but ${nullable.map((c) => `${fk.table}.${c}`).join(", ")} is nullable`);
    // RE3: zero-or-one exactly where the FK columns are the child's primary key or a UNIQUE constraint.
    const sameCols = (c: DbConstraint) => c.columns.length === fk.columns.length && fk.columns.every((col) => c.columns.includes(col));
    const keyed = db.constraints.some((c) => c.table === fk.table && (c.type === "PRIMARY KEY" || c.type === "UNIQUE") && sameCols(c));
    if (r.unique && !keyed) drift(`${r.drawn} (line ${r.line}) says zero or one ${r.many} per ${r.one}, but ${cols} isn't its primary key or unique`);
    if (!r.unique && keyed) drift(`${r.drawn} (line ${r.line}) says many, but ${cols} is its primary key or unique: draw it ||--o|`);
  }
  for (const fk of fks)
    if (!used.has(fk) && drawnTables.has(fk.table)) drift(`foreign key ${fk.table} (${fk.columns.join(", ")}) → ${fk.references} has no relationship`);
  return out;
}

/**
 * RQE5: each ERD file has exactly one ```mermaid block in the plan, the one whose first line is the file's first line,
 * and it equals the file; any other mermaid block fails. (002 and 003 keep such copies as their records.)
 */
export function embedDrift(planText: string, mmds: readonly { name: string; text: string }[]): string[] {
  const lines = planText.split("\n");
  const blocks: { line: number; body: string[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== "```mermaid") continue;
    const close = lines.findIndex((l, j) => j > i && l === "```");
    if (close < 0) return [`ERD: the plan's mermaid block (line ${i + 1}) is never closed`];
    blocks.push({ line: i + 1, body: lines.slice(i + 1, close) });
    i = close;
  }
  const out: string[] = [];
  const claimed = new Set<number>();
  for (const { name, text } of mmds) {
    const want = text.split("\n");
    const mine = blocks.filter((b) => b.body[0] === want[0]);
    for (const b of mine) claimed.add(b.line);
    if (mine.length !== 1) {
      out.push(`ERD: the plan has ${mine.length} mermaid blocks for ${name} (first line ${JSON.stringify(want[0])}); want exactly one`);
      continue;
    }
    const [b] = mine;
    const got = [...b!.body, ""];
    const at = want.findIndex((l, i) => l !== got[i]);
    if (at < 0 && got.length === want.length) continue;
    out.push(`ERD: the plan's mermaid block (line ${b!.line}) differs from ${name} at line ${(at < 0 ? Math.min(got.length, want.length) : at) + 1}`);
  }
  for (const b of blocks) if (!claimed.has(b.line)) out.push(`ERD: the plan's mermaid block (line ${b.line}) is none of ${mmds.map((m) => m.name).join(", ")}`);
  return out;
}

const EXTENDS = /^%% extends: (\S+)$/;

/** The base ERD a grown ERD names on its `%% extends: <file>` line (relative to it); undefined when it names none. */
export function baseOf(text: string): string | undefined {
  const found = text.split("\n").map((l) => EXTENDS.exec(l.trim())?.[1]).filter((x) => x !== undefined);
  if (found.length > 1) throw new Error(`"%% extends:" appears ${found.length} times; name the base ERD once, not twice`);
  return found[0];
}

const keyList = (keys: Set<Key>) => [...keys].sort().join(", ") || "(none)";

/** RE1, RE2, EG1: every entity and line of the base appears in the grown ERD unchanged, as `ERD: …` lines. */
export function baseDrift(base: Erd, grown: Erd, baseName: string): string[] {
  const out: string[] = [];
  for (const b of base.entities) {
    const g = grown.entities.find((e) => e.name === b.name);
    if (!g) {
      out.push(`ERD: ${b.name} (from ${baseName}) is missing`);
      continue;
    }
    const changed = (what: string) => out.push(`ERD: ${b.name} differs from ${baseName}: ${what}`);
    for (const a of g.attributes) if (!b.attributes.some((x) => x.name === a.name)) changed(`${a.name} added`);
    for (const a of b.attributes) {
      const x = g.attributes.find((y) => y.name === a.name);
      if (!x) changed(`${a.name} dropped`);
      else {
        if (x.type !== a.type) changed(`${a.name} is ${x.type}, was ${a.type}`);
        if (keyList(x.keys) !== keyList(a.keys)) changed(`${a.name} keys ${keyList(x.keys)}, were ${keyList(a.keys)}`);
        if (x.comment !== a.comment) changed(`${a.name}'s comment changed`);
      }
    }
  }
  for (const r of base.relationships)
    if (!grown.relationships.some((x) => x.drawn === r.drawn && x.label === r.label))
      out.push(`ERD: relationship ${r.drawn} : "${r.label}" (${baseName} line ${r.line}) is missing or changed`);
  // EG1: a line between two of the base's entities is the base's to draw; the grown ERD adds lines to new entities only.
  const own = new Set(base.entities.map((e) => e.name));
  for (const r of grown.relationships)
    if (own.has(r.one) && own.has(r.many) && !base.relationships.some((x) => x.drawn === r.drawn && x.label === r.label))
      out.push(`ERD: relationship ${r.drawn} (line ${r.line}) is a new line between ${baseName}'s entities`);
  return out;
}

/** The lists beside a diagram: tables lessons make (not drawn) and tables not built yet (drawn). */
export interface ErdMarkers {
  labMade: string[];
  planned: string[];
}

const MARKER = /^%% (lab-made|planned): (.*)$/;
const TABLE_NAME = new RegExp(`^${NAME}$`);

/** `%% lab-made: a, b` and `%% planned: c, d`, each at most once; anything but comma-separated table names fails. */
export function markers(text: string): ErdMarkers {
  const found: Record<"lab-made" | "planned", string[][]> = { "lab-made": [], planned: [] };
  for (const raw of text.split("\n")) {
    const m = MARKER.exec(raw.trim());
    if (!m) continue;
    const names = m[2]!.split(",").map((n) => n.trim());
    if (!names.every((n) => TABLE_NAME.test(n))) throw new Error(`%% ${m[1]}: takes table names separated by commas: ${raw.trim()}`);
    found[m[1] as "lab-made" | "planned"].push(names);
  }
  for (const [k, v] of Object.entries(found)) if (v.length > 1) throw new Error(`%% ${k}: appears ${v.length} times; list the tables once`);
  return { labMade: found["lab-made"][0] ?? [], planned: found.planned[0] ?? [] };
}

/** The markers against the diagram alone (no catalog): a lab-made table is not drawn, a planned one is. */
export function markerErrors(erd: Erd, { labMade, planned }: ErdMarkers): string[] {
  const drawn = new Set(erd.entities.map((e) => e.name));
  return [
    ...labMade.filter((t) => drawn.has(t)).map((t) => `ERD: ${t} is marked %% lab-made: but drawn in the diagram`),
    ...planned.filter((t) => !drawn.has(t)).map((t) => `ERD: ${t} is marked %% planned: but not drawn`),
  ];
}

/**
 * EG2–EG4: an ERD with markers (the lab, the star) against its catalog, both ways. `%% lab-made:` tables may be in the
 * catalog (a boot block's grid); `%% planned:` entities (and their lines) are excused while absent and fail once present,
 * so the marker can't go stale.
 */
export function markerDrift(erd: Erd, db: DbMeta, m: ErdMarkers): string[] {
  const out = markerErrors(erd, m);
  for (const t of m.planned)
    if (db.tables.includes(t)) out.push(`ERD: ${t} is marked %% planned: but is a table in the database; draw it and drop the marker`);
  const later = new Set(m.planned);
  const made = new Set(m.labMade);
  const shown: Erd = {
    entities: erd.entities.filter((e) => !later.has(e.name)),
    relationships: erd.relationships.filter((r) => !later.has(r.one) && !later.has(r.many)),
  };
  const catalog: DbMeta = {
    tables: db.tables.filter((t) => !made.has(t) && !later.has(t)),
    views: db.views,
    columns: db.columns.filter((c) => !made.has(c.table)),
    constraints: db.constraints.filter((c) => !made.has(c.table)),
  };
  return [...out, ...erdDrift(shown, catalog)];
}

/** What starMeta reads of the star manifest (S9's star.ts writes it; its full type adds rows, bytes, sha256, sources). */
export interface StarTables {
  files: Record<string, {
    table: string;
    columns: { name: string; type: string }[];
    primaryKey: string[];
    foreignKeys: { columns: string[]; references: { file: string } }[];
  }>;
}

/**
 * EG3: the star manifest as a catalog. The manifest has no nullability; key columns count as NOT NULL, because the
 * star fails a NULL key (unknowns map to members), so every star line is `||--o{`.
 */
export function starMeta(manifest: StarTables): DbMeta {
  const files = Object.values(manifest.files);
  const tableOf = (file: string) => {
    const t = manifest.files[file]?.table;
    if (!t) throw new Error(`the star manifest has a foreign key to ${file}, which it doesn't list`);
    return t;
  };
  return {
    tables: files.map((f) => f.table),
    views: [],
    columns: files.flatMap((f) =>
      f.columns.map((c) => ({ table: f.table, column: c.name, type: c.type, nullable: !f.primaryKey.includes(c.name) && !f.foreignKeys.some((k) => k.columns.includes(c.name)) })),
    ),
    constraints: files.flatMap((f): DbConstraint[] => [
      ...(f.primaryKey.length ? [{ table: f.table, type: "PRIMARY KEY" as const, columns: f.primaryKey }] : []),
      ...f.foreignKeys.map((k) => ({ table: f.table, type: "FOREIGN KEY" as const, columns: k.columns, references: tableOf(k.references.file) })),
    ]),
  };
}
