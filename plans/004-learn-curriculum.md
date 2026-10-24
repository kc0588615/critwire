# critwire Learn: a practitioner curriculum (design)

Design for critwire Learn as a practitioner course in database architecture, GIS in SQL, spatial statistics, ETL and Power BI, taught on critwire's open species data and other open data. It starts from a little SQL and everyday GIS, covers the foundations fast, then goes deep. It replaces the course in `plans/002-learn.md` and `plans/003-learn-data-spatial.md` and reuses their engine, schema, data and licensing findings (§1). Every SQL and Python block here is tested (§0). Nothing public changes until the build missions in §9 run.

Written by mission `critwire-learn-curriculum` (plan `plans/2026-10-23-critwire-learn-curriculum.md`); a section marked "(S<n>)" is written by that plan's step S<n>.

## 0. Conventions

Every example in this document is tested. A block is a fenced code block whose first lines are headers. The test runner (the mission's spike, §A) reads the headers, runs the block on the engine they name, and compares what it gets with the result block printed under it. A block that can't run here says why.

### Blocks, engines and statuses

- **Every block has an id and a status.** SQL: `-- q: <id>`, then `-- status: ran` or `-- status: untested: <reason>`. Python writes `#` for `--`; Power BI's M and DAX write `//`. Module blocks are named `<module>-<word>` (`d3-plan`); engine and setup blocks have plain ids (`setup`, `pg-session`). Ids are unique in the document.
- **`ran`** means the block ran on the data named in the log header (below) and gave the result printed under it; Verification runs it again and fails on any difference. **`untested: <reason>`** blocks never run: they need something this server doesn't have (Windows, ArcGIS Pro, a second session). A failing block is fixed, never relabelled `untested`.
- **Engines:**
  - SQL with no `-- engine:` line (or `-- engine: duckdb`) runs in DuckDB-WASM in headless Chromium, on the browser database the `setup` block builds (below), as a page runs it.
  - `-- engine: postgis` runs in PostgreSQL 16 with PostGIS 3.4.2, in schema `learn_curriculum`, after the loader and `pg-session` (below).
  - ```` ```python ```` blocks run in the pinned `uv` environment (§3), each in its own process, isolated (`python -I`), from an empty folder, connected through libpq's `PG*` variables. Their search path starts as `pg_catalog`, so a block that skips the `py-connect` helper fails on its first table name instead of quietly reading another schema.
  - ```` ```m ```` and ```` ```dax ```` blocks (Power BI) never run; their status is always `untested: Power BI is Windows-only`. Each names its inputs (`// input: star/<file>.csv, …`) and the runner checks those files instead: the file exists, its header equals the star manifest's columns, primary keys are unique and filled, every foreign key finds its dimension row, and rows and sha256 equal the manifest's.
- **More headers:**
  - `-- after: <id>, …`: those earlier blocks of the same engine run first, in the same transaction, in the order named; the result is still this block's last statement. An exercise runs after its lesson this way. Python's `# after:` puts the named blocks' code first, in document order, in one process.
  - `-- expect: error <text>`: the last statement must fail with an error containing `<text>` (d1's constraint violations); the block fails if it doesn't.
  - `-- params: [<value>, …]` (DuckDB only): JSON values for the last statement's `?` placeholders, as a page binds a learner's input.
  - `-- needs: raster` (PostGIS): the block uses PostGIS raster, so the run first checks the raster library and its settings (g7, s6). Raster functions anywhere else are refused.
  - `-- boot` (PostGIS): runs once when the runner connects, before every other block, and is committed. It builds fixtures later blocks read (s4's hexagon grids); its tables are listed `lab-made` on the lab ERD (§6.2).
  - `-- tx: own` (PostGIS): the runner doesn't wrap the block. It runs its own `BEGIN` … `COMMIT` or `ROLLBACK`, as typed in psql (d4). Afterwards the runner checks that the block ended its transaction, left the session as it found it, and left `learn_curriculum` unchanged.
  - `# timeout: <seconds>` (Python): when the block is stopped; 60 by default.
  - `-- show: cards` is not a test header: it stays in the SQL learners see, and the page shows the result as animal cards (002 §8).
- **Every other SQL block runs in a transaction the runner rolls back,** so each starts from the same database and the order of modules doesn't matter. Results must be deterministic: rows ordered by a unique key, `random()` only after `setseed()`, no clock; Python prints with explicit formats, never a DataFrame's repr.
- **Result blocks.** The ```` ```text ```` block under a `ran` block starts `-- result: <id> · <n> rows · sha256 <12 hex>`, then the column names, the first 5 rows (cells cut at 60 characters) and how many more. The hash covers the column names and every row, uncut, so the 5 rows shown don't limit what is checked. A Python result starts `-- result: <id> · python · sha256 <12 hex>`, then the block's whole output. Only the runner writes result blocks (`--update`).
- **Not counted:** ```` ```sh ```` and ```` ```powershell ```` fences are commands for the learner's own machine (installing PostgreSQL, Docker or `uv`; loading the lab file). They carry no headers and don't run here; §3 says which were checked another way. ```` ```mermaid ```` fences are the ERDs, checked against their files and the live catalogs (§6).

### Lab objects: the `learn_` rules

The PostGIS labs share a database with other work, on the test server and perhaps on yours, so they follow rules the runner checks before anything runs:
- Lab tables live in schema `learn_curriculum`, which the loader replaces as a whole (§4). Labs never name a database, and every PostGIS lab starts with `pg-session`.
- A role or schema a lab creates is named `learn_…`, and the same block removes it: each `CREATE ROLE learn_x` or `CREATE SCHEMA learn_x` has a later `DROP` in the block, a role that was granted anything gets `DROP OWNED BY` before its `DROP ROLE`, and a `SET ROLE` has a later `RESET ROLE`. Running a block twice, or stopping a module halfway, leaves nothing behind.
- After a block's last statement, before the rollback, the runner looks for `learn_` roles and schemas that weren't there when it connected. Finding one fails the block, because your psql would have kept it.
- Allowed only in PostGIS blocks: roles, `GRANT` and `REVOKE`, default privileges, `SET ROLE` and `CREATE`/`DROP SCHEMA`, all within `learn_` names; `SET` and `SET LOCAL`, which the rollback undoes. Refused everywhere: `ALTER SYSTEM`, `ALTER DATABASE`, `GRANT SET ON PARAMETER`, any role or schema not named `learn_…`, and the name `learn_spatial` (003's spike schema in the test database; the runner also compares its content before and after every run).
- Creating roles needs the CREATEROLE privilege ("The PostGIS setup" below; d5).

### Re-running the tests, and where results live

The tests run on critwire's server from the mission's spike folder, `SP=/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike`, which isn't committed; L2 moves it into the repository as `pnpm learn:check` (§9). From the worktree:
- `node $SP/scripts/build-site.ts` writes the spike's web root (the lab files and the loader). Then `node $SP/run-queries.ts plans/004-learn-curriculum.md --check --erd plans/004-learn-erd.mmd --lab-erd plans/004-lab-erd.mmd --star-erd plans/004-star-erd.mmd` runs every block, checks every Power BI input and the three ERDs, and fails on any difference. `--update` instead rewrites the result blocks.
- `$SP/verify.sh` re-runs everything: ports free; build-site; the command above; the lab shapes from their downloads; the loader, twice, as a learner runs it; the `learn_spatial` canary; the ETL spike, offline from the saved GBIF zip; the Moran spike; the star export; the three ERD renders. It ends `verify: ok`.
- **Results** are in this document, under each block, and in the run log, `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/queries.log`. The log's header records the engine versions (DuckDB-WASM, PostGIS, Python and the `requirements.txt` hash), the canary, and the sha256 of every lab data file, so "ran" names exactly the data it ran on; then come every result, every skipped block and every Power BI input check. The spikes' evidence is in `$SP/out/<spike>/summary.md` (§A), the ERD renders in `$SP/erd/`.

### The browser setup

The browser labs (DuckDB-WASM) start from 002's database plus the lab sample: this `setup` block, the spike's `src/setup.sql`, runs at boot. Its first part is 002's `setup` byte for byte (schema v1); schema v2 adds `datasets` and `occurrences`, read from `/learn/data/datasets.csv` and `/learn/data/occurrences.parquet` (§4). It has no result block.

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

-- Schema v2 (plans/004-learn-curriculum.md): the lab sample of open GBIF records, from
-- /learn/data/datasets.csv and /learn/data/occurrences.parquet. A record is where someone
-- recorded the animal, not where it lives. country_code_gbif is GBIF's code as delivered
-- (ZZ unknown, XZ international waters); country_code is that code only when it is a
-- countries row, else NULL.

CREATE TABLE datasets (
  dataset_key VARCHAR PRIMARY KEY,
  title       VARCHAR NOT NULL,
  publisher   VARCHAR NOT NULL,
  doi         VARCHAR,
  license     VARCHAR NOT NULL
);

INSERT INTO datasets
SELECT * FROM read_csv('datasets.csv', header = true, columns = {
  'dataset_key': 'VARCHAR', 'title': 'VARCHAR', 'publisher': 'VARCHAR', 'doi': 'VARCHAR', 'license': 'VARCHAR'});

CREATE TABLE occurrences (
  id                       BIGINT PRIMARY KEY,
  species_id               INTEGER NOT NULL REFERENCES species (id),
  dataset_key              VARCHAR NOT NULL REFERENCES datasets (dataset_key),
  license                  VARCHAR NOT NULL CHECK (license IN ('CC0 1.0', 'CC BY 4.0')),
  basis_of_record          VARCHAR NOT NULL CHECK (basis_of_record IN ('HUMAN_OBSERVATION', 'OBSERVATION',
                             'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN', 'MATERIAL_SAMPLE',
                             'MATERIAL_CITATION', 'OCCURRENCE')),
  longitude                DOUBLE NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude                 DOUBLE NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  coordinate_uncertainty_m DOUBLE,
  country_code_gbif        VARCHAR,
  country_code             VARCHAR REFERENCES countries (code),
  year                     INTEGER,
  month                    INTEGER CHECK (month BETWEEN 1 AND 12)
);

INSERT INTO occurrences
SELECT id, species_id, dataset_key, license, basis_of_record, longitude, latitude,
       coordinate_uncertainty_m, country_code_gbif, country_code, year, month
FROM read_parquet('occurrences.parquet');
```

The row count of every table and of the view (`countries` is A1's draft of `/v1/countries`; `datasets` and `occurrences` are the lab sample, §4):

```sql
-- q: setup-counts
-- status: ran
SELECT (SELECT count(*) FROM taxa)              AS taxa,
       (SELECT count(*) FROM species)           AS species,
       (SELECT count(*) FROM sources)           AS sources,
       (SELECT count(*) FROM species_sources)   AS species_sources,
       (SELECT count(*) FROM countries)         AS countries,
       (SELECT count(*) FROM species_countries) AS species_countries,
       (SELECT count(*) FROM datasets)          AS datasets,
       (SELECT count(*) FROM occurrences)       AS occurrences,
       (SELECT count(*) FROM species_taxonomy)  AS species_taxonomy;
```

```text
-- result: setup-counts · 1 row · sha256 e3323c4c9cd8
taxa | species | sources | species_sources | countries | species_countries | datasets | occurrences | species_taxonomy
143 | 76 | 5 | 591 | 250 | 472 | 400 | 40395 | 76
```

### The PostGIS setup

The PostGIS labs run in schema `learn_curriculum`, which one file builds: `learn_curriculum.sql` (§4). Load it with `psql -X -v ON_ERROR_STOP=1 -d <your database> -f learn_curriculum.sql`; it runs in one transaction, so a failed load leaves the previous schema as it was, and loading again replaces it. Every PostGIS lab starts with this session block. It puts `learn_curriculum` first on the search path, so plain table names find the lab tables, and PostGIS's functions still resolve from `public`. The tests run the same statement when they connect.

```sql
-- q: pg-session
-- status: ran
-- engine: postgis
SET search_path = learn_curriculum, public;
SHOW search_path;
```

```text
-- result: pg-session · 1 row · sha256 791623fd72db
search_path
learn_curriculum, public
```

A quick check that the load worked: the rows in every lab table.

```sql
-- q: pg-smoke
-- status: ran
-- engine: postgis
SELECT 'taxa' AS table_name, count(*) AS n_rows FROM taxa
UNION ALL SELECT 'species', count(*) FROM species
UNION ALL SELECT 'sources', count(*) FROM sources
UNION ALL SELECT 'species_sources', count(*) FROM species_sources
UNION ALL SELECT 'countries', count(*) FROM countries
UNION ALL SELECT 'species_countries', count(*) FROM species_countries
UNION ALL SELECT 'datasets', count(*) FROM datasets
UNION ALL SELECT 'occurrences', count(*) FROM occurrences
UNION ALL SELECT 'country_shapes', count(*) FROM country_shapes
UNION ALL SELECT 'admin1_shapes', count(*) FROM admin1_shapes
UNION ALL SELECT 'biomes', count(*) FROM biomes
UNION ALL SELECT 'ecoregions', count(*) FROM ecoregions
UNION ALL SELECT 'habitat_classes', count(*) FROM habitat_classes
UNION ALL SELECT 'country_habitats', count(*) FROM country_habitats
ORDER BY table_name;
```

```text
-- result: pg-smoke · 14 rows · sha256 444c9131da27
table_name | n_rows
admin1_shapes | 294
biomes | 14
countries | 250
country_habitats | 35
country_shapes | 247
… 9 more rows
```

Labs that create roles or schemas (d1, d5) clean up in the same block, so running a block twice, or stopping halfway through a module, leaves nothing behind. Their names start with `learn_`, and creating roles needs the CREATEROLE privilege (a superuser has it; on your own install, `ALTER ROLE <you> CREATEROLE` as the superuser, once). This check creates a read-only role, reads a table as that role, and removes it again: `DROP OWNED BY` takes away what the role was granted, and only then can `DROP ROLE` remove it.

```sql
-- q: pg-role-smoke
-- status: ran
-- engine: postgis
CREATE ROLE learn_smoke NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_smoke;
GRANT SELECT ON species TO learn_smoke;
SET ROLE learn_smoke;
SELECT current_user AS role, count(*) AS species FROM species;
RESET ROLE;
DROP OWNED BY learn_smoke;
DROP ROLE learn_smoke;
SELECT count(*) AS learn_smoke_left FROM pg_roles WHERE rolname = 'learn_smoke';
```

```text
-- result: pg-role-smoke · 1 row · sha256 fcfe7fd06dfa
learn_smoke_left
0
```

Most labs run in a transaction the tests roll back. The transaction labs (d4) manage their own, with `BEGIN` and `COMMIT` or `ROLLBACK`, exactly as you type them in `psql`; the tests then check that each one ended its transaction and left the lab tables as they were.

```sql
-- q: pg-tx-smoke
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE TABLE tx_smoke (id integer PRIMARY KEY);
INSERT INTO tx_smoke VALUES (1), (2);
ROLLBACK;
SELECT to_regclass('tx_smoke') IS NULL AS rolled_back;
```

```text
-- result: pg-tx-smoke · 1 row · sha256 a90c4cf411fd
rolled_back
true
```

### The Python setup

Python labs run in the `uv` environment (§3) and read the lab database through libpq's `PG*` environment variables, so the same file runs on your machine and on the test server. Every Python lab starts with this helper. It sets the search path when it connects, so plain table names find the lab tables in `learn_curriculum` and PostGIS's functions in `public`. It prints nothing.

```python
# q: py-connect
# status: ran
import psycopg


def connect():
    """A connection to the lab database: plain table names find learn_curriculum's tables, then PostGIS in public."""
    return psycopg.connect(options="-c search_path=learn_curriculum,public")
```

```text
-- result: py-connect · python · sha256 e3b0c44298fc
```

A quick check that the environment works: the search path through the helper, then the versions the labs were tested with.

```python
# q: py-smoke
# status: ran
# after: py-connect
import platform
from importlib.metadata import version

with connect() as conn:
    print("search_path:", conn.execute("SHOW search_path").fetchone()[0])
print("python:", platform.python_version())
for package in ["psycopg", "pandas", "pyarrow", "shapely", "pyproj", "pyogrio", "geopandas", "libpysal", "esda", "pointpats"]:
    print(f"{package}: {version(package)}")
```

```text
-- result: py-smoke · python · sha256 f75ba856b9f7
search_path: learn_curriculum,public
python: 3.12.3
psycopg: 3.3.6
pandas: 3.1.0
pyarrow: 26.0.0
shapely: 2.2.0
pyproj: 3.8.0
pyogrio: 0.13.0
geopandas: 1.2.0
libpysal: 4.15.1
esda: 2.10.0
pointpats: 2.6.0
```

## 1. What carries over

004 builds on two earlier designs, neither of them built (§B): `plans/002-learn.md` (mission A1: the browser engine, the learners' schema and ERD, 16 SQL lessons for beginners aged 16 and up, a cookbook, a game, the countries file) and `plans/003-learn-data-spatial.md` (mission A2: datasets and licenses, the grown schema, a spatial track, the habitat raster, IUCN). Both stay in the repository as records, marked superseded. Their measurements and research are reused as they stand, not redone. What changes is the learner (adults building job skills, not beginners), the course, and where lab data lives. "Kept" means 004 relies on it as written there, and the build missions (§9) build it from there; where 004 differs, §B says why.

### From 002

| Section | Kept | Changed | Dropped |
|---|---|---|---|
| 002 §1 Engine and interface | The whole engine: DuckDB-WASM `1.33.1-dev65.0` (DuckDB v1.5.6), the `eh` bundle in a worker, self-hosted, with the `parquet` extension mirror; the 10 000-row stream cap; Reset and Stop by restarting the worker; one engine start per visit; Q1–Q5's measurements; our own editor rather than the DuckDB shell | The setup also reads `/learn/data/datasets.csv` and `/learn/data/occurrences.parquet`: 3.22 s to a ready database on desktop, against A1's 2.9 s to the first result (§A.1) | — |
| 002 §2 The learners' schema | v1's six tables and the view, byte for byte: 004's `setup` starts with 002's (§0) | v2 adds `datasets` and `occurrences` (Room to grow's), nothing else (§6.1); the other spatial tables go in the lab database (§6.2) | Room to grow's `traits`, `habitats` and `regions` tables (the lab's habitat classes, admin-1 shapes and ecoregions take the last two) |
| 002 §3 Entity relationship diagram | Mermaid sources in the repository, the offline render (`pnpm erd`, no mermaid-cli), the build's stale check, the drift check against the catalog, the Schema dialog, the data dictionary | Three diagrams: schema v2, with 002's entities and lines checked unchanged; the lab database; the Power BI star (§6) | — |
| 002 §4 Lessons: the core path | The SQL of lessons 7 (keys), 9 (many-to-many), 11 (left join), 14 (normalization) and 15 (sources), re-run inside f3, d1 and d2; the exercise-check pattern (`-- after:`) | Rewritten for adults new to the topic, and fast: f1–f4 take 6 h (§2) | The 16-lesson path for ages 16 and up |
| 002 §5 Cookbook | — | c12 "Could they meet?" becomes an idea for the capstone's game feed (c1) | The cookbook page and its recipes |
| 002 §6 The countries file | The whole design: `/v1/countries.{parquet,csv,json}` from Natural Earth (public domain), 250 rows, its attribution entry, the `NA` note; L1 builds it | — | — |
| 002 §7 Demo | — | — | "Name that animal" and `/play/` |
| 002 §8 Site | The page design (cards and `-- show: cards`, the editor, the Schema button), accessibility, light and dark themes, the E2E rules, the playground | New URLs and page types: module pages, lab pages, downloadable lab files (§7) | The cookbook and `/play/` pages |
| 002 §9 Mission B | The reason for splitting the build: each mission well under 60 sessions | Five chained missions, L1–L5 (§9) | Briefs B1 and B2, marked superseded |
| 002 §10 For the owner | Items 1–4 and 6–9, as recommended there; §10 restates the open ones | Item 10 (a real-device check) becomes a Windows check of PostGIS and Power BI: the learners are on desktops (§10). Item 11 (extensions beyond `parquet`) is answered: none (§B) | Item 5 (lesson order): the 16 lessons are gone |

### From 003

| Section | Kept | Changed | Dropped |
|---|---|---|---|
| 003 §1 Growing the data | Every license quote, retrieval date and size A2 measured, cited in §4 by D number | D3, the GBIF sample, comes from the occurrence download API, not `occurrence/search` (below; §B). D2 (admin-0) and D10 (admin-1) at 1:50m; D9 (RESOLVE) simplified to fit the 50 MB cap (§4) | Deferred: D1, D5–D8 and D11–D14 (traits, names, the tree of life: no module needs them); D15 (CHELSA) comes later. D16 (WorldClim) and D17 (WDPA) are never hosted |
| 003 §2 The grown schema and its ERD | `occurrences`, `country_shapes` (with its `\|\|--o\|` line), `habitat_classes` and `country_habitats`, and the designed but unbuilt `ecoregions` and `biomes`, all now in the lab database (§6.2) | `occurrences` gains the country-key contract (raw code beside a nullable foreign key) and a `datasets` table with credits; it is in the browser's schema v2 too. `admin1_shapes` is new | `traits`, `species_traits`, `species_names`, `tree_nodes`, and `setup-grown` (§B) |
| 003 §3 Lessons for the grown data | — | Lessons 22–23's habitat questions return on PostGIS in g7 and s6 | Lessons 17–23 (they teach the deferred tables) |
| 003 §4 The advanced spatial track | "Your own PostGIS": the session block (`pg-session`, now on `learn_curriculum`) and `pg-once` (the raster settings) for g7; spatial lessons 5 (projection), 6 (point value) and 7 (zonal) go into g1 and g7; lesson 4's finding (E1) that GBIF's country codes and the outlines disagree on coasts goes into g3 | Learners load their PostGIS with one psql-only file, not `shp2pgsql` or `ogr2ogr` (§B) | Spatial lessons 1–4 and 8 in the browser: they need DuckDB's `spatial` extension (§B) |
| 003 §5 The habitat raster | The whole recommendation: Jung et al. 2020 v004 by URL, country summaries plus two clips, the provenance gate, the three summary methods and their measured errors | Clips for Costa Rica and Tasmania; L3 builds them | — |
| 003 §6 IUCN | Every conclusion: critwire never stores, caches, proxies or serves IUCN data | The "your own download" lessons become an optional, untested appendix to g3 | — (the draft permission request stays a record, unsent) |
| 003 §7 The build missions | The chain: each brief says what it needs from the one before; each mission releases itself | Five missions, L1–L5 (§9) | Briefs C and D, marked superseded; "what both assume B delivered" never happened (§B) |
| 003 §8 For the owner | Items 2–4 and 7–9, as recommended there | Item 1 (datasets first): admin-0 and the GBIF sample yes, AnAge deferred. Item 6 (publish occurrence records): yes, as a capped sample of a download (§4) | Item 5 (commit the `spatial` extension): no `spatial` in the browser (§B) |

003's own "Disagreements with 002" mostly fall away: lesson 16's move to `my_traits` is moot (no trait tables); habitats stay map classes, never species preferences; regions no longer wait (admin-1, ecoregions and biomes are in the lab); `setup-grown` is gone. Its ERD rule for one-to-one lines on a key that is also the primary key stays, in the lab ERD's check.

**The GBIF sample changes source (003 D3).** 003 drew up to 300 records per species through `occurrence/search`, inside `ingest gbif`, as a subset of what the countries DOI `10.15468/dd.ky9cyt` counts. 004 draws it from the occurrence download API: an asynchronous download with its own DOI and no paging cap, refreshed apart from the countries pipeline, capped at 2,000 records per species, and registered by L1 as its own derived dataset. `ingest gbif`, `contributions.json` and `10.15468/dd.ky9cyt` don't change (§4, §A.1, §B).

## 2. The curriculum map

Seven tracks, 33 modules, about 68 hours. Foundations come first and go fast; then the five areas; then a capstone that uses all of them. Each module answers real questions with the lab data (§4) on one or two tools: **B** the browser (DuckDB-WASM, nothing to install), **PG** your own PostgreSQL with PostGIS, **Py** Python in the `uv` environment, **PBI** Power BI Desktop (§3). Hours include the lab and the exercise. A module's id names its blocks (`d3-plan`) and its page (§7).

The table is in prerequisite order: every module's prerequisites come above it, so working down the table never meets a module that needs a later one. After f3 the tracks branch: GIS in SQL needs only f3 (and d3 for g5), ETL starts from f2, and Power BI waits for d6. **Depth** is what this document holds: `full` modules are written out in §5 (concept, worked example, lab, result, exercise, answer, check, dialects); `outline` modules give the goal, data, key code and expected result, and the build missions (§9) write them in full.

| id | Track | Module | Skill | Questions it answers | Tool | h | Prereqs | Depth |
|---|---|---|---|---|---|---|---|---|
| f1 | Foundations | select | `SELECT`, `WHERE`, `ORDER BY`, `NULL` | Which animals have no photo? Which mammals does critwire list, by common name? Why doesn't `= NULL` find a missing value? | B | 1.0 | — | full |
| f2 | Foundations | aggregate | `GROUP BY`, `HAVING`, `CASE`, `COUNT(DISTINCT …)` | How many records does the sample hold per year, and by basis of record? Which species have more than 500 records? How many datasets contributed? | B | 1.5 | f1 | full |
| f3 | Foundations | join | Inner, left and anti joins; many-to-many; reading an ERD; light spatial in plain SQL (bounding boxes, 10° bins) | Which animals were recorded in Brazil? Which have no records at all? How many records fall in each 10° box? | B | 2.0 | f2 | full |
| f4 | Foundations | window | CTEs, subqueries, window functions | Which dataset contributed most of each species' records, and what share is that? How does each year rank against the others? | B | 1.5 | f3 | full |
| d1 | Database architecture | keys | Entities; natural and surrogate keys; `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`; generated columns | What does a foreign key check, and what doesn't it? Natural or surrogate key for a species? What does a `CHECK` refuse? | B (+ PG) | 2.0 | f3 | full |
| d2 | Database architecture | normalize | 1NF to 3NF from nested JSON; functional dependencies; when to denormalize | Is a license a fact about a record or about a dataset? What goes wrong when a dataset's title is stored on every record? | B | 2.0 | d1 | full |
| d3 | Database architecture | indexes | B-tree, GiST and BRIN indexes; `EXPLAIN` and `EXPLAIN ANALYZE`; planner statistics | Why is this a sequential scan? When does an index help a filter, a join or a spatial test? What does the planner believe about a table? | PG | 2.0 | d1 | full |
| d4 | Database architecture | transactions | ACID, MVCC, isolation levels, locks, savepoints, `ON CONFLICT` | How do I re-run a failed load safely? What does another session see while a load runs? | PG | 2.0 | d3 | full |
| d5 | Database architecture | roles | Schemas, roles, `GRANT` and `REVOKE`, default privileges, least privilege, a taste of row-level security | How do I give a reporting tool read-only access to one schema and nothing else? What do default privileges change? | PG | 1.5 | d4 | full |
| d6 | Database architecture | star | Grain, facts, dimensions, conformed dimensions, unknown members, slowly changing dimensions (types 1 and 2); star vs snowflake; export | What is one record fact's grain? Which dimensions does it share with habitat area per country? Where does a record with no country go? | PG (+ DuckDB) | 2.5 | d2, d4 | full |
| g1 | GIS in SQL | crs | SRIDs, `ST_Transform`, geometry vs geography, Web Mercator's area error | How big is Tasmania in EPSG:3857, in EPSG:3577 and as geography? Why does Web Mercator overstate it? | PG | 1.5 | f3 | outline |
| g2 | GIS in SQL | load-validate | The loader, WKT and WKB, `ST_IsValid`, `ST_MakeValid` | Which shapes are invalid, and why? What does `ST_MakeValid` change? | PG | 1.5 | g1 | outline |
| g3 | GIS in SQL | spatial-join | `ST_Contains`, `ST_Covers`, `ST_Intersects`; point in polygon; records on boundaries | Do GBIF's country codes agree with the country outlines? Which records fall on a coast or in no country? | PG | 2.0 | g2 | outline |
| g4 | GIS in SQL | measure-overlay | Distances on the ellipsoid, `ST_DWithin`, buffers, `ST_Intersection` | How much of each country does each ecoregion cover? Which records lie within 10 km of a border? | PG | 2.0 | g3 | outline |
| g5 | GIS in SQL | spatial-index | GiST, the `&&` operator, nearest neighbours with `<->`, reading spatial plans | Which record is nearest to a point, found fast? When doesn't a spatial index help? | PG | 1.5 | g3, d3 | outline |
| g6 | GIS in SQL | grids | `ST_HexagonGrid` in an equal-area SRID; the modifiable areal unit problem (MAUP) | How many Tasmanian devil records fall in each 5 km hexagon, and in each 10 km one? How does the picture change with the grid? | PG | 1.5 | g4 | outline |
| g7 | GIS in SQL | raster | Value at a point; `ST_Clip`, `ST_ValueCount`; estimated areas and their error | Which habitat classes hold Costa Rica's records? How much of each class does a clip hold, and how good is that estimate? | PG | 2.5 | g6 | outline |
| s1 | Spatial statistics | bias | Datasets, basis of record, telemetry, recording effort; framing results honestly | How much of the jaguar sample is GPS-collar data? Which datasets and years dominate a species' records? What can records say about where an animal lives, and what can't they? | PG + B | 1.5 | g3 | outline |
| s2 | Spatial statistics | point-patterns | Quadrats, the nearest-neighbour index, kernel density, DBSCAN | Are devil records more clustered than chance? Where is record density highest? | PG + Py | 2.5 | s1, g6 | outline |
| s3 | Spatial statistics | weights | Distance-band, k-nearest and contiguity weights; row standardization; islands; ties | Who are a cell's neighbours? What does row standardization do, and what happens to a cell with none? | PG + Py | 2.0 | s2 | outline |
| s4 | Spatial statistics | moran | Global Moran's I, its expectation, variance and z-score in SQL, matched by PySAL; permutation tests | Does record density cluster across Tasmania? Do SQL and PySAL agree? How does the answer change at 10 km? | PG + Py | 2.0 | s3 | outline |
| s5 | Spatial statistics | local | Local Moran's I (LISA) and Getis-Ord Gi*; false discovery rate | Where are the hot and cold spots of recording effort? Which survive a false discovery rate correction? | PG + Py | 2.5 | s4 | outline |
| s6 | Spatial statistics | zonal | Zonal statistics on polygons and rasters; ratios normalized for effort | Do records over-represent some habitats or ecoregions, once effort is accounted for? | PG + Py | 2.0 | s5, g7 | outline |
| e1 | ETL | extract | Search API vs download API (asynchronous, with a DOI); paging, rate limits, retries; files with checksums | How do I get every open Tasmanian devil record, with a DOI to cite? | Py | 2.0 | f2 | outline |
| e2 | ETL | transform-load | Staging tables, types, `COPY`, upserts, geometry; GeoPandas to and from PostGIS | How do I load the download in one transaction, typed and checked, with each record matched to its species? | Py + PG | 2.5 | e1, d4 | outline |
| e3 | ETL | idempotent | Run ids, deterministic outputs, checksums; critwire's own ingest → derive → build as the case study | Can I re-run the pipeline without doubling rows or changing its output? | Py + PG | 2.0 | e2 | outline |
| e4 | ETL | quality-provenance | Data quality checks written as SQL; license filters; provenance tables; citations; derived datasets | Which datasets must I credit, and under which license? Which checks stop a bad load? | Py + PG | 2.0 | e3 | outline |
| e5 | ETL | schedule | cron, systemd timers, Windows Task Scheduler; logs, alerts, incremental loads | How do I refresh weekly, and know when a run broke? | Py | 1.5 | e4 | outline |
| p1 | Power BI | power-query | Power Query: `Web.Contents` on critwire's CSV files; types with an explicit culture; refresh | How do I load the star from critwire.com so that it refreshes, on any locale? | PBI | 1.5 | d6 | outline |
| p2 | Power BI | model | Relationships, cardinality, filter direction, conformed dimensions, factless facts | How do I filter records and habitat areas by the same country? | PBI | 2.0 | p1 | outline |
| p3 | Power BI | dax | Measures: `COUNTROWS`, `DISTINCTCOUNT`, `CALCULATE`, ratios | How many records per 1,000 km² of forest, by country? | PBI | 2.0 | p2 | outline |
| p4 | Power BI | maps-report | Map visuals, honest labels, publishing and scheduled refresh | How do I build a report that maps records and never calls them a range? | PBI | 1.5 | p3 | outline |
| c1 | Capstone | game-feed | ETL into PostGIS → Gi* on hexagons → a Power BI report → a static JSON feed a game reads (encounter weights per hexagon, labelled as records) | What could a player meet here, honestly? | all | 8.0 | s5, e4, p4 | outline |

| Track | Modules | Hours | Depth |
|---|---|---|---|
| Foundations | f1–f4 | 6.0 | full |
| Database architecture | d1–d6 | 12.0 | full |
| GIS in SQL | g1–g7 | 12.5 | outline |
| Spatial statistics | s1–s6 | 12.5 | outline |
| ETL | e1–e5 | 10.0 | outline |
| Power BI | p1–p4 | 7.0 | outline |
| Capstone | c1 | 8.0 | outline |
| **Total** | **33** | **68.0** | 10 full, 23 outline |

**Going fast.** Each foundations module opens with an "Already know this?" exercise; solving it marks the module done, so someone who already writes joins and window functions spends minutes, not six hours, on the first track. The dialect notes in each full module (PostgreSQL, DuckDB, SQL Server) let a SQL Server user map what they know. After foundations, the order within the prerequisites is yours: a GIS specialist might take d1, d3 and d4, then GIS in SQL and spatial statistics, and come back for d5 and d6 before ETL and Power BI.

## 3. Lab environments and setup

Four tools, each set up once. Every lab names the tool it runs on (§2). The file URLs below are where the build missions publish them (§7, §9); they don't exist yet.

| Tool | Modules | Runs on | Tested here | Not tested here |
|---|---|---|---|---|
| **B** browser | f1–f4, d1, d2, s1 | The course page: DuckDB-WASM in your browser | Every block, in headless Chromium, as the page runs it | — |
| **PG** PostGIS | d1, d3–d6, g1–g7, s1–s6, e2–e4, c1 | Your PostgreSQL 16 with PostGIS 3.4 | The loader (twice, with the command below) and every block, in PostgreSQL 16.x with PostGIS 3.4.2 on critwire's server | The Docker and installer commands (Windows) |
| **Py** Python | s2–s6, e1–e5, c1 | The `uv` environment on your computer | Every block, isolated, on the pins below (CPython 3.12.3, Linux aarch64) | The install commands; Windows itself (the pins' Windows wheels were resolved, below) |
| **PBI** Power BI | p1–p4, c1 | Power BI Desktop (Windows) | The files each query reads: header, keys, rows, sha256 (§0) | Power Query, DAX, visuals and refresh (§10 asks for one check on Windows) |
| arcpy (optional) | s4, s5 | ArcGIS Pro's own Python | — | Everything (needs ArcGIS Pro, Windows, licensed) |

### 3.1 Browser

Nothing to install: a current desktop browser opens a module page and its SQL runs there. The engine is 002 §1's, unchanged: DuckDB-WASM's `eh` bundle in a worker, served by critwire itself with its `parquet` extension, results capped at 10 000 rows, Reset and Stop by restarting the worker. The page builds its database from four files, `/v1/species.parquet`, `/v1/countries.parquet`, `/learn/data/datasets.csv` and `/learn/data/occurrences.parquet` (§0's `setup`; about 3.2 s on a desktop, §A.1), so every learner starts from the same tables and a reload starts fresh.

**Light spatial in plain SQL.** The browser has no `ST_` functions: DuckDB's `spatial` extension isn't served (23.6 MB per DuckDB version; §10 item 3). The foundations still use coordinates as numbers: a bounding box is `longitude BETWEEN … AND latitude BETWEEN …`, `floor(longitude / 10)` and `floor(latitude / 10)` bin records into 10° boxes, and the haversine formula gives a great-circle distance. Anything with shapes (outlines, projections, spatial joins and indexes) is PostGIS's.

### 3.2 PostGIS on your own computer

The labs are tested on PostgreSQL 16 with PostGIS 3.4. On Windows, the simplest match is Docker.

**Docker Desktop (recommended).** Install Docker Desktop with its WSL 2 backend (docs.docker.com/desktop/setup/install/windows-install/), then in PowerShell:

```powershell
# PostgreSQL 16 with PostGIS 3.4, the versions the labs are tested on, reachable only from this computer.
docker run -d --name learn-pg -e POSTGRES_PASSWORD=choose-a-password -p 127.0.0.1:5432:5432 -v learn-pg:/var/lib/postgresql/data postgis/postgis:16-3.4
docker exec learn-pg psql -U postgres -c "CREATE DATABASE learn"
docker exec learn-pg psql -U postgres -d learn -c "CREATE EXTENSION postgis" -c "CREATE EXTENSION postgis_raster"
# The lab file: every lab table, in one transaction (about 30 MB).
curl.exe -fLo learn_curriculum.sql https://critwire.com/learn/data/postgis/learn_curriculum.sql
docker cp learn_curriculum.sql learn-pg:/tmp/
docker exec learn-pg psql -X -U postgres -d learn -v ON_ERROR_STOP=1 -f /tmp/learn_curriculum.sql
```

The image tag `16-3.4` is the tested pair; it was last rebuilt in October 2024 (Docker Hub, checked 2026-10-23), so its PostgreSQL 16 minor release is old. That is fine for a lab reachable only from your own computer (the `127.0.0.1:` in `-p`), not for anything else. `16-3.5` and `16-3.6` run the labs too (none uses a function newer than 3.4), but a newer GEOS can change the last digits of some measurements, so a result may differ slightly from the one printed. PowerShell has no `<` redirection, which is why the file is copied in and read with `-f`. On Linux or macOS, the same `docker` commands work in a terminal, with `curl` for `curl.exe`. The image is built for x86-64 only.

**Native install (no Docker).** The EDB installer for PostgreSQL 16 (www.enterprisedb.com/downloads/postgres-postgresql-downloads), then Stack Builder → Spatial Extensions → the PostGIS 3.4 or 3.5 bundle for PostgreSQL 16. If port 5432 is taken (by another PostgreSQL, or an ArcGIS install), pick 5433 in the installer and add `-p 5433` below.

```powershell
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
& $psql -U postgres -c "CREATE DATABASE learn"
& $psql -U postgres -d learn -c "CREATE EXTENSION postgis" -c "CREATE EXTENSION postgis_raster"
curl.exe -fLo learn_curriculum.sql https://critwire.com/learn/data/postgis/learn_curriculum.sql
& $psql -X -U postgres -d learn -v ON_ERROR_STOP=1 -f learn_curriculum.sql
```

psql on Windows talks to the server in the console's code page unless told otherwise; the lab file sets `client_encoding` to UTF-8 itself, so names like "Côte d'Ivoire" arrive intact either way (tested by loading it under `WIN1252`).

**Loading, and loading again.** The lab file builds schema `learn_curriculum` in one transaction: it drops the schema, recreates it, loads every table, adds the keys and indexes, and checks every table's row count before `COMMIT`. A failed load changes nothing; a second load replaces the schema, including any table you made there, so keep your own work in another schema. Then connect with your SQL client (psql, pgAdmin, DBeaver, VS Code) to database `learn` and run §0's `pg-session` and `pg-smoke` blocks: the 14 row counts there mean your lab matches the tested one.

**Connection settings.** The Python labs, and any lab file you run with psql, find the database through libpq's standard environment variables, so the same file runs on your computer and on the test server. In PowerShell, for one session:

```powershell
$env:PGHOST = "localhost"; $env:PGPORT = "5432"; $env:PGUSER = "postgres"; $env:PGDATABASE = "learn"
# The password goes in %APPDATA%\postgresql\pgpass.conf, one line: localhost:5432:learn:postgres:choose-a-password
```

**Privileges.** The `postgres` user is a superuser and can do everything the labs do. As another user you need:
- `CREATE` on the database, to (re)create `learn_curriculum`, and ownership of that schema once it exists;
- `CREATEROLE`, for the labs that create roles (d1, d5, §0's `pg-role-smoke`): `ALTER ROLE <you> CREATEROLE;` as the superuser, once;
- for the raster labs (g7, s6), the two raster settings their session sets: a superuser session, or, on PostgreSQL 15 and later, 003 §4's `pg-once` grants (`GRANT SET ON PARAMETER`); g7 gives the block.

Every role or schema a lab creates is named `learn_…` and removed by the same block (§0), so the labs never leave anything in your database besides `learn_curriculum`.

### 3.3 Python

The Python labs (s2–s6, e1–e5, c1) run in a virtual environment built by `uv`, which uses the same commands on Windows, Linux and macOS, installs Python itself, and installs exactly the versions below. `--no-build` makes it fail loudly rather than compile a package that has no prebuilt wheel. Windows (PowerShell):

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/0.13.5/install.ps1 | iex"
mkdir $HOME\learn; cd $HOME\learn
curl.exe -fLo requirements.txt https://critwire.com/learn/labs/requirements.txt
uv python install 3.12
uv venv --python 3.12
uv pip sync --no-build requirements.txt
.venv\Scripts\python -c "import geopandas, esda; print(geopandas.__version__, esda.__version__)"
```

Linux and macOS:

```sh
curl -LsSf https://astral.sh/uv/0.13.5/install.sh | sh
mkdir -p ~/learn && cd ~/learn
curl -fLo requirements.txt https://critwire.com/learn/labs/requirements.txt
uv python install 3.12
uv venv --python 3.12
uv pip sync --no-build requirements.txt
.venv/bin/python -c "import geopandas, esda; print(geopandas.__version__, esda.__version__)"
```

A lab is a `.py` file with `# %%` cells: run it whole (`.venv\Scripts\python s4-moran.py`), or cell by cell in VS Code or Jupyter, which ask to add `ipykernel` to the environment the first time; the site also offers each lab as a notebook (`.ipynb`, the same cells; §7).

**The environment.** `requirements.in` names what the labs import, with the lowest versions they need (`geopandas>=1.0`, `shapely>=2.0`, `libpysal>=4.10`, `esda>=2.6`); `requirements.txt` pins every package to one version, compiled for every platform at once with `uv pip compile --universal --python-version 3.12 -o requirements.txt requirements.in`. The 44 pins have prebuilt wheels for Windows x86-64, Linux x86-64 and aarch64, and macOS 14 or later on Apple silicon: resolved with `--no-build` for each platform (`uv pip install --dry-run --python-platform …`). Intel Macs aren't covered (no `pyproj` 3.8.0 wheel). This is the file, verbatim:

```text
# This file was autogenerated by uv via the following command:
#    uv pip compile --universal --python-version 3.12 -o requirements.txt requirements.in
beautifulsoup4==4.15.0
    # via libpysal
certifi==2026.10.19
    # via
    #   pyogrio
    #   pyproj
    #   requests
charset-normalizer==3.5.2
    # via requests
cloudpickle==3.1.2
    # via joblib
contourpy==1.4.0
    # via matplotlib
cycler==0.12.1
    # via matplotlib
esda==2.10.0
    # via -r requirements.in
fonttools==4.67.0
    # via matplotlib
geoalchemy2==0.20.0
    # via -r requirements.in
geopandas==1.2.0
    # via
    #   -r requirements.in
    #   esda
    #   libpysal
    #   pointpats
idna==3.20
    # via requests
jinja2==3.1.6
    # via libpysal
joblib==1.6.0
    # via scikit-learn
kiwisolver==1.5.1
    # via matplotlib
libpysal==4.15.1
    # via
    #   -r requirements.in
    #   esda
    #   pointpats
mapclassify==2.11.0
    # via -r requirements.in
markupsafe==3.0.4
    # via jinja2
matplotlib==3.11.2
    # via
    #   -r requirements.in
    #   pointpats
narwhals==2.27.1
    # via scikit-learn
networkx==3.7
    # via mapclassify
numpy==2.5.4
    # via
    #   -r requirements.in
    #   contourpy
    #   esda
    #   geopandas
    #   libpysal
    #   mapclassify
    #   matplotlib
    #   pandas
    #   pointpats
    #   pyogrio
    #   scikit-learn
    #   scipy
    #   shapely
packaging==26.3
    # via
    #   geoalchemy2
    #   geopandas
    #   libpysal
    #   matplotlib
    #   pyogrio
pandas==3.1.0
    # via
    #   -r requirements.in
    #   esda
    #   geopandas
    #   libpysal
    #   mapclassify
    #   pointpats
pillow==13.0.0
    # via matplotlib
platformdirs==4.13.5
    # via libpysal
pointpats==2.6.0
    # via -r requirements.in
psycopg==3.3.6
    # via -r requirements.in
psycopg-binary==3.3.6 ; implementation_name != 'pypy'
    # via psycopg
pyarrow==26.0.0
    # via -r requirements.in
pyogrio==0.13.0
    # via
    #   -r requirements.in
    #   geopandas
pyparsing==3.3.3
    # via matplotlib
pyproj==3.8.0
    # via
    #   -r requirements.in
    #   geopandas
python-dateutil==3.0.0
    # via
    #   matplotlib
    #   pandas
requests==2.34.2
    # via
    #   -r requirements.in
    #   libpysal
scikit-learn==1.9.1
    # via
    #   esda
    #   libpysal
    #   mapclassify
scipy==1.18.1
    # via
    #   -r requirements.in
    #   esda
    #   libpysal
    #   mapclassify
    #   pointpats
    #   scikit-learn
shapely==2.2.0
    # via
    #   -r requirements.in
    #   esda
    #   geopandas
    #   libpysal
    #   pointpats
six==1.17.0
    # via python-dateutil
soupsieve==3.0.4
    # via beautifulsoup4
sqlalchemy==2.1.6
    # via
    #   -r requirements.in
    #   geoalchemy2
threadpoolctl==3.7.0
    # via scikit-learn
typing-extensions==4.16.0
    # via
    #   beautifulsoup4
    #   psycopg
    #   sqlalchemy
tzdata==2026.5
    # via
    #   pandas
    #   psycopg
    #   python-dateutil
urllib3==2.8.0
    # via requests
```

Every Python lab starts with §0's `py-connect` helper, which connects through the `PG*` settings above and puts `learn_curriculum` first on the search path. To move data to another GIS, write a GeoPackage: one file, read by ArcGIS Pro, QGIS and GDAL alike. This block writes the 5 km hexagons s4 builds (§5.4) to `s4_cells.gpkg` and reads the file back.

```python
# q: gpkg-export
# status: ran
# after: py-connect
import geopandas as gpd
import pyogrio
from sqlalchemy import create_engine

engine = create_engine("postgresql+psycopg://", creator=connect)
cells = gpd.read_postgis("SELECT id, n, y, geom FROM s4_cells WHERE edge_m = 5000 ORDER BY id", engine, geom_col="geom")
cells.to_file("s4_cells.gpkg", layer="s4_cells", driver="GPKG")

info = pyogrio.read_info("s4_cells.gpkg", layer="s4_cells")
back = gpd.read_file("s4_cells.gpkg", layer="s4_cells")
print("layer: s4_cells")
print("crs:", back.crs.to_string())
print("geometry:", info["geometry_type"])
print("fields:", ", ".join(info["fields"]))
print("rows:", len(back), "records:", int(back["n"].sum()))
```

```text
-- result: gpkg-export · python · sha256 d91667382d4a
layer: s4_cells
crs: EPSG:3577
geometry: Polygon
fields: id, n, y
rows: 1094 records: 1972
```

### 3.4 arcpy notes (ArcGIS Pro)

For anyone with ArcGIS Pro (Basic is enough); optional, and never needed by a lab.
- arcpy lives in Pro's own conda environment, `arcgispro-py3`. Don't pip-install into it; if a lab package is needed there, clone the environment in Pro (Settings → Package Manager → Environment Manager) and add it to the clone.
- Keep the `uv` environment for the labs, and pass data between the two as a GeoPackage (the block above). Pro shows a GeoPackage's layers as `main.<name>`.
- Pro Basic's Spatial Statistics toolbox covers s4 and s5: Spatial Autocorrelation (Global Moran's I) and Hot Spot Analysis (Getis-Ord Gi*). Pro reports Moran's z-score under the randomization assumption, so compare it with esda's `z_rand`, not `z_norm` (s4 prints both).

```python
# q: arcpy-moran
# status: untested: ArcGIS Pro (Windows, licensed)
# s4's global Moran's I on the 5 km hexagons, in ArcGIS Pro's Python window. Fixed distance band of 10,000 m
# (twice the edge, as s4), distances between polygon centroids, row-standardized weights.
import arcpy

cells = r"C:\Users\you\learn\s4_cells.gpkg\main.s4_cells"
result = arcpy.stats.SpatialAutocorrelation(
    cells, "y", "NO_REPORT", "FIXED_DISTANCE_BAND", "EUCLIDEAN_DISTANCE", "ROW", "10000 Meters"
)
moran_i, z_score, p_value = (float(result.getOutput(k)) for k in range(3))
print(f"I = {moran_i:.6f}  z = {z_score:.6f}  p = {p_value:.3g}")
# Expected, from s4: I = 0.273296 and z close to esda's z_rand, 15.246590.
```

### 3.5 Power BI Desktop

Power BI Desktop is free and Windows-only (Microsoft Store, or www.microsoft.com/power-platform/products/power-bi/desktop). It reads the star d6 builds, as CSV files under `https://critwire.com/learn/data/star/` (§4): no gateway, no account, no database connection. To check the setup, make a blank query (Home → Get data → Blank query → Advanced editor) and paste this. Power BI asks how to connect to critwire.com the first time: choose **Anonymous**, privacy level **Public**.

```m
// q: pbi-smoke
// status: untested: Power BI is Windows-only
// input: star/dim_country.csv
let
    Source = Web.Contents("https://critwire.com", [RelativePath = "learn/data/star/dim_country.csv"]),
    Rows = Csv.Document(Source, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
    Promoted = Table.PromoteHeaders(Rows, [PromoteAllScalars = true]),
    Typed = Table.TransformColumnTypes(Promoted, {{"country_code", type text}, {"name", type text}, {"continent", type text}, {"region", type text}, {"subregion", type text}}, "en-US")
in
    Typed
```

It should show 251 rows: 250 countries and `ZZ`, d6's unknown member for records in no country; Namibia's code `NA` stays text. Three choices make it refresh anywhere:
- **A fixed base URL**, with the file in `RelativePath`: the Power BI Service can then refresh the published report on a schedule, with anonymous access. A whole URL assembled from text (`"https://critwire.com/learn/data/star/" & file`) is a dynamic data source, which the Service won't refresh.
- **`Encoding = 65001`** (UTF-8) and `QuoteStyle.Csv`: names with accents and commas inside quotes are read as written.
- **The culture `"en-US"`** on the type change: critwire's files write `12.5`, and a computer set to a comma-decimal locale would otherwise misread it.

p1 (§5.6) turns this into one function for all eight tables. **Tested here:** every file a Power BI block names, against the star's manifest (header, unique and filled keys, foreign keys, row count, sha256), in each run (§0). **Not tested:** whether Power BI evaluates the M, the DAX results, the visuals and the refresh: Power BI has no Linux version. §10 asks the owner for one check on Windows.

## 4. Lab data

Every lab reads the same handful of files. critwire's build writes them from snapshots committed in `data/`, as it writes the species files, and publishes them under **`/learn/data/`**, not `/v1`. `/v1` promises "only additions": a file there never loses a column or changes meaning. Lab files will be redrawn and resized as the course changes, so they live outside that promise. The one `/v1` addition is 002's `countries` file (§1). The numbers below were measured in the spike (§A; `SP/out/lab-data/`, `SP/out/etl-postgis/`, `SP/out/loader/`); the build missions (§9) rebuild the files and re-measure.

### 4.1 The datasets

| Dataset | License (quoted in) | Files under `/learn/data/` | Rows | Bytes | Modules | Built by |
|---|---|---|---|---|---|---|
| GBIF open-records sample | per record CC0 1.0 or CC BY 4.0, after the effective-license rule (4.2) (003 D3); the download's DOI, and a derived-dataset DOI of its own | `occurrences.parquet`, `occurrences.csv`, `datasets.csv` | 40,395 records; 400 datasets | 622,971; 4,591,948; 72,797 | f2–f4, d2–d6, g3–g6, s1–s6, e1–e5, p1–p4, c1 | L1 |
| Natural Earth admin-0, 1:50m, v5.1.2 | public domain (003 D2, 002 §6) | `country_shapes.parquet` (GeoParquet) | 247 | 1,206,307 | g1–g7, s1, s6 | L1 |
| Natural Earth admin-1, 1:50m | public domain (003 D10) | `admin1_shapes.parquet` (GeoParquet) | 294, in 9 countries | 870,947 | g4, g6, s2–s5 | L1 |
| RESOLVE Ecoregions 2017, simplified to 0.05° | CC BY 4.0 (003 D9) | `ecoregions.parquet` (GeoParquet), `biomes.csv` | 847; 14 | 6,686,262; 518 | g4, s6 | L1 |
| Countries (Natural Earth attributes) | public domain (002 §6) | `/v1/countries.{parquet,csv,json}` | 250 | a few KB | every module | L1 |
| Jung et al. 2020 habitat map, v004: classes and country summaries | CC BY 4.0 (003 D4, §5) | `habitat_classes.parquet`, `country_habitats.parquet`; L3 adds `occurrence_habitats.parquet` | 75; 35 (A2's stand-ins until L3) | 2,488; 850 | g7, s6, p2–p3 | L3 |
| Jung v004 clips, Costa Rica and Tasmania | CC BY 4.0 (003 D4) | `clips/{cr,tas}.tif` (cloud-optimized GeoTIFF) | 2 rasters | ≈ 3 MB (estimate; A2 measured the Costa Rica clip at 1.42 MB) | g7, s6 | L3 |
| The PostGIS loader | inherits the above | `postgis/learn_curriculum.sql` | 14 tables | 21,330,577 | every PostGIS module | build (L1; grown in L3) |
| The star export | inherits the above; credits in its own manifest | `star/*.csv` (8 files), `star/manifest.json` | §A.3 | 4,576,053; 10,995 | d6, p1–p4 | build (L2: the records fact; L5: the habitat fact) |
| The manifest | | `manifest.json` (4.5) | | 12,006 | every module | build (L1) |

Notes on the shapes (`SP/out/lab-data/summary.md`):
- **GeoParquet 1.0.0**: WKB geometry in a `geom` column, its bounding box, longitude-latitude (CRS84), zstd compression, rows sorted by key. The same inputs write byte-identical files.
- **Admin-1 covers 9 countries only** (AU 9, BR 27, CA 13, CN 31, ID 33, IN 36, RU 85, US 51, ZA 9 rows), as Natural Earth's 1:50m layer does. Tasmania is one row, `AUS-2660`. The key is `adm1_code`; Natural Earth's `iso_3166_2` is dropped, because one value (Jervis Bay's `AU-X02~`) isn't a real code.
- **RESOLVE is simplified feature by feature**, keeping topology, at 0.05° (about 5 km, close to the detail of the 1:50m outlines beside it). The source has 15,164,376 vertices; 0.05° keeps 545,976. The finest tolerance that fits 8 MB was 0.05°: 0.02° gives 9,880,579 bytes. Because each ecoregion is simplified on its own, neighbours no longer share an exact border, and small gaps and overlaps appear between them (g2 and g4 use this).
- **"Rock and Ice"** (`ECO_ID` 0) has no biome or realm in RESOLVE (`N/A`), so its `biome_id` and `realm` are NULL, a nullable foreign key like `occurrences.country_code`. Any other `N/A` fails the build.
- **Invalid shapes are kept on purpose**, for g2: one ring self-intersection in admin-1; 3 nested shells and 7 ring self-intersections in the simplified ecoregions (the source shapefile has 69 self-intersections). The admin-0 shapes are all valid. Every country code in the shapes has a `countries` row.

**How each is built.** One command per step, in the order critwire's ingests already use (ingest → derive → build; `AGENTS.md`):
- **GBIF sample** (L1): `pnpm ingest gbif-sample` submits the download (or reuses the one in `download.json`), waits, fetches the zip to a temporary folder, applies the species rule, the effective license, the country-key contract and the cap (4.2), reads each dataset's and publisher's metadata, and commits `data/raw/gbif-sample/`. `pnpm derive` writes the sample's per-dataset counts. `pnpm gbif:register --target learn-sample` mints its derived-dataset DOI. `pnpm build` writes the three files, the loader's two tables and the manifest.
- **Natural Earth and RESOLVE** (L1): an ingest downloads the pinned sources (Natural Earth's commit `f1890d9f…`; RESOLVE's `Ecoregions2017.zip`, read in place, never extracted), writes the GeoParquet files above and commits them under `data/`. The build copies them and puts the same shapes in the loader.
- **Habitat summaries and clips** (L3): `pnpm ingest habitat` (003 §5) computes the summaries and the class at each sample record from v004, and cuts the two clips; the build publishes them and adds their tables to the loader.
- **Loader, star and manifest**: written by `pnpm build` from the files above; nothing new is committed for them.

### 4.2 The GBIF sample

**Where it comes from: the occurrence download API.** 003 D3 drew a few hundred records per species inside `ingest gbif`, through GBIF's search API: pages of 300, a subset of what the countries DOI (`10.15468/dd.ky9cyt`) counts, and no DOI of its own. The labs need tens of thousands of records, and a source learners can cite and fetch again. GBIF's download API gives both: it runs the query as a job, archives the result under a DOI and has no paging limit. The sample is refreshed on its own; `ingest gbif`, `contributions.json` and the countries DOI stay as they are. The spike's download: key `0041824-260928105237408`, DOI `10.15468/dl.fbpk9w`, ready 16 min 41 s after it was submitted, a 34,725,756-byte zip holding 394,532 records from 454 datasets (§A.1).

**The predicate is critwire's countries rule**, so the sample and the countries field count the same kind of record (`SP/downloads/gbif-request/request.json`):
- `TAXON_KEY in` the 73 `ids.gbif` in `data/species.json`;
- `LICENSE in [CC0_1_0, CC_BY_4_0]`, `HAS_COORDINATE = true`, `HAS_GEOSPATIAL_ISSUE = false`, `OCCURRENCE_STATUS = PRESENT`;
- `BASIS_OF_RECORD in` the 7 values the countries rule keeps (no living or fossil specimens);
- format `SIMPLE_CSV`.

**`checklistKey` is pinned** to the legacy GBIF Backbone (`d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`), at the top of the request and on `TAXON_KEY`. critwire's `ids.gbif` are keys in that backbone. GBIF documents it as the download API's default today, but also calls it obsolete, and the search API's default has already moved to the Catalogue of Life checklist. A pipeline shouldn't depend on a default its provider has said will change, so the request names its taxonomy. GBIF accepted both keys and echoes them in the stored request; `fetch` checks the echo (e1).

**From download to sample** (`SP/out/etl-postgis/summary.md`):

| Stage | Records |
|---|---|
| the download (`totalRecords`; equal to the search count at submission) | 394,532 |
| loaded and typed, every check passed | 394,532 |
| effective license CC0 1.0 or CC BY 4.0 | 381,065 |
| at most 2,000 per species, by ascending `md5` of the `gbifID` text | **40,395** (28,187 CC BY 4.0, 12,208 CC0 1.0) |

- **Species.** A record belongs to the species whose `ids.gbif` is its `speciesKey`, else its `taxonKey`; a record that names no species, or two, fails the run. Four of critwire's keys are synonyms in the backbone (Blanding's turtle, Baird's tapir, Temminck's and giant pangolins): GBIF files their 2,385 records under the accepted name's `speciesKey` and keeps critwire's key in `taxonKey` (e2).
- **Effective license.** A record's license is the more restrictive of its own and its dataset's (CC0 < CC BY < CC BY-NC). 11 datasets declare CC BY-NC 4.0 while GBIF labels their 13,467 records CC0 or CC BY; those records are left out. A record that is CC0 in a CC BY dataset is published as CC BY and credited. §10 asks the owner whether to keep this rule.
- **The cap.** At most 2,000 records per species, chosen by ascending `md5(gbifID)`. Any engine computes the same hash, so DuckDB, PostgreSQL and Python pick the same records, and a refresh changes only what GBIF changed. 71 species have records: 13 reach the cap, 33 have fewer than 100, and the median is 111. The Ili pika has no open record; the Yangtze giant softshell turtle's only record sits in a CC BY-NC dataset. Uncapped, the open records would be 4,791,485 bytes as Parquet and 44,556,230 as CSV; they are never published.
- **Columns** (`occurrences`, the same in every file and both databases): `id` (GBIF's `gbifID`), `species_id`, `dataset_key`, `license` (effective, `CC0 1.0` or `CC BY 4.0`), `basis_of_record`, `longitude`, `latitude`, `coordinate_uncertainty_m`, `country_code_gbif`, `country_code`, `year`, `month`. The PostGIS lab adds `geom`, a stored point generated from the coordinates (SRID 4326, GiST-indexed).

**The country-key contract**, one rule applied once, where the sample is written; no lab re-derives it:
- `country_code_gbif` is GBIF's `countryCode` as delivered, NULL when empty. g3 compares it with the outlines.
- `country_code` is that code when `countries` has it, else NULL: a nullable foreign key to `countries`, in the browser and in PostGIS alike.
- Two values are known not to be countries: `ZZ` (unknown or invalid) and `XZ` (international waters). They give a NULL `country_code`. Any other code with no `countries` row fails the run and names the code, because it means the countries file has a gap (fixed by 002 §6's matching rule).
- The star maps a NULL to one unknown member, `dim_country` `ZZ` "Unknown or outside any country", so its foreign keys are never NULL (d6).
- In the spike's download all 112 codes were `countries` rows, and no `ZZ`, `XZ` or empty code came through (the geospatial-issue filter removes them), so `country_code` is never NULL in this sample. The contract stays for later refreshes.

**Dataset metadata.** For each dataset in the download, `GET https://api.gbif.org/v1/dataset/<key>` gives its title, DOI and license, and once per publisher `GET https://api.gbif.org/v1/organization/<key>` gives the publisher's name: 454 datasets and 233 publishers, read at 2 requests a second or fewer in 5 min 55 s. Every dataset had a title, a publisher and a DOI; none was deleted. A dataset GBIF deletes later keeps its title and records the deletion date; an unknown license fails the ingest. Licenses: CC BY 4.0 311, CC0 1.0 132, CC BY-NC 4.0 11. The 400 datasets left in the sample go into `datasets` (`dataset_key`, `title`, `publisher`, `doi`, `license`: the dataset's declared license). Record counts aren't stored: they are a query (d2), and one dataset (iNaturalist research-grade) holds records under two licenses, which is why `license` belongs on `occurrences`.

**Registration.** The sample is a reduced subset of the download, so GBIF's rules for citing it are those of a derived dataset: L1 registers it as its own, with its per-dataset counts and `originalDownloadDOI` set to the download's DOI. `pnpm gbif:register` gains `--target learn-sample`; its deposit tags are `gbif-learn-<hex12>`. The countries target and its `gbif-dd-*` tags don't change. A plain build refuses a missing or stale sample DOI, as it does for the countries DOI, and the refresh follows `AGENTS.md`'s DOI steps with the new target. GBIF deletes an uncited download after six months (the spike's on 2027-04-23), so L1 makes its own download and registers that one.

**What's committed**, under `data/raw/gbif-sample/`:
- `download.json`: the key, DOI, request, `totalRecords`, the zip's sha256 and every dataset's count in the full download (the spike's: 25,403 bytes);
- `datasets.json`: the metadata above, keys sorted, one `retrieved` time (241,891 bytes);
- `sample.csv`: the capped rows, sorted by `id` (about the size of `occurrences.csv`, 4.6 MB).

The ingest applies the cap, so `data/` is the whole snapshot and `pnpm derive` never needs the zip. The full download and the zip are never committed: GBIF archives the download under its DOI, which is how anyone reproduces the sample.

### 4.3 The loader

`postgis/learn_curriculum.sql` builds the PostGIS lab with nothing but `psql` and PostGIS (§0, §3.2): `psql -X -v ON_ERROR_STOP=1 -d <your database> -f learn_curriculum.sql`. It is one transaction, so a failed load leaves the previous schema as it was:
- `\set ON_ERROR_STOP on`, `BEGIN`, `SET client_encoding = 'UTF8'` (psql on Windows talks in the console's code page and would garble names), then `DROP SCHEMA IF EXISTS learn_curriculum CASCADE`, `CREATE SCHEMA learn_curriculum` and `SET LOCAL search_path = learn_curriculum, public`.
- The tables, then each table's rows as `COPY … FROM stdin (FORMAT csv)`. csv format reads a backslash as plain text; the text format would silently change rows (F10, e2).
- Shapes arrive as base64 text and become geometry afterwards: `ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326))`, one type per column (MultiPolygon, SRID 4326). Base64 takes a third less room than `bytea`'s hex form: the loader is 21,330,577 bytes instead of 29,598,105, with identical geometries.
- Then primary, unique and foreign keys, GiST indexes and `ANALYZE` on every table.
- Then a check that raises on failure: each table's row count equals the build's, and every geometry has SRID 4326. Shapes may be invalid (g2), so validity isn't checked.
- `COMMIT`. The file references no table outside `learn_curriculum`; only PostGIS's functions come from `public`. Loading it again replaces the schema, tables you made there included, and its first lines say so.

In the spike it loads in 1.6 s, twice in a row, with the same rows each time: `admin1_shapes` 294, `biomes` 14, `countries` 250, `country_habitats` 35, `country_shapes` 247, `datasets` 400, `ecoregions` 847, `habitat_classes` 75, `occurrences` 40,395, `sources` 5, `species` 76, `species_countries` 472, `species_sources` 591, `taxa` 143 (`pg-smoke`, §0). The browser holds the same rows in its eight tables:

```sql
-- q: lab-sizes
-- status: ran
SELECT 'taxa' AS table_name, count(*) AS n_rows FROM taxa
UNION ALL SELECT 'species', count(*) FROM species
UNION ALL SELECT 'sources', count(*) FROM sources
UNION ALL SELECT 'species_sources', count(*) FROM species_sources
UNION ALL SELECT 'countries', count(*) FROM countries
UNION ALL SELECT 'species_countries', count(*) FROM species_countries
UNION ALL SELECT 'datasets', count(*) FROM datasets
UNION ALL SELECT 'occurrences', count(*) FROM occurrences
ORDER BY table_name;
```

```text
-- result: lab-sizes · 8 rows · sha256 792e5293a528
table_name | n_rows
countries | 250
datasets | 400
occurrences | 40395
sources | 5
species | 76
… 3 more rows
```

### 4.4 The cap: 50 MB

The build refuses when `dist/learn/data/` exceeds 50,000,000 bytes, or when the committed lab data (`data/raw/gbif-sample/` and the other lab snapshots) does. The browser engine's `parquet` extension (3.22 MB) is counted apart, under 002 §10 item 3.

| `/learn/data/` | Bytes |
|---|---|
| now (the spike, after L1's files): 10 files and the manifest | 35,397,671 |
| + L2's star (8 CSV files and its manifest) | 39,984,719 |
| + L3's habitat files and clips, about 3.2 MB, and their loader tables, about 0.7 MB for `occurrence_habitats` plus the clips as rasters (estimates) | ≈ 44–48 MB |

The committed lab data in the spike (`SP/data/learn/`: the shapes, the stand-in habitat summaries and the sample files) is 14,055,088 bytes; L1's `data/raw/gbif-sample/` adds about 4.9 MB in place of the sample files.

With hex geometry the loader was 29,598,105 bytes, and the same projection came to about 52–58 MB, over the cap once L3 landed. Base64 brought it back under, with no change to any table. If L3's measured total is still over, the cuts go in this order, and each keeps the browser and PostGIS on the same data: RESOLVE is simplified further, in the file and the loader alike, using the same tolerance probe; then the CSV copy of the sample goes, since every reader also takes Parquet; then the Tasmania clip leaves the loader, and g7 keeps Costa Rica's. The loader and the sample's Parquet are cut last: every PostGIS module needs the one, and every browser module the other.

### 4.5 Credits

`/v1/attribution.json` stays about the species files, plus 002 §6's Natural Earth entry. The lab files are credited in **`/learn/data/manifest.json`**: for each file its columns, rows, bytes, sha256 and `sources[]` (`name`, `license`, `licenseUrl` from `scripts/build/sources.ts` `licenseUrl()`, `citation`, `doi` where there is one, `url`). In the spike's manifest:
- the sample's three files: GBIF's citation of the download, "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w", plus `"datasets": "datasets.csv"` for each dataset's credit; from L1 also the sample's derived-dataset DOI;
- the Natural Earth shapes: public domain, credited anyway ("Made with Natural Earth");
- RESOLVE: CC BY 4.0, Dinerstein et al. 2017, BioScience 67(6), doi 10.1093/biosci/bix014;
- the habitat files: CC BY 4.0, Jung et al. 2020 and the map's version (003 §5), doi 10.5281/zenodo.4058819;
- the loader: every source of the tables it holds, critwire's own data included.

One `credits(file)` function writes these entries and the star's (`star/manifest.json`, §A.3); `dim_dataset` carries the `datasets` columns. The build refuses a lab file with no `sources`, a license missing from `LICENSE_URLS`, a CC BY source with no citation, and a dataset in the sample with no title or publisher. The `/learn/data/` index page lists the files, their sources and the dataset table (title, publisher, DOI link, license, records in the sample).

The same check, as a query any lab can run: datasets in the sample that couldn't be credited properly. There are none.

```sql
-- q: lab-credits
-- status: ran
SELECT d.dataset_key, d.title, d.publisher, count(*) AS records
FROM occurrences AS o
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE coalesce(trim(d.title), '') = '' OR coalesce(trim(d.publisher), '') = ''
GROUP BY d.dataset_key, d.title, d.publisher
ORDER BY d.dataset_key;
```

```text
-- result: lab-credits · 0 rows · sha256 3c8b3286886e
dataset_key | title | publisher | records
```

### 4.6 Who can read the files (CORS)

critwire's web server sends `Access-Control-Allow-Origin: *` on `/v1/*` only (F7), and no lab reader needs more: DuckDB-WASM on critwire's own pages reads `/learn/data/` from the same origin, and PostgreSQL, Python and Power BI aren't browsers, so the rule doesn't apply to them. Only a page on another site, reading the lab files in its visitors' browsers, would need CORS on `/learn/data/`. §10 leaves that to the owner: it is one Caddy rule, made from the control room.

## 5. Modules

### 5.1 Foundations

Four modules, six hours, all in the browser: enough SQL to read every later module. They go fast and assume you can already use a spreadsheet. Each opens with **Already know this?**: an exercise that uses the whole module; solve it and the module is marked done. The tables are §0's browser setup (schema v2, §6.1); the Schema button shows the ERD on every page.

#### f1 · select

**Tool:** B (browser) · **Time:** 1.0 h · **Prereqs:** none

**Already know this?** Show the `id`, `common_name` and `photo_license` of every animal whose photo isn't under a Creative Commons license (the license doesn't start with `CC`), animals with no photo included, by common name.

```sql
-- q: f1-skip
-- status: ran
SELECT id, common_name, photo_license
FROM species
WHERE photo_license NOT LIKE 'CC%' OR photo_license IS NULL
ORDER BY common_name;
```

```text
-- result: f1-skip · 10 rows · sha256 614eaf6db760
id | common_name | photo_license
26 | Black-footed Ferret | Public domain
54 | Brown-throated Sloth | Public domain
19 | Floreana Giant Tortoise | NULL
37 | Greater Bilby | Public domain
47 | Ili Pika | NULL
… 5 more rows
```

**Concept:** A query reads tables and returns a new table; it never changes the data. Its clauses run in a fixed order, whatever order you write them in: `FROM` picks the table, `WHERE` keeps the rows whose condition is true, `SELECT` picks and names the columns, `ORDER BY` sorts, and `LIMIT` keeps the first rows. A table has no order of its own, so a result without `ORDER BY` can come back in any order, and "the first five" means nothing without it; sort on something unique (add `id` last) so that ties always fall the same way.

`NULL` is a missing value: not zero, not empty text, but "unknown". Any comparison with an unknown value is itself unknown, neither true nor false, and `WHERE` keeps only rows where the condition is true. So `= NULL` never matches, and `NOT LIKE 'CC%'` silently drops the rows whose license is `NULL`, because "is an unknown license not CC?" is unknown too. Test for a missing value with `IS NULL` or `IS NOT NULL`; `coalesce(x, 'default')` replaces one.

**Worked example:** Which animals have no photo? `photo_url` is `NULL` where critwire has none:

```sql
-- q: f1-no-photo
-- status: ran
-- show: cards
SELECT id, common_name, photo_url
FROM species
WHERE photo_url IS NULL
ORDER BY id;
```

```text
-- result: f1-no-photo · 2 rows · sha256 cb073c536764
id | common_name | photo_url
19 | Floreana Giant Tortoise | NULL
47 | Ili Pika | NULL
```

The same question asked with `=` finds nothing, whatever the data:

```sql
-- q: f1-equals-null
-- status: ran
SELECT count(*) AS animals
FROM species
WHERE photo_url = NULL;
```

```text
-- result: f1-equals-null · 1 row · sha256 5b42c9c5b42a
animals
0
```

Why: each comparison below involves an unknown, so its answer is unknown (shown as `NULL`), except `IS NULL`, which asks exactly that question, and `coalesce`, which picks the first known value.

```sql
-- q: f1-unknown
-- status: ran
SELECT NULL = NULL AS equal,
       NULL <> 'CC BY 4.0' AS not_equal,
       NULL IS NULL AS is_null,
       coalesce(NULL, 'no photo') AS replaced;
```

```text
-- result: f1-unknown · 1 row · sha256 8fe6606addf8
equal | not_equal | is_null | replaced
NULL | NULL | true | no photo
```

**Lab:** Which mammals does critwire list, by common name?
1. `species` has no class column; the view `species_taxonomy` has one row per species with its class, order, family and genus. Look at its first rows:

```sql
-- q: f1-taxonomy
-- status: ran
SELECT * FROM species_taxonomy ORDER BY species_id LIMIT 5;
```

```text
-- result: f1-taxonomy · 5 rows · sha256 f5df850ee9a4
species_id | class | order_name | family | genus
1 | Reptilia | Testudines | Emydidae | Emydoidea
2 | Reptilia | Testudines | Trionychidae | Apalone
3 | Amphibia | Anura | Rhinodermatidae | Rhinoderma
4 | Reptilia | Testudines | Platysternidae | Platysternon
5 | Amphibia | Anura | Rhacophoridae | Rhacophorus
```

2. Keep the species whose id is among the mammals' ids. `IN (…)` is true when a value is in a list, and the list can be another query's result; f3 shows the usual way to do this, a join.

```sql
-- q: f1-mammals
-- status: ran
-- show: cards
SELECT id, common_name, scientific_name
FROM species
WHERE id IN (SELECT species_id FROM species_taxonomy WHERE class = 'Mammalia')
ORDER BY common_name, id;
```

```text
-- result: f1-mammals · 50 rows · sha256 8f1036b368d6
id | common_name | scientific_name
57 | Aardvark | Orycteropus afer
50 | Addax | Addax nasomaculatus
41 | African Forest Elephant | Loxodonta cyclotis
64 | African Savanna Elephant | Loxodonta africana
65 | African Wild Dog | Lycaon pictus
… 45 more rows
```

3. A page shows a few rows at a time: `LIMIT` takes a page and `OFFSET` skips the pages before it. The second page of five:

```sql
-- q: f1-page
-- status: ran
-- show: cards
SELECT id, common_name, scientific_name
FROM species
WHERE id IN (SELECT species_id FROM species_taxonomy WHERE class = 'Mammalia')
ORDER BY common_name, id
LIMIT 5 OFFSET 5;
```

```text
-- result: f1-page · 5 rows · sha256 770d407d9b02
id | common_name | scientific_name
71 | Andean Bear | Tremarctos ornatus
28 | Asian Elephant | Elephas maximus
23 | Aye-aye | Daubentonia madagascariensis
70 | Baird's Tapir | Tapirus bairdii
66 | Black Rhinoceros | Diceros bicornis
```

**Result:** Two animals have no photo, and `= NULL` counts zero of them. The mammals come back A to Z; the second page is rows 6 to 10 of that same order, which is only stable because the sort ends on a unique column. In the skip exercise, dropping `OR photo_license IS NULL` loses exactly the two animals with no photo, a mistake that looks like a correct result.

**Exercise:** critwire links each animal to other catalogues through outside ids (`gbif_id`, `ncbi_id`, `inaturalist_id`, `wikidata_id`). Which animals are missing at least one of them? Show `id`, `common_name` and the four ids, by `id`.

**Answer:**

```sql
-- q: f1-ex
-- status: ran
SELECT id, common_name, gbif_id, ncbi_id, inaturalist_id, wikidata_id
FROM species
WHERE gbif_id IS NULL OR ncbi_id IS NULL OR inaturalist_id IS NULL OR wikidata_id IS NULL
ORDER BY id;
```

```text
-- result: f1-ex · 6 rows · sha256 4bd9d867b18a
id | common_name | gbif_id | ncbi_id | inaturalist_id | wikidata_id
1 | Blanding's Turtle | 2442885 | NULL | 39885 | Q185526
9 | Dyeing Poison Dart Frog | NULL | 92724 | 21141 | Q1478869
19 | Floreana Giant Tortoise | NULL | 66189 | 57386 | Q486672
27 | Western Long-beaked Echidna | NULL | 33543 | 75237 | Q635949
35 | Red Panda | 5219446 | 9649 | NULL | Q41960
… 1 more row
```

The three animals with no GBIF id are the ones whose identity in GBIF critwire hasn't settled (their `range_status` says so), so they have no records in the lab sample either: f3 finds them again with an anti join.

**Check:** `result, any row order`: your rows must equal the answer's, column by column (002 §4's check). The skip exercise is checked the same way.

**Dialects:**
- **PostgreSQL:** as here. Ascending sorts put `NULL` last (`NULLS FIRST` changes that); `LIKE` is case-sensitive and `ILIKE` isn't; `LIMIT … OFFSET …`, or the standard `OFFSET … FETCH FIRST n ROWS ONLY`.
- **DuckDB:** as PostgreSQL for everything in this module: `NULL` sorts last, `LIKE` and `ILIKE`, `LIMIT` and `OFFSET`. It adds conveniences such as `SELECT * EXCLUDE (photo_url)`.
- **SQL Server:** `SELECT TOP (5) …`, or `ORDER BY … OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY`; `NULL` sorts first in ascending order and there is no `NULLS LAST`; `LIKE` follows the column's collation, usually case-insensitive; `= NULL` never matches, as here, under the default `ANSI_NULLS ON`.

#### f2 · aggregate

**Tool:** B (browser) · **Time:** 1.5 h · **Prereqs:** f1

**Already know this?** For each species with records from more than 25 datasets, show `species_id`, its records, its datasets, its preserved specimens (`basis_of_record` `PRESERVED_SPECIMEN`) and its records with no year, most records first.

```sql
-- q: f2-skip
-- status: ran
SELECT species_id,
       count(*) AS records,
       count(DISTINCT dataset_key) AS datasets,
       sum(CASE WHEN basis_of_record = 'PRESERVED_SPECIMEN' THEN 1 ELSE 0 END) AS specimens,
       count(*) - count(year) AS no_year
FROM occurrences
GROUP BY species_id
HAVING count(DISTINCT dataset_key) > 25
ORDER BY records DESC, species_id;
```

```text
-- result: f2-skip · 16 rows · sha256 b6cf06e04b0c
species_id | records | datasets | specimens | no_year
2 | 2000 | 53 | 1844 | 362
8 | 2000 | 31 | 1997 | 109
25 | 2000 | 38 | 102 | 129
52 | 2000 | 67 | 73 | 45
53 | 2000 | 48 | 35 | 14
… 11 more rows
```

**Concept:** An aggregate function turns many rows into one value: `count(*)` counts rows, `count(year)` counts the rows where `year` isn't `NULL`, `count(DISTINCT dataset_key)` counts different values, and `sum`, `min`, `max` and `avg` do what they say; all but `count(*)` skip `NULL`s. `GROUP BY` splits the rows into groups, one per distinct value of its columns (`NULL` makes a group of its own), and the aggregates then run once per group, so every column you select must be grouped or aggregated. The clauses now run in this order: `FROM`, `WHERE` (filters rows), `GROUP BY`, `HAVING` (filters groups, so it can use aggregates), `SELECT`, `ORDER BY`. `CASE WHEN … THEN … ELSE … END` computes a value row by row: use it to put rows into buckets, or inside `sum` to count only some rows, which turns one grouped query into a small cross-tab.

The table is `occurrences`, the lab sample of open GBIF records (§4): one row per record of an animal at a place and, usually, a date. `basis_of_record` says what kind of evidence it is: a person's observation, a camera trap or GPS collar (`MACHINE_OBSERVATION`), a museum specimen, a tissue sample.

**Worked example:** How many records does the sample hold per year, and by basis of record? First the whole table in one row:

```sql
-- q: f2-count
-- status: ran
SELECT count(*) AS records,
       count(year) AS with_year,
       count(DISTINCT species_id) AS species,
       min(year) AS first_year,
       max(year) AS last_year
FROM occurrences;
```

```text
-- result: f2-count · 1 row · sha256 272a447603cd
records | with_year | species | first_year | last_year
40395 | 38106 | 71 | 1599 | 2026
```

Records per year, for the last ten years and this one. `WHERE` keeps the rows before they are grouped:

```sql
-- q: f2-years
-- status: ran
SELECT year, count(*) AS records
FROM occurrences
WHERE year >= 2016
GROUP BY year
ORDER BY year;
```

```text
-- result: f2-years · 11 rows · sha256 33cda711b580
year | records
2016 | 1526
2017 | 2643
2018 | 1458
2019 | 1336
2020 | 1663
… 6 more rows
```

Records by basis of record:

```sql
-- q: f2-basis
-- status: ran
SELECT basis_of_record, count(*) AS records
FROM occurrences
GROUP BY basis_of_record
ORDER BY records DESC, basis_of_record;
```

```text
-- result: f2-basis · 7 rows · sha256 23bce085dee0
basis_of_record | records
HUMAN_OBSERVATION | 17587
PRESERVED_SPECIMEN | 10568
MACHINE_OBSERVATION | 8418
MATERIAL_SAMPLE | 1805
OBSERVATION | 1384
… 2 more rows
```

Both at once: one row per basis of record, one column per period, each a `sum` of a `CASE` that is 1 for the rows in that period. A record with no year falls in no period, so it gets a column of its own.

```sql
-- q: f2-periods
-- status: ran
SELECT basis_of_record,
       sum(CASE WHEN year < 1900 THEN 1 ELSE 0 END) AS before_1900,
       sum(CASE WHEN year BETWEEN 1900 AND 1999 THEN 1 ELSE 0 END) AS from_1900,
       sum(CASE WHEN year >= 2000 THEN 1 ELSE 0 END) AS from_2000,
       count(*) - count(year) AS no_year
FROM occurrences
GROUP BY basis_of_record
ORDER BY basis_of_record;
```

```text
-- result: f2-periods · 7 rows · sha256 bc32d04f36eb
basis_of_record | before_1900 | from_1900 | from_2000 | no_year
HUMAN_OBSERVATION | 18 | 463 | 16931 | 175
MACHINE_OBSERVATION | 0 | 1327 | 7039 | 52
MATERIAL_CITATION | 1 | 38 | 159 | 243
MATERIAL_SAMPLE | 0 | 165 | 1301 | 339
OBSERVATION | 10 | 85 | 1288 | 1
… 2 more rows
```

**Lab:**
1. Which species have more than 500 records? `HAVING` keeps the groups whose count passes; `WHERE` couldn't, because it runs before there are counts.

```sql
-- q: f2-over-500
-- status: ran
SELECT species_id, count(*) AS records
FROM occurrences
GROUP BY species_id
HAVING count(*) > 500
ORDER BY records DESC, species_id;
```

```text
-- result: f2-over-500 · 22 rows · sha256 e0016d3f3ed8
species_id | records
2 | 2000
8 | 2000
25 | 2000
28 | 2000
37 | 2000
… 17 more rows
```

2. The same question for records from 2000 on: `WHERE` removes the older rows first, then `HAVING` judges what is left.

```sql
-- q: f2-recent-over-500
-- status: ran
SELECT species_id, count(*) AS records
FROM occurrences
WHERE year >= 2000
GROUP BY species_id
HAVING count(*) > 500
ORDER BY records DESC, species_id;
```

```text
-- result: f2-recent-over-500 · 17 rows · sha256 e0519b6b04dd
species_id | records
51 | 1990
37 | 1974
58 | 1968
71 | 1962
53 | 1941
… 12 more rows
```

3. How many datasets contributed, under how many licenses, and from how many countries? `count(DISTINCT …)` counts each value once and skips `NULL`, so records with no country (`country_code` is `NULL`, §4) don't count as a country.

```sql
-- q: f2-distinct
-- status: ran
SELECT count(DISTINCT dataset_key) AS datasets,
       count(DISTINCT license) AS licenses,
       count(DISTINCT country_code) AS countries
FROM occurrences;
```

```text
-- result: f2-distinct · 1 row · sha256 3ed55a695cef
datasets | licenses | countries
400 | 2 | 106
```

**Result:** The oldest record is from 1599, and some records have no year at all: ask `min` and `count(year)` before trusting a date column. Human observations dominate, and almost all of them are recent; most records before 1900 are museum specimens. Many species stop at exactly 2,000 records: that is the sample's cap per species (§4), not a fact about the animals, and step 1's top rows are a tie for that reason. Every dataset in `datasets` contributed at least one record, and only two licenses remain after the sample's license filter (CC0 1.0 and CC BY 4.0, §4).

**Exercise:** For each basis of record with at least 1,000 records, show `basis_of_record`, its records, how many species and how many datasets they come from, and how many have no year, largest first.

**Answer:**

```sql
-- q: f2-ex
-- status: ran
SELECT basis_of_record,
       count(*) AS records,
       count(DISTINCT species_id) AS species,
       count(DISTINCT dataset_key) AS datasets,
       count(*) - count(year) AS no_year
FROM occurrences
GROUP BY basis_of_record
HAVING count(*) >= 1000
ORDER BY records DESC, basis_of_record;
```

```text
-- result: f2-ex · 5 rows · sha256 dea2e0636744
basis_of_record | records | species | datasets | no_year
HUMAN_OBSERVATION | 17587 | 55 | 182 | 175
PRESERVED_SPECIMEN | 10568 | 67 | 166 | 1469
MACHINE_OBSERVATION | 8418 | 22 | 39 | 52
MATERIAL_SAMPLE | 1805 | 47 | 22 | 339
OBSERVATION | 1384 | 5 | 3 | 1
```

**Check:** `result, any row order`. The skip exercise is checked the same way.

**Dialects:**
- **PostgreSQL:** `count(*) FILTER (WHERE year < 1900)` is the short form of the `sum(CASE …)` columns; `GROUP BY` may name an output column or its position, `HAVING` may not; `/` between integers drops the fraction (`7 / 2` is 3).
- **DuckDB:** also has `FILTER`, plus `GROUP BY ALL` (group by every column that isn't aggregated) and aliases in `WHERE`, `GROUP BY` and `HAVING`; `/` between integers gives a fraction (`7 / 2` is 3.5) and `//` drops it.
- **SQL Server:** no `FILTER`: write `sum(CASE …)` as here; `GROUP BY` takes neither aliases nor positions; `count` returns `int` (`count_big` for more rows); `/` between integers drops the fraction.

#### f3 · join

**Tool:** B (browser) · **Time:** 2.0 h · **Prereqs:** f2

**Already know this?** For every country in South America, show `code`, `name`, how many species have records there in the sample and how many records, countries with none included (as 0), by name.

```sql
-- q: f3-skip
-- status: ran
SELECT c.code, c.name,
       count(DISTINCT o.species_id) AS species,
       count(o.id) AS records
FROM countries AS c
LEFT JOIN occurrences AS o ON o.country_code = c.code
WHERE c.continent = 'South America'
GROUP BY c.code, c.name
ORDER BY c.name;
```

```text
-- result: f3-skip · 14 rows · sha256 cd259b211bbe
code | name | species | records
AR | Argentina | 7 | 1127
BO | Bolivia | 7 | 33
BR | Brazil | 14 | 5033
CL | Chile | 1 | 58
CO | Colombia | 10 | 2289
… 9 more rows
```

**Concept:** Normalized tables (d2) keep each fact once, so most questions need several tables at once. A **join** pairs the rows of two tables wherever a condition, written after `ON`, is true; aliases (`species AS s`) keep the column names short and unambiguous. The ERD (Schema button, §6.1) says which columns to join on and what to expect: the line `species ||--o{ occurrences` reads "one species, zero or more records", so joining a species to its records turns one row into many, and `countries |o--o{ occurrences` says a record has at most one country, possibly none.
- An **inner join** (`JOIN`) keeps only the pairs that match: a species with no records disappears from the result without a word.
- A **left join** (`LEFT JOIN`) keeps every row of the left table; where nothing matches, the right table's columns are `NULL`. Count a column of the right table (`count(o.id)`), not `count(*)`, to get 0 for those rows. A condition on the right table belongs in `ON`: in `WHERE` it throws away the rows the left join kept, because their `NULL`s fail it.
- An **anti join** keeps the left rows that have no match: `LEFT JOIN … WHERE <right key> IS NULL`, or `WHERE NOT EXISTS (SELECT 1 FROM … WHERE <match>)`. Avoid `NOT IN (subquery)` for this: if the subquery returns one `NULL`, `NOT IN` is never true and the answer is empty.
- A **many-to-many** relationship (an animal is recorded in many countries, a country holds many animals) needs a junction table of pairs, here `species_countries`; you join through it.
- A join **multiplies rows**: joining one species to its 20 countries and its 2,000 records gives 40,000 rows, and every count over them is wrong. Join one "many" table at a time, or aggregate before joining (f4).

**Worked example:** Which animals were recorded in Brazil? critwire answers it in two places. `species_countries` is critwire's published list (the junction between `species` and `countries`, 002's lesson 9), built from every open record in GBIF after critwire's country rule:

```sql
-- q: f3-brazil-list
-- status: ran
-- show: cards
SELECT s.id, s.common_name, s.scientific_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = 'BR'
ORDER BY s.common_name;
```

```text
-- result: f3-brazil-list · 12 rows · sha256 6eaf98efd284
id | common_name | scientific_name
65 | African Wild Dog | Lycaon pictus
54 | Brown-throated Sloth | Bradypus variegatus
56 | Chimpanzee | Pan troglodytes
52 | Giant Anteater | Myrmecophaga tridactyla
36 | Giant Armadillo | Priodontes maximus
… 7 more rows
```

The lab sample holds the records themselves, so it can also say how many:

```sql
-- q: f3-brazil-records
-- status: ran
SELECT s.id, s.common_name, count(*) AS records
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE o.country_code = 'BR'
GROUP BY s.id, s.common_name
ORDER BY records DESC, s.id;
```

```text
-- result: f3-brazil-records · 14 rows · sha256 714279e6b8e1
id | common_name | records
52 | Giant Anteater | 1476
51 | Jaguar | 1370
72 | Maned Wolf | 870
53 | Lowland Tapir | 504
54 | Brown-throated Sloth | 283
… 9 more rows
```

The two lists differ. `EXCEPT` returns the rows of the first query that the second doesn't have:

```sql
-- q: f3-brazil-diff
-- status: ran
SELECT s.id, s.common_name
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE o.country_code = 'BR'
EXCEPT
SELECT s.id, s.common_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = 'BR'
ORDER BY id;
```

```text
-- result: f3-brazil-diff · 2 rows · sha256 f0384a3aee89
id | common_name
4 | Big-headed Turtle
50 | Addax
```

Each has a single Brazilian record in the sample (the query above), far from the rest of its records. critwire's country rule leaves out a country with only one record outside the region where most of an animal's countries lie, as a likely captive animal or a mistake; the sample keeps every record. Neither list is where the animal lives: both are where someone recorded it (and the Tiger, the Chimpanzee and the African Wild Dog are on both).

**Lab:**
1. Which animals have no records in the sample at all? An anti join: keep the species whose left join found nothing.

```sql
-- q: f3-no-records
-- status: ran
SELECT s.id, s.common_name, s.range_status, s.gbif_id
FROM species AS s
LEFT JOIN occurrences AS o ON o.species_id = s.id
WHERE o.id IS NULL
ORDER BY s.id;
```

```text
-- result: f3-no-records · 5 rows · sha256 5658cf0e3423
id | common_name | range_status | gbif_id
9 | Dyeing Poison Dart Frog | identity-unsettled | NULL
18 | Yangtze Giant Softshell Turtle | ok | 2442647
19 | Floreana Giant Tortoise | identity-unsettled | NULL
27 | Western Long-beaked Echidna | identity-unsettled | NULL
47 | Ili Pika | no-open-records | 2436969
```

   The three without a GBIF id are f1's: critwire hasn't settled which GBIF taxon they are, so nothing was downloaded for them. The Ili Pika has no open record anywhere. The Yangtze Giant Softshell Turtle is different: critwire lists countries for it, but its only open record comes from a dataset whose own license is CC BY-NC, and the sample keeps a record only when both licenses are open (§4). The same anti join on `species_countries` (002's lesson 11) finds the other four, but not the turtle:

```sql
-- q: f3-no-countries
-- status: ran
SELECT s.id, s.common_name, s.range_status
FROM species AS s
LEFT JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.species_id IS NULL
ORDER BY s.id;
```

```text
-- result: f3-no-countries · 4 rows · sha256 f5fd7b6feb3f
id | common_name | range_status
9 | Dyeing Poison Dart Frog | identity-unsettled
19 | Floreana Giant Tortoise | identity-unsettled
27 | Western Long-beaked Echidna | identity-unsettled
47 | Ili Pika | no-open-records
```

2. Where the condition goes. Records since 2020 in each South American country, zeros kept: the year test is part of the match, so it goes in `ON`.

```sql
-- q: f3-on
-- status: ran
SELECT c.code, c.name, count(o.id) AS records_since_2020
FROM countries AS c
LEFT JOIN occurrences AS o ON o.country_code = c.code AND o.year >= 2020
WHERE c.continent = 'South America'
GROUP BY c.code, c.name
ORDER BY c.name;
```

```text
-- result: f3-on · 14 rows · sha256 bd29d0ba9d27
code | name | records_since_2020
AR | Argentina | 2
BO | Bolivia | 1
BR | Brazil | 653
CL | Chile | 1
CO | Colombia | 503
… 9 more rows
```

   Move `o.year >= 2020` to `WHERE` and the countries with no recent record vanish: their `o.year` is `NULL`, the test is unknown, and `WHERE` drops them. The left join has quietly become an inner join.

```sql
-- q: f3-where
-- status: ran
SELECT c.code, c.name, count(o.id) AS records_since_2020
FROM countries AS c
LEFT JOIN occurrences AS o ON o.country_code = c.code
WHERE c.continent = 'South America' AND o.year >= 2020
GROUP BY c.code, c.name
ORDER BY c.name;
```

```text
-- result: f3-where · 9 rows · sha256 73ba2465db73
code | name | records_since_2020
AR | Argentina | 2
BO | Bolivia | 1
BR | Brazil | 653
CL | Chile | 1
CO | Colombia | 503
… 4 more rows
```

3. The row multiplier. The Jaguar has 2,000 records and 20 countries in `species_countries`; joining both to the species pairs every record with every country:

```sql
-- q: f3-fan-out
-- status: ran
SELECT s.common_name, count(*) AS joined_rows, count(DISTINCT o.id) AS records,
       count(DISTINCT sc.country_code) AS countries
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.id = 51
GROUP BY s.common_name;
```

```text
-- result: f3-fan-out · 1 row · sha256 473ef5a32e0b
common_name | joined_rows | records | countries
Jaguar | 40000 | 2000 | 20
```

4. Light spatial in plain SQL. Every record has a `longitude` and `latitude` in degrees (WGS 84), so `min` and `max` give a species' **bounding box**, the smallest rectangle around its records:

```sql
-- q: f3-bbox
-- status: ran
SELECT s.id, s.common_name, count(*) AS records,
       min(o.longitude) AS west, max(o.longitude) AS east,
       min(o.latitude) AS south, max(o.latitude) AS north
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.id IN (25, 48, 51)
GROUP BY s.id, s.common_name
ORDER BY s.id;
```

```text
-- result: f3-bbox · 3 rows · sha256 a26cad9f9f8d
id | common_name | records | west | east | south | north
25 | Tiger | 2000 | -157.821478 | 134.0985 | -28.55362 | 60
48 | Tasmanian Devil | 2000 | -106.663485 | 150.254131 | -43.577984 | 35.078382
51 | Jaguar | 2000 | -109.45264 | -39.7565988 | -25.790838 | 35.078382
```

   The Tasmanian Devil's box runs from New Mexico to Tasmania: a few zoo specimens in Albuquerque stretch it across the Pacific (the Jaguar's northern edge is the same zoo). One outlier ruins a box, so look at where the records actually are. A rectangle as a filter (`BETWEEN` on both axes) finds the records in and around Tasmania:

```sql
-- q: f3-box-filter
-- status: ran
SELECT s.id, s.common_name, count(*) AS records
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
WHERE o.longitude BETWEEN 143.5 AND 149.0
  AND o.latitude BETWEEN -44.0 AND -39.5
GROUP BY s.id, s.common_name
ORDER BY records DESC, s.id;
```

```text
-- result: f3-box-filter · 1 row · sha256 22dbc8fe0d1c
id | common_name | records
48 | Tasmanian Devil | 1993
```

5. Count records in a grid of 10° boxes: `floor(longitude / 10) * 10` is the west edge of a record's box, `floor(latitude / 10) * 10` its south edge. `floor` rounds down, also below zero, so latitude -41.2 falls in the box from -50 to -40.

```sql
-- q: f3-bins
-- status: ran
SELECT floor(longitude / 10) * 10 AS west, floor(latitude / 10) * 10 AS south,
       count(*) AS records, count(DISTINCT species_id) AS species
FROM occurrences
GROUP BY west, south
ORDER BY records DESC, west, south
LIMIT 10;
```

```text
-- result: f3-bins · 10 rows · sha256 dc2b2d6996ed
west | south | records | species
-80 | 0 | 2409 | 12
30 | -10 | 2247 | 14
-60 | -30 | 2171 | 7
40 | -20 | 2078 | 5
140 | -50 | 1993 | 1
… 5 more rows
```

**Result:** Brazil has 12 animals in critwire's list and 14 in the sample; the two extra ones each rest on one stray record that critwire's rule leaves out. Five animals have no record in the sample, four of them for reasons `range_status` gives and one because of a dataset's license. A condition on the right table in `WHERE` turns a left join into an inner one (14 countries become 9), and joining two "many" tables at once turned 2,000 records into 40,000 rows. A degree box is cheap and works anywhere, but it is not an area (a 10° box near the poles is much smaller than one at the equator) and one outlier stretches it: GIS in SQL (g1, g3) does this properly with geometries.

**Exercise:** Which countries in Africa have no record in the sample? Show `code` and `name`, by name. Write it with `NOT EXISTS`.

**Answer:**

```sql
-- q: f3-ex
-- status: ran
SELECT c.code, c.name
FROM countries AS c
WHERE c.continent = 'Africa'
  AND NOT EXISTS (SELECT 1 FROM occurrences AS o WHERE o.country_code = c.code)
ORDER BY c.name;
```

```text
-- result: f3-ex · 11 rows · sha256 eaef5e28524f
code | name
BI | Burundi
CV | Cape Verde
DJ | Djibouti
ER | Eritrea
GW | Guinea-Bissau
… 6 more rows
```

The `LEFT JOIN … WHERE o.id IS NULL` form passes the check too. The `NOT IN` trap, in one line: whether `'BR'` is in a list holding `NULL` can't be ruled out, so `NOT IN` gives unknown, while a match still makes `IN` true.

```sql
-- q: f3-not-in
-- status: ran
SELECT 'BR' NOT IN ('AR', NULL) AS not_in, 'BR' IN ('BR', NULL) AS is_in;
```

```text
-- result: f3-not-in · 1 row · sha256 19723778fbc4
not_in | is_in
NULL | true
```

**Check:** `result, any row order`. The skip exercise is checked the same way.

**Dialects:**
- **PostgreSQL:** as here; also `JOIN … USING (col)`, `FULL JOIN`, and `LATERAL` (a subquery that reads the row beside it). There is no `ANTI JOIN` keyword: write `NOT EXISTS`, which the planner runs as an anti join.
- **DuckDB:** as PostgreSQL, plus `SEMI JOIN` and `ANTI JOIN` keywords, `ASOF JOIN` (nearest earlier match, for times) and `POSITIONAL JOIN`.
- **SQL Server:** no `USING` or `NATURAL`; `CROSS APPLY` and `OUTER APPLY` do what `LATERAL` does; `EXCEPT` and `NOT EXISTS` as here; `GROUP BY` repeats the expressions, not their aliases; `floor` as here.

#### f4 · window

**Tool:** B (browser) · **Time:** 1.5 h · **Prereqs:** f3

**Already know this?** For each species with at least 1,000 records that have a year, show its best year (most records; on a tie, the later year), that year's records, the species' dated records and the best year's share of them in percent to one decimal, largest share first.

```sql
-- q: f4-skip
-- status: ran
WITH per_year AS (
  SELECT species_id, year, count(*) AS records
  FROM occurrences
  WHERE year IS NOT NULL
  GROUP BY species_id, year
),
ranked AS (
  SELECT species_id, year, records,
         sum(records) OVER (PARTITION BY species_id) AS dated,
         row_number() OVER (PARTITION BY species_id ORDER BY records DESC, year DESC) AS place
  FROM per_year
)
SELECT species_id, year, records, dated, round(100.0 * records / dated, 1) AS share_pct
FROM ranked
WHERE place = 1 AND dated >= 1000
ORDER BY share_pct DESC, species_id;
```

```text
-- result: f4-skip · 16 rows · sha256 3807b8cb95c4
species_id | year | records | dated | share_pct
25 | 2021 | 1202 | 1871 | 64.2
46 | 2021 | 763 | 1610 | 47.4
58 | 2007 | 919 | 1992 | 46.1
71 | 2017 | 789 | 1985 | 39.7
61 | 2017 | 649 | 1871 | 34.7
… 11 more rows
```

**Concept:** A query can use another query's result as a table.
- A **subquery** is a query in brackets: in `FROM` it is a table (give it an alias); in `WHERE` or `SELECT` it can return one value (a scalar subquery) or a list for `IN`. A **correlated** subquery refers to the outer row (`WHERE o.country_code = c.code` in f3's exercise) and runs, in effect, once per row.
- A **common table expression** (CTE), `WITH name AS (…)`, names a subquery before the main query. Several CTEs, separated by commas, read top to bottom like the steps of a recipe, and each may use the ones above it.
- A **window function** computes a value for each row from a set of related rows, its window, without collapsing them as `GROUP BY` does. `OVER (PARTITION BY species_id ORDER BY records DESC)` says which rows form the window (the same species) and in which order. `row_number()` numbers the rows 1, 2, 3; `rank()` gives ties the same number and skips after them (1, 1, 3); `dense_rank()` doesn't skip (1, 1, 2). An aggregate with `OVER` (`sum(records) OVER (PARTITION BY species_id)`) puts the group's total on every row, so a share is one division. With `ORDER BY` in the window, `sum` becomes a running total, and `lag(x)` reads the previous row's value.
- Window functions run after `WHERE`, `GROUP BY` and `HAVING`, so they can't be filtered in `WHERE`: compute them in a CTE and filter outside, as in the skip exercise. They can rank aggregates (`rank() OVER (ORDER BY count(*) DESC)`) in the same query that groups.

**Worked example:** Which dataset contributed most of each species' records, and what share is that? Three steps, one CTE each: count records per species and dataset; put each species' total and a place on every row; keep place 1 and join the dataset's title.

```sql
-- q: f4-top-dataset
-- status: ran
WITH per_dataset AS (
  SELECT species_id, dataset_key, count(*) AS records
  FROM occurrences
  GROUP BY species_id, dataset_key
),
ranked AS (
  SELECT species_id, dataset_key, records,
         sum(records) OVER (PARTITION BY species_id) AS species_records,
         row_number() OVER (PARTITION BY species_id ORDER BY records DESC, dataset_key) AS place
  FROM per_dataset
)
SELECT r.species_id, d.title, r.records, r.species_records,
       round(100.0 * r.records / r.species_records, 1) AS share_pct
FROM ranked AS r
JOIN datasets AS d ON d.dataset_key = r.dataset_key
WHERE r.place = 1
ORDER BY share_pct DESC, r.species_id;
```

```text
-- result: f4-top-dataset · 71 rows · sha256 84b6a30c3e95
species_id | title | records | species_records | share_pct
30 | NABU\|naturgucker | 2 | 2 | 100
32 | NMNH Extant Specimen Records (USNM, US) | 1 | 1 | 100
45 | INSDC Sequences | 109 | 109 | 100
46 | Dakatcha Woodland Biodiversity Assessment | 1583 | 1613 | 98.1
51 | Jaguar Movement Database: a GPS-based movement dataset of th… | 1948 | 2000 | 97.4
… 66 more rows
```

The top rows are species with a handful of records, or with one source only, so 100 % says little there; read on down. The Jaguar's sample is 97 % one GPS-collar dataset: most of its 2,000 points are positions of collared animals, not 2,000 separate sightings. s1 comes back to this. `row_number` breaks ties by `dataset_key` so that place 1 is always one row; with `rank`, a tie would keep both.

**Lab:**
1. Which species have more records than the average species? A subquery in `FROM` counts per species; a scalar subquery in `HAVING` gives the average of those counts.

```sql
-- q: f4-above-average
-- status: ran
SELECT species_id, count(*) AS records
FROM occurrences
GROUP BY species_id
HAVING count(*) > (SELECT avg(n) FROM (SELECT count(*) AS n FROM occurrences GROUP BY species_id) AS per_species)
ORDER BY records DESC, species_id;
```

```text
-- result: f4-above-average · 21 rows · sha256 6c474db5d8ed
species_id | records
2 | 2000
8 | 2000
25 | 2000
28 | 2000
37 | 2000
… 16 more rows
```

2. `row_number`, `rank` and `dense_rank` side by side, on records per species. Thirteen species sit at the sample's cap of 2,000 (§4), a tie:

```sql
-- q: f4-ranks
-- status: ran
SELECT species_id, count(*) AS records,
       row_number() OVER (ORDER BY count(*) DESC, species_id) AS by_row,
       rank() OVER (ORDER BY count(*) DESC) AS by_rank,
       dense_rank() OVER (ORDER BY count(*) DESC) AS by_dense_rank
FROM occurrences
GROUP BY species_id
ORDER BY by_row
LIMIT 16;
```

```text
-- result: f4-ranks · 16 rows · sha256 3010c6a34f6e
species_id | records | by_row | by_rank | by_dense_rank
2 | 2000 | 1 | 1 | 1
8 | 2000 | 2 | 1 | 1
25 | 2000 | 3 | 1 | 1
28 | 2000 | 4 | 1 | 1
37 | 2000 | 5 | 1 | 1
… 11 more rows
```

3. How does each year since 2000 rank against the others, and what share of those years' records does it hold? `sum(count(*)) OVER ()`, a window over every row, is the total.

```sql
-- q: f4-years
-- status: ran
SELECT year, count(*) AS records,
       rank() OVER (ORDER BY count(*) DESC) AS place,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS share_pct
FROM occurrences
WHERE year >= 2000
GROUP BY year
ORDER BY place, year;
```

```text
-- result: f4-years · 27 rows · sha256 36304934ba6e
year | records | place | share_pct
2021 | 2859 | 1 | 9.8
2017 | 2643 | 2 | 9
2015 | 2039 | 3 | 7
2007 | 1874 | 4 | 6.4
2008 | 1698 | 5 | 5.8
… 22 more rows
```

4. The Tasmanian Devil (id 48) year by year since 2010: the change from the year before with `lag`, and a running total. `ROWS UNBOUNDED PRECEDING` makes the frame "every row up to this one"; it matters only when the order has ties, but saying it is clearer.

```sql
-- q: f4-running
-- status: ran
SELECT year, count(*) AS records,
       count(*) - lag(count(*)) OVER (ORDER BY year) AS change,
       sum(count(*)) OVER (ORDER BY year ROWS UNBOUNDED PRECEDING) AS running_total
FROM occurrences
WHERE species_id = 48 AND year >= 2010
GROUP BY year
ORDER BY year;
```

```text
-- result: f4-running · 14 rows · sha256 fbd2f429964c
year | records | change | running_total
2010 | 182 | NULL | 182
2011 | 80 | -102 | 262
2012 | 48 | -32 | 310
2013 | 16 | -32 | 326
2014 | 29 | 13 | 355
… 9 more rows
```

   A year with no records would have no row, and `lag` would compare with the last year that has one, not the calendar year before. A calendar of years, left-joined (f3), fills such gaps.

**Result:** Most species' samples lean on one or two datasets, and for the Jaguar one GPS-collar study is almost everything. Ranks show the cap at work: 13 species share rank 1, so `rank` jumps to 14 and `dense_rank` to 2; which you want depends on whether "third place" means "two ahead of you" or "the third distinct value". 2021 is the sample's biggest recent year, and the Devil's records fall sharply after 2010.

**Exercise:** For each class (`species_taxonomy.class`), show its three species with the most records (ties broken by the lower `species_id`): `class`, `species_id`, `records`, the place (1–3) and the species' share of its class's records in percent to one decimal, by class and place.

**Answer:**

```sql
-- q: f4-ex
-- status: ran
WITH per_species AS (
  SELECT t.class, o.species_id, count(*) AS records
  FROM occurrences AS o
  JOIN species_taxonomy AS t ON t.species_id = o.species_id
  GROUP BY t.class, o.species_id
),
ranked AS (
  SELECT class, species_id, records,
         row_number() OVER (PARTITION BY class ORDER BY records DESC, species_id) AS place,
         round(100.0 * records / sum(records) OVER (PARTITION BY class), 1) AS share_pct
  FROM per_species
)
SELECT class, species_id, records, place, share_pct
FROM ranked
WHERE place <= 3
ORDER BY class, place;
```

```text
-- result: f4-ex · 9 rows · sha256 f730ac9edba7
class | species_id | records | place | share_pct
Amphibia | 8 | 2000 | 1 | 41.9
Amphibia | 6 | 938 | 2 | 19.6
Amphibia | 75 | 552 | 3 | 11.6
Mammalia | 25 | 2000 | 1 | 6.3
Mammalia | 28 | 2000 | 2 | 6.3
… 4 more rows
```

**Check:** `result, in order`: the order is part of the answer here. The skip exercise is checked the same way.

**Dialects:**
- **PostgreSQL:** as here; also `FILTER` on window aggregates and named windows (`WINDOW w AS (…)`); a CTE can be `MATERIALIZED` or `NOT MATERIALIZED`; `WITH RECURSIVE` walks trees such as `taxa`. No `QUALIFY`.
- **DuckDB:** as PostgreSQL, plus `QUALIFY place = 1`, which filters on a window function without a CTE, and `arg_max(dataset_key, records)` for "the value with the largest count" in one aggregate.
- **SQL Server:** CTEs and window functions as here (the statement before a `WITH` must end in `;`); no `QUALIFY`; `TOP (1) WITH TIES … ORDER BY row_number() OVER (…)` or `CROSS APPLY (SELECT TOP (3) …)` for top-n per group; `count` is `int`, so cast before dividing for a share.

### 5.2 Database architecture

Six modules, twelve hours: how to design the tables the foundations queried, and how to run them. d1 and d2 are about design and work in the browser (d1's last part in PostgreSQL); d3 to d5 need your own PostgreSQL (§3.2), because indexes, transactions and roles are what a server adds; d6 builds a star for reporting, in PostgreSQL and DuckDB. The lab tables are §4's; the PostGIS labs run in `learn_curriculum` after `pg-session` (§0), each in a transaction the tests roll back, so a lab that adds, changes or deletes rows changes nothing for the next one.

#### d1 · keys

**Tool:** B (browser) + PG · **Time:** 2.0 h · **Prereqs:** f3

**Concept:** An **entity** is a kind of thing a database keeps facts about, each one with its own identity: an animal, a country, a dataset, a record. Each entity becomes a table, and each table needs a **key**: a column, or a set of columns, whose value picks out exactly one row.
- A table can have several **candidate keys**. `species` has `id`, `slug`, `scientific_name` and six ids from other websites. The one picked as the main key is the **primary key**: never `NULL`, never repeated. The others are **alternate keys**, declared `UNIQUE`.
- A **natural key** is one the world already uses: a scientific name, a country's ISO code, GBIF's dataset key. A **surrogate key** is a number the database makes up and that means nothing else: critwire's `species.id`. Natural keys change (a species moves to another genus, a name turns out to be a synonym), and every row that points at one has to change with it; a surrogate never has to. critwire uses both: `id` (an integer, never reused) is the primary key, and the natural keys are `UNIQUE`. A natural key makes a good primary key when an authority keeps it stable and it is never missing: `countries.code` (ISO 3166-1) and `datasets.dataset_key` (GBIF's identifier) are primary keys here.
- `UNIQUE` allows any number of `NULL`s, because one unknown value isn't equal to another: animals with no NCBI id don't collide. That is why an outside id can be an alternate key but not the primary key.
- A **foreign key** says a column's value must be a key of another table: `occurrences.species_id REFERENCES species (id)`. It checks two things. A value that is inserted or changed must exist in the other table, or be `NULL`. And a row that other rows still point at can't be deleted or given another key, unless the foreign key says what to do instead (`ON DELETE CASCADE` deletes the children too, `ON DELETE SET NULL` empties their column). That is all it checks: not that the value is the right one, not rules that span rows, and with a key of two columns, a row with one of them `NULL` isn't checked at all (`MATCH SIMPLE`, the default). PostgreSQL also doesn't index the referencing column for you (d3).
- A **`CHECK`** is a condition every row must meet, such as `month BETWEEN 1 AND 12`. It refuses a row only when the condition is false. When it is `NULL` (unknown, f1) the row passes, so a `CHECK` doesn't replace `NOT NULL`. A `CHECK` can compare columns of the same row: `taxa`'s says a class has no parent and every other rank has one.
- A **generated column** is computed from other columns of its row and can't be written directly. The lab's `occurrences.geom` is the point made from `longitude` and `latitude`, so the point and the two numbers can never disagree.
- Foreign keys set the order of a load: a parent row goes in before its children (the browser setup inserts `taxa` one rank at a time, top down), and out after them.

**Worked example:** Can two animals share an id? (002's lesson 7, re-run.) The standard view `information_schema.table_constraints` lists a table's constraints. DuckDB also lists each `NOT NULL` rule, as a `CHECK`; this query leaves those out:

```sql
-- q: d1-constraints
-- status: ran
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'species'
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY constraint_type, constraint_name;
```

```text
-- result: d1-constraints · 10 rows · sha256 e6eae9d8d6bb
constraint_name | constraint_type
species_genus_name_fkey | FOREIGN KEY
species_id_pkey | PRIMARY KEY
species_col_id_key | UNIQUE
species_gbif_id_key | UNIQUE
species_inaturalist_id_key | UNIQUE
… 5 more rows
```

Try to add a second animal with the tiger's id, 25. `INSERT INTO` adds a row: the columns in brackets, then their values in the same order. The database refuses, and nothing is added:

```sql
-- q: d1-same-id
-- status: ran
-- expect: error violates primary key constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (25, 'siberian-tiger', 'Panthera tigris altaica', 'Siberian Tiger', 'Panthera', 'ok');
```

```text
-- result: d1-same-id · error: statement 1 of 1: Constraint Error: Duplicate key "id: 25" violates primary key constraint.
```

A new id doesn't get a row past the alternate keys either. A Bengal tiger with its own id but given the tiger's GBIF id is refused by `UNIQUE (gbif_id)`: in critwire, one GBIF id names one animal.

```sql
-- q: d1-same-gbif
-- status: ran
-- expect: error violates unique constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status, gbif_id)
VALUES (1000, 'bengal-tiger', 'Panthera tigris tigris', 'Bengal Tiger', 'Panthera', 'ok',
        (SELECT gbif_id FROM species WHERE id = 25));
```

```text
-- result: d1-same-gbif · error: statement 1 of 1: Constraint Error: Duplicate key "gbif_id: 5219416" violates unique constraint.
```

Why not use an outside id as the primary key? Some are missing, and `UNIQUE` lets the `NULL`s sit side by side:

```sql
-- q: d1-missing-ids
-- status: ran
SELECT count(*) AS species,
       count(*) - count(gbif_id) AS no_gbif_id,
       count(*) - count(col_id) AS no_col_id,
       count(*) - count(wikidata_id) AS no_wikidata_id,
       count(*) - count(inaturalist_id) AS no_inaturalist_id,
       count(*) - count(ncbi_id) AS no_ncbi_id
FROM species;
```

```text
-- result: d1-missing-ids · 1 row · sha256 760e1edef926
species | no_gbif_id | no_col_id | no_wikidata_id | no_inaturalist_id | no_ncbi_id
76 | 3 | 7 | 0 | 2 | 1
```

And the scientific name? Names change. These four animals' GBIF ids are synonyms in GBIF's backbone: GBIF files their records under another, accepted name (§4.2).

```sql
-- q: d1-synonyms
-- status: ran
SELECT id, slug, scientific_name, gbif_id
FROM species
WHERE gbif_id IN (2442885, 2440897, 5786560, 5786559)
ORDER BY id;
```

```text
-- result: d1-synonyms · 4 rows · sha256 0c8afd374c8f
id | slug | scientific_name | gbif_id
1 | blandings-turtle | Emydoidea blandingii | 2442885
55 | giant-pangolin | Smutsia gigantea | 5786559
63 | temmincks-pangolin | Smutsia temminckii | 5786560
70 | bairds-tapir | Tapirus bairdii | 2440897
```

Had `scientific_name` been the primary key, following such a change would mean rewriting it in `species`, `species_sources`, `species_countries` and every record. With `id` as the key it is one `UPDATE` of one row, and every foreign key still points at the right animal.

**Lab:**
1. What does a `CHECK` refuse? A record with month 13 (a copy of the first devil record, with a new id and the month changed):

```sql
-- q: d1-check-month
-- status: ran
-- expect: error CHECK constraint failed
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, longitude, latitude, year, 13
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
```

```text
-- result: d1-check-month · error: statement 1 of 1: Constraint Error: CHECK constraint failed on table occurrences with expression CHECK(("month" BETWEEN 1 AND 12))
```

2. The same record with no month and no country goes in. `month BETWEEN 1 AND 12` is unknown for `NULL`, and a `CHECK` passes unknown; a foreign key passes `NULL` too. Most of the time that is what you want (many records really have no month), but if a value must be there, the column needs `NOT NULL` as well.

```sql
-- q: d1-check-null
-- status: ran
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude, country_code, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, longitude, latitude, NULL, year, NULL
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
SELECT id, species_id, country_code, month
FROM occurrences
WHERE id = 1;
```

```text
-- result: d1-check-null · 1 row · sha256 8ae30f0c14b6
id | species_id | country_code | month
1 | 48 | NULL | NULL
```

3. A `CHECK` across two columns: a genus must have a parent.

```sql
-- q: d1-check-taxa
-- status: ran
-- expect: error CHECK constraint failed
INSERT INTO taxa (name, taxon_rank, parent_name)
VALUES ('Dracula', 'genus', NULL);
```

```text
-- result: d1-check-taxa · error: statement 1 of 1: Constraint Error: CHECK constraint failed on table taxa with expression CHECK(((taxon_rank = 'class') = (parent_name IS NULL)))
```

4. What does a foreign key refuse? An animal in a genus critwire doesn't have (002's lesson 7 exercise): `species.genus` must be a `name` in `taxa`.

```sql
-- q: d1-fk-genus
-- status: ran
-- expect: error Violates foreign key constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (1000, 'dracula-ant', 'Dracula ant', 'Dracula Ant', 'Dracula', 'ok');
```

```text
-- result: d1-fk-genus · error: statement 1 of 1: Constraint Error: Violates foreign key constraint because key "name: Dracula" does not exist in the referenced table
```

   The rest of the lab runs in PostgreSQL (§3.2), on the same tables.

5. A foreign key also protects the parent. Deleting the dataset with the most records in the sample would leave its records pointing at nothing, so PostgreSQL refuses:

```sql
-- q: d1-fk-delete
-- status: ran
-- engine: postgis
-- expect: error violates foreign key constraint
DELETE FROM datasets
WHERE dataset_key = (SELECT dataset_key FROM occurrences
                     GROUP BY dataset_key
                     ORDER BY count(*) DESC, dataset_key
                     LIMIT 1);
```

```text
-- result: d1-fk-delete · error: statement 1 of 1: update or delete on table "datasets" violates foreign key constraint "occurrences_dataset_key_fkey" on table "occurrences"
```

6. What doesn't a foreign key check? Whether the value is the right one. This copy of a devil record says Australia (`AU` is a `countries` row, so the foreign key is satisfied) but sits at Brasília. The point is the generated column, made from the longitude and latitude just inserted, so a spatial test can catch what the key can't (g3 does this for every record):

```sql
-- q: d1-fk-wrong
-- status: ran
-- engine: postgis
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude,
                         country_code_gbif, country_code, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, -47.9, -15.8, 'AU', 'AU', year, month
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
SELECT o.id, o.country_code, ST_AsText(o.geom) AS point,
       ST_Covers(cs.geom, o.geom) AS in_its_country,
       (SELECT s.country_code FROM country_shapes AS s WHERE ST_Covers(s.geom, o.geom)) AS point_is_in
FROM occurrences AS o
JOIN country_shapes AS cs ON cs.country_code = o.country_code
WHERE o.id = 1;
```

```text
-- result: d1-fk-wrong · 1 row · sha256 18d790a2949e
id | country_code | point | in_its_country | point_is_in
1 | AU | POINT(-47.9 -15.8) | false | BR
```

7. PostgreSQL builds an index for every primary key and `UNIQUE` constraint, because it needs one to check them. It doesn't for a foreign key: checking a new record needs only the parent's key, which is indexed already. But deleting a parent, or joining from it, has to find the children, and with no index on `occurrences.species_id` that means reading the whole table (d3). Which of `occurrences`' keys have an index that starts with their column?

```sql
-- q: d1-fk-index
-- status: ran
-- engine: postgis
SELECT c.conname AS constraint_name,
       CASE c.contype WHEN 'p' THEN 'PRIMARY KEY' ELSE 'FOREIGN KEY' END AS constraint_type,
       a.attname AS column_name,
       EXISTS (SELECT 1 FROM pg_index AS i
               WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]) AS indexed
FROM pg_constraint AS c
JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.conrelid = 'occurrences'::regclass
  AND c.contype IN ('p', 'f')
ORDER BY c.contype DESC, c.conname;
```

```text
-- result: d1-fk-index · 4 rows · sha256 bbc2c2e237f8
constraint_name | constraint_type | column_name | indexed
occurrences_pkey | PRIMARY KEY | id | true
occurrences_country_code_fkey | FOREIGN KEY | country_code | false
occurrences_dataset_key_fkey | FOREIGN KEY | dataset_key | false
occurrences_species_id_fkey | FOREIGN KEY | species_id | false
```

8. The generated column, as the catalog describes it; then an attempt to write it, refused:

```sql
-- q: d1-generated
-- status: ran
-- engine: postgis
SELECT column_name, is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'occurrences'
  AND is_generated = 'ALWAYS';
```

```text
-- result: d1-generated · 1 row · sha256 5927c3d4ced9
column_name | is_generated | generation_expression
geom | ALWAYS | st_setsrid(st_makepoint(longitude, latitude), 4326)
```

```sql
-- q: d1-generated-write
-- status: ran
-- engine: postgis
-- expect: error can only be updated to DEFAULT
UPDATE occurrences
SET geom = ST_SetSRID(ST_MakePoint(0, 0), 4326)
WHERE id = (SELECT min(id) FROM occurrences);
```

```text
-- result: d1-generated-write · error: statement 1 of 1: column "geom" can only be updated to DEFAULT
```

9. A surrogate key made by the database. `GENERATED ALWAYS AS IDENTITY` numbers the rows as they go in. A surrogate key alone would accept the same note twice under two numbers, so the natural key, (animal, observer, day), is declared `UNIQUE` beside it:

```sql
-- q: d1-identity
-- status: ran
-- engine: postgis
CREATE TABLE field_notes (
  note_id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  observer   text NOT NULL CHECK (observer <> ''),
  seen_on    date NOT NULL,
  UNIQUE (species_id, observer, seen_on)
);
INSERT INTO field_notes (species_id, observer, seen_on)
VALUES (48, 'Ana', DATE '2026-03-14'), (48, 'Ana', DATE '2026-03-15'), (25, 'Ben', DATE '2026-03-14');
SELECT note_id, species_id, observer, seen_on
FROM field_notes
ORDER BY note_id;
```

```text
-- result: d1-identity · 3 rows · sha256 f171f9ff7119
note_id | species_id | observer | seen_on
1 | 48 | Ana | 2026-03-14
2 | 48 | Ana | 2026-03-15
3 | 25 | Ben | 2026-03-14
```

```sql
-- q: d1-identity-twice
-- status: ran
-- engine: postgis
-- after: d1-identity
-- expect: error duplicate key value violates unique constraint
INSERT INTO field_notes (species_id, observer, seen_on)
VALUES (48, 'Ana', DATE '2026-03-14');
```

```text
-- result: d1-identity-twice · error: statement 1 of 1: duplicate key value violates unique constraint "field_notes_species_id_observer_seen_on_key"
```

**Result:** Every key refused what it should: a second animal with id 25 or with the tiger's GBIF id, a month of 13, a genus with no parent, an animal in a genus that doesn't exist, the deletion of a dataset its records still point at, a write to a generated column and the same field note twice. What got through is as instructive: a record with no month and no country (a `CHECK` and a foreign key both pass `NULL`), and a record that says Australia while its point is in Brazil (a foreign key checks that a value exists, not that it is true). `occurrences`' primary key is indexed and its three foreign keys aren't. critwire's design follows from this: a surrogate primary key, the natural keys `UNIQUE` (some outside ids are missing, and four names already changed in GBIF's eyes), and natural primary keys only where an authority keeps them stable (`countries`, `datasets`).

**Exercise:** critwire keeps one photo per animal, in `species`. Design a table `species_photos` that can hold several: a surrogate `photo_id`; the animal (`species_id`, an animal critwire has); a `url` no other photo has; a `license` that is a Creative Commons license (it starts with `CC`) or `Public domain`; and a `credit` that is filled in and not empty. Create it in the browser, copy in every animal's current photo (`photo_url`, `photo_license`, `photo_credit`, numbered by species id), and count the photos, the animals and the licenses.

**Answer:**

```sql
-- q: d1-ex
-- status: ran
CREATE TABLE species_photos (
  photo_id   INTEGER PRIMARY KEY,
  species_id INTEGER NOT NULL REFERENCES species (id),
  url        VARCHAR NOT NULL UNIQUE,
  license    VARCHAR NOT NULL CHECK (license LIKE 'CC%' OR license = 'Public domain'),
  credit     VARCHAR NOT NULL CHECK (trim(credit) <> '')
);
INSERT INTO species_photos
SELECT row_number() OVER (ORDER BY id), id, photo_url, photo_license, photo_credit
FROM species
WHERE photo_url IS NOT NULL;
SELECT count(*) AS photos, count(DISTINCT species_id) AS species, count(DISTINCT license) AS licenses
FROM species_photos;
```

```text
-- result: d1-ex · 1 row · sha256 8f006cc37be7
photos | species | licenses
74 | 74 | 10
```

Then each of these must be refused by your table: the axolotl's photo again, a photo of an animal critwire doesn't have, and a photo with no license to reuse.

```sql
-- q: d1-ex-same-url
-- status: ran
-- after: d1-ex
-- expect: error PRIMARY KEY or UNIQUE constraint violation
INSERT INTO species_photos
SELECT 1000, id, photo_url, photo_license, photo_credit FROM species WHERE id = 74;
```

```text
-- result: d1-ex-same-url · error: statement 1 of 1: Constraint Error: PRIMARY KEY or UNIQUE constraint violation: duplicate key "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Axolotl_ganz.jpg/500px-Axolotl_ganz.jpg"
```

```sql
-- q: d1-ex-no-species
-- status: ran
-- after: d1-ex
-- expect: error Violates foreign key constraint
INSERT INTO species_photos
VALUES (1000, 1000, 'https://example.org/dracula-ant.jpg', 'CC BY 4.0', 'A. Photographer');
```

```text
-- result: d1-ex-no-species · error: statement 1 of 1: Constraint Error: Violates foreign key constraint because key "id: 1000" does not exist in the referenced table
```

```sql
-- q: d1-ex-license
-- status: ran
-- after: d1-ex
-- expect: error CHECK constraint failed
INSERT INTO species_photos
VALUES (1000, 74, 'https://example.org/axolotl-2.jpg', 'All rights reserved', 'A. Photographer');
```

```text
-- result: d1-ex-license · error: statement 1 of 1: Constraint Error: CHECK constraint failed on table species_photos with expression CHECK(((license ~~ 'CC%') OR (license = 'Public domain')))
```

**Check:** `result, any row order` for the counts; then the page runs the three inserts above after your answer, and each must fail with the error named (unique, foreign key, `CHECK`), whatever you named your constraints.

**Dialects:**
- **PostgreSQL:** as here, with surrogate keys from `GENERATED ALWAYS AS IDENTITY` (or the older `serial`); generated columns are `STORED` only (virtual ones come in PostgreSQL 18); foreign keys take `ON DELETE CASCADE | SET NULL | RESTRICT`, can be `DEFERRABLE` (checked at commit), and can be added `NOT VALID` and checked later with `VALIDATE CONSTRAINT`; `UNIQUE NULLS NOT DISTINCT` makes `NULL`s collide; no automatic index on a foreign key.
- **DuckDB:** keys as here, but foreign keys only in `CREATE TABLE`, with no `CASCADE` or `SET NULL` actions; no identity columns (a `CREATE SEQUENCE` and `DEFAULT nextval('…')` do it); generated columns are virtual only; primary keys and `UNIQUE` build an index, which also makes bulk loads into keyed tables slower.
- **SQL Server:** `IDENTITY(1, 1)` for surrogates; computed columns (`AS (…)`, `PERSISTED` to store them); a `UNIQUE` constraint allows only one `NULL` (a filtered unique index, `WHERE col IS NOT NULL`, allows many); foreign keys take `ON DELETE CASCADE | SET NULL`, and `NOCHECK` turns one off, which leaves it untrusted until it is re-checked; `CHECK` passes unknown, as here.

#### d2 · normalize

**Tool:** B (browser) · **Time:** 2.0 h · **Prereqs:** d1

**Concept:** Normalization decides which table each fact belongs in, so that every fact is stored once and the tables can't contradict themselves.
- A **functional dependency**, written `X → Y`, says that a value of `X` fixes the value of `Y`: two rows with the same `X` always have the same `Y`. `dataset_key → title`: a dataset has one title. `genus → family`: every *Panthera* is a cat. The direction matters: two datasets can share a title, so `title → dataset_key` doesn't hold. A key is a set of columns every other column depends on.
- A dependency is a rule about the world, which the designer states; it isn't read off the data. Rows can refute one (two rows, same `X`, different `Y`), never prove it: a rule that holds in today's rows may break with tomorrow's load. Once a table's key enforces the rule, the database refuses the row that would break it (d1).
- A table that stores a fact in more than one place invites three **anomalies**. **Update:** a fact changed in some of its copies leaves the table saying two things. **Delete:** deleting the last row that held a fact deletes the fact (a record removed as a misidentification takes its dataset's only copy of the title with it). **Insert:** a fact can't be stored until something else exists (a dataset can't be listed before it has a record).
- The **normal forms** remove them one kind at a time:
  - **First normal form (1NF):** one value per cell, no lists or repeated groups of columns. A list in a cell can't be joined, counted or checked by a foreign key.
  - **Second (2NF):** in a table whose key has several columns, no other column depends on only part of it.
  - **Third (3NF):** no other column depends on a column that isn't a key. The short version of all three: every column depends on the key, the whole key, and nothing but the key. (**Boyce–Codd normal form** tightens 3NF for tables with several overlapping keys; critwire's tables don't have that case.)
- Normalizing splits a table along its dependencies. The split is **lossless** when joining the parts gives back exactly the rows you started with; splitting along a real dependency always is.
- A nested file (JSON, or Parquet with structs and lists) groups facts by how they are read: one animal with everything about it. Tables group them by what they depend on. critwire keeps both: its build loads `data/` into tables, then writes `/v1/species.{json,parquet}` nested, because a reader wants one record per animal.
- **Denormalizing** is repeating facts on purpose, for reading: the published files, d6's star, a summary table. It is safe when the copy is rebuilt from the normalized tables every time and never edited by hand; a value that is only a count of other rows (records per dataset) stays a query.

**Worked example:** How does critwire's nested record become tables? (002's lesson 14, re-run.) These queries read the published file itself, `species.parquet`, with DuckDB's own SQL: `read_parquet` opens a file, `"range".countriesWithOpenRecords` reaches into the record, and `unnest` turns a list into rows. The browser setup (§0) builds the tables with exactly these. Here is the jaguar's record, its countries one list in one cell:

```sql
-- q: d2-list
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT id, slug, "range".countriesWithOpenRecords AS country_codes
FROM read_parquet('species.parquet')
WHERE slug = 'jaguar';
```

```text
-- result: d2-list · 1 row · sha256 2aac6d391e87
id | slug | country_codes
51 | jaguar | [AR, BO, BR, BZ, CO, CR, EC, GF, GT, GY, HN, MX, NI, PA, PE,…
```

1NF gives each item its own row, which is how `species_countries` is filled:

```sql
-- q: d2-unnest
-- status: ran
-- DuckDB only: unnest turns a list into rows
SELECT id, unnest("range".countriesWithOpenRecords) AS country_code
FROM read_parquet('species.parquet')
WHERE slug = 'jaguar'
ORDER BY country_code;
```

```text
-- result: d2-unnest · 20 rows · sha256 b463f81200a2
id | country_code
51 | AR
51 | BO
51 | BR
51 | BZ
51 | CO
… 15 more rows
```

2NF: the key of `species_countries` is (`species_id`, `country_code`). A country's name depends on `country_code` alone, so a `country_name` column there would repeat each name once per animal recorded in that country, and a rename would have to find every copy:

```sql
-- q: d2-country-copies
-- status: ran
SELECT c.name AS country, count(*) AS copies
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
GROUP BY c.name
ORDER BY copies DESC, country
LIMIT 5;
```

```text
-- result: d2-country-copies · 5 rows · sha256 10e8f33346b3
country | copies
United States of America | 30
Kenya | 15
Brazil | 12
Colombia | 10
Mexico | 10
```

3NF: an animal's family depends on its genus, not on the animal. So `species` stores only the genus, and the family is in the genus's `taxa` row. A flat table with a `family` column would repeat these families, and one mistyped copy would put an animal in two families:

```sql
-- q: d2-repeat
-- status: ran
SELECT g.parent_name AS family, count(*) AS animals
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
GROUP BY g.parent_name
HAVING count(*) > 1
ORDER BY animals DESC, family;
```

```text
-- result: d2-repeat · 16 rows · sha256 edbe3098db04
family | animals
Testudinidae | 5
Bovidae | 4
Manidae | 4
Canidae | 3
Elephantidae | 3
… 11 more rows
```

The record's `sources` is a list of structs: each item names a source, its license, when critwire retrieved it, and the fields it supplied. Does a source's license depend on the source? In the file, each source has one license, written once per animal it supplied:

```sql
-- q: d2-sources
-- status: ran
-- DuckDB only: sources is a list of structs in the published file
SELECT s.source, count(DISTINCT s.license) AS licenses, min(s.license) AS license, count(*) AS copies_in_file
FROM (SELECT unnest(sources) AS s FROM read_parquet('species.parquet'))
GROUP BY s.source
ORDER BY s.source;
```

```text
-- result: d2-sources · 5 rows · sha256 02711a98b356
source | licenses | license | copies_in_file
Catalogue of Life | 1 | CC BY 4.0 | 69
GBIF Backbone Taxonomy | 1 | CC BY 4.0 | 73
GBIF.org occurrence search | 1 | CC BY 4.0 | 72
Wikidata | 1 | CC0 1.0 | 76
critwire base | 1 | CC BY 4.0 | 76
```

So `source → license` goes into its own table, `sources`, one row per source, and the setup's `SELECT DISTINCT` gives exactly one row each. Its primary key now holds the rule: had two animals' entries named two licenses for one source, the load would have failed instead of storing both. The file repeats each license 69 to 76 times, and that is fine, because critwire's build writes the file from its tables every time. Which source gave which field is a fact about the animal and the field together, so it goes in `species_sources`, keyed (`species_id`, `field`). Joined back, they tell where each of the jaguar's facts came from (002's lesson 15):

```sql
-- q: d2-provenance
-- status: ran
SELECT ss.field, ss.source_name, so.license, so.retrieved
FROM species_sources AS ss
JOIN sources AS so ON so.name = ss.source_name
WHERE ss.species_id = 51
ORDER BY ss.field;
```

```text
-- result: d2-provenance · 8 rows · sha256 bc64a29cc0b4
field | source_name | license | retrieved
ids.col | Catalogue of Life | CC BY 4.0 | 2026-10-20
ids.gbif | GBIF Backbone Taxonomy | CC BY 4.0 | 2026-10-21
ids.inaturalist | Wikidata | CC0 1.0 | 2026-10-20
ids.iucn | critwire base | CC BY 4.0 | NULL
ids.ncbi | Wikidata | CC0 1.0 | 2026-10-20
… 3 more rows
```

The taxonomy is from the Catalogue of Life, the outside ids from Wikidata and GBIF, the country list from GBIF's occurrence search. `ids.iucn` is critwire's own: critwire stores only the animal's IUCN id, never the Red List's data, whose terms don't allow republishing it.

**Lab:** Is a license a fact about a record or about its dataset? GBIF gives both: every dataset declares a license, and every record carries one. If `dataset_key → license` held, the license would belong in `datasets` (3NF), stored 400 times instead of 40,395.
1. Test the rule on the records: does any dataset have records under two licenses?

```sql
-- q: d2-fd-license
-- status: ran
SELECT dataset_key, count(DISTINCT license) AS licenses
FROM occurrences
GROUP BY dataset_key
HAVING count(DISTINCT license) > 1
ORDER BY dataset_key;
```

```text
-- result: d2-fd-license · 0 rows · sha256 e80a19641b1a
dataset_key | licenses
```

   None, in this sample. That doesn't prove the rule (Concept). The full download the sample comes from (§4.2) refutes it: the iNaturalist research-grade dataset holds 9,581 CC BY records and 3,152 CC0 records. The sample just doesn't show it, because iNaturalist declares CC BY-NC for the dataset, so none of its records passed the sample's license rule.
2. Is the record's license the dataset's declared one?

```sql
-- q: d2-license-differs
-- status: ran
SELECT d.title, d.license AS dataset_license, o.license AS record_license, count(*) AS records
FROM occurrences AS o
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE o.license <> d.license
GROUP BY d.title, d.license, o.license
ORDER BY records DESC, d.title;
```

```text
-- result: d2-license-differs · 1 row · sha256 fea1b5f1953c
title | dataset_license | record_license | records
Natuurmuseum Brabant, Tilburg - Vertebrates | CC0 1.0 | CC BY 4.0 | 4
```

   Not always: this museum declares CC0 for its dataset and CC BY for these records. So there are two facts here, under one word. The record's license depends on the record and stays on `occurrences`; the dataset's declared license depends on the dataset and stays on `datasets`. Moving the first into `datasets` would publish these four records as CC0 and lose the credit their license asks for. (The sample's `license` is the stricter of the two, §4.2.)
3. Now the anomalies, on a flat table: each record with its animal's name and its dataset's title and publisher, the shape a spreadsheet export has. Every record carries its dataset's title, 400 datasets' titles stored 40,395 times. And there are fewer titles than datasets: two titles are shared, so a title can't stand in for a dataset key.

```sql
-- q: d2-flat
-- status: ran
CREATE TABLE records_flat AS
SELECT o.id, o.species_id, s.common_name, o.dataset_key, d.title, d.publisher, o.license
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key;
SELECT count(*) AS rows, count(DISTINCT dataset_key) AS datasets, count(DISTINCT title) AS titles,
       count(DISTINCT publisher) AS publishers
FROM records_flat;
```

```text
-- result: d2-flat · 1 row · sha256 33a734ea4e5d
rows | datasets | titles | publishers
40395 | 400 | 398 | 217
```

```sql
-- q: d2-shared-titles
-- status: ran
-- after: d2-flat
SELECT title, count(DISTINCT dataset_key) AS datasets
FROM records_flat
GROUP BY title
HAVING count(DISTINCT dataset_key) > 1
ORDER BY title;
```

```text
-- result: d2-shared-titles · 2 rows · sha256 c9adf8875927
title | datasets
Anfibios y reptiles de las regiones 30 (Parque Natural Sierr… | 2
Order Primates | 2
```

4. An update anomaly: the museum renames its dataset, and the fix reaches one of its records. The table now gives one dataset two titles, which the same kind of query catches:

```sql
-- q: d2-update-anomaly
-- status: ran
-- after: d2-flat
UPDATE records_flat
SET title = 'Natuurmuseum Brabant - Vertebrates'
WHERE id = (SELECT min(id) FROM records_flat WHERE title = 'Natuurmuseum Brabant, Tilburg - Vertebrates');
SELECT dataset_key, title, count(*) AS records
FROM records_flat
WHERE dataset_key IN (SELECT dataset_key FROM records_flat GROUP BY dataset_key HAVING count(DISTINCT title) > 1)
GROUP BY dataset_key, title
ORDER BY records DESC, title;
```

```text
-- result: d2-update-anomaly · 2 rows · sha256 845bb6fc6bac
dataset_key | title | records
3c2eb73a-82c8-4373-956f-1cb9473f76ba | Natuurmuseum Brabant, Tilburg - Vertebrates | 3
3c2eb73a-82c8-4373-956f-1cb9473f76ba | Natuurmuseum Brabant - Vertebrates | 1
```

5. A delete anomaly: 84 datasets have one record in the sample. Delete those records (say they all turned out to be misidentified) and their datasets vanish from the flat table, titles, publishers and all; `datasets` still lists them:

```sql
-- q: d2-delete-anomaly
-- status: ran
-- after: d2-flat
DELETE FROM records_flat
WHERE dataset_key IN (SELECT dataset_key FROM records_flat GROUP BY dataset_key HAVING count(*) = 1);
SELECT (SELECT count(DISTINCT dataset_key) FROM records_flat) AS datasets_in_flat,
       (SELECT count(*) FROM datasets) AS datasets_in_table;
```

```text
-- result: d2-delete-anomaly · 1 row · sha256 4af153eb1129
datasets_in_flat | datasets_in_table
316 | 400
```

**Result:** The nested record became tables along its dependencies: the country list into rows (1NF), the country's name into `countries` (2NF), the family into `taxa` and the source's license into `sources` (3NF), with the published file repeating them for readers, rebuilt each time. The license question has a two-part answer. In the sample, no dataset has records under two licenses, but the full download has one (iNaturalist), and one museum's records carry a stricter license than its dataset declares. So the record's license is a fact about the record and stays on `occurrences`; `datasets.license` is the dataset's own declaration, a different fact. The flat table showed what normalizing prevents: 40,395 copies of 400 titles, one dataset with two titles after a partial fix, and 84 datasets lost with their last records (316 left of 400). And a record count per dataset is a query, not a column: stored, it would be wrong after the next load.

**Exercise:** Normalize `records_flat` (lab step 3, before the anomalies) into 3NF: `r_species (species_id, common_name)`, `r_datasets (dataset_key, title, publisher)` and `r_records (id, species_id, dataset_key, license)`, each with its primary key, and `r_records`' foreign keys to the other two. Fill them from `records_flat`, then show the split is lossless: count each table's rows, and the rows that joining the three back loses or adds compared with `records_flat` (both should be 0).

**Answer:**

```sql
-- q: d2-ex
-- status: ran
-- after: d2-flat
CREATE TABLE r_species (
  species_id  INTEGER PRIMARY KEY,
  common_name VARCHAR NOT NULL
);
CREATE TABLE r_datasets (
  dataset_key VARCHAR PRIMARY KEY,
  title       VARCHAR NOT NULL,
  publisher   VARCHAR NOT NULL
);
CREATE TABLE r_records (
  id          BIGINT PRIMARY KEY,
  species_id  INTEGER NOT NULL REFERENCES r_species (species_id),
  dataset_key VARCHAR NOT NULL REFERENCES r_datasets (dataset_key),
  license     VARCHAR NOT NULL
);
INSERT INTO r_species SELECT DISTINCT species_id, common_name FROM records_flat;
INSERT INTO r_datasets SELECT DISTINCT dataset_key, title, publisher FROM records_flat;
INSERT INTO r_records SELECT id, species_id, dataset_key, license FROM records_flat;
CREATE VIEW r_joined AS
SELECT r.id, r.species_id, s.common_name, r.dataset_key, d.title, d.publisher, r.license
FROM r_records AS r
JOIN r_species AS s ON s.species_id = r.species_id
JOIN r_datasets AS d ON d.dataset_key = r.dataset_key;
SELECT (SELECT count(*) FROM r_species) AS species,
       (SELECT count(*) FROM r_datasets) AS datasets,
       (SELECT count(*) FROM r_records) AS records,
       (SELECT count(*) FROM (SELECT * FROM records_flat EXCEPT SELECT * FROM r_joined)) AS lost,
       (SELECT count(*) FROM (SELECT * FROM r_joined EXCEPT SELECT * FROM records_flat)) AS added;
```

```text
-- result: d2-ex · 1 row · sha256 cd378802acf7
species | datasets | records | lost | added
71 | 400 | 40395 | 0 | 0
```

The `INSERT … SELECT DISTINCT` into `r_datasets` works only because `dataset_key → title, publisher` holds in `records_flat`; run after lab step 4's partial rename, it fails on the key. Your table must now refuse the rename that caused it, a second title for the museum's dataset:

```sql
-- q: d2-ex-two-titles
-- status: ran
-- after: d2-flat, d2-ex
-- expect: error PRIMARY KEY or UNIQUE constraint violation
INSERT INTO r_datasets
SELECT dataset_key, 'Natuurmuseum Brabant - Vertebrates', publisher
FROM r_datasets
WHERE title = 'Natuurmuseum Brabant, Tilburg - Vertebrates';
```

```text
-- result: d2-ex-two-titles · error: statement 1 of 1: Constraint Error: PRIMARY KEY or UNIQUE constraint violation: duplicate key "3c2eb73a-82c8-4373-956f-1cb9473f76ba"
```

**Check:** `result, any row order` for the counts; then the page runs the insert above after your answer, and it must fail on `r_datasets`' key.

**Dialects:**
- **PostgreSQL:** nested data is `jsonb` (or arrays and composite types); `jsonb_array_elements`, `jsonb_to_recordset` and `unnest(array)` turn it into rows, `->` and `->>` reach into it, and `jsonb_agg`/`jsonb_build_object` build it back for a published file.
- **DuckDB:** `STRUCT`, `LIST` and `MAP` columns, read from Parquet or JSON (`read_json`); `unnest` and dot access as here, `to_json` and `list(…)` to nest again.
- **SQL Server:** no list or struct types: JSON is text (SQL Server 2025 adds a `json` type), shredded with `OPENJSON(...) WITH (...)` under `CROSS APPLY` and built with `FOR JSON PATH`; `STRING_SPLIT` splits a delimited cell.

#### d3 · indexes

**Tool:** PG · **Time:** 2.0 h · **Prereqs:** d1

**Concept:** PostgreSQL stores a table as 8 kB pages, about fifty records to a page in `occurrences`. A query that has nothing better reads every page, in order, and tests every row: a **sequential scan**. An **index** is a second structure, kept in step with the table, that leads from a value to the rows holding it. Before running a query, the **planner** writes several plans and picks the one it expects to read the fewest pages for the least work. That expectation comes from the **statistics** `ANALYZE` collects. So "why is this a sequential scan?" has four usual answers: there is no index that fits; the query hides the column inside an expression; the filter keeps so many rows that reading the whole table is cheaper; or the statistics are wrong.
- A **B-tree** (the default, `CREATE INDEX … ON t (col)`) keeps the values sorted. It finds one value, a range (`BETWEEN`, `>=`) or rows in sorted order (`ORDER BY … LIMIT`). An index on `(a, b)` is sorted by `a`, then by `b` inside each `a`: it jumps straight to `a = 48 AND b = 2010` or to `a = 48`, but a condition on `b` alone has nothing to jump to.
- How the rows are fetched shows in the plan. An **Index Scan** walks the index and fetches each row as it goes, in index order. A **Bitmap Index Scan** first collects every matching row's location, then the **Bitmap Heap Scan** reads each page that holds one, once, in page order (`Heap Blocks: exact=6` is six pages). Which the planner picks depends on how many rows match and how scattered they are: rows stored in roughly the index's order (a high correlation, below) favour the Index Scan. An **Index Only Scan** answers from the index alone, when every column the query needs is in the index and `VACUUM` has marked the pages all-visible. Because that depends on when autovacuum last ran, the labs below always ask for a column outside the index, so their plans don't change from run to run.
- **Statistics** live in `pg_statistic`, readable through the view `pg_stats`: per column, the share of `NULL`s, the number of distinct values, the most common values with their frequencies, a histogram of the rest, and the **correlation** between the values' order and the rows' physical order (1: stored in value order; 0: scattered). `ANALYZE` reads a sample of 300 × `default_statistics_target` rows (100, so 30,000), and autovacuum runs it again after enough of a table changes. After a bulk load, run it yourself: critwire's loader ends with `ANALYZE` on every table (§4.3). The planner treats columns as **independent**, which goes wrong when one column predicts another; `CREATE STATISTICS` teaches it how they go together.
- A **GiST** index on a geometry column stores each shape's bounding box in a tree of boxes. A spatial test like `ST_Intersects`, `ST_Covers` or `ST_DWithin` adds a box comparison the index can answer (`&&`, boxes overlap; `@`, box inside box), then runs the exact test only on the rows whose boxes passed. A test the index can't turn into a box, such as `ST_Distance(…) < d`, computes on every row. The loader builds one on every geometry column (`occurrences_geom_idx`). g5 goes further: nearest neighbours with `<->` and geography.
- A **BRIN** index keeps one summary, the smallest and largest value, per range of pages (128 by default). It is tiny, and it can only rule out ranges, so it helps exactly when the values follow the physical order: an id that grows as rows are appended, the time of a log line. The column's correlation tells you whether it will.
- **`EXPLAIN`** prints the chosen plan; **`EXPLAIN ANALYZE`** also runs the query and adds what really happened at each step (`actual rows`, `Rows Removed by Filter`). Read a plan from the innermost, most indented line outwards. On your own, use `EXPLAIN (ANALYZE, BUFFERS)`, which adds the planner's estimated cost and rows, the time and the pages read. The labs print `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)`, the plan's shape and its row counts only, because costs and times vary from machine to machine and the tests compare every line. `EXPLAIN ANALYZE` on an `INSERT`, `UPDATE` or `DELETE` really changes the rows, so wrap it in `BEGIN` … `ROLLBACK`.
- Indexes aren't free. Every index makes every write slower and takes disk space, and a primary key or `UNIQUE` constraint already brings one (d1). A foreign key doesn't: index its column when you join or delete through it. And a bulk load is faster when the indexes are built after the rows are in, which is why the lab file adds its keys and indexes after loading the data (§4.3).

Each lab below starts from the loaded tables: the tests run every block in a transaction and roll it back. To do the same in `psql`, type `BEGIN;` before a lab and `ROLLBACK;` after it, so the indexes you make in one lab don't change the plans of the next.

**Worked example:** Why is this a sequential scan? First, statistics everyone can reproduce. `ANALYZE` reads a random sample, so its numbers could differ slightly from one run to the next; with the target set to 1,000 it reads 300,000 rows, more than `occurrences` holds, so it reads them all and gets the same statistics every time. `SET LOCAL` lasts until the transaction ends. Every block of this module runs after this one:

```sql
-- q: d3-analyze
-- status: ran
-- engine: postgis
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences;
SELECT c.reltuples::bigint AS planner_rows, (SELECT count(*) FROM occurrences) AS table_rows
FROM pg_class AS c
WHERE c.oid = 'occurrences'::regclass;
```

```text
-- result: d3-analyze · 1 row · sha256 2415e801456a
planner_rows | table_rows
40395 | 40395
```

Temminck's pangolin (species 63) has nine records in the lab. With no index on `species_id`, PostgreSQL reads all 40,395 rows to find them:

```sql
-- q: d3-seq
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 63;
```

```text
-- result: d3-seq · 3 rows · sha256 2b6ae5eab0fd
QUERY PLAN
Seq Scan on occurrences (actual rows=9 loops=1)
  Filter: (species_id = 63)
  Rows Removed by Filter: 40386
```

`Rows Removed by Filter` is the waste: every row tested and thrown away. An index on the foreign key d1 left unindexed:

```sql
-- q: d3-btree
-- status: ran
-- engine: postgis
-- after: d3-analyze
CREATE INDEX occurrences_species_id_idx ON occurrences (species_id);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 63;
```

```text
-- result: d3-btree · 5 rows · sha256 d6791edbc017
QUERY PLAN
Bitmap Heap Scan on occurrences (actual rows=9 loops=1)
  Recheck Cond: (species_id = 63)
  Heap Blocks: exact=6
  ->  Bitmap Index Scan on occurrences_species_id_idx (actua…
        Index Cond: (species_id = 63)
```

The index finds the nine rows, and the table is read only where they are: six pages instead of all of them.

**Lab:**
1. An index the planner doesn't use. With an index on `year`, ask for every record since 2000:

```sql
-- q: d3-many-rows
-- status: ran
-- engine: postgis
-- after: d3-analyze
CREATE INDEX occurrences_year_idx ON occurrences (year);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year >= 2000;
```

```text
-- result: d3-many-rows · 3 rows · sha256 e99d8d0080da
QUERY PLAN
Seq Scan on occurrences (actual rows=29261 loops=1)
  Filter: (year >= 2000)
  Rows Removed by Filter: 11134
```

2. Seven records in ten are from 2000 or later. Through the index, PostgreSQL would read much of the index and still nearly every page of the table, so reading the table straight through is cheaper. Ask for this year's records, 74 of them, and the same index is used:

```sql
-- q: d3-few-rows
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-many-rows
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year >= 2026;
```

```text
-- result: d3-few-rows · 2 rows · sha256 38ac5a7e9de0
QUERY PLAN
Index Scan using occurrences_year_idx on occurrences (actual…
  Index Cond: (year >= 2026)
```

3. A column inside an expression. The records of the 1850s, written as "the decade is 185":

```sql
-- q: d3-function
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-many-rows
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year / 10 = 185;
```

```text
-- result: d3-function · 3 rows · sha256 1f4188e01d9f
QUERY PLAN
Seq Scan on occurrences (actual rows=26 loops=1)
  Filter: ((year / 10) = 185)
  Rows Removed by Filter: 40369
```

4. The index holds `year`, not `year / 10`, so it can't help. The same question as a range on the bare column can use it:

```sql
-- q: d3-range
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-many-rows
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year BETWEEN 1850 AND 1859;
```

```text
-- result: d3-range · 2 rows · sha256 d4f341dad05f
QUERY PLAN
Index Scan using occurrences_year_idx on occurrences (actual…
  Index Cond: ((year >= 1850) AND (year <= 1859))
```

The other way out is an index on the expression itself, `CREATE INDEX ON occurrences ((year / 10))`, which the planner uses for exactly that expression (run `ANALYZE` afterwards, so it has statistics for it too). The same goes for `lower(name) = …` and an index on `lower(name)`.

5. A join through the foreign key, as an app asks for one animal's records by its slug. Without an index on `occurrences.species_id`, PostgreSQL builds a hash table of the matching animal and runs every record past it:

```sql
-- q: d3-join-seq
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.slug = 'temmincks-pangolin';
```

```text
-- result: d3-join-seq · 8 rows · sha256 5f5262a5b6e9
QUERY PLAN
Hash Join (actual rows=9 loops=1)
  Hash Cond: (o.species_id = s.id)
  ->  Seq Scan on occurrences o (actual rows=40395 loops=1)
  ->  Hash (actual rows=1 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 9kB
… 3 more rows
```

6. With the index from the worked example, it finds the animal first, then looks up its records (a nested loop: for each row outside, an index lookup inside). `species` is read in full both times: 76 rows fit in a few pages, and no index beats that.

```sql
-- q: d3-join-index
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-btree
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.slug = 'temmincks-pangolin';
```

```text
-- result: d3-join-index · 9 rows · sha256 65566407e202
QUERY PLAN
Nested Loop (actual rows=9 loops=1)
  ->  Seq Scan on species s (actual rows=1 loops=1)
        Filter: (slug = 'temmincks-pangolin'::text)
        Rows Removed by Filter: 75
  ->  Bitmap Heap Scan on occurrences o (actual rows=9 loops…
… 4 more rows
```

7. An index on two columns. The devil's records of 2010, found through both columns at once:

```sql
-- q: d3-two-columns
-- status: ran
-- engine: postgis
-- after: d3-analyze
CREATE INDEX occurrences_species_year_idx ON occurrences (species_id, year);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, month
FROM occurrences
WHERE species_id = 48 AND year = 2010;
```

```text
-- result: d3-two-columns · 5 rows · sha256 e46d89a1ff97
QUERY PLAN
Bitmap Heap Scan on occurrences (actual rows=182 loops=1)
  Recheck Cond: ((species_id = 48) AND (year = 2010))
  Heap Blocks: exact=18
  ->  Bitmap Index Scan on occurrences_species_year_idx (act…
        Index Cond: ((species_id = 48) AND (year = 2010))
```

8. The same index, asked about `year` alone (1850 to 1899). It is still used, which surprises people taught that a second column is useless on its own. But the years are sorted only inside each animal, so there is no place to jump to: PostgreSQL 16 reads every entry of the index and checks the year on each, which here is still cheaper than reading the table. On a large table that is a scan of the whole index; give such a query its own index on `year`. (PostgreSQL 18's skip scan jumps animal by animal instead.)

```sql
-- q: d3-second-column
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-two-columns
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, month
FROM occurrences
WHERE year BETWEEN 1850 AND 1899;
```

```text
-- result: d3-second-column · 5 rows · sha256 71cb12c0a8a4
QUERY PLAN
Bitmap Heap Scan on occurrences (actual rows=107 loops=1)
  Recheck Cond: ((year >= 1850) AND (year <= 1899))
  Heap Blocks: exact=44
  ->  Bitmap Index Scan on occurrences_species_year_idx (act…
        Index Cond: ((year >= 1850) AND (year <= 1899))
```

9. What the planner believes about `occurrences`. A negative `n_distinct` is a share of the rows: −1 means every value is different. `id` has a correlation of 1 because the loader writes the rows in id order; `year` is partly ordered (0.62), the rest close to 0.

```sql
-- q: d3-stats
-- status: ran
-- engine: postgis
-- after: d3-analyze
SELECT attname AS column_name, null_frac, n_distinct, correlation
FROM pg_stats
WHERE schemaname = current_schema()
  AND tablename = 'occurrences'
  AND attname IN ('id', 'species_id', 'year', 'basis_of_record', 'license', 'country_code')
ORDER BY attname;
```

```text
-- result: d3-stats · 6 rows · sha256 0058f437405b
column_name | null_frac | n_distinct | correlation
basis_of_record | 0 | 7 | 0.05776447
country_code | 0 | 106 | -0.164075
id | 0 | -1 | 1
license | 0 | 2 | 0.39390513
species_id | 0 | 71 | 0.023194969
… 1 more row
```

10. The most common values, and the estimate each gives: the frequency times the rows the planner expects. Because `d3-analyze` read every row, the estimates are exact; with the default sample they would be close.

```sql
-- q: d3-mcv
-- status: ran
-- engine: postgis
-- after: d3-analyze
SELECT m.value AS basis_of_record,
       round(m.freq * c.reltuples) AS planner_estimate,
       (SELECT count(*) FROM occurrences AS o WHERE o.basis_of_record = m.value) AS actual
FROM pg_stats AS s
CROSS JOIN LATERAL unnest(s.most_common_vals::text::text[], s.most_common_freqs) AS m (value, freq)
JOIN pg_class AS c ON c.oid = 'occurrences'::regclass
WHERE s.schemaname = current_schema()
  AND s.tablename = 'occurrences'
  AND s.attname = 'basis_of_record'
ORDER BY m.value;
```

```text
-- result: d3-mcv · 7 rows · sha256 16d206284038
basis_of_record | planner_estimate | actual
HUMAN_OBSERVATION | 17587 | 17587
MACHINE_OBSERVATION | 8418 | 8418
MATERIAL_CITATION | 441 | 441
MATERIAL_SAMPLE | 1805 | 1805
OBSERVATION | 1384 | 1384
… 2 more rows
```

11. Two conditions together: the devil's records in Australia. The planner multiplies the two frequencies, as if an animal's country were chance:

```sql
-- q: d3-independent
-- status: ran
-- engine: postgis
-- after: d3-analyze
WITH mcv AS (
  SELECT s.attname, m.value, m.freq
  FROM pg_stats AS s
  CROSS JOIN LATERAL unnest(s.most_common_vals::text::text[], s.most_common_freqs) AS m (value, freq)
  WHERE s.schemaname = current_schema() AND s.tablename = 'occurrences'
)
SELECT round((SELECT freq FROM mcv WHERE attname = 'species_id' AND value = '48')
           * (SELECT freq FROM mcv WHERE attname = 'country_code' AND value = 'AU')
           * (SELECT reltuples FROM pg_class WHERE oid = 'occurrences'::regclass)) AS planner_estimate,
       (SELECT count(*) FROM occurrences WHERE species_id = 48 AND country_code = 'AU') AS actual;
```

```text
-- result: d3-independent · 1 row · sha256 a04db70be52f
planner_estimate | actual
230 | 1998
```

12. A guess nearly nine times too low is how a planner picks a nested loop where a hash join was needed. Extended statistics on the pair record the combinations that actually occur (`mcv`), and the planner uses them for both conditions at once:

```sql
-- q: d3-extended
-- status: ran
-- engine: postgis
CREATE STATISTICS occurrences_species_country (mcv) ON species_id, country_code FROM occurrences;
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences;
SELECT s.most_common_vals[i][1] AS species_id, s.most_common_vals[i][2] AS country_code,
       round(s.most_common_freqs[i] * c.reltuples) AS planner_estimate
FROM pg_stats_ext AS s
CROSS JOIN generate_subscripts(s.most_common_freqs, 1) AS i
JOIN pg_class AS c ON c.oid = 'occurrences'::regclass
WHERE s.statistics_name = 'occurrences_species_country'
  AND s.most_common_vals[i][1] = '48'
ORDER BY planner_estimate DESC;
```

```text
-- result: d3-extended · 2 rows · sha256 ea5f3d4586b1
species_id | country_code | planner_estimate
48 | AU | 1998
48 | US | 2
```

13. A spatial join through GiST: the records inside Nepal. The index finds the records whose point is inside Nepal's bounding box (`@`); `ST_Covers` then tests each one against the outline, and the box's corners outside Nepal are what it removes:

```sql
-- q: d3-gist-join
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM country_shapes AS cs
JOIN occurrences AS o ON ST_Covers(cs.geom, o.geom)
WHERE cs.country_code = 'NP';
```

```text
-- result: d3-gist-join · 9 rows · sha256 831e30c01c92
QUERY PLAN
Nested Loop (actual rows=184 loops=1)
  ->  Index Scan using country_shapes_pkey on country_shapes…
        Index Cond: (country_code = 'NP'::text)
  ->  Bitmap Heap Scan on occurrences o (actual rows=184 loo…
        Filter: st_covers(cs.geom, geom)
… 4 more rows
```

14. Records within half a degree of a point in Tasmania. (Degrees, because the lab's points are longitude and latitude; g1 and g5 measure in metres.) `ST_DWithin` widens the point into a box half a degree each way, the index finds the records in the box, and the exact distance runs on those only:

```sql
-- q: d3-dwithin
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM admin1_shapes AS a
JOIN occurrences AS o ON ST_DWithin(o.geom, ST_PointOnSurface(a.geom), 0.5)
WHERE a.name = 'Tasmania';
```

```text
-- result: d3-dwithin · 10 rows · sha256 d06922cb9525
QUERY PLAN
Nested Loop (actual rows=186 loops=1)
  ->  Seq Scan on admin1_shapes a (actual rows=1 loops=1)
        Filter: (name = 'Tasmania'::text)
        Rows Removed by Filter: 293
  ->  Bitmap Heap Scan on occurrences o (actual rows=186 loo…
… 5 more rows
```

15. The same question written with `ST_Distance`. Same rows, but there is no box to give the index, so every record's distance is computed:

```sql
-- q: d3-distance
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM admin1_shapes AS a
JOIN occurrences AS o ON ST_Distance(o.geom, ST_PointOnSurface(a.geom)) < 0.5
WHERE a.name = 'Tasmania';
```

```text
-- result: d3-distance · 7 rows · sha256 b000623aa7a8
QUERY PLAN
Nested Loop (actual rows=186 loops=1)
  Join Filter: (st_distance(o.geom, st_pointonsurface(a.geom…
  Rows Removed by Join Filter: 40209
  ->  Seq Scan on admin1_shapes a (actual rows=1 loops=1)
        Filter: (name = 'Tasmania'::text)
… 2 more rows
```

16. A BRIN index on `year`, as the table is stored. A BRIN index returns page ranges, not rows; PostgreSQL counts ten rows per page in its `actual rows`. The table's 40,395 rows fill seven ranges of 128 pages, and four of them hold some record from the 1850s, so 512 pages are read and rechecked row by row:

```sql
-- q: d3-brin
-- status: ran
-- engine: postgis
-- after: d3-analyze
CREATE INDEX occurrences_year_brin ON occurrences USING brin (year);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year BETWEEN 1850 AND 1859;
```

```text
-- result: d3-brin · 6 rows · sha256 8d3b91175bd6
QUERY PLAN
Bitmap Heap Scan on occurrences (actual rows=26 loops=1)
  Recheck Cond: ((year >= 1850) AND (year <= 1859))
  Rows Removed by Index Recheck: 26264
  Heap Blocks: lossy=512
  ->  Bitmap Index Scan on occurrences_year_brin (actual row…
… 1 more row
```

17. The same index on a copy stored in year order (`occurrences_by_year`; `CLUSTER` reorders a table in place, but it locks the table while it does). Now the 1850s sit in the first range only:

```sql
-- q: d3-brin-sorted
-- status: ran
-- engine: postgis
CREATE TABLE occurrences_by_year AS
SELECT * FROM occurrences ORDER BY year, id;
CREATE INDEX occurrences_by_year_brin ON occurrences_by_year USING brin (year);
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences_by_year;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences_by_year
WHERE year BETWEEN 1850 AND 1859;
```

```text
-- result: d3-brin-sorted · 6 rows · sha256 7f856cb65d9e
QUERY PLAN
Bitmap Heap Scan on occurrences_by_year (actual rows=26 loop…
  Recheck Cond: ((year >= 1850) AND (year <= 1859))
  Rows Removed by Index Recheck: 6488
  Heap Blocks: lossy=128
  ->  Bitmap Index Scan on occurrences_by_year_brin (actual …
… 1 more row
```

18. What each costs on disk: the BRIN index is three pages, a B-tree on the same column about a twentieth of the table.

```sql
-- q: d3-sizes
-- status: ran
-- engine: postgis
-- after: d3-brin-sorted
CREATE INDEX occurrences_by_year_btree ON occurrences_by_year (year);
SELECT pg_size_pretty(pg_relation_size('occurrences_by_year')) AS table_size,
       pg_size_pretty(pg_relation_size('occurrences_by_year_btree')) AS btree_size,
       pg_size_pretty(pg_relation_size('occurrences_by_year_brin')) AS brin_size;
```

```text
-- result: d3-sizes · 1 row · sha256 abcc435e8f56
table_size | btree_size | brin_size
6656 kB | 304 kB | 24 kB
```

**Result:** A filter on an unindexed column reads the whole table (40,386 of the pangolin's 40,395 rows thrown away); a B-tree turns it into six pages, and turns the slug join from a hash join over every record into a nested loop over nine. The planner skips an index when the filter keeps most of the table (72 % of records are from 2000 on), and can't use it when the column is inside an expression (`year / 10`); rewriting the filter as a range fixes that. A two-column index jumps on its first column; on its second alone, PostgreSQL 16 reads all of it. The planner's beliefs are in `pg_stats`: exact for one column after a full `ANALYZE`, but its independence assumption put the devil's Australian records at 230 when there are 1,998, until extended statistics recorded the pair. GiST answers `ST_Covers` and `ST_DWithin` through bounding boxes and leaves `ST_Distance` to a full scan. BRIN is three pages and helps only when the rows are stored in the column's order: 512 pages read for the 1850s as loaded, 128 on the sorted copy.

**Exercise:** A game shows an animal's records for a decade, newest first, twenty at a time. For the devil in the 2000s:

```sql
-- q: d3-ex-rows
-- status: ran
-- engine: postgis
SELECT id, year, month
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2009
ORDER BY year DESC, id DESC
LIMIT 20;
```

```text
-- result: d3-ex-rows · 20 rows · sha256 2be4fa3d7b63
id | year | month
6004147577 | 2009 | NULL
6004147576 | 2009 | NULL
6004147534 | 2009 | NULL
6004147500 | 2009 | NULL
6004147435 | 2009 | NULL
… 15 more rows
```

As loaded, PostgreSQL reads every record, keeps the devil's 1,390 from the decade and sorts them to return twenty:

```sql
-- q: d3-ex-before
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2009
ORDER BY year DESC, id DESC
LIMIT 20;
```

```text
-- result: d3-ex-before · 7 rows · sha256 d6e50d56b7a4
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Sort (actual rows=20 loops=1)
        Sort Key: year DESC, id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        ->  Seq Scan on occurrences (actual rows=1390 loops=…
… 2 more rows
```

Create the one index that lets it read just those twenty rows, with no sort and no sequential scan, and show the plan.

**Answer:** An index on the filter's equality column first, then the sort's columns in the sort's order. PostgreSQL reads a B-tree in either direction, so `(species_id, year, id)` serves `year DESC, id DESC` backwards; `(species_id, year DESC, id DESC)` is the same index read forwards.

```sql
-- q: d3-ex
-- status: ran
-- engine: postgis
-- after: d3-analyze
CREATE INDEX occurrences_species_year_id_idx ON occurrences (species_id, year, id);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2009
ORDER BY year DESC, id DESC
LIMIT 20;
```

```text
-- result: d3-ex · 3 rows · sha256 662b60fd19af
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Index Scan Backward using occurrences_species_year_id_…
        Index Cond: ((species_id = 48) AND (year >= 2000) AN…
```

**Check:** Compare your plan with the answer's: a `Limit` over an `Index Scan` or `Index Scan Backward` on your index with `actual rows=20`, its `Index Cond` holding both the animal and the years, and no `Sort` or `Seq Scan` anywhere. Then run the query itself: its twenty rows equal `d3-ex-rows`'. An index on `(species_id)` alone, or on `(year, species_id)`, still needs the `Sort`.

**Dialects:**
- **PostgreSQL:** B-tree, hash, GiST, SP-GiST, GIN and BRIN; partial indexes (`… WHERE basis_of_record = 'PRESERVED_SPECIMEN'`), expression indexes and `INCLUDE` columns for index-only scans; `CREATE INDEX CONCURRENTLY` builds without blocking writes (not inside a transaction); `EXPLAIN (ANALYZE, BUFFERS)`, which PostgreSQL 18 prints by default; `CREATE STATISTICS` for columns that go together; skip scan from 18.
- **DuckDB:** stores tables by column and keeps a min-max summary (a zonemap) of every column in every row group automatically, BRIN's idea built in, so it scans and skips rather than seeks. `CREATE INDEX` builds an ART index, used for primary keys, `UNIQUE` and very selective equality lookups only; the spatial extension adds an R-tree (`USING RTREE`); `EXPLAIN ANALYZE` prints the plan with timings.
- **SQL Server:** a clustered index *is* the table, stored in key order (one per table); nonclustered indexes point to it (the plan's Key Lookup is PostgreSQL's fetch from the table), with `INCLUDE` columns and filtered indexes (`WHERE …`); columnstore indexes skip row groups by their min-max, as BRIN does; spatial indexes are grids, not trees; statistics are created and updated automatically, and `SET STATISTICS IO ON` with the actual execution plan shows the pages read.

(S21–S22 write d4–d5 here.)

#### d6 · star

(S23 writes the module around this key code; §A.3 is the spike that tests it.)

**Key code:**

A star schema answers report questions with one join per question: a fact table holds one row per event at a stated grain, and each dimension describes one way to slice it. These blocks are `star.sql`, the one definition of the star: standard SQL with no schema names, so the same text runs in PostGIS (this lab, in `learn_curriculum`) and in DuckDB (critwire's build, which writes the CSV files Power BI reads). Each block creates one table, fills it from the lab tables and reports what it holds. Keys are declared in each `CREATE TABLE`, because DuckDB accepts foreign keys only there.

`dim_species` flattens the taxonomy into columns: a report filters by class or family without walking `taxa` (a star, not a snowflake).

```sql
-- q: d6-star-dim-species
-- status: ran
-- engine: postgis
CREATE TABLE dim_species (
  species_id      INTEGER PRIMARY KEY,
  scientific_name VARCHAR NOT NULL,
  common_name     VARCHAR NOT NULL,
  class           VARCHAR NOT NULL,
  order_name      VARCHAR NOT NULL,
  family          VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL
);
INSERT INTO dim_species
SELECT s.id, s.scientific_name, s.common_name, t.class, t.order_name, t.family, t.genus
FROM species AS s
JOIN species_taxonomy AS t ON t.species_id = s.id;
SELECT count(*) AS species, count(DISTINCT class) AS classes, count(DISTINCT family) AS families
FROM dim_species;
```

```text
-- result: d6-star-dim-species · 1 row · sha256 f55e25393aeb
species | classes | families
76 | 3 | 50
```

`dim_country` is every country plus one **unknown member**, `ZZ`. A record with no country gets `ZZ` in the fact table, so every foreign key is filled and a report's totals still add up; the browser schema's nullable `country_code` becomes this one row.

```sql
-- q: d6-star-dim-country
-- status: ran
-- engine: postgis
CREATE TABLE dim_country (
  country_code VARCHAR PRIMARY KEY,
  name         VARCHAR NOT NULL,
  continent    VARCHAR NOT NULL,
  region       VARCHAR NOT NULL,
  subregion    VARCHAR NOT NULL
);
INSERT INTO dim_country
SELECT code, name, continent, region, subregion FROM countries
UNION ALL
SELECT 'ZZ', 'Unknown or outside any country', 'Unknown', 'Unknown', 'Unknown';
SELECT count(*) AS countries, count(*) FILTER (WHERE country_code = 'ZZ') AS unknown_members
FROM dim_country;
```

```text
-- result: d6-star-dim-country · 1 row · sha256 c47786e15c16
countries | unknown_members
251 | 1
```

`dim_dataset` carries each dataset's credit (title, publisher, DOI, license), so the credits travel with the star into any report built on it.

```sql
-- q: d6-star-dim-dataset
-- status: ran
-- engine: postgis
CREATE TABLE dim_dataset (
  dataset_key VARCHAR PRIMARY KEY,
  title       VARCHAR NOT NULL,
  publisher   VARCHAR NOT NULL,
  doi         VARCHAR,
  license     VARCHAR NOT NULL
);
INSERT INTO dim_dataset
SELECT CAST(dataset_key AS VARCHAR), title, publisher, doi, license
FROM datasets;
SELECT count(*) AS datasets, count(doi) AS with_doi, count(DISTINCT publisher) AS publishers
FROM dim_dataset;
```

```text
-- result: d6-star-dim-dataset · 1 row · sha256 3e8e7544bbbe
datasets | with_doi | publishers
400 | 400 | 217
```

`dim_year` has the years that occur, plus `-1` for a record with no year: the same unknown-member rule.

```sql
-- q: d6-star-dim-year
-- status: ran
-- engine: postgis
CREATE TABLE dim_year (
  year   INTEGER PRIMARY KEY,
  decade INTEGER,
  label  VARCHAR NOT NULL
);
INSERT INTO dim_year
SELECT DISTINCT year, year - year % 10, CAST(year AS VARCHAR)
FROM occurrences
WHERE year IS NOT NULL
UNION ALL
SELECT -1, NULL, 'Unknown';
SELECT count(*) AS years, min(year) FILTER (WHERE year > 0) AS first_year, max(year) AS last_year
FROM dim_year;
```

```text
-- result: d6-star-dim-year · 1 row · sha256 fcdad55612e8
years | first_year | last_year
177 | 1599 | 2026
```

`fact_records`: the grain is **one sample record**. `coalesce` is the one place a missing country or year becomes its unknown member. `basis_of_record` and `license` stay on the fact as plain columns (degenerate dimensions): they have no attributes of their own to describe.

```sql
-- q: d6-star-fact-records
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year
CREATE TABLE fact_records (
  record_id                BIGINT PRIMARY KEY,
  species_id               INTEGER NOT NULL REFERENCES dim_species (species_id),
  country_code             VARCHAR NOT NULL REFERENCES dim_country (country_code),
  dataset_key              VARCHAR NOT NULL REFERENCES dim_dataset (dataset_key),
  year                     INTEGER NOT NULL REFERENCES dim_year (year),
  month                    INTEGER,
  basis_of_record          VARCHAR NOT NULL,
  license                  VARCHAR NOT NULL,
  longitude                DOUBLE PRECISION NOT NULL,
  latitude                 DOUBLE PRECISION NOT NULL,
  coordinate_uncertainty_m DOUBLE PRECISION
);
INSERT INTO fact_records
SELECT id, species_id, coalesce(country_code, 'ZZ'), CAST(dataset_key AS VARCHAR), coalesce(year, -1), month,
       basis_of_record, license, longitude, latitude, coordinate_uncertainty_m
FROM occurrences;
SELECT count(*) AS records,
       count(*) FILTER (WHERE country_code = 'ZZ') AS unknown_country,
       count(*) FILTER (WHERE year = -1) AS unknown_year,
       count(coordinate_uncertainty_m) AS with_uncertainty
FROM fact_records;
```

```text
-- result: d6-star-fact-records · 1 row · sha256 808a805569b8
records | unknown_country | unknown_year | with_uncertainty
40395 | 0 | 2289 | 16393
```

`fact_species_country` is a **factless fact**: it has no measure, only the pairs critwire publishes (a country where a species has open records). It shares `dim_species` and `dim_country` with `fact_records`, so one country slicer filters both (conformed dimensions).

```sql
-- q: d6-star-fact-species-country
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country
CREATE TABLE fact_species_country (
  species_id   INTEGER NOT NULL REFERENCES dim_species (species_id),
  country_code VARCHAR NOT NULL REFERENCES dim_country (country_code),
  PRIMARY KEY (species_id, country_code)
);
INSERT INTO fact_species_country
SELECT species_id, country_code FROM species_countries;
SELECT count(*) AS pairs, count(DISTINCT species_id) AS species, count(DISTINCT country_code) AS countries
FROM fact_species_country;
```

```text
-- result: d6-star-fact-species-country · 1 row · sha256 e67b39a44d4e
pairs | species | countries
472 | 72 | 107
```

The habitat classes have two levels; `dim_habitat_class` flattens them, and a level-1 class is its own parent, so a report can group by `level1_name` with no gaps. The habitat data are stand-ins until L3 loads the habitat summaries.

```sql
-- q: d6-star-dim-habitat-class
-- status: ran
-- engine: postgis
CREATE TABLE dim_habitat_class (
  habitat_code INTEGER PRIMARY KEY,
  name         VARCHAR NOT NULL,
  level1_code  INTEGER NOT NULL,
  level1_name  VARCHAR NOT NULL
);
INSERT INTO dim_habitat_class
SELECT h.code, h.name, coalesce(h.level1_code, h.code), coalesce(p.name, h.name)
FROM habitat_classes AS h
LEFT JOIN habitat_classes AS p ON p.code = h.level1_code;
SELECT count(*) AS classes, count(DISTINCT level1_code) AS level1_classes
FROM dim_habitat_class;
```

```text
-- result: d6-star-dim-habitat-class · 1 row · sha256 37ad5647623e
classes | level1_classes
75 | 13
```

`fact_country_habitat`: the grain is **one country and one habitat class**, with a measure that adds up across classes, `est_area_km2`.

```sql
-- q: d6-star-fact-country-habitat
-- status: ran
-- engine: postgis
-- after: d6-star-dim-country, d6-star-dim-habitat-class
CREATE TABLE fact_country_habitat (
  country_code VARCHAR NOT NULL REFERENCES dim_country (country_code),
  habitat_code INTEGER NOT NULL REFERENCES dim_habitat_class (habitat_code),
  est_area_km2 DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (country_code, habitat_code)
);
INSERT INTO fact_country_habitat
SELECT country_code, habitat_code, est_area_km2 FROM country_habitats;
SELECT count(*) AS country_classes, count(DISTINCT country_code) AS countries, sum(est_area_km2) AS total_km2
FROM fact_country_habitat;
```

```text
-- result: d6-star-fact-country-habitat · 1 row · sha256 a745d03c7c43
country_classes | countries | total_km2
35 | 2 | 6062.26
```

### 5.3 GIS in SQL

(S24)

### 5.4 Spatial statistics

#### s4 · moran

(S25 writes the outline around this key code; §A.2 is the spike that tests it.)

**Key code:**

Points can't be the units for Moran's I: a record has no value to compare with its neighbours', and many records share one spot. So the records are counted into equal-area hexagons over Tasmania's main island (EPSG:3577, Australian Albers), at two cell sizes, and each cell's value is `y = ln(1 + n)`. Its centroid is kept as two plain numbers, `cx` and `cy`, so SQL and PySAL measure distances from the same coordinates. The neighbour rule is a view: two cells of one grid are neighbours when their centroids are within twice the edge length. This block runs when a PostGIS run starts, and its tables stay until the lab data is loaded again.

```sql
-- q: s4-cells
-- status: ran
-- engine: postgis
-- boot
CREATE TABLE s4_cells AS
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), devils AS (
  SELECT ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), grid AS (
  SELECT e.edge_m, h.i, h.j, h.geom
  FROM island, (VALUES (5000), (10000)) AS e (edge_m), ST_HexagonGrid(e.edge_m, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
)
SELECT row_number() OVER (ORDER BY g.edge_m, g.i, g.j)::integer AS id,
       g.edge_m, g.geom,
       ST_X(ST_Centroid(g.geom)) AS cx,
       ST_Y(ST_Centroid(g.geom)) AS cy,
       count(d.geom)::integer AS n,
       ln(1 + count(d.geom)::float8) AS y
FROM grid AS g LEFT JOIN devils AS d ON ST_Contains(g.geom, d.geom)
GROUP BY g.edge_m, g.i, g.j, g.geom;
ALTER TABLE s4_cells ADD PRIMARY KEY (id);
CREATE VIEW s4_neighbours AS
SELECT a.edge_m, a.id AS i, b.id AS j
FROM s4_cells AS a
JOIN s4_cells AS b
  ON b.edge_m = a.edge_m AND b.id <> a.id
 AND ST_DWithin(ST_Point(a.cx, a.cy, 3577), ST_Point(b.cx, b.cy, 3577), 2 * a.edge_m);
SELECT c.edge_m, count(*) AS cells, sum(c.n) AS records_in_cells,
       (SELECT count(*) FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
        WHERE s.scientific_name = 'Sarcophilus harrisii') - sum(c.n) AS records_in_no_cell,
       max(c.n) AS max_n
FROM s4_cells AS c
GROUP BY c.edge_m
ORDER BY c.edge_m;
```

```text
-- result: s4-cells · 2 rows · sha256 29efe20842eb
edge_m | cells | records_in_cells | records_in_no_cell | max_n
5000 | 1094 | 1972 | 28 | 256
10000 | 296 | 1990 | 10 | 475
```

Before building weights from a distance band, look at the distances. In a hexagon grid with edge `e`, centroids are √3·e apart (the touching cells), then 3·e (the next ring). A threshold of 2·e sits between the two, with no pair near it, so every cell gets exactly its touching cells and a rounding error can't move a pair across. The block also counts duplicate centroids and cells with no neighbour (an "island"), which would break the statistic.

```sql
-- q: s4-geometry
-- status: ran
-- engine: postgis
WITH pairs AS (
  SELECT a.edge_m, ST_Distance(ST_Point(a.cx, a.cy, 3577), ST_Point(b.cx, b.cy, 3577)) AS d_m
  FROM s4_cells AS a
  JOIN s4_cells AS b
    ON b.edge_m = a.edge_m AND b.id > a.id
   AND ST_DWithin(ST_Point(a.cx, a.cy, 3577), ST_Point(b.cx, b.cy, 3577), 4 * a.edge_m)
), classes AS (
  SELECT edge_m, round(d_m::numeric, 2) AS d_m,
         dense_rank() OVER (PARTITION BY edge_m ORDER BY round(d_m::numeric, 2)) AS class
  FROM pairs
)
SELECT c.edge_m,
       2 * c.edge_m AS threshold_m,
       (SELECT min(d_m) FROM classes WHERE edge_m = c.edge_m AND class = 1) AS class_1_m,
       (SELECT min(d_m) FROM classes WHERE edge_m = c.edge_m AND class = 2) AS class_2_m,
       count(*) - count(DISTINCT (c.cx, c.cy)) AS duplicate_centroids,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM s4_neighbours AS nb WHERE nb.i = c.id)) AS islands,
       (SELECT count(*) FROM pairs AS p WHERE p.edge_m = c.edge_m AND abs(p.d_m - 2 * p.edge_m) <= 1) AS pairs_near_threshold
FROM s4_cells AS c
GROUP BY c.edge_m
ORDER BY c.edge_m;
```

```text
-- result: s4-geometry · 2 rows · sha256 099b07470829
edge_m | threshold_m | class_1_m | class_2_m | duplicate_centroids | islands | pairs_near_threshold
5000 | 10000 | 8660.25 | 15000.00 | 0 | 0 | 0
10000 | 20000 | 17320.51 | 30000.00 | 0 | 0 | 0
```

Global Moran's I in plain SQL, with row-standardized weights (`w_ij = 1/k_i`, where `k_i` is cell i's number of neighbours) and its expected value, variance and z-score under the normality assumption. These are the formulas PySAL's `esda.Moran` uses (`EI`, `VI_norm`, `z_norm`).

```sql
-- q: s4-moran-sql
-- status: ran
-- engine: postgis
WITH z AS (
  SELECT id, edge_m, y - avg(y) OVER (PARTITION BY edge_m) AS z FROM s4_cells
), w AS (
  SELECT edge_m, i, j, 1 / count(*) OVER (PARTITION BY i)::float8 AS w FROM s4_neighbours
), pairs AS (
  SELECT w.edge_m, w.i, w.j, w.w AS w_ij, t.w AS w_ji
  FROM w JOIN w AS t ON t.i = w.j AND t.j = w.i
), sums AS (
  SELECT p.edge_m,
         sum(p.w_ij * zi.z * zj.z) AS wzz,
         sum(p.w_ij) AS s0,
         sum((p.w_ij + p.w_ji) ^ 2) / 2 AS s1
  FROM pairs AS p JOIN z AS zi ON zi.id = p.i JOIN z AS zj ON zj.id = p.j
  GROUP BY p.edge_m
), s2 AS (
  SELECT edge_m, sum(ws ^ 2) AS s2
  FROM (SELECT edge_m, i, sum(w_ij) + sum(w_ji) AS ws FROM pairs GROUP BY edge_m, i) AS cell
  GROUP BY edge_m
), cells AS (
  SELECT edge_m, count(*)::float8 AS n, sum(z * z) AS zz FROM z GROUP BY edge_m
), moran AS (
  SELECT c.edge_m, c.n,
         c.n / s.s0 * s.wzz / c.zz AS i,
         -1 / (c.n - 1) AS ei,
         (c.n ^ 2 * s.s1 - c.n * s2.s2 + 3 * s.s0 ^ 2) / ((c.n - 1) * (c.n + 1) * s.s0 ^ 2) - (1 / (c.n - 1)) ^ 2 AS var_norm
  FROM cells AS c JOIN sums AS s USING (edge_m) JOIN s2 USING (edge_m)
)
SELECT edge_m, n::integer AS n, i, ei, var_norm, (i - ei) / sqrt(var_norm) AS z
FROM moran
ORDER BY edge_m;
```

```text
-- result: s4-moran-sql · 2 rows · sha256 7cd3a5f317d7
edge_m | n | i | ei | var_norm | z
5000 | 1094 | 0.27329612511604184 | -0.0009149130832570906 | 0.000326399057870225 | 15.177857980449323
10000 | 296 | 0.2035877773186644 | -0.003389830508474576 | 0.0012597916525627741 | 5.831415676740585
```

The same statistic in PySAL, from the same cells. `DistanceBand` builds the binary weights; `transformation="r"` row-standardizes them. `z_rand` is the z-score under the randomization assumption, which ArcGIS reports.

```python
# q: s4-moran-pysal
# status: ran
# after: py-connect
import esda
import numpy as np
from libpysal.weights import DistanceBand

results = {}
with connect() as conn:
    edges = [e for (e,) in conn.execute("SELECT DISTINCT edge_m FROM s4_cells ORDER BY edge_m")]
    for edge_m in edges:
        rows = conn.execute(
            "SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = %s ORDER BY id", (edge_m,)
        ).fetchall()
        ids = [r[0] for r in rows]
        y = np.array([r[1] for r in rows])
        xy = np.array([(r[2], r[3]) for r in rows])
        w = DistanceBand(xy, threshold=2 * edge_m, binary=True, ids=ids)
        assert w.islands == [], f"cells with no neighbour: {w.islands}"
        results[edge_m] = esda.Moran(y, w, transformation="r", permutations=0)

print("edge_m | n | I | E[I] | Var_norm | z_norm | z_rand")
for edge_m, mi in results.items():
    print(f"{edge_m} | {mi.n} | {mi.I:.6f} | {mi.EI:.6f} | {mi.VI_norm:.6e} | {mi.z_norm:.6f} | {mi.z_rand:.6f}")
```

```text
-- result: s4-moran-pysal · python · sha256 30d9b36db807
edge_m | n | I | E[I] | Var_norm | z_norm | z_rand
5000 | 1094 | 0.273296 | -0.000915 | 3.263991e-04 | 15.177858 | 15.246590
10000 | 296 | 0.203588 | -0.003390 | 1.259792e-03 | 5.831416 | 5.847466
```

### 5.5 ETL

(S26)

### 5.6 Power BI

(S26 writes p2–p4 and the outline around p1's key code; §A.3 checks the files it reads.)

#### p1 · power-query

**Key code:**

Power BI reads the star d6 builds, as CSV files critwire publishes under `/learn/data/star/`. `LoadStar` is one function for all eight tables: create it as a blank query (Home → Get data → Blank query → Advanced editor), then add one query per table that calls it, for example `dim_country = LoadStar("dim_country", {{"country_code", type text}, {"name", type text}, {"continent", type text}, {"region", type text}, {"subregion", type text}})`. The base URL is fixed and the file name goes in `RelativePath`, so the Power BI Service can refresh it with anonymous access. The culture `"en-US"` is explicit, so a computer set to a comma-decimal locale still reads `12.5` as twelve and a half. Type `country_code` as text: Namibia's code is `NA`, which some tools read as "not available".

```m
// q: p1-load
// status: untested: Power BI is Windows-only
// input: star/dim_species.csv, star/dim_country.csv, star/dim_dataset.csv, star/dim_year.csv, star/fact_records.csv, star/fact_species_country.csv, star/dim_habitat_class.csv, star/fact_country_habitat.csv
(file as text, types as list) as table =>
let
    Source = Web.Contents("https://critwire.com", [RelativePath = "learn/data/star/" & file & ".csv"]),
    Rows = Csv.Document(Source, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
    Promoted = Table.PromoteHeaders(Rows, [PromoteAllScalars = true]),
    Typed = Table.TransformColumnTypes(Promoted, types, "en-US")
in
    Typed
```

### 5.7 Capstone

(S27)

## 6. ERDs

Three diagrams, one per database a learner meets: the browser's tables (schema v2), the PostGIS lab, and the star that Power BI reads. Each is a Mermaid source under `plans/`, shown here as it is in that file, and each is checked against the database it describes on every run of the tests (§0): a column, key or line in the picture that the database lacks fails, and so does the reverse. The data dictionary under each diagram says the same in words, with where each column comes from; its column, type, key and meaning are the diagram's own, and a test holds them to it.

How to read the lines: `||` exactly one, `|o` zero or one, `o{` zero or more, `|{` one or more. The side with the crow's foot holds the foreign key. PK is the primary key, FK a foreign key, UK a unique key.

The pictures are drawn offline by Mermaid in a headless browser, as SVG (plain text labels, so it shows inside an `<img>`) and PNG. Each SVG records the sha256 of the source it was drawn from, so a build can refuse a picture older than its source (002 §3): `node scripts/erd.ts plans/004-learn-erd.mmd --name schema`, then `--name lab` and `--name star` for the other two.

### 6.1 Schema v2: the browser's tables

`plans/004-learn-erd.mmd`. 002's six tables and their lines are unchanged (the check compares them with `plans/002-learn-erd.mmd` and allows no new line between them); v2 adds the lab sample. A record belongs to one species and one dataset. Its country is optional: `country_code_gbif` keeps GBIF's code as delivered, and `country_code` holds it only when it is a row of `countries`, so GBIF's `ZZ` (unknown) and `XZ` (high seas) never break the foreign key. The view `species_taxonomy (species_id, class, order_name, family, genus)` stores nothing and isn't drawn.

```mermaid
%% critwire Learn: the learners' schema v2 in the browser (plans/004-learn-curriculum.md §4, §6): 002's schema v1, unchanged, plus the lab sample.
%% extends: 002-learn-erd.mmd
%% Tables only; the view species_taxonomy is listed beside it.
%% Keys: PK primary key, FK foreign key, UK unique. Lines: || exactly one, |o or o| zero or one, |{ one or more, o{ zero or more.
erDiagram
    taxa {
        VARCHAR name PK "Agalychnis, Phyllomedusidae, Anura, Amphibia"
        VARCHAR taxon_rank "class, order, family or genus"
        VARCHAR parent_name FK "the taxon one rank up; NULL for a class"
    }
    species {
        INTEGER id PK "critwire's own id, never reused"
        VARCHAR slug UK "red-eyed-tree-frog"
        VARCHAR scientific_name UK "Agalychnis callidryas"
        VARCHAR common_name "Red-eyed Tree Frog"
        VARCHAR genus FK "a taxa row of rank genus"
        VARCHAR range_status "ok, no-open-records or identity-unsettled"
        VARCHAR photo_url "NULL when there is no photo"
        VARCHAR photo_credit "who took the photo"
        VARCHAR photo_license "CC BY-SA 4.0, CC BY 2.0, CC0, Public domain"
        VARCHAR photo_page "the photo's Wikimedia Commons page"
        INTEGER iucn_id UK "IUCN Red List taxon id"
        BIGINT gbif_id UK "GBIF backbone taxon key"
        VARCHAR col_id UK "Catalogue of Life id"
        VARCHAR wikidata_id UK "Wikidata item"
        INTEGER inaturalist_id UK "iNaturalist taxon id"
        INTEGER ncbi_id UK "NCBI Taxonomy id"
    }
    countries {
        VARCHAR code PK "ISO 3166-1 alpha-2, plus XK"
        VARCHAR name UK "Brazil"
        VARCHAR continent "South America"
        VARCHAR region "Americas"
        VARCHAR subregion "South America"
    }
    species_countries {
        INTEGER species_id PK, FK "the animal"
        VARCHAR country_code PK, FK "recorded there in open records"
    }
    sources {
        VARCHAR name PK "Wikidata, Catalogue of Life, critwire base"
        VARCHAR license "the license of what critwire took"
        DATE retrieved "when critwire took it; NULL for critwire base"
    }
    species_sources {
        INTEGER species_id PK, FK "the animal"
        VARCHAR field PK "a path in the record, such as ids.col"
        VARCHAR source_name FK "who supplied that field"
    }
    datasets {
        VARCHAR dataset_key PK "GBIF's dataset id"
        VARCHAR title "the dataset's own title"
        VARCHAR publisher "the organization that published it"
        VARCHAR doi "the dataset's DOI; NULL when it has none"
        VARCHAR license "the license the dataset declares"
    }
    occurrences {
        BIGINT id PK "GBIF's record id"
        INTEGER species_id FK "the animal recorded"
        VARCHAR dataset_key FK "the dataset to credit"
        VARCHAR license "CC0 1.0 or CC BY 4.0, the stricter of record and dataset"
        VARCHAR basis_of_record "HUMAN_OBSERVATION, PRESERVED_SPECIMEN, ..."
        DOUBLE longitude "degrees east, WGS 84"
        DOUBLE latitude "degrees north, WGS 84"
        DOUBLE coordinate_uncertainty_m "metres; NULL when not given"
        VARCHAR country_code_gbif "GBIF's code as delivered; ZZ unknown, XZ high seas"
        VARCHAR country_code FK "that code when it is a countries row, else NULL"
        INTEGER year "NULL when the record has none"
        INTEGER month "1 to 12; NULL when the record has none"
    }

    taxa |o--o{ taxa : "parent of"
    taxa ||--o{ species : "genus of"
    species ||--o{ species_countries : "recorded in"
    countries ||--o{ species_countries : "has records of"
    species ||--o{ species_sources : "fields from"
    sources ||--|{ species_sources : "supplies"
    species ||--o{ occurrences : "recorded as"
    datasets ||--o{ occurrences : "publishes"
    countries |o--o{ occurrences : "contains"
```

Data dictionary, schema v2:

**taxa**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `name` | VARCHAR | PK | Agalychnis, Phyllomedusidae, Anura, Amphibia | critwire `/v1/species.parquet`: taxonomy from Catalogue of Life, else critwire base |
| `taxon_rank` | VARCHAR |  | class, order, family or genus | critwire `/v1/species.parquet`: taxonomy from Catalogue of Life, else critwire base |
| `parent_name` | VARCHAR | FK | the taxon one rank up; NULL for a class | critwire `/v1/species.parquet`: taxonomy from Catalogue of Life, else critwire base |

**species**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `id` | INTEGER | PK | critwire's own id, never reused | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `slug` | VARCHAR | UK | red-eyed-tree-frog | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `scientific_name` | VARCHAR | UK | Agalychnis callidryas | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `common_name` | VARCHAR |  | Red-eyed Tree Frog | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `genus` | VARCHAR | FK | a taxa row of rank genus | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `range_status` | VARCHAR |  | ok, no-open-records or identity-unsettled | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `photo_url` | VARCHAR |  | NULL when there is no photo | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `photo_credit` | VARCHAR |  | who took the photo | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `photo_license` | VARCHAR |  | CC BY-SA 4.0, CC BY 2.0, CC0, Public domain | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `photo_page` | VARCHAR |  | the photo's Wikimedia Commons page | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `iucn_id` | INTEGER | UK | IUCN Red List taxon id | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `gbif_id` | BIGINT | UK | GBIF backbone taxon key | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `col_id` | VARCHAR | UK | Catalogue of Life id | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `wikidata_id` | VARCHAR | UK | Wikidata item | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `inaturalist_id` | INTEGER | UK | iNaturalist taxon id | critwire `/v1/species.parquet`; each field's source is in `species_sources` |
| `ncbi_id` | INTEGER | UK | NCBI Taxonomy id | critwire `/v1/species.parquet`; each field's source is in `species_sources` |

**countries**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `code` | VARCHAR | PK | ISO 3166-1 alpha-2, plus XK | critwire `/v1/countries.parquet` (002 §6) |
| `name` | VARCHAR | UK | Brazil | critwire `/v1/countries.parquet` (002 §6) |
| `continent` | VARCHAR |  | South America | critwire `/v1/countries.parquet` (002 §6) |
| `region` | VARCHAR |  | Americas | critwire `/v1/countries.parquet` (002 §6) |
| `subregion` | VARCHAR |  | South America | critwire `/v1/countries.parquet` (002 §6) |

**species_countries**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `species_id` | INTEGER | PK, FK | the animal | critwire `/v1/species.parquet`, `range.countriesWithOpenRecords` (GBIF, CC0 and CC BY records) |
| `country_code` | VARCHAR | PK, FK | recorded there in open records | critwire `/v1/species.parquet`, `range.countriesWithOpenRecords` (GBIF, CC0 and CC BY records) |

**sources**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `name` | VARCHAR | PK | Wikidata, Catalogue of Life, critwire base | critwire `/v1/species.parquet`, `sources[]` |
| `license` | VARCHAR |  | the license of what critwire took | critwire `/v1/species.parquet`, `sources[]` |
| `retrieved` | DATE |  | when critwire took it; NULL for critwire base | critwire `/v1/species.parquet`, `sources[]` |

**species_sources**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `species_id` | INTEGER | PK, FK | the animal | critwire `/v1/species.parquet`, `sources[]` |
| `field` | VARCHAR | PK | a path in the record, such as ids.col | critwire `/v1/species.parquet`, `sources[]` |
| `source_name` | VARCHAR | FK | who supplied that field | critwire `/v1/species.parquet`, `sources[]` |

**datasets**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `dataset_key` | VARCHAR | PK | GBIF's dataset id | GBIF registry, the download's datasets (`datasets.csv`) |
| `title` | VARCHAR |  | the dataset's own title | GBIF registry, the download's datasets (`datasets.csv`) |
| `publisher` | VARCHAR |  | the organization that published it | GBIF registry, the download's datasets (`datasets.csv`) |
| `doi` | VARCHAR |  | the dataset's DOI; NULL when it has none | GBIF registry, the download's datasets (`datasets.csv`) |
| `license` | VARCHAR |  | the license the dataset declares | GBIF registry, the download's datasets (`datasets.csv`) |

**occurrences**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `id` | BIGINT | PK | GBIF's record id | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `species_id` | INTEGER | FK | the animal recorded | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `dataset_key` | VARCHAR | FK | the dataset to credit | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `license` | VARCHAR |  | CC0 1.0 or CC BY 4.0, the stricter of record and dataset | GBIF record and dataset licenses (§4) |
| `basis_of_record` | VARCHAR |  | HUMAN_OBSERVATION, PRESERVED_SPECIMEN, ... | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `longitude` | DOUBLE |  | degrees east, WGS 84 | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `latitude` | DOUBLE |  | degrees north, WGS 84 | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `coordinate_uncertainty_m` | DOUBLE |  | metres; NULL when not given | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `country_code_gbif` | VARCHAR |  | GBIF's code as delivered; ZZ unknown, XZ high seas | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `country_code` | VARCHAR | FK | that code when it is a countries row, else NULL | `country_code_gbif`, when a `countries` row |
| `year` | INTEGER |  | NULL when the record has none | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `month` | INTEGER |  | 1 to 12; NULL when the record has none | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
### 6.2 The lab database (PostGIS)

`plans/004-lab-erd.mmd`, schema `learn_curriculum`. The same keyed tables as schema v2 in PostgreSQL types (`text`, `float8`; GBIF's dataset key is a `uuid`), plus the shapes the GIS modules join to: country outlines, admin-1 areas for nine countries, RESOLVE's biomes and ecoregions, and the habitat map's classes. Every shape is `geometry` in WGS 84 (SRID 4326) with a GiST index; a record's point is a generated column, so it can never disagree with its longitude and latitude. Two lists sit beside the diagram, as comments in the source:

- **Lab-made:** tables the lessons create in the lab (s4's hexagon grids, the smoke check's table, d1's field notes, d3's copy in year order, the ETL's staging tables, d6's star). They aren't part of the loaded lab, so they aren't drawn; the check excuses them when a lesson's setup has made them.
- **Planned:** `occurrence_habitats` (the habitat class at each record) and `habitat_clips` (small clips of the habitat map, as rasters), which build mission L3 adds. They are drawn so the design is whole; the check excuses them while they don't exist, and fails once they do, so the marker can't go stale.

```mermaid
%% critwire Learn: the lab database, PostGIS schema learn_curriculum (plans/004-learn-curriculum.md §3, §4, §6), in PostgreSQL types.
%% Tables only; the view species_taxonomy is listed beside it. Shapes are geometry in WGS 84 (SRID 4326), each with a GiST index.
%% Tables the lessons make in the lab (s4's grids, the smoke check's, the ETL's staging, d6's star): beside the diagram, not in it.
%% lab-made: s4_cells, tx_smoke, field_notes, occurrences_by_year, gbif_staging, occurrences_all, dim_species, dim_country, dim_dataset, dim_year, dim_habitat_class, fact_records, fact_species_country, fact_country_habitat
%% Drawn, but built by build mission L3 (the habitat map), so not in the lab yet:
%% planned: occurrence_habitats, habitat_clips
%% Keys: PK primary key, FK foreign key, UK unique. Lines: || exactly one, |o or o| zero or one, |{ one or more, o{ zero or more.
erDiagram
    taxa {
        text name PK "Agalychnis, Phyllomedusidae, Anura, Amphibia"
        text taxon_rank "class, order, family or genus"
        text parent_name FK "the taxon one rank up; NULL for a class"
    }
    species {
        integer id PK "critwire's own id, never reused"
        text slug UK "red-eyed-tree-frog"
        text scientific_name UK "Agalychnis callidryas"
        text common_name "Red-eyed Tree Frog"
        text genus FK "a taxa row of rank genus"
        text range_status "ok, no-open-records or identity-unsettled"
        text photo_url "NULL when there is no photo"
        text photo_credit "who took the photo"
        text photo_license "CC BY-SA 4.0, CC BY 2.0, CC0, Public domain"
        text photo_page "the photo's Wikimedia Commons page"
        integer iucn_id UK "IUCN Red List taxon id"
        bigint gbif_id UK "GBIF backbone taxon key"
        text col_id UK "Catalogue of Life id"
        text wikidata_id UK "Wikidata item"
        integer inaturalist_id UK "iNaturalist taxon id"
        integer ncbi_id UK "NCBI Taxonomy id"
    }
    countries {
        text code PK "ISO 3166-1 alpha-2, plus XK"
        text name UK "Brazil"
        text continent "South America"
        text region "Americas"
        text subregion "South America"
    }
    species_countries {
        integer species_id PK, FK "the animal"
        text country_code PK, FK "recorded there in open records"
    }
    sources {
        text name PK "Wikidata, Catalogue of Life, critwire base"
        text license "the license of what critwire took"
        date retrieved "when critwire took it; NULL for critwire base"
    }
    species_sources {
        integer species_id PK, FK "the animal"
        text field PK "a path in the record, such as ids.col"
        text source_name FK "who supplied that field"
    }
    datasets {
        uuid dataset_key PK "GBIF's dataset id"
        text title "the dataset's own title"
        text publisher "the organization that published it"
        text doi "the dataset's DOI; NULL when it has none"
        text license "the license the dataset declares"
    }
    occurrences {
        bigint id PK "GBIF's record id"
        integer species_id FK "the animal recorded"
        uuid dataset_key FK "the dataset to credit"
        text license "CC0 1.0 or CC BY 4.0, the stricter of record and dataset"
        text basis_of_record "HUMAN_OBSERVATION, PRESERVED_SPECIMEN, ..."
        float8 longitude "degrees east, WGS 84"
        float8 latitude "degrees north, WGS 84"
        float8 coordinate_uncertainty_m "metres; NULL when not given"
        text country_code_gbif "GBIF's code as delivered; ZZ unknown, XZ high seas"
        text country_code FK "that code when it is a countries row, else NULL"
        integer year "NULL when the record has none"
        integer month "1 to 12; NULL when the record has none"
        geometry geom "Point, generated from longitude and latitude"
    }
    country_shapes {
        text country_code PK, FK "the country"
        geometry geom "MultiPolygon, Natural Earth admin-0 1:50m"
    }
    admin1_shapes {
        text adm1_code PK "Natural Earth's code, such as AUS-2660"
        text country_code FK "the country it is part of"
        text name "Tasmania"
        geometry geom "MultiPolygon, Natural Earth admin-1 1:50m"
    }
    biomes {
        integer biome_id PK "RESOLVE biome number, 1 to 14"
        text name "Tropical & Subtropical Moist Broadleaf Forests"
    }
    ecoregions {
        integer eco_id PK "RESOLVE ecoregion id"
        integer biome_id FK "its biome; NULL for Rock and Ice"
        text name "Tasmanian temperate forests"
        text realm "Australasia; NULL for Rock and Ice"
        geometry geom "MultiPolygon, simplified to 0.05 degrees"
    }
    habitat_classes {
        integer code PK "Jung v004 class, such as 105"
        integer level1_code FK "its level-1 class, such as 100; NULL for level 1"
        text name "Forest – Subtropical/tropical dry"
    }
    country_habitats {
        text country_code PK, FK "the country"
        integer habitat_code PK, FK "the habitat class"
        numeric est_area_km2 "estimated from the map, never measured"
    }
    occurrence_habitats {
        bigint occurrence_id PK, FK "the record"
        integer habitat_code FK "class of its 1 km cell; NULL if none"
    }
    habitat_clips {
        text clip PK "cr or tas"
        raster rast "a clip of the habitat map, stored in the database"
    }

    taxa |o--o{ taxa : "parent of"
    taxa ||--o{ species : "genus of"
    species ||--o{ species_countries : "recorded in"
    countries ||--o{ species_countries : "has records of"
    species ||--o{ species_sources : "fields from"
    sources ||--|{ species_sources : "supplies"
    species ||--o{ occurrences : "recorded as"
    datasets ||--o{ occurrences : "publishes"
    countries |o--o{ occurrences : "contains"
    countries ||--o| country_shapes : "outlined by"
    countries ||--o{ admin1_shapes : "divided into"
    biomes |o--o{ ecoregions : "groups"
    habitat_classes |o--o{ habitat_classes : "level 1 of"
    countries ||--o{ country_habitats : "estimated to hold"
    habitat_classes ||--o{ country_habitats : "estimated in"
    occurrences ||--o| occurrence_habitats : "habitat at"
    habitat_classes |o--o{ occurrence_habitats : "class at"
```

Data dictionary, the lab: the tables schema v2 lacks, and `occurrences` for its point. The other seven are as in §6.1, in PostgreSQL types.

**occurrences**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `id` | bigint | PK | GBIF's record id | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `species_id` | integer | FK | the animal recorded | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `dataset_key` | uuid | FK | the dataset to credit | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `license` | text |  | CC0 1.0 or CC BY 4.0, the stricter of record and dataset | GBIF record and dataset licenses (§4) |
| `basis_of_record` | text |  | HUMAN_OBSERVATION, PRESERVED_SPECIMEN, ... | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `longitude` | float8 |  | degrees east, WGS 84 | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `latitude` | float8 |  | degrees north, WGS 84 | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `coordinate_uncertainty_m` | float8 |  | metres; NULL when not given | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `country_code_gbif` | text |  | GBIF's code as delivered; ZZ unknown, XZ high seas | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `country_code` | text | FK | that code when it is a countries row, else NULL | `country_code_gbif`, when a `countries` row |
| `year` | integer |  | NULL when the record has none | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `month` | integer |  | 1 to 12; NULL when the record has none | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `geom` | geometry |  | Point, generated from longitude and latitude | generated from `longitude`, `latitude` |

**country_shapes**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `country_code` | text | PK, FK | the country | Natural Earth admin-0 1:50m (public domain) |
| `geom` | geometry |  | MultiPolygon, Natural Earth admin-0 1:50m | Natural Earth admin-0 1:50m (public domain) |

**admin1_shapes**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `adm1_code` | text | PK | Natural Earth's code, such as AUS-2660 | Natural Earth admin-1 1:50m (public domain) |
| `country_code` | text | FK | the country it is part of | Natural Earth admin-1 1:50m (public domain) |
| `name` | text |  | Tasmania | Natural Earth admin-1 1:50m (public domain) |
| `geom` | geometry |  | MultiPolygon, Natural Earth admin-1 1:50m | Natural Earth admin-1 1:50m (public domain) |

**biomes**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `biome_id` | integer | PK | RESOLVE biome number, 1 to 14 | RESOLVE Ecoregions 2017 (CC BY 4.0) |
| `name` | text |  | Tropical & Subtropical Moist Broadleaf Forests | RESOLVE Ecoregions 2017 (CC BY 4.0) |

**ecoregions**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `eco_id` | integer | PK | RESOLVE ecoregion id | RESOLVE Ecoregions 2017 (CC BY 4.0) |
| `biome_id` | integer | FK | its biome; NULL for Rock and Ice | RESOLVE Ecoregions 2017 (CC BY 4.0) |
| `name` | text |  | Tasmanian temperate forests | RESOLVE Ecoregions 2017 (CC BY 4.0) |
| `realm` | text |  | Australasia; NULL for Rock and Ice | RESOLVE Ecoregions 2017 (CC BY 4.0) |
| `geom` | geometry |  | MultiPolygon, simplified to 0.05 degrees | RESOLVE Ecoregions 2017 (CC BY 4.0) |

**habitat_classes**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `code` | integer | PK | Jung v004 class, such as 105 | Jung et al. 2020, v004 legend (CC BY 4.0) |
| `level1_code` | integer | FK | its level-1 class, such as 100; NULL for level 1 | Jung et al. 2020, v004 legend (CC BY 4.0) |
| `name` | text |  | Forest – Subtropical/tropical dry | Jung et al. 2020, v004 legend (CC BY 4.0) |

**country_habitats**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `country_code` | text | PK, FK | the country | stand-in from Jung et al. 2020 (CC BY 4.0) until L3 |
| `habitat_code` | integer | PK, FK | the habitat class | stand-in from Jung et al. 2020 (CC BY 4.0) until L3 |
| `est_area_km2` | numeric |  | estimated from the map, never measured | stand-in from Jung et al. 2020 (CC BY 4.0) until L3 |

**occurrence_habitats**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `occurrence_id` | bigint | PK, FK | the record | L3: Jung et al. 2020, v004 (CC BY 4.0) |
| `habitat_code` | integer | FK | class of its 1 km cell; NULL if none | L3: Jung et al. 2020, v004 (CC BY 4.0) |

**habitat_clips**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `clip` | text | PK | cr or tas | L3: Jung et al. 2020, v004 (CC BY 4.0) |
| `rast` | raster |  | a clip of the habitat map, stored in the database | L3: Jung et al. 2020, v004 (CC BY 4.0) |
### 6.3 The Power BI star

`plans/004-star-erd.mmd`: the eight CSV files `star.sql` writes (d6, §A.3), checked against the star's `manifest.json`. `fact_records` holds one row per sample record; `fact_species_country` has no measure (a factless fact: a row says a species has open records in a country); `fact_country_habitat` is the habitat stand-in. `dim_species` and `dim_country` are shared by the facts (conformed dimensions), so one slicer filters them all. Every fact foreign key is filled: a record with no year points at `dim_year`'s `-1` member, one with no country at `dim_country`'s `ZZ`, so every line is "exactly one" on the dimension's side.

```mermaid
%% critwire Learn: the Power BI star (plans/004-learn-curriculum.md §5.2 d6, §5.6, §6): the CSV files star.sql writes, in DuckDB types.
%% Every fact foreign key is filled: a record with no year points at dim_year -1, one with no country at dim_country ZZ.
%% fact_records and fact_species_country share dim_species and dim_country (conformed dimensions); fact_species_country has no measure (factless).
%% Keys: PK primary key, FK foreign key, UK unique. Lines: || exactly one, |o or o| zero or one, |{ one or more, o{ zero or more.
erDiagram
    dim_species {
        INTEGER species_id PK "critwire's species id"
        VARCHAR scientific_name "Sarcophilus harrisii"
        VARCHAR common_name "Tasmanian Devil"
        VARCHAR class "Mammalia"
        VARCHAR order_name "Dasyuromorphia"
        VARCHAR family "Dasyuridae"
        VARCHAR genus "Sarcophilus"
    }
    dim_country {
        VARCHAR country_code PK "ISO alpha-2; ZZ the unknown member"
        VARCHAR name "Australia; Unknown or outside any country for ZZ"
        VARCHAR continent "Oceania"
        VARCHAR region "Oceania"
        VARCHAR subregion "Australia and New Zealand"
    }
    dim_dataset {
        VARCHAR dataset_key PK "GBIF's dataset id"
        VARCHAR title "the dataset's title, to credit"
        VARCHAR publisher "who published it"
        VARCHAR doi "its DOI; empty when it has none"
        VARCHAR license "the license the dataset declares"
    }
    dim_year {
        INTEGER year PK "a year with records; -1 the unknown member"
        INTEGER decade "2010; empty for -1"
        VARCHAR label "2016; Unknown for -1"
    }
    fact_records {
        BIGINT record_id PK "GBIF's record id; grain: one record"
        INTEGER species_id FK "the animal"
        VARCHAR country_code FK "where; ZZ when unknown"
        VARCHAR dataset_key FK "whose record"
        INTEGER year FK "when; -1 when unknown"
        INTEGER month "1 to 12, or empty"
        VARCHAR basis_of_record "degenerate dimension"
        VARCHAR license "degenerate dimension: CC0 1.0 or CC BY 4.0"
        DOUBLE longitude "for map visuals"
        DOUBLE latitude "for map visuals"
        DOUBLE coordinate_uncertainty_m "metres, or empty"
    }
    fact_species_country {
        INTEGER species_id PK, FK "the animal"
        VARCHAR country_code PK, FK "a country with open records of it"
    }
    dim_habitat_class {
        INTEGER habitat_code PK "Jung v004 class"
        VARCHAR name "the class"
        INTEGER level1_code "its level-1 class; a level-1 class is its own"
        VARCHAR level1_name "the level-1 class's name"
    }
    fact_country_habitat {
        VARCHAR country_code PK, FK "the country"
        INTEGER habitat_code PK, FK "the habitat class"
        DECIMAL est_area_km2 "estimated area, km2"
    }

    dim_species ||--o{ fact_records : "recorded as"
    dim_country ||--o{ fact_records : "where"
    dim_dataset ||--o{ fact_records : "published"
    dim_year ||--o{ fact_records : "when"
    dim_species ||--o{ fact_species_country : "recorded in"
    dim_country ||--o{ fact_species_country : "has records of"
    dim_country ||--o{ fact_country_habitat : "estimated to hold"
    dim_habitat_class ||--o{ fact_country_habitat : "estimated in"
```

Data dictionary, the star:

**dim_species**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `species_id` | INTEGER | PK | critwire's species id | `species` and `species_taxonomy` |
| `scientific_name` | VARCHAR |  | Sarcophilus harrisii | `species` and `species_taxonomy` |
| `common_name` | VARCHAR |  | Tasmanian Devil | `species` and `species_taxonomy` |
| `class` | VARCHAR |  | Mammalia | `species` and `species_taxonomy` |
| `order_name` | VARCHAR |  | Dasyuromorphia | `species` and `species_taxonomy` |
| `family` | VARCHAR |  | Dasyuridae | `species` and `species_taxonomy` |
| `genus` | VARCHAR |  | Sarcophilus | `species` and `species_taxonomy` |

**dim_country**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `country_code` | VARCHAR | PK | ISO alpha-2; ZZ the unknown member | `countries`, plus the `ZZ` member |
| `name` | VARCHAR |  | Australia; Unknown or outside any country for ZZ | `countries`, plus the `ZZ` member |
| `continent` | VARCHAR |  | Oceania | `countries`, plus the `ZZ` member |
| `region` | VARCHAR |  | Oceania | `countries`, plus the `ZZ` member |
| `subregion` | VARCHAR |  | Australia and New Zealand | `countries`, plus the `ZZ` member |

**dim_dataset**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `dataset_key` | VARCHAR | PK | GBIF's dataset id | `datasets` |
| `title` | VARCHAR |  | the dataset's title, to credit | `datasets` |
| `publisher` | VARCHAR |  | who published it | `datasets` |
| `doi` | VARCHAR |  | its DOI; empty when it has none | `datasets` |
| `license` | VARCHAR |  | the license the dataset declares | `datasets` |

**dim_year**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `year` | INTEGER | PK | a year with records; -1 the unknown member | `occurrences.year`, plus the `-1` member |
| `decade` | INTEGER |  | 2010; empty for -1 | computed from `year` |
| `label` | VARCHAR |  | 2016; Unknown for -1 | computed from `year` |

**fact_records**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `record_id` | BIGINT | PK | GBIF's record id; grain: one record | `occurrences` |
| `species_id` | INTEGER | FK | the animal | `occurrences` |
| `country_code` | VARCHAR | FK | where; ZZ when unknown | `occurrences` |
| `dataset_key` | VARCHAR | FK | whose record | `occurrences` |
| `year` | INTEGER | FK | when; -1 when unknown | `occurrences` |
| `month` | INTEGER |  | 1 to 12, or empty | `occurrences` |
| `basis_of_record` | VARCHAR |  | degenerate dimension | `occurrences` |
| `license` | VARCHAR |  | degenerate dimension: CC0 1.0 or CC BY 4.0 | `occurrences` |
| `longitude` | DOUBLE |  | for map visuals | `occurrences` |
| `latitude` | DOUBLE |  | for map visuals | `occurrences` |
| `coordinate_uncertainty_m` | DOUBLE |  | metres, or empty | `occurrences` |

**fact_species_country**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `species_id` | INTEGER | PK, FK | the animal | `species_countries` |
| `country_code` | VARCHAR | PK, FK | a country with open records of it | `species_countries` |

**dim_habitat_class**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `habitat_code` | INTEGER | PK | Jung v004 class | `habitat_classes` |
| `name` | VARCHAR |  | the class | `habitat_classes` |
| `level1_code` | INTEGER |  | its level-1 class; a level-1 class is its own | `habitat_classes` |
| `level1_name` | VARCHAR |  | the level-1 class's name | `habitat_classes`, its level-1 row |

**fact_country_habitat**

| Column | Type | Key | Meaning | Source |
|---|---|---|---|---|
| `country_code` | VARCHAR | PK, FK | the country | `country_habitats` |
| `habitat_code` | INTEGER | PK, FK | the habitat class | `country_habitats` |
| `est_area_km2` | DECIMAL |  | estimated area, km2 | `country_habitats` |

## 7. The site

(S27)

## 8. For the owner only: the vault overlap

(S29)

## 9. Build missions

(S28)

## 10. For the owner: choices

(S29)

## A. The three spikes

Each spike ran on the VPS in the mission's spike folder, `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike/` (`SP` below; never committed). Its `README.md` lists every command in order; `verify.sh` re-runs them all.

### A.1 ETL: a GBIF download into PostGIS (S8, S9)

**Inputs.** The 73 `ids.gbif` in `data/species.json` (legacy GBIF Backbone keys); GBIF's occurrence download API with the owner's account; the lab loader (§0), which provides `countries`.

**The request** (`SP/downloads/gbif-request/request.json`): `TAXON_KEY in` the 73 keys, `LICENSE in [CC0_1_0, CC_BY_4_0]`, `HAS_COORDINATE`, `HAS_GEOSPATIAL_ISSUE = false`, `OCCURRENCE_STATUS = PRESENT`, `BASIS_OF_RECORD in` the 7 values critwire's countries rule allows, format `SIMPLE_CSV`. `checklistKey` is pinned to the legacy backbone at the top level and on `TAXON_KEY`; GBIF accepted it and echoes both in its stored request.

**Commands** (`SP/etl/run.sh <step>`, the spike's Python 3.12 environment, scripts run isolated with `-I`):

| Step | What it does | Result |
|---|---|---|
| `request` | builds the predicate, POSTs it, records the key and the `occurrence/search` count for the same filters | key `0041824-260928105237408`; search count 394,532 |
| `wait` | checks the status at most once a minute (resumable) | SUCCEEDED after 16 min 41 s |
| `fetch` | the zip, its sha256 and size; checks the echoed `checklistKey`s and `totalRecords` against the search count | 34.7 MB zip; DOI `10.15468/dl.fbpk9w`; 394,532 records (Δ 0) from 454 datasets |
| `load` | one transaction: `gbif_staging` (every column `text`) by `COPY … (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '', HEADER true)` streamed from the zip, then the typed `occurrences_all`, then 10 checks that each roll the load back if any row fails | 394,532 rows in about 15 s; every check 0 |
| `datasets` | each dataset's title, publisher, DOI and license, and each publisher's name, at ≤ 2 requests a second | 454 datasets, 233 publishers, in 6 min |
| `sample` | the lab sample (below) → `occurrences.{parquet,csv}`, `datasets.csv` | 40,395 records, 400 datasets, 71 species |
| `verify` | offline, from the saved zip: `load` twice, then the sample into a temporary folder | same rows and md5 as the first load; every file's sha256 equal |

**What the spike found** (each changes the design, §4 and the modules say how):
- **Synonyms.** 4 of critwire's `ids.gbif` are synonyms in the backbone (Blanding's turtle, Baird's tapir, Temminck's and giant pangolins). GBIF files their 2,385 records under the accepted species' `speciesKey` and keeps our key in `taxonKey`. Rule: the species whose `ids.gbif` is the record's `speciesKey`, else its `taxonKey`; none, or two different species, fails. e2 teaches it.
- **Licenses.** One dataset (iNaturalist research-grade) holds records under two licenses, so `license` belongs on `occurrences`, not `datasets` (d2). 11 datasets declare CC BY-NC 4.0 while GBIF marks their 13,467 records CC0 or CC BY. The sample uses each record's **effective license**, the more restrictive of its own and its dataset's, and publishes only CC0 1.0 and CC BY 4.0 (§10 asks the owner to keep or change this).
- **Text-format `COPY` corrupts this file silently.** Loaded as `FORMAT text`, 9 rows with a backslash in free text change with no error; the csv form above keeps all 97 rows holding `\` or `"` byte for byte (e2).
- **Country codes.** All 112 codes in the download are `countries` rows; no `ZZ`, `XZ` or empty code reached it (the geospatial-issue filter removes them). The country-key contract still applies, for later refreshes.
- **Bias, in numbers.** 45 % of records give no coordinate uncertainty. Australia holds 189,551 of the 394,532 records and Brazil 101,791; one GPS-collar study supplies 134,690 jaguar fixes (s1).

**The sample.** Of 394,532 loaded records, 381,065 have an effective open license; at most 2,000 per species, chosen by ascending `md5` of the `gbifID` text, leaves **40,395 records** from 400 datasets: 28,187 CC BY 4.0 and 12,208 CC0 1.0. 13 species reach the cap; 33 have fewer than 100; the median is 111. Two species have none: the Ili pika (no open records at all) and the Yangtze giant softshell turtle (its one record is in a CC BY-NC dataset).

| File (`/learn/data/`) | Rows | Bytes |
|---|---|---|
| `occurrences.parquet` | 40,395 | 622,971 |
| `occurrences.csv` | 40,395 | 4,591,948 |
| `datasets.csv` | 400 | 72,797 |
| `postgis/learn_curriculum.sql` (all lab tables, with these two) | | 21,330,577 |

Every open record, uncapped, would be 4.8 MB as Parquet and 44.6 MB as CSV; it is never published (§4).

**Browser boot with the sample** (`SP/scripts/boot-time.ts`, desktop, 5 first visits): 3.22 s from navigation to a ready database, against 2.9 s to A1's first lesson result. The two new tables cost about 0.33 s of setup, so the whole setup can stay at boot.

**Evidence:** `SP/out/etl-postgis/` (`summary.md`, `sample.json`, `sample-contributions.json`, the two `verify-load-*.json`) and `SP/out/boot-time/`.

### A.2 Spatial statistics: global Moran's I, SQL = PySAL (S10)

**Question.** Does Moran's I written in plain SQL give exactly what PySAL gives, so s4 can teach both and trust either?

**Inputs.** The lab sample's 2,000 Tasmanian devil records; `admin1_shapes`' Tasmania (its largest part, the main island); s4's four blocks (§5.4), which the spike extracts from this file by id (`SP/scripts/block.ts`), so the lesson and the test are the same code.

**Commands.** `SP/moran/run.sh`: loads the lab data, runs `s4-cells`, gates `s4-geometry`'s distances, runs `s4-moran-sql` and `s4-moran-pysal` (with `py-connect`), then `SP/moran/compare.py` compares neighbour sets pair by pair, then the statistics.

| Grid (edge) | Cells | Records in a cell | Neighbour pairs | I | z (normality) | z (randomization) |
|---|---|---|---|---|---|---|
| 5 km (compared) | 1,094 | 1,972 of 2,000 | 6,246, equal in both | 0.273296 | 15.177858 | 15.246590 |
| 10 km (MAUP, recorded) | 296 | 1,990 of 2,000 | equal in both | 0.203588 | 5.831416 | 5.847466 |

**What the spike found:**
- **SQL = PySAL.** On the 5 km grid, I, E[I], Var_norm and z agree to 6 decimals; the largest difference is 1.1e-12 (in z; the gate is 5e-7). The SQL is esda's `__moments` formulas with row-standardized weights.
- **The distance band is safe only in a gap.** The two smallest centroid distances are 8,660.25 and 15,000.00 m (17,320.51 and 30,000.00 m at 10 km), with no duplicate centroid, no cell without a neighbour and no pair within 1 m of the threshold (2 × edge). s4 checks this before any weight is built.
- **Coincident points.** Two records at one spot are neighbours for `ST_DWithin` but not for libpysal's `DistanceBand`, which drops zero distances (a 3-point test). That is one more reason the units are cells, not points (s4).
- **Scale changes the answer (MAUP).** The same records give I = 0.273 on 5 km cells and 0.204 on 10 km cells; both are strongly clustered. The clustering largely measures where people record devils (roads, atlases), not where devils live: s4 says so.
- 28 records fall in no 5 km cell, and the block reports them: 12 on Maria Island (a population moved there for conservation), 10 off the north coast or at sea, 4 on the Australian mainland and 2 in New Mexico, USA (near Albuquerque). Units drawn over the main island leave them out by design; s1 uses such records to teach that a record is where someone saw the animal.

**Evidence:** `SP/out/moran/` (`summary.md`, `compare.json` at full precision, `raw/`).

### A.3 A star export Power BI reads (S11)

**Question.** Can one `star.sql` build the Power BI star in both PostGIS (d6's lab) and DuckDB (critwire's build), and can the files Power BI reads be checked here, where Power BI can't run?

**Inputs.** The lab tables (the browser schema v2 plus the habitat stand-ins); d6's eight `d6-star-*` blocks (§5.2), which the spike reads from this file by id; p1's `p1-load` (§5.6), whose `// input:` line names the eight files.

**Commands.** `SP/star-export/run.sh`: loads the lab data, then `SP/star-export/export.ts`: runs the blocks in Node DuckDB over the published files and writes each table as CSV ordered by its primary key (the canonical files, with `manifest.json`); runs the same blocks in PostGIS in a transaction it rolls back, `\copy`-ing each table; compares the two by value; checks every file as the Power BI input check does. The runner (`run-queries.ts`) checks `p1-load`'s inputs against the manifest on every run and logs one `-- input:` line per file.

| File | Grain or key | Rows | Bytes |
|---|---|---|---|
| `dim_species.csv` | species | 76 | 6,186 |
| `dim_country.csv` | country, plus `ZZ` | 251 | 11,227 |
| `dim_dataset.csv` | dataset (its credit) | 400 | 72,797 |
| `dim_year.csv` | year, plus `-1` | 177 | 2,670 |
| `fact_records.csv` | one sample record | 40,395 | 4,475,330 |
| `fact_species_country.csv` | species × country (factless) | 472 | 2,818 |
| `dim_habitat_class.csv` | habitat class (stand-in) | 75 | 4,525 |
| `fact_country_habitat.csv` | country × class (stand-in) | 35 | 500 |

`manifest.json` lists, per file: columns and types, primary key and foreign keys (read from DuckDB's catalog, so `star.sql` is their one definition), rows, bytes, sha256, and `sources` (name, license, license URL, citation, DOI). `fact_records`' source is the GBIF download's citation, with `"datasets": "datasets.csv"` for each dataset's credit, which `dim_dataset` also carries.

**What the spike found:**
- **One `star.sql` runs in both engines.** Standard types (`INTEGER`, `VARCHAR`, `DOUBLE PRECISION`, `DECIMAL`), keys declared in `CREATE TABLE` (DuckDB accepts foreign keys only there), `count(*) FILTER (…)` and `%` work in both; the lab's `uuid` dataset key is cast to text so the key has one type.
- **The two exports agree by value.** Seven of the eight files are byte-identical. `fact_records` differs only in how numbers are written: DuckDB writes a whole double as `805.0`, PostgreSQL as `805` (15,421 cells, every one equal in value). DuckDB's file is the published one, so the manifest's sha256 is unambiguous.
- **Unknown members keep every foreign key filled.** 2,289 records have no year and map to `-1`; no record in this sample lacks a country (the download's geospatial filter removed them), but the `ZZ` member stays for refreshes. The earliest year is 1599: a reminder that dates are data to check too (s1, e3).
- **`NA` stays Namibia.** Read as text by DuckDB's `read_csv(all_varchar)` and Python's `csv`, the code survives. p1 types `country_code` as text for the same reason.
- **What can't be tested here:** M evaluation, DAX, visuals and refresh (§10 asks the owner for one check on Windows). What is tested is every byte Power BI would read.

**Evidence:** `SP/out/star-export/` (`summary.md`, `manifest.json`, the eight CSV files, `postgis/`, `check.json`) and the `-- input:` lines in the mission's `queries.log`.

## B. Disagreements with 002 and 003

Where 004 and the earlier designs differ, the build missions follow 004. One paragraph per difference; §1 lists what is kept.

**The learner.** 002 wrote for beginners aged 16 and up, and `AGENTS.md` asks for copy "for grades 6–12". 004 writes for adults new to each topic, starting with a working GIS specialist: foundations fast (6 h), then depth in five job areas (§2). The lessons' SQL that still fits is re-run inside f3, d1 and d2; the path, the cookbook and the game go. §10 gives the replacement for `AGENTS.md`'s copy line, which L1 applies.

**Nothing of Learn was built** (finding F1). 003 §7 assumes missions B1 and B2 delivered `/v1/countries`, the self-hosted engine, `setup.sql`, the ERD pipeline and 16 lessons. Neither ran: `site/` holds only `index.html`, `dist/` has nothing under `/learn/`, and `/v1/countries.*` doesn't exist. So 002's engine (§1), schema (§2), ERD pipeline (§3), countries file (§6) and site (§8) are design to build, not work to build on. L1 and L2 build them first (§9), and the B, C and D briefs are marked superseded.

**The GBIF sample comes from a download, not from search** (003 D3). 003 drew a capped sample through `occurrence/search` inside `ingest gbif`: pages of up to 300 records per species, no DOI of its own, and tied to the countries DOI's refresh. 004 uses the occurrence download API: an asynchronous job with its own DOI (the spike's: `10.15468/dl.fbpk9w`), no paging cap, archived by GBIF, refreshed apart from the countries pipeline. The published sample keeps at most 2,000 records per species, chosen by ascending `md5` of the record id, which gives 40,395 records against 003's 528: enough for spatial statistics. Because it is a subset, L1 registers it as its own GBIF derived dataset (`pnpm gbif:register --target learn-sample`, tags `gbif-learn-*`); `ingest gbif`, `contributions.json` and `10.15468/dd.ky9cyt` are untouched (§4, §A.1).

**The download pins its taxonomy** (F3). 003's requests named no `checklistKey`. GBIF's download documentation says that without one "the obsolete GBIF Backbone Taxonomy will be used", which today is the taxonomy critwire's `ids.gbif` come from. The risk is that default moving, as `occurrence/search`'s already did (to Catalogue of Life XR in 2026-06): our 73 keys would be read against another taxonomy, and `speciesKey` in the output would change, with no error. 004 sets `checklistKey` to the legacy backbone at the top level and on `TAXON_KEY`; GBIF accepted both and echoes them in its stored request, and the ETL checks the echo. e1 teaches pinning a taxonomy rather than trusting a default.

**Records map to species by `speciesKey`, else `taxonKey`** (003 D3's join). 003 joined `species.gbif_id` to a record's taxon key. In the download, 4 of critwire's `ids.gbif` are synonyms (Blanding's turtle, Baird's tapir, Temminck's and giant pangolins): GBIF files their 2,385 records under the accepted species' `speciesKey` and keeps our key in `taxonKey`. The rule: the species whose `ids.gbif` is the record's `speciesKey`, else its `taxonKey`; no match, or two species, fails the load. e2 teaches synonyms with it.

**A record's license is its effective license** (003 D3). 003 kept each record's own license. 11 datasets declare CC BY-NC 4.0 while GBIF marks their 13,467 records CC0 or CC BY (12,733 of them iNaturalist's). "If unclear, don't publish": the sample uses the more restrictive of the record's and the dataset's license, and publishes only effective CC0 1.0 and CC BY 4.0, so those records stay out. `license` stays on `occurrences`, not `datasets`, because one dataset holds records under two licenses (d2). §10 asks the owner to keep this or trust record licenses. critwire's countries pipeline is unchanged.

**A country code with no country** (F11). 003's `occurrences.country_code` was a plain foreign key to `countries`, but GBIF's codes include `ZZ` (unknown) and `XZ` (international waters), and some records have none: the key would reject them at load. 004 keeps GBIF's code as delivered in `country_code_gbif` and puts a nullable foreign key beside it, `country_code`, set only when the code is a `countries` row. `ZZ` and `XZ` are named non-country values; any other unknown code fails the build. The star maps a missing country to one unknown member, `ZZ` (d6). The spike's download had no such code, so the contract guards later refreshes.

**Loading PostGIS needs only psql** (F5). 003 §4 and §6 gave learners `shp2pgsql` and `ogr2ogr` commands, uncounted and untested; this server has no GDAL command-line tools, and not every learner's install will. 004 gives one file, `learn_curriculum.sql`, that `psql` loads in one transaction: tables by `COPY … (FORMAT csv)`, shapes as base64 WKB turned into geometry by `ST_GeomFromWKB`, then keys, indexes and a check that raises on failure. The tests load it with the exact command a learner types, twice (§0, §4). Text-format `COPY` is never used on data we didn't write: it silently altered hex WKB and backslashes in the spike (F10, e2).

**Sizes fit a 50 MB cap** (F6). 003 measured its files for `/v1` with no total in mind: admin-0 at 1:10m (7.35 MB), admin-1 as GeoJSON (40.7 MB), the RESOLVE zip (149 MB), the `spatial` extension (23.6 MB per DuckDB version). Lab data is copied on every deploy and stays in git history, so 004 caps it at 50 MB: Natural Earth at 1:50m, RESOLVE simplified at 0.05° (6.69 MB), the capped sample, no `spatial`. The spike's lab files under `/learn/data/` come to about 43.7 MB; §4 gives the budget.

**Lab data lives under `/learn/data/`, not `/v1`** (F7). 003's grown tables were to be read from `/v1/<table>.parquet`. `/v1` is critwire's data contract and only ever grows, while lab samples are redrawn and resized as the course changes. No lab reader needs `/v1`'s CORS: the course's own pages are same-origin, and PostGIS, Python and Power BI aren't browsers. The one `/v1` addition is 002's countries file. §10 asks whether other sites' pages should be able to read the lab files.

**No `spatial` extension in the browser, and no `setup-grown`** (§10 item 3). 002 §10 item 11 left extensions beyond `parquet` to A2, and 003 §8 item 5 recommended committing `spatial` (23.6 MB per DuckDB version) for its browser spatial lessons. 004 does light spatial work in the browser in plain SQL (bounding boxes, 10° bins, a haversine distance) and teaches GIS in PostGIS, where practitioners use it. That saves 23.6 MB per DuckDB version, at the cost of no `ST_` functions in the browser. 003's second setup, `setup-grown`, kept stand-in tables apart from 002's `setup`; it goes too: schema v2's two tables are additions at the end of the one `setup` (002's part stays byte for byte), and the other spatial tables live in the lab database.
