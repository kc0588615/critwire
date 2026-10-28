// The ERD model (erd-model.ts; plan D10, S7), the spike's failure cases ported first:
// - RQE1–RQE5: parse, drift against a catalog both ways (tables, attributes, keys, lines), an embedded copy;
// - RE1–RE4: a grown ERD keeps its base's entities and lines; `||--o|` only on a unique FK; the subset stays strict;
// - EG1–EG4: schema.mmd extends v1.mmd; the lab and star against their catalogs, `%% lab-made:` and `%% planned:`
//   excused one way, a planned entity that exists failing (the marker is stale). EG3 runs on a fixture star manifest.
// Plus accTitle/accDescr, and the records 002 and 003 keep of v1.mmd and 003's ERD (RE5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  baseDrift, baseOf, dbMeta, embedDrift, erdDrift, markerDrift, markerErrors, markers, parseErd, PG_META_SQL, starMeta,
  type DbMeta, type StarTables,
} from "./erd-model.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const V1 = read("site/learn/erd/v1.mmd");
const SCHEMA = read("site/learn/erd/schema.mmd");
const LAB = read("site/learn/erd/lab.mmd");
const STAR = read("site/learn/erd/star.mmd");
const MANIFEST: StarTables = JSON.parse(read("scripts/fixtures/star-manifest.json"));

/** `text` with each [from, to] replaced once; a missing `from` is a test bug. */
function edit(text: string, ...pairs: [string, string][]): string {
  for (const [from, to] of pairs) {
    assert.ok(text.includes(from), `lacks ${JSON.stringify(from)}`);
    text = text.replace(from, to);
  }
  return text;
}

function assertHas(got: string[], ...want: (string | RegExp)[]): void {
  for (const w of want)
    assert.ok(got.some((g) => (typeof w === "string" ? g.includes(w) : w.test(g))), `no message with ${w}; got:\n${got.join("\n")}`);
}

// --- RQE1–RQE5 on a small hand-made schema.

// genera (name PK, parent_name FK → genera, nullable); animals (id PK, slug UK, genus FK NOT NULL);
// places (code PK); animal_places (animal_id PK FK, place_code PK FK); view animal_view.
const META: DbMeta = {
  tables: ["animal_places", "animals", "genera", "places"],
  views: ["animal_view"],
  columns: [
    { table: "genera", column: "name", type: "VARCHAR", nullable: false },
    { table: "genera", column: "parent_name", type: "VARCHAR", nullable: true },
    { table: "animals", column: "id", type: "INTEGER", nullable: false },
    { table: "animals", column: "slug", type: "VARCHAR", nullable: false },
    { table: "animals", column: "genus", type: "VARCHAR", nullable: false },
    { table: "animals", column: "born", type: "DATE", nullable: true },
    { table: "places", column: "code", type: "VARCHAR", nullable: false },
    { table: "animal_places", column: "animal_id", type: "INTEGER", nullable: false },
    { table: "animal_places", column: "place_code", type: "VARCHAR", nullable: false },
  ],
  constraints: [
    { table: "genera", type: "PRIMARY KEY", columns: ["name"] },
    { table: "genera", type: "FOREIGN KEY", columns: ["parent_name"], references: "genera" },
    { table: "animals", type: "PRIMARY KEY", columns: ["id"] },
    { table: "animals", type: "UNIQUE", columns: ["slug"] },
    { table: "animals", type: "FOREIGN KEY", columns: ["genus"], references: "genera" },
    { table: "places", type: "PRIMARY KEY", columns: ["code"] },
    { table: "animal_places", type: "PRIMARY KEY", columns: ["animal_id", "place_code"] },
    { table: "animal_places", type: "FOREIGN KEY", columns: ["animal_id"], references: "animals" },
    { table: "animal_places", type: "FOREIGN KEY", columns: ["place_code"], references: "places" },
  ],
};

const BASE = `%% a comment
erDiagram
    genera {
        VARCHAR name PK "Panthera"
        VARCHAR parent_name FK
    }
    animals {
        INTEGER id PK "our id"
        VARCHAR slug UK
        VARCHAR genus FK "a genus"
        DATE born
    }
    places {
        VARCHAR code PK
    }
    animal_places {
        INTEGER animal_id PK, FK
        VARCHAR place_code PK, FK "where"
    }

    genera |o--o{ genera : "parent of"
    genera ||--o{ animals : "genus of"
    animals ||--o{ animal_places : "seen in"
    places ||--o{ animal_places : "has"
`;
const base = (...pairs: [string, string][]) => edit(BASE, ...pairs);
const drift = (mmd: string) => erdDrift(parseErd(mmd), META);
const assertDrift = (mmd: string, ...want: string[]) => assertHas(drift(mmd), ...want);

test("the matching ERD has no drift; type synonyms (INT, TEXT) and key order (FK, PK) normalize", () => {
  assert.deepEqual(drift(BASE), []);
  assert.deepEqual(drift(base(["INTEGER id PK", "INT id PK"], ["VARCHAR slug UK", "TEXT slug UK"], ["INTEGER animal_id PK, FK", "integer animal_id FK,PK"])), []);
});

test("parseErd reads entities, attributes (as written and upper-cased), keys, comments and relationships", () => {
  const erd = parseErd(BASE);
  assert.deepEqual(erd.entities.map((e) => e.name), ["genera", "animals", "places", "animal_places"]);
  const ap = erd.entities[3]!.attributes;
  assert.deepEqual(ap.map((a) => [a.type, a.name, [...a.keys].sort(), a.comment]), [
    ["INTEGER", "animal_id", ["FK", "PK"], ""],
    ["VARCHAR", "place_code", ["FK", "PK"], "where"],
  ]);
  assert.equal(parseErd(base(["INTEGER id PK", "int id PK"])).entities[1]!.attributes[0]!.written, "int");
  assert.deepEqual(erd.relationships[1], { one: "genera", many: "animals", optional: false, drawn: "genera ||--o{ animals", label: "genus of", line: 22 });
});

test("parseErd fails on syntax it doesn't know, naming the line", () => {
  assert.throws(() => parseErd(BASE.replace("erDiagram", "flowchart")), /line 2: .*erDiagram/);
  assert.throws(() => parseErd(base(["DATE born", "DATE born XK"])), /line 11: /);
  assert.throws(() => parseErd(base(['"seen in"', '"seen in" extra'])), /line 23: /);
  assert.throws(() => parseErd("erDiagram\n    a {\n        INTEGER id PK\n"), /line 2: "a \{" is never closed/);
  assert.throws(() => parseErd(base(["DATE born", "DATE born\n        DATE born"])), /animals\.born twice/);
  assert.throws(() => parseErd(base(["    places {", "    genera {\n        VARCHAR x\n    }\n    places {"])), /genera is defined twice/);
});

test("parseErd reads accTitle and accDescr once each, outside the entities; the block form and a repeat fail", () => {
  const erd = parseErd(base(["erDiagram\n", "erDiagram\n    accTitle: Animals and places\n    accDescr: Four tables.\n"]));
  assert.deepEqual([erd.title, erd.description], ["Animals and places", "Four tables."]);
  assert.deepEqual([parseErd(BASE).title, parseErd(BASE).description], [undefined, undefined]);
  assert.throws(() => parseErd(base(["erDiagram\n", "erDiagram\n    accTitle: a\n    accTitle: b\n"])), /line 4: accTitle twice/);
  assert.throws(() => parseErd(base(["erDiagram\n", "erDiagram\n    accDescr {\n"])), /line 3: /);
  assert.throws(() => parseErd(base(["erDiagram\n", "erDiagram\n    accTitle:\n"])), /line 3: /);
  assert.throws(() => parseErd(base(["        DATE born\n", "        DATE born\n        accTitle: x\n"])), /line 12: not an attribute/);
});

test("RQE1 a database table missing from the ERD fails", () => {
  assertDrift(base(["    places {\n        VARCHAR code PK\n    }\n", ""], ['    places ||--o{ animal_places : "has"\n', ""]), 'table "places" is in the database but not in the ERD');
});

test("RQE1 an ERD table missing from the database fails", () => {
  assertDrift(base(["    places {", "    traits {\n        VARCHAR name PK\n    }\n    places {"]), '"traits" is in the ERD but not a table in the database');
});

test("RQE1 the view drawn as a table fails", () => {
  assertDrift(base(["    places {", "    animal_view {\n        INTEGER id\n    }\n    places {"]), '"animal_view" is a view; the ERD shows tables only');
});

test("RQE1 an entity only named in a relationship counts as an ERD table", () => {
  assertDrift(base(['    places ||--o{ animal_places : "has"', '    places ||--o{ animal_places : "has"\n    habitats ||--o{ animals : "home of"']), '"habitats" is in the ERD but not a table in the database');
});

test("RQE2 a missing or extra attribute fails", () => {
  assertDrift(base(["        DATE born\n", ""]), "animals.born is in the database (DATE) but not in the ERD");
  assertDrift(base(["        DATE born\n", "        DATE born\n        VARCHAR nickname\n"]), "animals.nickname is in the ERD but not in the database");
});

test("RQE2 a type that differs after normalizing fails", () => {
  assertDrift(base(["INTEGER id PK", "BIGINT id PK"]), "animals.id is BIGINT in the ERD but INTEGER in the database");
  assertDrift(base(["DATE born", "VARCHAR born"]), "animals.born is VARCHAR in the ERD but DATE in the database");
});

test("RQE3 a PK, FK or UK marker that disagrees with the constraints fails, both ways", () => {
  assertDrift(base(["VARCHAR code PK", "VARCHAR code"]), "places.code is in the primary key but not marked PK");
  assertDrift(base(["VARCHAR slug UK", "VARCHAR slug PK, UK"]), "animals.slug is marked PK but isn't in the primary key");
  assertDrift(base(["VARCHAR genus FK", "VARCHAR genus"]), "animals.genus is in a foreign key but not marked FK");
  assertDrift(base(["DATE born", "DATE born FK"]), "animals.born is marked FK but isn't in a foreign key");
  assertDrift(base(["VARCHAR slug UK", "VARCHAR slug"]), "animals.slug is unique but not marked UK");
  assertDrift(base(["DATE born", "DATE born UK"]), "animals.born is marked UK but isn't unique");
});

test("RQE4 a relationship with no matching FK fails, and an FK with no relationship", () => {
  assertDrift(base(['"seen in"', '"seen in"\n    places ||--o{ animals : "home of"']), "relationship places ||--o{ animals (line 24) has no foreign key animals → places");
  assertDrift(base(['    places ||--o{ animal_places : "has"\n', ""]), "foreign key animal_places (place_code) → places has no relationship");
});

test("RQE4 the relationship drawn the wrong way round fails", () => {
  assert.deepEqual(drift(base(['animals ||--o{ animal_places : "seen in"', 'animal_places }o--|| animals : "seen in"'])), []);
  assertDrift(base(['animals ||--o{ animal_places : "seen in"', 'animal_places ||--o{ animals : "seen in"']), "has no foreign key animals → animal_places");
});

test("RQE4 the one side's optionality must match the FK's nullability", () => {
  assertDrift(base(["genera |o--o{ genera", "genera ||--o{ genera"]), "genera ||--o{ genera (line 21) says exactly one, but genera.parent_name is nullable");
  assertDrift(base(["genera ||--o{ animals", "genera |o--o{ animals"]), "genera |o--o{ animals (line 22) says zero or one, but animals.genus is NOT NULL");
});

test("RQE4 many-to-many and one-to-one lines fail: drawn through a junction table or not at all", () => {
  assert.throws(() => parseErd(base(['"seen in"', '"seen in"\n    animals }o--o{ places : "seen in"'])), /line 24: animals }o--o\{ places is many-to-many/);
  assert.throws(() => parseErd(base(['"seen in"', '"seen in"\n    animals ||--|| places : "twin"'])), /line 24: animals \|\|--\|\| places is one-to-one/);
});

const PLAN = (blocks: string) => `# 002\n\n## 3. ERD\n\n${blocks}\n\nText.\n`;
const fence = (body: string) => "```mermaid\n" + body + "```";

test("RQE5 a plan's mermaid block must equal the .mmd, matched by its first line", () => {
  const one = [{ name: "erd.mmd", text: BASE }];
  assert.deepEqual(embedDrift(PLAN(fence(BASE)), one), []);
  const changed = embedDrift(PLAN(fence(BASE.replace("DATE born", "DATE born_on"))), one);
  assert.equal(changed.length, 1);
  assert.match(changed[0]!, /the plan's mermaid block \(line 5\) differs from erd\.mmd at line 11/);
  assert.match(embedDrift(PLAN("no diagram"), one)[0]!, /0 mermaid blocks for erd\.mmd .*; want exactly one/);
  assert.match(embedDrift(PLAN(fence(BASE) + "\n\n" + fence(BASE)), one)[0]!, /2 mermaid blocks for erd\.mmd .*; want exactly one/);
  assert.match(embedDrift(PLAN(fence(BASE.trimEnd() + "\n    %% extra\n")), one)[0]!, /differs from erd\.mmd at line 25/);
  assert.match(embedDrift(PLAN(fence(BASE) + "\n\n" + fence(V1)), one)[0]!, /is none of erd\.mmd/);
});

test("RE5 the records: 002 §3's block is v1.mmd; 003's block is 003-learn-erd.mmd, which extends v1.mmd unchanged", () => {
  assert.deepEqual(embedDrift(read("plans/002-learn.md"), [{ name: "v1.mmd", text: V1 }]), []);
  const erd003 = read("plans/003-learn-erd.mmd");
  assert.deepEqual(embedDrift(read("plans/003-learn-data-spatial.md"), [{ name: "003-learn-erd.mmd", text: erd003 }]), []);
  assert.equal(baseOf(erd003), "../site/learn/erd/v1.mmd");
  assert.deepEqual(baseDrift(parseErd(V1), parseErd(erd003), "v1.mmd"), []);
});

// --- RE1–RE4: a grown ERD against its base (v1.mmd).

const GROWN = V1.replace("erDiagram\n", "%% extends: v1.mmd\nerDiagram\n").trimEnd() +
  '\n    species_names {\n        INTEGER species_id PK, FK\n        VARCHAR language PK\n        VARCHAR name\n    }\n    species ||--o{ species_names : "named in"\n';
const againstV1 = (text: string) => baseDrift(parseErd(V1), parseErd(text), "v1.mmd");

test("baseOf reads the %% extends: line; v1 names none; twice fails", () => {
  assert.equal(baseOf(GROWN), "v1.mmd");
  assert.equal(baseOf(V1), undefined);
  assert.throws(() => baseOf(GROWN.replace("erDiagram\n", "%% extends: other.mmd\nerDiagram\n")), /extends.*twice/);
});

test("a grown ERD with v1's entities and lines unchanged has no base drift; comments and order don't count", () => {
  assert.deepEqual(againstV1(GROWN), []);
  assert.deepEqual(againstV1(GROWN.replace(/^%% critwire.*\n/m, "%% the grown schema\n")), []);
});

test("RE1 a v1 entity missing, or with an attribute added, dropped, retyped, re-marked or re-commented, fails", () => {
  assertHas(againstV1(edit(GROWN, [GROWN.slice(GROWN.indexOf("    sources {"), GROWN.indexOf("    species_sources {")), ""])), "ERD: sources (from v1.mmd) is missing");
  assertHas(againstV1(edit(GROWN, ['VARCHAR subregion "South America"', 'VARCHAR subregion "South America"\n        VARCHAR flag'])), "countries differs from v1.mmd: flag added");
  assertHas(againstV1(edit(GROWN, [/^ *VARCHAR photo_page .*\n/m.exec(GROWN)![0], ""])), "species differs from v1.mmd: photo_page dropped");
  assertHas(againstV1(edit(GROWN, ["BIGINT gbif_id UK", "INTEGER gbif_id UK"])), "species differs from v1.mmd: gbif_id is INTEGER, was BIGINT");
  assertHas(againstV1(edit(GROWN, ["VARCHAR col_id UK", "VARCHAR col_id"])), "species differs from v1.mmd: col_id keys (none), were UK");
  assertHas(againstV1(edit(GROWN, ['"Red-eyed Tree Frog"', '"Red-eyed tree frog"'])), "species differs from v1.mmd: common_name's comment changed");
});

test("RE2 a v1 relationship line missing or changed fails", () => {
  assertHas(againstV1(edit(GROWN, ['    species ||--o{ species_sources : "fields from"\n', ""])), /ERD: relationship species \|\|--o\{ species_sources : "fields from" \(v1\.mmd line \d+\) is missing or changed/);
  assertHas(againstV1(edit(GROWN, ['sources ||--|{ species_sources : "supplies"', 'sources ||--o{ species_sources : "supplies"'])), 'relationship sources ||--|{ species_sources : "supplies"');
  assertHas(againstV1(edit(GROWN, ['taxa |o--o{ taxa : "parent of"', 'taxa |o--o{ taxa : "parent"'])), 'relationship taxa |o--o{ taxa : "parent of"');
});

// places (code PK); animals (id PK, slug UK); profiles (animal_id PK, FK → animals); passports (id PK,
// animal_id UK FK → animals); visits (id PK, animal_id FK → animals, place_code FK → places, nullable).
const ONE_META: DbMeta = {
  tables: ["animals", "passports", "places", "profiles", "visits"],
  views: [],
  columns: [
    { table: "places", column: "code", type: "VARCHAR", nullable: false },
    { table: "animals", column: "id", type: "INTEGER", nullable: false },
    { table: "animals", column: "slug", type: "VARCHAR", nullable: false },
    { table: "profiles", column: "animal_id", type: "INTEGER", nullable: false },
    { table: "profiles", column: "area", type: "DECIMAL(12,2)", nullable: false },
    { table: "passports", column: "id", type: "INTEGER", nullable: false },
    { table: "passports", column: "animal_id", type: "INTEGER", nullable: false },
    { table: "visits", column: "id", type: "INTEGER", nullable: false },
    { table: "visits", column: "animal_id", type: "INTEGER", nullable: false },
    { table: "visits", column: "place_code", type: "VARCHAR", nullable: true },
  ],
  constraints: [
    { table: "places", type: "PRIMARY KEY", columns: ["code"] },
    { table: "animals", type: "PRIMARY KEY", columns: ["id"] },
    { table: "animals", type: "UNIQUE", columns: ["slug"] },
    { table: "profiles", type: "PRIMARY KEY", columns: ["animal_id"] },
    { table: "profiles", type: "FOREIGN KEY", columns: ["animal_id"], references: "animals" },
    { table: "passports", type: "PRIMARY KEY", columns: ["id"] },
    { table: "passports", type: "UNIQUE", columns: ["animal_id"] },
    { table: "passports", type: "FOREIGN KEY", columns: ["animal_id"], references: "animals" },
    { table: "visits", type: "PRIMARY KEY", columns: ["id"] },
    { table: "visits", type: "FOREIGN KEY", columns: ["animal_id"], references: "animals" },
    { table: "visits", type: "FOREIGN KEY", columns: ["place_code"], references: "places" },
  ],
};

const ONE = `erDiagram
    places {
        VARCHAR code PK
    }
    animals {
        INTEGER id PK
        VARCHAR slug UK
    }
    profiles {
        INTEGER animal_id PK, FK
        DECIMAL area "km2, estimated"
    }
    passports {
        INTEGER id PK
        INTEGER animal_id UK, FK
    }
    visits {
        INTEGER id PK
        INTEGER animal_id FK
        VARCHAR place_code FK
    }

    animals ||--o| profiles : "profile of"
    animals ||--o| passports : "passport of"
    animals ||--o{ visits : "visits"
    places |o--o{ visits : "visited"
`;
const oneDrift = (text: string) => erdDrift(parseErd(text), ONE_META);

test("RE3 ||--o| passes where the child's FK is its PK or UNIQUE, either way round; DECIMAL(p,s) is DECIMAL", () => {
  assert.deepEqual(oneDrift(ONE), []);
  assert.deepEqual(oneDrift(edit(ONE, ['animals ||--o| profiles : "profile of"', 'profiles |o--|| animals : "profile of"'])), []);
  const r = parseErd(ONE).relationships[0]!;
  assert.deepEqual([r.one, r.many, r.optional, r.unique], ["animals", "profiles", false, true]);
  assert.equal(parseErd(ONE).relationships[2]!.unique, undefined);
});

test("RE3 ||--o| on an FK that isn't the child's PK or UNIQUE fails; a many line on one that is fails", () => {
  assertHas(oneDrift(edit(ONE, ['animals ||--o{ visits : "visits"', 'animals ||--o| visits : "visits"'])), /animals \|\|--o\| visits \(line \d+\) says zero or one visits per animals, but visits\.animal_id isn't its primary key or unique/);
  assertHas(oneDrift(edit(ONE, ['animals ||--o| profiles : "profile of"', 'animals ||--o{ profiles : "profile of"'])), /profiles\.animal_id is its primary key or unique: draw it \|\|--o\|/);
  assertHas(oneDrift(edit(ONE, ['animals ||--o| passports : "passport of"', 'animals ||--o{ passports : "passport of"'])), /passports\.animal_id is its primary key or unique/);
});

test("RE4 lines outside the subset still fail: many-to-many, one-to-one both ways, zero-or-one both ways", () => {
  assert.throws(() => parseErd(ONE + '    animals }o--o{ places : "seen in"\n'), /line 27: animals }o--o\{ places is many-to-many/);
  assert.throws(() => parseErd(ONE + '    animals ||--|| places : "twin"\n'), /line 27: animals \|\|--\|\| places is one-to-one/);
  assert.throws(() => parseErd(ONE + '    animals |o--o| places : "maybe"\n'), /line 27: animals \|o--o\| places is one-to-one/);
});

// --- EG1: schema.mmd keeps v1.

const schemaBase = (text: string) => baseDrift(parseErd(V1), parseErd(text), "v1.mmd");

test("EG1 schema.mmd extends v1.mmd and changes none of its entities or lines", () => {
  assert.equal(baseOf(SCHEMA), "v1.mmd");
  assert.deepEqual(schemaBase(SCHEMA), []);
  assert.deepEqual(parseErd(SCHEMA).entities.map((e) => e.name).slice(-2), ["datasets", "occurrences"]);
});

test("EG1 a change to one of v1's entities fails: comment, type, key, added or dropped attribute, dropped entity", () => {
  assertHas(schemaBase(edit(SCHEMA, ['"Red-eyed Tree Frog"', '"Red-eyed treefrog"'])), "species differs from v1.mmd: common_name's comment changed");
  assertHas(schemaBase(edit(SCHEMA, ["INTEGER ncbi_id UK", "BIGINT ncbi_id UK"])), "ncbi_id is BIGINT, was INTEGER");
  assertHas(schemaBase(edit(SCHEMA, ["VARCHAR name UK", "VARCHAR name"])), "countries differs from v1.mmd: name keys (none), were UK");
  assertHas(schemaBase(edit(SCHEMA, ["    taxa {\n", "    taxa {\n        INTEGER depth\n"])), "taxa differs from v1.mmd: depth added");
  assertHas(schemaBase(edit(SCHEMA, [/^ *DATE retrieved .*\n/m.exec(SCHEMA)![0], ""])), "sources differs from v1.mmd: retrieved dropped");
  assertHas(schemaBase(edit(SCHEMA, [/    sources \{[^}]*\}\n/.exec(SCHEMA)![0], ""])), "sources (from v1.mmd) is missing");
});

test("EG1 a change to one of v1's lines fails, and so does a new line between two of v1's entities", () => {
  assertHas(schemaBase(edit(SCHEMA, ['"has records of"', '"holds records of"'])), 'relationship countries ||--o{ species_countries : "has records of"');
  assertHas(schemaBase(edit(SCHEMA, ["sources ||--|{ species_sources", "sources ||--o{ species_sources"])), 'relationship sources ||--|{ species_sources : "supplies"');
  assertHas(schemaBase(SCHEMA + '    countries |o--o{ species : "home of"\n'), "is a new line between v1.mmd's entities");
  // A new line from a new entity to one of v1's is how v2 grows: not drift.
  assert.deepEqual(schemaBase(SCHEMA.replace('    countries |o--o{ occurrences : "contains"\n', "")), []);
});

// --- EG2, EG4: an ERD with markers against its catalog.

// a (id PK), b (id PK, a_id FK → a NOT NULL), made (lab-made), view v.
const MINI: DbMeta = {
  tables: ["a", "b", "made"],
  views: ["v"],
  columns: [
    { table: "a", column: "id", type: "integer", nullable: false },
    { table: "a", column: "geom", type: "geometry", nullable: false },
    { table: "b", column: "id", type: "bigint", nullable: false },
    { table: "b", column: "a_id", type: "integer", nullable: false },
    { table: "b", column: "x", type: "double precision", nullable: true },
    { table: "made", column: "n", type: "integer", nullable: true },
  ],
  constraints: [
    { table: "a", type: "PRIMARY KEY", columns: ["id"] },
    { table: "b", type: "PRIMARY KEY", columns: ["id"] },
    { table: "b", type: "FOREIGN KEY", columns: ["a_id"], references: "a" },
  ],
};
const MINI_ERD = `%% the mini lab
%% lab-made: made
%% planned: p
erDiagram
    a {
        integer id PK
        geometry geom "Point"
    }
    b {
        bigint id PK
        integer a_id FK
        float8 x
    }
    p {
        integer b_id PK, FK
        raster rast
    }

    a ||--o{ b : "has"
    b ||--o| p : "planned line"
`;
const marked = (mmd: string, db: DbMeta = MINI) => markerDrift(parseErd(mmd), db, markers(mmd));

test("EG2 markers reads %% lab-made: and %% planned: lists, once each", () => {
  assert.deepEqual(markers(MINI_ERD), { labMade: ["made"], planned: ["p"] });
  assert.deepEqual(markers(LAB).planned, ["occurrence_habitats", "habitat_clips"]);
  assert.ok(markers(LAB).labMade.includes("s4_cells"));
  assert.deepEqual(markers(STAR), { labMade: [], planned: ["dim_habitat_class", "fact_country_habitat"] });
  assert.deepEqual(markers(SCHEMA), { labMade: [], planned: [] });
  assert.throws(() => markers(MINI_ERD + "%% planned: q\n"), /%% planned: appears 2 times/);
  assert.throws(() => markers("%% lab-made: a,,b\nerDiagram\n"), /lab-made/);
});

test("EG2 the matching ERD has no drift: lab-made tables, views and planned entities are excused; float8 = double precision", () => {
  assert.deepEqual(marked(MINI_ERD), []);
});

test("EG2 an entity, column, PK or FK in the .mmd that isn't in the catalog fails, and the reverse too", () => {
  assertHas(marked(edit(MINI_ERD, ["    p {", "    c {\n        integer id PK\n    }\n    p {"])), '"c" is in the ERD but not a table in the database');
  assertHas(marked(edit(MINI_ERD, ["%% lab-made: made", "%% lab-made: other"])), 'table "made" is in the database but not in the ERD');
  assertHas(marked(edit(MINI_ERD, ["        float8 x\n", ""])), "b.x is in the database (double precision) but not in the ERD");
  assertHas(marked(edit(MINI_ERD, ["        float8 x\n", "        float8 x\n        text y\n"])), "b.y is in the ERD but not in the database");
  assertHas(marked(edit(MINI_ERD, ["bigint id PK", "bigint id"])), "b.id is in the primary key but not marked PK");
  assertHas(marked(edit(MINI_ERD, ["integer a_id FK", "integer a_id"])), "b.a_id is in a foreign key but not marked FK");
  assertHas(marked(edit(MINI_ERD, ['    a ||--o{ b : "has"\n', ""])), "foreign key b (a_id) → a has no relationship");
  assertHas(marked(edit(MINI_ERD, ["float8 x", "integer x"])), "b.x is INTEGER in the ERD but DOUBLE in the database");
});

test("EG2 a lab-made table drawn fails; a planned entity not drawn fails; markerErrors needs no catalog", () => {
  const drawnMade = edit(MINI_ERD, ["    p {", "    made {\n        integer n\n    }\n    p {"]);
  assertHas(marked(drawnMade), "made is marked %% lab-made: but drawn in the diagram");
  assertHas(markerErrors(parseErd(drawnMade), markers(drawnMade)), "made is marked %% lab-made: but drawn in the diagram");
  const undrawn = edit(MINI_ERD, ["%% planned: p", "%% planned: p, q"]);
  assertHas(marked(undrawn), "q is marked %% planned: but not drawn");
  assertHas(markerErrors(parseErd(undrawn), markers(undrawn)), "q is marked %% planned: but not drawn");
  assert.deepEqual(markerErrors(parseErd(MINI_ERD), markers(MINI_ERD)), []);
});

test("EG4 a %% planned: entity that is in the catalog fails: the marker is stale", () => {
  assertHas(marked(MINI_ERD, { ...MINI, tables: [...MINI.tables, "p"] }), "p is marked %% planned: but is a table in the database; draw it and drop the marker");
});

test("PG_META_SQL has the three catalog queries; dbMeta reads tables, views, columns and constraints from their results", () => {
  assert.equal(PG_META_SQL.length, 3);
  const meta = dbMeta([
    { columns: ["table_name", "table_type"], rows: [["a", "BASE TABLE"], ["v", "VIEW"]] },
    { columns: ["table_name", "column_name", "data_type", "is_nullable"], rows: [["a", "id", "integer", "NO"], ["a", "b_id", "integer", "YES"]] },
    { columns: ["table_name", "constraint_type", "constraint_column_names", "referenced_table"], rows: [["a", "PRIMARY KEY", ["id"], null], ["a", "FOREIGN KEY", ["b_id"], "b"]] },
  ]);
  assert.deepEqual(meta, {
    tables: ["a"],
    views: ["v"],
    columns: [{ table: "a", column: "id", type: "integer", nullable: false }, { table: "a", column: "b_id", type: "integer", nullable: true }],
    constraints: [{ table: "a", type: "PRIMARY KEY", columns: ["id"] }, { table: "a", type: "FOREIGN KEY", columns: ["b_id"], references: "b" }],
  });
});

// --- EG3: the star against a fixture manifest (the six tables L2 publishes), its habitat pair planned.

const star = (mmd: string, m: StarTables = MANIFEST) => markerDrift(parseErd(mmd), starMeta(m), markers(mmd));
const withManifest = (change: (m: StarTables) => void): StarTables => {
  const m: StarTables = structuredClone(MANIFEST);
  change(m);
  return m;
};
const HABITAT_CLASS = { table: "dim_habitat_class", columns: [{ name: "habitat_code", type: "INTEGER" }, { name: "name", type: "VARCHAR" }, { name: "level1_code", type: "INTEGER" }, { name: "level1_name", type: "VARCHAR" }], primaryKey: ["habitat_code"], foreignKeys: [] };

test("EG3 star.mmd matches the fixture manifest: 6 tables, their columns, keys and 6 lines; the 2 planned are excused while absent", () => {
  assert.equal(starMeta(MANIFEST).tables.length, 6);
  assert.deepEqual(star(STAR), []);
  assert.equal(parseErd(STAR).relationships.length, 8);
});

test("EG3 a planned star entity that is in the manifest fails: the marker is stale", () => {
  assertHas(star(STAR, withManifest((m) => (m.files["dim_habitat_class.csv"] = HABITAT_CLASS))), "dim_habitat_class is marked %% planned: but is a table in the database");
});

test("EG3 an entity, key or relationship that differs from the manifest fails, either way", () => {
  assertHas(star(edit(STAR, ['    dim_year ||--o{ fact_records : "when"\n', ""])), "foreign key fact_records (year) → dim_year has no relationship");
  assertHas(star(STAR, withManifest((m) => (m.files["fact_records.csv"]!.foreignKeys = m.files["fact_records.csv"]!.foreignKeys.filter((f) => f.columns[0] !== "year")))), "relationship dim_year ||--o{ fact_records");
  assertHas(star(edit(STAR, ['INTEGER year PK "a year', 'INTEGER year "a year'])), "dim_year.year is in the primary key but not marked PK");
  assertHas(star(STAR, withManifest((m) => (m.files["dim_extra.csv"] = { ...m.files["dim_year.csv"]!, table: "dim_extra" }))), 'table "dim_extra" is in the database but not in the ERD');
  assertHas(star(edit(STAR, ["    fact_records {", "    dim_month {\n        INTEGER month PK\n    }\n    fact_records {"])), '"dim_month" is in the ERD but not a table in the database');
  assertHas(star(STAR, withManifest((m) => m.files["fact_records.csv"]!.columns.push({ name: "count", type: "INTEGER" }))), "fact_records.count is in the database (INTEGER) but not in the ERD");
  // Every fact foreign key is filled (unknown members), so a zero-or-one line is drift.
  assertHas(star(edit(STAR, ["dim_country ||--o{ fact_records", "dim_country |o--o{ fact_records"])), "says zero or one, but fact_records.country_code is NOT NULL");
});

test("starMeta fails on a foreign key to a file the manifest doesn't list", () => {
  assert.throws(() => starMeta(withManifest((m) => delete m.files["dim_year.csv"])), /foreign key to dim_year\.csv, which it doesn't list/);
});

test("the four ERDs have different first lines; the three drawn ones have accTitle and accDescr", () => {
  assert.equal(new Set([V1, SCHEMA, LAB, STAR].map((t) => t.split("\n")[0])).size, 4);
  for (const t of [SCHEMA, LAB, STAR]) {
    const e = parseErd(t);
    assert.ok(e.title && e.description, t.split("\n")[0]);
  }
});
