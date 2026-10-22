# 002: critwire Learn

critwire Learn is a set of pages on critwire.com where people aged 16 and up who are new to SQL learn relational databases and SQL by asking questions about critwire's animals. The SQL runs in the learner's browser (DuckDB-WASM), on tables the page builds from the public `/v1` files, and the answers come back as animal cards. This document is the design that mission B builds from: the engine, the learners' tables, the ERD, the lessons, a query cookbook, the new countries file, one small demo game, the site, the mission B briefs and the owner's choices. Research and measurements: `plans/2026-10-22-critwire-learn-design.md` (mission A1) and its spike.

Every ```` ```sql ```` block in this file was run in DuckDB-WASM by the spike's `run-queries.ts`, and the ```` ```text ```` block after it is the result it gave (row count, a hash of the whole result, the first rows). Each block's `-- status:` says what it ran against: `ran` (today's data) or `draft-table` (needs the countries file mission B publishes; it ran against the spike's draft of it).

## 1. Engine and interface

Written in step S14.

## 2. The learners' schema, first version

### How it's built

When a Learn page loads, it starts DuckDB-WASM on an empty in-memory database and runs one script, `setup.sql` (the `setup` block below), which builds every learners' table from two public files: `/v1/species.parquet` (exists today) and `/v1/countries.parquet` (new in mission B, §6). That script is the only way a learners' database comes into being. The Learn pages, the playground, the demo, mission B's E2E suite and this document's query runner all run the same text, so a lesson can't depend on a table that some other path built differently.

- **Learners never see the nested file.** `species.parquet` keeps critwire's nested record shape (structs such as `taxonomy` and `photo`, lists such as `range.countriesWithOpenRecords` and `sources`) and camelCase names. The setup flattens it into plain tables with snake_case names, and lessons use only standard SQL on those tables. The DuckDB-specific parts (`read_parquet`, `unnest`, struct access with `.`) appear only in the setup, and in lesson 14, which shows them labelled as DuckDB.
- **Order matters.** DuckDB declares foreign keys only inside `CREATE TABLE` (`ALTER TABLE … ADD FOREIGN KEY` is not implemented) and checks them statement by statement, so every table a key points at is created and filled first:
  1. `taxa`, one `INSERT` per rank, top down (class, order, family, genus): a single multi-row `INSERT` whose rows point at parents inserted by that same statement fails the foreign key check;
  2. `species` (its `genus` points at `taxa`);
  3. `sources`, then `species_sources`;
  4. `countries`, then `species_countries` (both keys);
  5. the view `species_taxonomy`.
- **Nothing is ever dropped.** DuckDB refuses to drop a table another table still references (`CASCADE` doesn't help), so re-running the setup can't reset a database. A fresh database comes only from restarting the engine (a new worker and a new in-memory database, then the setup again). That is what the page's Reset button does (§1, §8).
- **It fails loudly.** Bad data breaks a constraint instead of slipping through: a species country code missing from `countries` (foreign key), a source with two licenses or two dates (primary key of `sources`), a taxon name used at two ranks (primary key of `taxa`), a class with a parent or a genus without one (check). The page then shows DuckDB's error, and mission B's E2E suite runs this same setup, so a deploy can't ship a setup that fails.
- **What it costs.** The setup is 16 statements. The page loads DuckDB's `parquet` extension from critwire.com's own mirror before running it (§1). Each data file is fetched once per fresh database (about 32 KB for `species.parquet`).

### Tables

Names: entity tables are plural snake_case (`species`, `taxa`, `countries`, `sources`); a junction table is named after the two tables it joins (`species_countries`, `species_sources`); a foreign key column is named after what it points at (`species_id`, `country_code`, `source_name`, `parent_name`; `species.genus` keeps its everyday name). Scalar columns use the names the repo's own `db/schema.sql` already gives them (`scientific_name`, `common_name`, `range_status`, `photo_url`, `iucn_id`, …), and no column needs quoting in SQL: `order` and `range` are reserved words, so the view says `order_name` and `species` says `range_status`.

| Table | Columns and keys | Built from |
|---|---|---|
| `taxa` | `name` VARCHAR, primary key; `taxon_rank` VARCHAR NOT NULL, one of `class`, `order`, `family`, `genus`; `parent_name` VARCHAR, foreign key → `taxa.name`, NULL exactly for classes (a check) | the distinct `taxonomy.class`, `.order`, `.family` and `.genus` values, each with the rank above it as parent |
| `species` | `id` INTEGER, primary key; `slug` VARCHAR NOT NULL, unique; `scientific_name` VARCHAR NOT NULL, unique; `common_name` VARCHAR NOT NULL; `genus` VARCHAR NOT NULL, foreign key → `taxa.name`; `range_status` VARCHAR NOT NULL, one of `ok`, `no-open-records`, `identity-unsettled`; `photo_url`, `photo_credit`, `photo_license`, `photo_page` VARCHAR; `iucn_id` INTEGER, `gbif_id` BIGINT, `col_id` VARCHAR, `wikidata_id` VARCHAR, `inaturalist_id` INTEGER, `ncbi_id` INTEGER, each unique and nullable | one row per record: `id`, `slug`, `scientificName`, `commonName`, `taxonomy.genus`, `range.status`, the `photo` fields, the `ids` fields |
| `sources` | `name` VARCHAR, primary key; `license` VARCHAR NOT NULL; `retrieved` DATE (NULL for `critwire base`, critwire's own fields) | the distinct (`source`, `license`, `retrieved`) of every record's `sources` list |
| `species_sources` | `species_id` INTEGER NOT NULL, foreign key → `species.id`; `field` VARCHAR NOT NULL (a path in the record, such as `ids.col` or `taxonomy`); `source_name` VARCHAR NOT NULL, foreign key → `sources.name`; primary key (`species_id`, `field`) | each record's `sources` list, then each entry's `fields` list: which source supplied which field of which animal |
| `countries` | `code` VARCHAR, primary key (ISO 3166-1 alpha-2, plus `XK` for Kosovo, as GBIF uses it); `name` VARCHAR NOT NULL, unique; `continent`, `region`, `subregion` VARCHAR NOT NULL | `/v1/countries.parquet` (§6): Natural Earth admin-0 attributes, 250 rows |
| `species_countries` | `species_id` INTEGER NOT NULL, foreign key → `species.id`; `country_code` VARCHAR NOT NULL, foreign key → `countries.code`; primary key (`species_id`, `country_code`) | each record's `range.countriesWithOpenRecords` list, one row per code |
| view `species_taxonomy` | `species_id`, `class`, `order_name`, `family`, `genus` | `species` joined to `taxa` four times, genus up to class |

**What `species_countries` means.** A row says the animal has been *recorded in that country in open (CC0 or CC BY) occurrence records on GBIF*, after critwire's filters (§6 and the docs page). It is not the native range: open records include zoos, introductions and the odd stray. Every lesson that uses it says so, and the table keeps that one meaning for good; a native range, if critwire ever has one, would be a new table (for example `species_native_countries`), never a new meaning for this one. Four animals have no rows: three whose GBIF identity isn't settled yet (`range_status` `identity-unsettled`) and one with no open records left after filtering (`no-open-records`). Lessons 4 and 11 use them.

**Relationships** (§3 draws them):
- `taxa` → `taxa`: each taxon except a class has one parent; a taxon can have many children (one-to-many, the hierarchy).
- `taxa` → `species`: a genus has many species; each species has one genus (one-to-many).
- `species` ↔ `countries` through `species_countries`: many-to-many.
- `species` ↔ `sources` through `species_sources`: many-to-many; every species cites at least one source.

### The setup

The `setup` block must equal the spike's `src/setup.sql` byte for byte; `run-queries` refuses a plan where they differ. It has no result block, because it is what builds the database the other blocks run on.

```sql
-- q: setup
-- status: ran
-- critwire Learn: the learners' tables (schema v1), built on a fresh in-memory database
-- from /v1/species.parquet and /v1/countries.parquet. Every table a foreign key points at is
-- created first, and taxa go in one rank per INSERT, top down: DuckDB declares foreign keys
-- only in CREATE TABLE and checks them statement by statement. Nothing is ever dropped;
-- a fresh database comes from a restart.

CREATE TABLE taxa (
  name        VARCHAR PRIMARY KEY,
  taxon_rank  VARCHAR NOT NULL CHECK (taxon_rank IN ('class', 'order', 'family', 'genus')),
  parent_name VARCHAR REFERENCES taxa (name),
  CHECK ((taxon_rank = 'class') = (parent_name IS NULL))
);

INSERT INTO taxa
SELECT DISTINCT taxonomy.class, 'class', NULL FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy."order", 'order', taxonomy.class FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy.family, 'family', taxonomy."order" FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy.genus, 'genus', taxonomy.family FROM read_parquet('species.parquet');

CREATE TABLE species (
  id              INTEGER PRIMARY KEY,
  slug            VARCHAR NOT NULL UNIQUE,
  scientific_name VARCHAR NOT NULL UNIQUE,
  common_name     VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL REFERENCES taxa (name),
  range_status    VARCHAR NOT NULL CHECK (range_status IN ('ok', 'no-open-records', 'identity-unsettled')),
  photo_url       VARCHAR,
  photo_credit    VARCHAR,
  photo_license   VARCHAR,
  photo_page      VARCHAR,
  iucn_id         INTEGER UNIQUE,
  gbif_id         BIGINT UNIQUE,
  col_id          VARCHAR UNIQUE,
  wikidata_id     VARCHAR UNIQUE,
  inaturalist_id  INTEGER UNIQUE,
  ncbi_id         INTEGER UNIQUE
);

INSERT INTO species
SELECT id, slug, scientificName, commonName, taxonomy.genus, "range".status,
       photo.url, photo.credit, photo.license, photo.page,
       ids.iucn, ids.gbif, ids.col, ids.wikidata, ids.inaturalist, ids.ncbi
FROM read_parquet('species.parquet');

CREATE TABLE sources (
  name      VARCHAR PRIMARY KEY,
  license   VARCHAR NOT NULL,
  retrieved DATE
);

INSERT INTO sources
SELECT DISTINCT s.source, s.license, CAST(s.retrieved AS DATE)
FROM (SELECT unnest(sources) AS s FROM read_parquet('species.parquet'));

CREATE TABLE species_sources (
  species_id  INTEGER NOT NULL REFERENCES species (id),
  field       VARCHAR NOT NULL,
  source_name VARCHAR NOT NULL REFERENCES sources (name),
  PRIMARY KEY (species_id, field)
);

INSERT INTO species_sources
SELECT id, unnest(s.fields), s.source
FROM (SELECT id, unnest(sources) AS s FROM read_parquet('species.parquet'));

CREATE TABLE countries (
  code      VARCHAR PRIMARY KEY,
  name      VARCHAR NOT NULL UNIQUE,
  continent VARCHAR NOT NULL,
  region    VARCHAR NOT NULL,
  subregion VARCHAR NOT NULL
);

INSERT INTO countries
SELECT code, name, continent, region, subregion FROM read_parquet('countries.parquet');

-- Countries with open (CC0 / CC BY) occurrence records, not the native range.
CREATE TABLE species_countries (
  species_id   INTEGER NOT NULL REFERENCES species (id),
  country_code VARCHAR NOT NULL REFERENCES countries (code),
  PRIMARY KEY (species_id, country_code)
);

INSERT INTO species_countries
SELECT id, unnest("range".countriesWithOpenRecords) FROM read_parquet('species.parquet');

CREATE VIEW species_taxonomy AS
SELECT s.id AS species_id, c.name AS class, o.name AS order_name, f.name AS family, g.name AS genus
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
JOIN taxa AS o ON o.name = f.parent_name
JOIN taxa AS c ON c.name = o.parent_name;
```

The row count of every table and of the view, today (`countries` is the spike's draft, so this block is `draft-table`):

```sql
-- q: setup-counts
-- status: draft-table
SELECT (SELECT count(*) FROM taxa)              AS taxa,
       (SELECT count(*) FROM species)           AS species,
       (SELECT count(*) FROM sources)           AS sources,
       (SELECT count(*) FROM species_sources)   AS species_sources,
       (SELECT count(*) FROM countries)         AS countries,
       (SELECT count(*) FROM species_countries) AS species_countries,
       (SELECT count(*) FROM species_taxonomy)  AS species_taxonomy;
```

```text
-- result: setup-counts · 1 row · sha256 a46604343811
taxa | species | sources | species_sources | countries | species_countries | species_taxonomy
143 | 76 | 5 | 591 | 250 | 472 | 76
```

### Limits the lessons state

- **A foreign key checks existence, nothing more.** `species.genus` points at `taxa.name`, but no constraint can make sure the row it points at is a *genus*: a check constraint sees only its own row. Lesson 12 says so, and that enforcing it would take a trigger (DuckDB has none) or one table per rank. Learners shouldn't assume a foreign key checks more than it does.
- **Taxon names are a natural key because of today's data, not a rule of nature.** No name is used at two ranks or under two parents today, so `taxa.name` can be the primary key. Nomenclature allows the same genus name in animals and plants, though. Mission B's `pnpm derive` refuses (as a blocking mismatch) a taxon name at two ranks or under two parents, so a collision stops the data build instead of breaking learners' browsers. Fixing one for real would be a schema change (a surrogate `taxa.id`), decided then.
- **No `DROP`, no `ALTER … ADD FOREIGN KEY`.** These are DuckDB limits (above). A learner who creates tables does it inside the page's database, and Reset (a restart) is how to start over.
- **Everything is in memory.** A learner's tables last until the page reloads or Reset; nothing is saved.

### Left out of v1

- `replacedBy`: null for every record today. When an id is first retired, a `species_replacements (species_id, replaced_by)` table joins on.
- Each source's query URL (`sources[].url`) and release details (`doi`, `release`): they describe how critwire fetched a field, not the animals, and they would turn `species_sources` into a wide table nobody queries in a lesson. The `/v1` files keep them.

### Room to grow (A2)

New data joins on with new tables and no renames:
- traits: `traits (name, unit, description)` + `species_traits (species_id, trait_name, value, unit, source_name)`; lesson 16 has learners design this one;
- habitats: `habitats` + `species_habitats`;
- regions: `regions` + `country_regions`;
- occurrences: `occurrences (id, species_id, country_code, …)`;
- new taxonomic ranks: new `taxa` rows, with the rank check widened.

Each new table is created after the tables it points at, in the same `setup.sql`.

## 3. Entity relationship diagram

Written in step S13.

## 4. Lessons: the core path

Written in steps S15 and S16.

## 5. Cookbook

Written in steps S17 and S18.

## 6. The countries file

Written in step S19.

## 7. Demo

Written in step S20.

## 8. Site

Written in step S20.

## 9. Mission B

Written in step S21.

## 10. For the owner

Written in step S22.
