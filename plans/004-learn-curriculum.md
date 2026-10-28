# critwire Learn: a practitioner curriculum (design)

Design for critwire Learn as a practitioner course in database architecture, GIS in SQL, spatial statistics, ETL and Power BI, taught on critwire's open species data and other open data. It starts from a little SQL and everyday GIS, covers the foundations fast, then goes deep. It replaces the course in `plans/002-learn.md` and `plans/003-learn-data-spatial.md` and reuses their engine, schema, data and licensing findings (§1). Every SQL and Python block here is tested (§0). Nothing public changes until the build missions in §9 run.

Written by mission `critwire-learn-curriculum` (plan `plans/2026-10-23-critwire-learn-curriculum.md`); a section marked "(S<n>)" is written by that plan's step S<n>.

## 0. Conventions

Every example in this document is tested. A block is a fenced code block whose first lines are headers. The test runner (the mission's spike, §A) reads the headers, runs the block on the engine they name, and compares what it gets with the result block printed under it. A block that can't run here says why.

### Blocks, engines and statuses

- **Every block has an id and a status.** SQL: `-- q: <id>`, then `-- status: ran` or `-- status: untested: <reason>`. Python writes `#` for `--`; Power BI's M and DAX write `//`. Module blocks are named `<module>-<word>` (`d3-plan`); engine and setup blocks have plain ids (`setup`, `pg-session`). Ids are unique in the document.
- **`ran`** means the block ran on the data named in the log header (below) and gave the result printed under it; Verification runs it again and fails on any difference. **`untested: <reason>`** blocks never run: they need something this server doesn't have (Windows, ArcGIS Pro, a second session). Nor do they run from a download: there they are commented out (§7.3). A failing block is fixed, never relabelled `untested`.
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
  - `-- tx: own` (PostGIS): the runner doesn't wrap the block. It runs its own `BEGIN` … `COMMIT` or `ROLLBACK`, as typed in psql (d4). Afterwards the runner checks that the block ended its transaction, left the session as it found it, and left `learn_curriculum` unchanged. Inside one, a statement whose comment line says `-- fails: <text>` must fail with an error containing `<text>`, and the block goes on, as psql does when you type without `ON_ERROR_STOP`; any other error fails the block. Its result is the last statement that returned rows, so a block can show what it built and then roll it back or drop it.
  - `# timeout: <seconds>` (Python): when the block is stopped; 60 by default.
  - `-- show: cards` is not a test header: it stays in the SQL learners see, and the page shows the result as animal cards (002 §8).
- **Every other SQL block runs in a transaction the runner rolls back,** so each starts from the same database and the order of modules doesn't matter. Results must be deterministic: rows ordered by a unique key, `random()` only after `setseed()`, no clock; Python prints with explicit formats, never a DataFrame's repr.
- **Result blocks.** The ```` ```text ```` block under a `ran` block starts `-- result: <id> · <n> rows · sha256 <12 hex>`, then the column names, the first 5 rows (cells cut at 60 characters) and how many more. The hash covers the column names and every row, uncut, so the 5 rows shown don't limit what is checked. A Python result starts `-- result: <id> · python · sha256 <12 hex>`, then the block's whole output. Only the runner writes result blocks (`--update`).
- **Not counted:** ```` ```sh ```` and ```` ```powershell ```` fences are commands for the learner's own machine (installing PostgreSQL, Docker or `uv`; loading the lab file). They carry no headers and don't run here; §3 says which were checked another way. ```` ```mermaid ```` fences are the ERDs, checked against their files and the live catalogs (§6).

### Lab objects: the `learn_` rules

The PostGIS labs share a database with other work, on the test server and perhaps on yours, so they follow rules the runner checks before anything runs:
- Lab tables live in schema `learn_curriculum`, which the loader replaces as a whole (§4). Labs never name a database, and every PostGIS lab starts with `pg-session`.
- A role or schema a lab creates is named `learn_…`, and the same block removes it: each `CREATE ROLE learn_x` or `CREATE SCHEMA learn_x` has a later `DROP` in the block, a role that was granted anything gets `DROP OWNED BY` before its `DROP ROLE`, and a `SET ROLE` has a later `RESET ROLE`; a statement marked `-- fails:` doesn't count, since it doesn't happen. Running a block twice, or stopping a module halfway, leaves nothing behind.
- After a block's last statement, before the rollback, the runner looks for `learn_` roles and schemas that weren't there when it connected. Finding one fails the block, because your psql would have kept it.
- Allowed only in PostGIS blocks: roles, `GRANT` and `REVOKE`, default privileges, `SET ROLE` and `CREATE`/`DROP SCHEMA`, all within `learn_` names; `SET` and `SET LOCAL`, which the rollback undoes. Refused everywhere: `ALTER SYSTEM`, `ALTER DATABASE`, `GRANT SET ON PARAMETER`, any role or schema not named `learn_…`, and the name `learn_spatial` (003's spike schema in the test database; the runner also compares its content before and after every run).
- Creating roles needs the CREATEROLE privilege ("The PostGIS setup" below; d5).
- On the test server the labs run as one role, `critwire_lab`, which `pnpm learn:check --setup` creates once as the superuser: LOGIN and CREATEROLE with `createrole_self_grant = 'set, inherit'`, CONNECT, CREATE and TEMPORARY on `critwire_dev`, the owner of `learn_curriculum`, and no CREATE on `public`. The runner connects as it through `LEARN_PG_URL`, never through `SET ROLE` from the superuser, because a block's `RESET ROLE` would return to the superuser. The leak check ignores it.

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

Labs that create roles or schemas (d5) clean up in the same block, so running a block twice, or stopping halfway through a module, leaves nothing behind. Their names start with `learn_`, and creating roles needs the CREATEROLE privilege (a superuser has it; on your own install, see §3.2). This check creates a read-only role, reads a table as that role, and removes it again: `DROP OWNED BY` takes away what the role was granted, and only then can `DROP ROLE` remove it.

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
| 003 §4 The advanced spatial track | "Your own PostGIS": the session block (`pg-session`, now on `learn_curriculum`); spatial lessons 5 (projection), 6 (point value) and 7 (zonal) go into g1 and g7; lesson 4's finding (E1) that GBIF's country codes and the outlines disagree on coasts goes into g3 | Learners load their PostGIS with one psql-only file, not `shp2pgsql` or `ogr2ogr` (§B) | Spatial lessons 1–4 and 8 in the browser: they need DuckDB's `spatial` extension (§B). `pg-once` (the raster settings): g7's clips are in the database and need none |
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

**Loading, and loading again.** The lab file builds schema `learn_curriculum` in one transaction: it drops the schema, recreates it, loads every table, adds the keys and indexes, and checks every table's row count before `COMMIT`. A failed load changes nothing; a second load replaces the schema, including any table you made there, so keep your own work in another schema. Another schema keeps your tables, not your dependencies: a view, a foreign key, a trigger or a policy of yours that reads `learn_curriculum` would go with it (`DROP SCHEMA … CASCADE`). The lab file refuses that reload instead, naming each such object, and changes nothing; move or drop them and load again. Then connect with your SQL client (psql, pgAdmin, DBeaver, VS Code) to database `learn` and run §0's `pg-session` and `pg-smoke` blocks: the 14 row counts there mean your lab matches the tested one.

**Connection settings.** The Python labs, and any lab file you run with psql, find the database through libpq's standard environment variables, so the same file runs on your computer and on the test server. In PowerShell, for one session:

```powershell
$env:PGHOST = "localhost"; $env:PGPORT = "5432"; $env:PGUSER = "postgres"; $env:PGDATABASE = "learn"
# The password goes in %APPDATA%\postgresql\pgpass.conf, one line: localhost:5432:learn:postgres:choose-a-password
```

**Privileges.** The `postgres` user is a superuser and can do everything the labs do. As another user you need:
- `CONNECT`, `CREATE` and `TEMPORARY` on the database (its owner has them; else `GRANT CONNECT, CREATE, TEMPORARY ON DATABASE learn TO <you>;` as the superuser), to connect, to (re)create `learn_curriculum` and for temporary tables, and ownership of that schema once it exists;
- `CREATEROLE`, for the labs that create roles (d5, §0's `pg-role-smoke`): `ALTER ROLE <you> CREATEROLE;` as the superuser, once; on PostgreSQL 16 and later also `ALTER ROLE <you> SET createrole_self_grant = 'set, inherit';`, so you can act as the roles you create (`SET ROLE`) and drop what they hold (d5 explains);
- nothing more for the raster labs (g7, s6): their clips are stored in the database, so neither of PostGIS's raster settings (`postgis.enable_outdb_rasters`, `postgis.gdal_enabled_drivers`) is needed, and 003 §4's `pg-once` grants aren't either.

Every role or schema a lab creates is named `learn_…` and removed by the same block (§0), so the labs never leave anything in your database besides `learn_curriculum`.

Give the labs a database of their own (`learn` above), one you could drop and create again, and keep other work out of it. CREATEROLE is server-wide, not per database, so give it to a role you use only for the labs.

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
| GBIF open-records sample | per record CC0 1.0 or CC BY 4.0, after the effective-license rule (4.2) (003 D3); the download's DOI, and a derived-dataset DOI of its own | `occurrences.parquet`, `occurrences.csv`, `datasets.csv` | 40,395 records; 400 datasets | 454,202 (L1's zstd writer; the spike's 622,971); 4,591,948; 72,797 | f2–f4, d2–d6, g3–g6, s1–s6, e1–e5, p1–p4, c1 | L1 |
| Natural Earth admin-0, 1:50m, v5.1.2 | public domain (003 D2, 002 §6) | `country_shapes.parquet` (GeoParquet) | 247 | 1,304,205 | g1–g7, s1, s6 | L1 |
| Natural Earth admin-1, 1:50m | public domain (003 D10) | `admin1_shapes.parquet` (GeoParquet) | 294, in 9 countries | 870,947 | g4, g6, s2–s5 | L1 |
| RESOLVE Ecoregions 2017, simplified to 0.05° | CC BY 4.0 (003 D9) | `ecoregions.parquet` (GeoParquet), `biomes.csv` | 847; 14 | 6,686,262; 518 | g4, s6 | L1 |
| Countries (Natural Earth attributes) | public domain (002 §6) | `/v1/countries.{parquet,csv,json}` | 250 | a few KB | every module | L1 |
| Jung et al. 2020 habitat map, v004: classes and country summaries | CC BY 4.0 (003 D4, §5) | `habitat_classes.parquet`, `country_habitats.parquet`; L3 adds `occurrence_habitats.parquet` | 75; 35 (A2's stand-ins until L3) | 2,488; 850 | g7, s6, p2–p3 | L3 |
| Jung v004 clips, Costa Rica and Tasmania | CC BY 4.0 (003 D4) | `clips/{cr,tas}.tif` (cloud-optimized GeoTIFF) | 2 rasters | ≈ 3 MB (estimate; A2 measured the Costa Rica clip at 1.42 MB) | g7, s6 | L3 |
| The PostGIS loader | inherits the above | `postgis/learn_curriculum.sql` | 14 tables | 21,330,577 | every PostGIS module | build (L1; grown in L3) |
| The star export | inherits the above; credits in its own manifest | `star/*.csv` (8 files), `star/manifest.json` | §A.3 | 4,576,053; 10,995 | d6, p1–p4 | build (L2: the records fact; L5: the habitat fact) |
| The manifest and the index page | | `manifest.json` (4.5), `index.html` | | 14,257; 114,820 (L1's build) | every module | build (L1) |

Notes on the shapes (`SP/out/lab-data/summary.md`; sizes re-measured by L1's `pnpm ingest shapes`, `data/learn/shapes.json`):
- **GeoParquet 1.0.0**: WKB geometry in a `geom` column, its bounding box, longitude-latitude (CRS84), zstd compression, rows sorted by key. The same inputs write byte-identical files. The ingest rebuilds all three (and `biomes.csv`): admin-1, ecoregions and `biomes.csv` are byte-identical to the spike's; `country_shapes` has the spike's WKB for all 247 codes, but the spike wrote it with DuckDB's snappy (1,206,307 bytes), so zstd makes it 1,304,205.
- **Admin-1 covers 9 countries only** (AU 9, BR 27, CA 13, CN 31, ID 33, IN 36, RU 85, US 51, ZA 9 rows), as Natural Earth's 1:50m layer does. Tasmania is one row, `AUS-2660`. The key is `adm1_code`; Natural Earth's `iso_3166_2` is dropped, because one value (Jervis Bay's `AU-X02~`) isn't a real code.
- **RESOLVE is simplified feature by feature**, keeping topology, at 0.05° (about 5 km, close to the detail of the 1:50m outlines beside it). The source has 15,164,376 vertices; 0.05° keeps 545,976. The finest tolerance that fits 8 MB was 0.05°: 0.02° gives 9,880,579 bytes. Because each ecoregion is simplified on its own, neighbours no longer share an exact border, and small gaps and overlaps appear between them (g2 and g4 use this).
- **"Rock and Ice"** (`ECO_ID` 0) has no biome or realm in RESOLVE (`N/A`), so its `biome_id` and `realm` are NULL, a nullable foreign key like `occurrences.country_code`. Any other `N/A` fails the build.
- **Invalid shapes are kept on purpose**, for g2: one ring self-intersection in admin-1; 3 nested shells and 7 ring self-intersections in the simplified ecoregions (the source shapefile has 69 self-intersections). The admin-0 shapes are all valid. Every country code in the shapes has a `countries` row.

**How each is built.** One command per step, in the order critwire's ingests already use (ingest → derive → build; `AGENTS.md`):
- **GBIF sample** (L1): `pnpm ingest gbif-sample` submits the download (or reuses the one in `download.json`), waits, fetches the zip to a temporary folder, applies the species rule, the effective license, the country-key contract and the cap (4.2), reads each dataset's and publisher's metadata, and commits `data/raw/gbif-sample/`. `pnpm derive` writes the sample's per-dataset counts. `pnpm gbif:register --target learn-sample` mints its derived-dataset DOI. `pnpm build` writes the three files, the loader's two tables and the manifest.
- **Natural Earth and RESOLVE** (L1): an ingest downloads the pinned sources (Natural Earth's commit `f1890d9f…`; RESOLVE's `Ecoregions2017.zip`, read in place, never extracted), writes the GeoParquet files above, `biomes.csv` and `shapes.json` (inputs, tolerance, tool versions, per-file rows, bytes, sha256) and commits them under `data/learn/`. The build copies them and puts the same shapes in the loader.
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
| at most 2,000 per species, by ascending `md5` of the `gbifID` text, then `gbifID` | **40,395** (28,187 CC BY 4.0, 12,208 CC0 1.0) |

- **Species.** A record belongs to the species whose `ids.gbif` is its `speciesKey`, else its `taxonKey`; a record that names no species, or two, fails the run. Four of critwire's keys are synonyms in the backbone (Blanding's turtle, Baird's tapir, Temminck's and giant pangolins): GBIF files their 2,385 records under the accepted name's `speciesKey` and keeps critwire's key in `taxonKey` (e2).
- **Effective license.** A record's license is the more restrictive of its own and its dataset's (CC0 < CC BY < CC BY-NC). 11 datasets declare CC BY-NC 4.0 while GBIF labels their 13,467 records CC0 or CC BY; those records are left out. A record that is CC0 in a CC BY dataset is published as CC BY and credited. §10 asks the owner whether to keep this rule.
- **The cap.** At most 2,000 records per species, chosen by ascending `md5(gbifID)`, then `gbifID` (a tie-break, so the order is total even if two hashes were equal). Any engine computes the same hash, so DuckDB, PostgreSQL and TypeScript pick the same records, and a refresh changes only what GBIF changed, plus its knock-on at the cap: a newly eligible record with a low hash takes the place of the capped species' highest-hash record. 71 species have records: 13 reach the cap, 33 have fewer than 100, and the median is 111. The Ili pika has no open record; the Yangtze giant softshell turtle's only record sits in a CC BY-NC dataset. Uncapped, the open records would be 4,791,485 bytes as Parquet and 44,556,230 as CSV; they are never published.
- **Columns** (`occurrences`, the same in every file and both databases): `id` (GBIF's `gbifID`), `species_id`, `dataset_key`, `license` (effective, `CC0 1.0` or `CC BY 4.0`), `basis_of_record`, `longitude`, `latitude`, `coordinate_uncertainty_m`, `country_code_gbif`, `country_code`, `year`, `month`. The PostGIS lab adds `geom`, a stored point generated from the coordinates (SRID 4326, GiST-indexed).

**The country-key contract**, one rule applied once, by `pnpm derive` when it writes the published rows (`scripts/derive/sample.ts`, over the derived `countries` rows); no lab re-derives it. `sample.csv` keeps GBIF's raw code, so a countries fix needs no new GBIF ingest (L1, A4):
- `country_code_gbif` is GBIF's `countryCode` as delivered, NULL when empty. g3 compares it with the outlines.
- `country_code` is that code when `countries` has it, else NULL: a nullable foreign key to `countries`, in the browser and in PostGIS alike.
- Two values are known not to be countries: `ZZ` (unknown or invalid) and `XZ` (international waters). They give a NULL `country_code`. Any other code with no `countries` row fails the run and names the code, because it means the countries file has a gap (fixed by 002 §6's matching rule).
- The star maps a NULL to one unknown member, `dim_country` `ZZ` "Unknown or outside any country", so its foreign keys are never NULL (d6).
- In the spike's download all 112 codes were `countries` rows, and no `ZZ`, `XZ` or empty code came through (the geospatial-issue filter removes them), so `country_code` is never NULL in this sample. The contract stays for later refreshes.

**Dataset metadata.** For each dataset in the download, `GET https://api.gbif.org/v1/dataset/<key>` gives its title, DOI and license, and once per publisher `GET https://api.gbif.org/v1/organization/<key>` gives the publisher's name: 454 datasets and 233 publishers, read at 2 requests a second or fewer in 5 min 55 s. Every dataset had a title, a publisher and a DOI; none was deleted. A dataset GBIF deletes later keeps its title and records the deletion date; an unknown license fails the ingest. Licenses: CC BY 4.0 311, CC0 1.0 132, CC BY-NC 4.0 11. The 400 datasets left in the sample go into `datasets` (`dataset_key`, `title`, `publisher`, `doi`, `license`: the dataset's declared license). Record counts aren't stored: they are a query (d2), and one dataset (iNaturalist research-grade) holds records under two licenses, which is why `license` belongs on `occurrences`.

**Registration.** The sample is a reduced subset of the download, so GBIF's rules for citing it are those of a derived dataset: L1 registers it as its own, with its per-dataset counts and `originalDownloadDOI` set to the download's DOI. `pnpm gbif:register` gains `--target learn-sample`; its deposit tags are `gbif-learn-<hex12>`. The countries target and its `gbif-dd-*` tags don't change. GBIF stores `relatedDatasets` as sent and only checks that `originalDownloadDOI` exists (registry `DerivedDatasetResource`, checked in L1), so the sample's own counts are what it records. Every read-back (after the POST, on adopting, on verifying) is a hard error unless GBIF holds that download DOI. A sample DOI is current while GBIF holds the same per-dataset counts from the same download: a citation check, not record identity, which is `sample.csv`'s sha256 in `contributions.json` (under the description's hash line) and the manifest's sha256s. A plain build refuses a missing or stale sample DOI, as it does for the countries DOI, and the refresh follows `AGENTS.md`'s DOI steps with the new target. GBIF deletes an uncited download after six months (the spike's on 2027-04-23), and a derived dataset that cites it keeps it. So L1 reuses the spike's download (key `0041824-260928105237408`, through `download.json`) and registers the sample before that date: the same download and the same rules give the same 40,395 records, so every result recorded in this document holds on the published files. Only if the date has passed does L1 submit a new download, and then every result here is re-run on it. A new download is `pnpm ingest gbif-sample --new`: it records the search count, writes its intent (the request, the time and that count) before the one POST, which is never retried, and polls once a minute until GBIF finishes; `totalRecords` must then be within 0.1 % of the search count. A run interrupted after the POST lists the account's downloads and adopts the one with the same request created since the POST; with none, or several, it refuses rather than submit twice.

**What's committed**, under `data/raw/gbif-sample/`:
- `download.json`: the key, DOI, request, `totalRecords`, the zip's sha256 and every dataset's count in the full download (the spike's: 25,403 bytes);
- `datasets.json`: the metadata above, keys sorted, one `retrieved` time (241,891 bytes);
- `sample.csv`: the capped rows, sorted by `id` (about the size of `occurrences.csv`, 4.6 MB).

The ingest applies the cap, so `data/` is the whole snapshot and `pnpm derive` never needs the zip. `download.json` also records `sampleRules`, the text of the species, license and cap rules. `pnpm derive` refuses the sample as stale (and writes nothing) unless GBIF's stored request equals today's request over the species' `ids.gbif`, `sampleRules` equals the code's, and `datasets.json` names the same download; it then writes `data/gbif-learn-sample/contributions.json` (the download key and DOI, the records, the per-dataset counts and `sample.csv`'s sha256), the counts the sample's DOI registers. A species or `ids.gbif` change therefore needs a new download (`--new`) and a new sample DOI before a plain build passes; `--draft` lifts only the DOI checks. The full download and the zip are never committed: GBIF archives the download under its DOI, which is how anyone reproduces the sample.

### 4.3 The loader

`postgis/learn_curriculum.sql` builds the PostGIS lab with nothing but `psql` and PostGIS (§0, §3.2): `psql -X -v ON_ERROR_STOP=1 -d <your database> -f learn_curriculum.sql`. It is one transaction, so a failed load leaves the previous schema as it was:
- `\set ON_ERROR_STOP on`, `BEGIN`, `SET client_encoding = 'UTF8'` (psql on Windows talks in the console's code page and would garble names) and `SET LOCAL lock_timeout = '60s'` (a session still reading the old schema makes the load wait a minute at most, then fail, changing nothing).
- The guard and the drop, one `DO` block. Schema separation isn't dependency isolation (§3.2): `DROP SCHEMA learn_curriculum CASCADE` also drops whatever outside depends on it. So the block lists every object outside the schema that has a `pg_depend` entry (rules, triggers, defaults and policies take their table's schema; `pg_toast` belongs to its table), drops the schema, and raises, naming each listed object that is gone. Postgres computes the cascade; the guard only reads what it removed. It catches views and materialized views, foreign keys, columns of an inside type, defaults and functions over inside objects, triggers and policies; inside views, identity columns, indexes and TOAST reload cleanly (LD13–LD16). The one gap: an object another session creates in the second between the listing and the drop isn't listed. A lab database has one user, and `learn:check` holds its lock, so this is accepted.
- `CREATE SCHEMA learn_curriculum` and `SET LOCAL search_path = learn_curriculum, public`.
- The tables, with CHECKs for what a value may be: `coordinate_uncertainty_m` at least 0 and below `'Infinity'` (NaN sorts above it, so it fails too), `year` above 0, `est_area_km2` at least 0 and finite, `month` 1 to 12. NULL means unknown and passes. Then each table's rows as `COPY … FROM stdin (FORMAT csv)`. csv format reads a backslash as plain text; the text format would silently change rows (F10, e2).
- Shapes arrive as base64 text and become geometry afterwards: `ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326))`, one type per column (MultiPolygon, SRID 4326). Base64 takes a third less room than `bytea`'s hex form: the spike's loader is 21,330,577 bytes instead of 29,598,105, with identical geometries (the build's, with the guard and the checks, 21,338,761).
- Then primary, unique and foreign keys, GiST indexes and `ANALYZE` on every table.
- Then a check that raises on failure: each table's row count equals the build's, every geometry has SRID 4326, and every `LAB_CHECKS` rule holds. Those are the rules keys and CHECKs can't state (`range_status` is `ok` exactly when a species has countries, each taxon's parent is one rank up, the country-key contract, the lab-only tables' codes); each is one portable query counting the rows that break it, and the build runs the same queries in DuckDB over the published files, so a file that wouldn't load is never published. Shapes may be invalid (g2), so validity isn't checked.
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

The build refuses when `dist/learn/data/` exceeds 50,000,000 bytes, or when the committed lab data does: `data/raw/gbif-sample/`, `data/learn/` and `data/gbif-learn-sample/` together (L1's build: 35,452,055 and 13,673,945 bytes). Both refusals name the total and the largest files (`scripts/build/learn/cap.ts`). The browser engine's `parquet` extension (3.22 MB) is counted apart, under 002 §10 item 3.

| `/learn/data/` | Bytes |
|---|---|
| now (the spike, after L1's files): 10 files and the manifest | 35,397,671 (L1's build, with its index page: 35,452,055) |
| + L2's star (8 CSV files and its manifest) | 39,984,719 |
| + L3's habitat files and clips, about 3.2 MB, and their loader tables, about 0.7 MB for `occurrence_habitats` plus the clips as rasters (estimates) | ≈ 44–48 MB |

The committed lab data in the spike (`SP/data/learn/`: the shapes, the stand-in habitat summaries and the sample files) is 14,055,088 bytes; L1's `data/raw/gbif-sample/` adds about 4.9 MB in place of the sample files. L1's `country_shapes.parquet` (zstd, 4.1) is 97,898 bytes larger than the spike's, which adds that much to each total above.

With hex geometry the loader was 29,598,105 bytes, and the same projection came to about 52–58 MB, over the cap once L3 landed. Base64 brought it back under, with no change to any table. If L3's measured total is still over, the cuts go in this order, and each keeps the browser and PostGIS on the same data: RESOLVE is simplified further, in the file and the loader alike, using the same tolerance probe; then the CSV copy of the sample goes, since every reader also takes Parquet; then the Tasmania clip leaves the loader, and g7 keeps Costa Rica's. The loader and the sample's Parquet are cut last: every PostGIS module needs the one, and every browser module the other.

### 4.5 Credits

`/v1/attribution.json` stays about the species files, plus 002 §6's Natural Earth entry. The lab files are credited in **`/learn/data/manifest.json`**, keys in this order and no clock, so the same files give the same bytes (L1, `scripts/build/learn/data.ts`):
- `cap` (50,000,000) and `bytes`, the files' total;
- `inputs`: `v1`, the bytes and sha256 of `/v1/species.parquet` and `/v1/countries.parquet`, the two `/v1` files the lab tables are built from (a lab that finds other hashes is reading newer `/v1` files than these were tested with); `sample`, `sample.csv`'s path, sha256 and rows, the file the sample's derived-dataset deposit holds (= `contributions.json`);
- `dois`: `download` (the GBIF download's) and `sample` (the sample's derived dataset; null in a draft build);
- `files`: per file (all but `manifest.json` and `index.html`), its `columns` and `rows` (Parquet and CSV), `tables` for the loader (each lab table's rows, the counts its final check enforces), `bytes`, `sha256` and `sources[]` (`name`, `license`, `licenseUrl` from `scripts/build/sources.ts` `licenseUrl()`, `citation`, `url`, `doi` where there is one; the sample's source adds `datasets` and `derivedDataset` {`doi`, `citation`, `url`}).

In the spike's manifest:
- the sample's three files: GBIF's citation of the download, "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w", plus `"datasets": "datasets.csv"` for each dataset's credit; from L1 also the sample's derived dataset, `10.15468/dd.5sthtk`, with GBIF's citation of it;
- the Natural Earth shapes: public domain, credited anyway ("Made with Natural Earth");
- RESOLVE: CC BY 4.0, Dinerstein et al. 2017, BioScience 67(6), doi 10.1093/biosci/bix014;
- the habitat files: CC BY 4.0, Jung et al. 2020 and the map's version (003 §5), doi 10.5281/zenodo.4058819; until L3, named "(stand-in summaries)";
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

#### d4 · transactions

**Tool:** PG · **Time:** 2.0 h · **Prereqs:** d3

**Concept:** A **transaction** is a group of statements the database treats as one change: either all of it happens or none of it does. Its four promises are called **ACID**:
- **Atomicity:** all or nothing. If anything fails before `COMMIT`, or you type `ROLLBACK`, every change the transaction made is undone. PostgreSQL also undoes `CREATE TABLE`, `DROP TABLE` and `DROP SCHEMA` (DDL is transactional), which several databases don't.
- **Consistency:** each transaction moves the database from one state where every constraint holds (d1) to another. A statement that would break a constraint fails, and so does its transaction.
- **Isolation:** transactions that run at the same time don't see each other's unfinished work. How much they see of each other's *finished* work is the isolation level (below).
- **Durability:** once `COMMIT` returns, the change survives a crash: PostgreSQL wrote it to its write-ahead log first.

How you work with them:
- **Autocommit.** psql, like most clients, commits every statement on its own unless you type `BEGIN`. A script of ten statements is ten transactions: if the seventh fails, the first six stay. One statement is always atomic, though: an `INSERT … SELECT` that fails on its last row inserts nothing.
- **An error aborts the transaction.** Inside `BEGIN`, after a failed statement PostgreSQL refuses everything (`current transaction is aborted, commands ignored until end of transaction block`) until you type `ROLLBACK`. `COMMIT` of an aborted transaction rolls back too. In a script, `\set ON_ERROR_STOP on` makes psql stop at the first error, as critwire's lab file does (§4.3).
- **Savepoints** mark a point inside a transaction: `SAVEPOINT name`, then `ROLLBACK TO SAVEPOINT name` undoes only what came after it and clears the error, so the transaction can go on. psql's `\set ON_ERROR_ROLLBACK interactive` puts a savepoint before every statement you type by hand.
- **MVCC** (multi-version concurrency control) is how PostgreSQL isolates transactions without making readers wait. A row is stored as **versions**; each records the transaction that created it (the hidden column `xmin`) and the one that deleted it (`xmax`). An `UPDATE` writes a new version and marks the old one deleted; it doesn't overwrite. Each statement reads through a **snapshot**, a list of which transactions had committed when it started, and sees only the versions those made. So a reader sees the old version while a writer works on the new one, and neither waits. Old versions no one can see any more are removed later by `VACUUM` (autovacuum runs it for you).
- **Isolation levels.** **Read committed**, PostgreSQL's default, takes a new snapshot for every statement: two `SELECT`s in one transaction can see different data if someone committed in between. **Repeatable read** takes one snapshot for the whole transaction, and refuses to update a row that someone else changed since (`could not serialize access`, SQLSTATE `40001`): the application retries the transaction. **Serializable** goes further and refuses any outcome that no one-after-the-other order of the transactions could give; retry the same way.
- **Locks.** MVCC doesn't make writers wait for readers, but a writer waits for another writer of the same row, until that one commits or rolls back. Statements also lock whole tables, in modes that mostly don't conflict: a `SELECT` takes `AccessShareLock`, an `UPDATE` `RowExclusiveLock`. `ALTER TABLE`, `DROP` and `TRUNCATE` take `AccessExclusiveLock`, which conflicts with everything, even a `SELECT`, until the transaction ends. Two transactions that each wait for a lock the other holds are a **deadlock**: PostgreSQL notices within a second (`deadlock_timeout`) and aborts one of them. `SET LOCAL lock_timeout = '5s'` makes a statement give up instead of waiting.
- **A load you can re-run** (idempotent): running it twice leaves the same result as running it once, so after a failure you fix the cause and simply run it again. Three common ways:
  - **Replace in one transaction:** `BEGIN`, drop or empty the target, load it all, `COMMIT`. A failure changes nothing; readers see the old data until the commit, then the new. critwire's lab file does exactly this with the whole `learn_curriculum` schema (§4.3); its `DROP SCHEMA` takes `AccessExclusiveLock` on every table, so the labs wait for the few seconds it runs instead of reading half a load.
  - **Upsert by key:** `INSERT … ON CONFLICT (key) DO NOTHING` skips rows that are already there; `DO UPDATE SET col = EXCLUDED.col` updates them from the incoming row (`EXCLUDED`). It needs a primary key or unique constraint on exactly those columns, and it's safe when two loads run at once. Good for adding to a large table a batch at a time.
  - **Stage, then merge:** load into a staging table, check it (e1, e3), then upsert from it into the target in one transaction. The ETL spike loads GBIF's download this way (§A.1).

Every lab below runs in `psql`. Most start from the loaded tables in a transaction the tests roll back: type `BEGIN;` before one and `ROLLBACK;` after it. The worked example's and the first lab's blocks are typed exactly as shown, `BEGIN` and all, and end by removing what they made; a statement marked `-- fails:` fails on purpose, with that message. Leave `ON_ERROR_STOP` off for them (psql's default when you type), so psql goes on after the error as it does here.

**Worked example:** How do I re-run a failed load safely? A game wants a table of Tasmanian devil sightings (species 48) with the year of each, so `year` is `NOT NULL`. The load runs in two batches: the records since 2000, then the older ones. 41 of the devil's 2,000 records have no year, so the second batch fails. Run as a plain script, in autocommit:

```sql
-- q: d4-autocommit
-- status: ran
-- engine: postgis
-- tx: own
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year >= 2000;
-- fails: null value in column "year"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND (year < 2000 OR year IS NULL);
-- the script, run again after the failure:
-- fails: duplicate key value violates unique constraint "sightings_pkey"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year >= 2000;
SELECT count(*) AS rows_left_behind FROM sightings;
DROP TABLE sightings;
```

```text
-- result: d4-autocommit · 1 row · sha256 89b4148cdca5
rows_left_behind
1858
```

The first batch committed the moment it finished, so the failed load left half its rows behind, and running the script again fails on them (its `CREATE TABLE` would fail first: the table already exists). The second batch itself inserted nothing: one statement is atomic. The same load inside one transaction:

```sql
-- q: d4-one-transaction
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year >= 2000;
-- fails: null value in column "year"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND (year < 2000 OR year IS NULL);
-- fails: current transaction is aborted
SELECT count(*) FROM sightings;
ROLLBACK;
SELECT to_regclass('sightings') IS NULL AS nothing_left;
```

```text
-- result: d4-one-transaction · 1 row · sha256 c7809e52559a
nothing_left
true
```

After the error even a `SELECT` is refused; `ROLLBACK` undoes the first batch and the `CREATE TABLE` with it. Nothing is left to clean up, so after fixing the cause you run the same file again. The fix here is a decision, not a trick: the game needs a year, so records without one stay out. Written as "replace in one transaction" and run twice, as a scheduled job would:

```sql
-- q: d4-replace
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
DROP TABLE IF EXISTS sightings;
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year IS NOT NULL;
COMMIT;
-- the same file, run again:
BEGIN;
DROP TABLE IF EXISTS sightings;
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year IS NOT NULL;
COMMIT;
SELECT count(*) AS sightings, count(DISTINCT xmin::text) AS written_by_transactions FROM sightings;
DROP TABLE sightings;
```

```text
-- result: d4-replace · 1 row · sha256 de77387b65ec
sightings | written_by_transactions
1959 | 1
```

Run once or twice, the table holds the same rows, all written by one transaction (`xmin`, below). The last line removes the table, so the lab leaves your database as it found it.

**Lab:**
1. A savepoint keeps the good part of a transaction. Mark the point before the second batch, roll back to it when the batch fails, and load the older records that do have a year:

```sql
-- q: d4-savepoint
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year >= 2000;
SAVEPOINT before_batch_2;
-- fails: null value in column "year"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND (year < 2000 OR year IS NULL);
ROLLBACK TO SAVEPOINT before_batch_2;
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year < 2000;
SELECT count(*) FILTER (WHERE year >= 2000) AS since_2000,
       count(*) FILTER (WHERE year < 2000) AS before_2000
FROM sightings;
ROLLBACK;
```

```text
-- result: d4-savepoint · 1 row · sha256 5bc17d8ef8b5
since_2000 | before_2000
1858 | 101
```

2. Row versions. Every row the lab file loaded carries the id of the transaction that wrote it, in `xmin`. Across the fourteen tables there is one:

```sql
-- q: d4-xmin-load
-- status: ran
-- engine: postgis
SELECT count(DISTINCT xmin::text) AS transactions, count(*) AS row_versions
FROM (
  SELECT xmin FROM taxa
  UNION ALL SELECT xmin FROM species
  UNION ALL SELECT xmin FROM sources
  UNION ALL SELECT xmin FROM species_sources
  UNION ALL SELECT xmin FROM countries
  UNION ALL SELECT xmin FROM species_countries
  UNION ALL SELECT xmin FROM datasets
  UNION ALL SELECT xmin FROM occurrences
  UNION ALL SELECT xmin FROM country_shapes
  UNION ALL SELECT xmin FROM admin1_shapes
  UNION ALL SELECT xmin FROM biomes
  UNION ALL SELECT xmin FROM ecoregions
  UNION ALL SELECT xmin FROM habitat_classes
  UNION ALL SELECT xmin FROM country_habitats
) AS loaded;
```

```text
-- result: d4-xmin-load · 1 row · sha256 e8f1ca79813b
transactions | row_versions
1 | 43844
```

That is the loader's atomicity in the data itself: the lab arrived in one transaction, so no reader could ever see part of it. The number itself differs on every machine and every load, which is why the lab compares it rather than printing it.

3. An `UPDATE` writes a new version. Give one of the devil's records from 2005 a month, then compare it with its neighbour:

```sql
-- q: d4-xmin-update
-- status: ran
-- engine: postgis
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
SELECT id, month, xmin::text = pg_current_xact_id()::xid::text AS written_by_this_transaction
FROM occurrences
WHERE id IN (6004132305, 6004132353)
ORDER BY id;
```

```text
-- result: d4-xmin-update · 2 rows · sha256 12ad209f5ad8
id | month | written_by_this_transaction
6004132305 | 7 | true
6004132353 | NULL | false
```

The updated row is a new version, written by your open transaction; the old version is still in the table, marked deleted, and every other session goes on reading it until you commit. `ROLLBACK` makes the new version the dead one instead. Either way `VACUUM` removes the dead version later.

4. The locks a transaction holds, from `pg_locks`. Update a row of `occurrences`, then add a column to `species`:

```sql
-- q: d4-locks
-- status: ran
-- engine: postgis
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
ALTER TABLE species ADD COLUMN note text;
SELECT relation::regclass::text AS table_name, mode
FROM pg_locks
WHERE pid = pg_backend_pid()
  AND locktype = 'relation'
  AND relation IN ('occurrences'::regclass, 'species'::regclass)
ORDER BY table_name, mode;
```

```text
-- result: d4-locks · 2 rows · sha256 527e596492f7
table_name | mode
occurrences | RowExclusiveLock
species | AccessExclusiveLock
```

`RowExclusiveLock` lets everyone else read `occurrences` and write its other rows. `AccessExclusiveLock` stops every session from even reading `species` until this transaction ends: keep transactions that change a table's structure short.

5. Readers don't wait; writers of the same row do. This needs two psql windows, A and B, each after `pg-session`; type the lines in the order shown. (The tests run every block in one session, so this one was run by hand on the test server, with the results in the comments.)

```sql
-- q: d4-wait
-- status: untested: needs two sessions
-- engine: postgis
-- window A
BEGIN;
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
-- window B
BEGIN;
SELECT month FROM occurrences WHERE id = 6004132305;     -- NULL, at once: B reads the old version
UPDATE occurrences SET month = 8 WHERE id = 6004132305;  -- waits for A's row lock
-- window A
ROLLBACK;                                                -- now B's UPDATE finishes: UPDATE 1
-- window B
SELECT month FROM occurrences WHERE id = 6004132305;     -- 8
ROLLBACK;
```

6. Isolation levels, with the same two windows. B changes the row and commits (autocommit) while A's transaction is open:

```sql
-- q: d4-isolation
-- status: untested: needs two sessions
-- engine: postgis
-- window A
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT month FROM occurrences WHERE id = 6004132305;     -- NULL
-- window B
UPDATE occurrences SET month = 1 WHERE id = 6004132305;  -- committed at once
-- window A
SELECT month FROM occurrences WHERE id = 6004132305;     -- still NULL: one snapshot for the whole transaction
UPDATE occurrences SET month = 2 WHERE id = 6004132305;
-- ERROR:  could not serialize access due to concurrent update
ROLLBACK;
-- window B: undo the change
UPDATE occurrences SET month = NULL WHERE id = 6004132305;
```

Begin A with plain `BEGIN;` (read committed) instead and A's second `SELECT` shows B's 1, and its `UPDATE` succeeds. Which is right depends on the job: a report that reads several tables wants one snapshot (repeatable read, read only); a job that decides from what it read and then writes wants to hear that the data changed under it (repeatable read or serializable, with a retry).

7. Upserts. The game's feed, version 1: the devil's records from 2000 to 2019, without months. Labs 8 to 11 and the exercise start from it:

```sql
-- q: d4-feed
-- status: ran
-- engine: postgis
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings (occurrence_id, species_id, year, country_code)
SELECT id, species_id, year, country_code
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2019;
SELECT count(*) AS sightings, count(month) AS with_month FROM sightings;
```

```text
-- result: d4-feed · 1 row · sha256 2eded79bd687
sightings | with_month
1816 | 0
```

8. A plain `INSERT` can't be run twice:

```sql
-- q: d4-rerun
-- status: ran
-- engine: postgis
-- after: d4-feed
-- expect: error duplicate key value violates unique constraint "sightings_pkey"
INSERT INTO sightings (occurrence_id, species_id, year, country_code)
SELECT id, species_id, year, country_code
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2019;
```

```text
-- result: d4-rerun · error: statement 1 of 1: duplicate key value violates unique constraint "sightings_pkey"
```

9. `ON CONFLICT … DO NOTHING` adds what's missing and skips the rest. Widen the batch to every year since 2000; `RETURNING` hands back the rows actually inserted, which a `WITH` query can count:

```sql
-- q: d4-do-nothing
-- status: ran
-- engine: postgis
-- after: d4-feed
WITH added AS (
  INSERT INTO sightings (occurrence_id, species_id, year, country_code)
  SELECT id, species_id, year, country_code
  FROM occurrences
  WHERE species_id = 48 AND year >= 2000
  ON CONFLICT (occurrence_id) DO NOTHING
  RETURNING year
)
SELECT count(*) AS added, min(year) AS first_year FROM added;
```

```text
-- result: d4-do-nothing · 1 row · sha256 9cb3872ad5bc
added | first_year
42 | 2020
```

10. Version 2 of the feed carries the month. `DO UPDATE` brings existing rows up to date from `EXCLUDED`, the row that was refused; its `WHERE` skips rows that wouldn't change, so they aren't rewritten (a new version each, for nothing). Whether `RETURNING` hands back an inserted or an updated row shows in `xmax`, which is 0 on a freshly inserted version: a PostgreSQL detail, but a well-known one.

```sql
-- q: d4-do-update
-- status: ran
-- engine: postgis
-- after: d4-feed
WITH upserted AS (
  INSERT INTO sightings AS s (occurrence_id, species_id, year, month, country_code)
  SELECT id, species_id, year, month, country_code
  FROM occurrences
  WHERE species_id = 48 AND year >= 2000
  ON CONFLICT (occurrence_id) DO UPDATE
    SET month = EXCLUDED.month, country_code = EXCLUDED.country_code
    WHERE (s.month, s.country_code) IS DISTINCT FROM (EXCLUDED.month, EXCLUDED.country_code)
  RETURNING xmax = 0 AS inserted
)
SELECT count(*) FILTER (WHERE inserted) AS inserted,
       count(*) FILTER (WHERE NOT inserted) AS updated
FROM upserted;
```

```text
-- result: d4-do-update · 1 row · sha256 418ed4da479b
inserted | updated
42 | 1320
```

The other 496 rows of version 1 have no month in version 2 either, so they were left alone.

11. Two ways an upsert fails. `ON CONFLICT` names the columns of a unique constraint or index; there is none on `(species_id, year)`:

```sql
-- q: d4-no-arbiter
-- status: ran
-- engine: postgis
-- after: d4-feed
-- expect: error there is no unique or exclusion constraint matching the ON CONFLICT specification
INSERT INTO sightings (occurrence_id, species_id, year)
SELECT id, species_id, year
FROM occurrences
WHERE species_id = 48 AND year >= 2020
ON CONFLICT (species_id, year) DO NOTHING;
```

```text
-- result: d4-no-arbiter · error: statement 1 of 1: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

And a batch that holds the same key twice can't decide which row wins, so `DO UPDATE` refuses it: remove duplicates in the batch first (`DISTINCT ON`, or a check in staging).

```sql
-- q: d4-twice
-- status: ran
-- engine: postgis
-- after: d4-feed
-- expect: error cannot affect row a second time
INSERT INTO sightings AS s (occurrence_id, species_id, year, month)
SELECT id, species_id, year, month FROM occurrences WHERE species_id = 48 AND year >= 2020
UNION ALL
SELECT id, species_id, year, month FROM occurrences WHERE species_id = 48 AND year >= 2020
ON CONFLICT (occurrence_id) DO UPDATE SET month = EXCLUDED.month;
```

```text
-- result: d4-twice · error: statement 1 of 1: ON CONFLICT DO UPDATE command cannot affect row a second time
```

**Result:** In autocommit, a load that fails on its second batch keeps the first (1,858 rows), and running it again fails on them; in one transaction the error aborts everything, even a `SELECT`, and `ROLLBACK` leaves nothing behind, so the fixed file can simply be run again, once or twice, for the same 1,959 rows. A savepoint keeps the first batch and lets the transaction go on. MVCC is visible in `xmin`: the whole lab was written by one transaction, and an `UPDATE` writes a new version under your own transaction's id. An `UPDATE` holds `RowExclusiveLock`, an `ALTER TABLE` `AccessExclusiveLock`; by hand, a reader didn't wait for a writer, a second writer did, and repeatable read refused to update a row changed since its snapshot. `ON CONFLICT` made the feed re-runnable: `DO NOTHING` added the 42 missing records, and `DO UPDATE … WHERE … IS DISTINCT FROM` inserted those 42 and updated the 1,320 that gained a month, leaving 496 alone.

**Exercise:** The feed grows to a second animal, the jaguar (species 51). Starting from `d4-feed`'s table, write one statement that brings `sightings` up to date with every record of the devil and the jaguar that has a year: new records inserted, month and country updated where they changed, other rows left alone. Log what it did in a table `sightings_runs (run, inserted, updated)`, run it twice, and show the log. The second run must change nothing.

**Answer:** The upsert of lab 10 over both animals, with its counts written to the log by a second `INSERT` that reads the `WITH` query; the same statement again for run 2.

```sql
-- q: d4-ex
-- status: ran
-- engine: postgis
-- after: d4-feed
CREATE TABLE sightings_runs (run integer PRIMARY KEY, inserted bigint NOT NULL, updated bigint NOT NULL);
WITH upserted AS (
  INSERT INTO sightings AS s (occurrence_id, species_id, year, month, country_code)
  SELECT id, species_id, year, month, country_code
  FROM occurrences
  WHERE species_id IN (48, 51) AND year IS NOT NULL
  ON CONFLICT (occurrence_id) DO UPDATE
    SET month = EXCLUDED.month, country_code = EXCLUDED.country_code
    WHERE (s.month, s.country_code) IS DISTINCT FROM (EXCLUDED.month, EXCLUDED.country_code)
  RETURNING xmax = 0 AS inserted
)
INSERT INTO sightings_runs
SELECT 1, count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) FROM upserted;
WITH upserted AS (
  INSERT INTO sightings AS s (occurrence_id, species_id, year, month, country_code)
  SELECT id, species_id, year, month, country_code
  FROM occurrences
  WHERE species_id IN (48, 51) AND year IS NOT NULL
  ON CONFLICT (occurrence_id) DO UPDATE
    SET month = EXCLUDED.month, country_code = EXCLUDED.country_code
    WHERE (s.month, s.country_code) IS DISTINCT FROM (EXCLUDED.month, EXCLUDED.country_code)
  RETURNING xmax = 0 AS inserted
)
INSERT INTO sightings_runs
SELECT 2, count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) FROM upserted;
SELECT run, inserted, updated, (SELECT count(*) FROM sightings) AS sightings_after
FROM sightings_runs
ORDER BY run;
```

```text
-- result: d4-ex · 2 rows · sha256 cff78f0f35bc
run | inserted | updated | sightings_after
1 | 2137 | 1320 | 3953
2 | 0 | 0 | 3953
```

**Check:** Your two runs must match the answer's rows: run 1 inserts 2,137 (the devil's 143 records outside 2000–2019 and the jaguar's 1,994) and updates 1,320; run 2 inserts and updates nothing; `sightings` ends with 3,953 rows. Without the `WHERE … IS DISTINCT FROM`, run 2 "updates" every existing row that matches (a new version each) and the check fails; without `ON CONFLICT`, run 1 fails on the first duplicate.

**Dialects:**
- **PostgreSQL:** psql autocommits; `psql -1` (`--single-transaction`) wraps a whole file in one transaction, with `-v ON_ERROR_STOP=1`; DDL is transactional; read committed by default, repeatable read and serializable (serializable snapshot isolation) raise SQLSTATE `40001` for the application to retry; `INSERT … ON CONFLICT` since 9.5, `MERGE` since 15 (with `RETURNING` since 17), and `RETURNING old.*, new.*` since 18, which says inserted or updated without the `xmax` trick.
- **DuckDB:** transactions with MVCC too, but optimistic: two transactions that change the same row don't wait; the second gets a conflict error and is rolled back. One process at a time can open a database file for writing. DDL is transactional; `INSERT … ON CONFLICT DO NOTHING | DO UPDATE` and `INSERT OR REPLACE` need a primary key or unique constraint.
- **SQL Server:** autocommit unless `BEGIN TRANSACTION`; many errors end only the statement, not the transaction, unless `SET XACT_ABORT ON` (use it in load scripts); savepoints are `SAVE TRANSACTION name` and `ROLLBACK TRANSACTION name`. Read committed uses locks, so readers wait for writers, unless the database has `READ_COMMITTED_SNAPSHOT` on (the default in Azure SQL Database), which keeps row versions in tempdb; `SNAPSHOT` isolation is its repeatable read by versions. No `ON CONFLICT`: `MERGE … WITH (HOLDLOCK)`, or `UPDATE` then `INSERT … WHERE NOT EXISTS` in one transaction.

#### d5 · roles

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** d4

**Concept:** A database server decides who may do what with **roles** and **privileges**:
- **Roles.** PostgreSQL has one kind of account, the role. A role with the `LOGIN` attribute is what other systems call a user; one without it is a group. Roles belong to the whole server (the cluster), not to one database: a role made while you work in `learn` exists in every database there, and outlives `learn_curriculum`. Other attributes say what a role may do beyond the objects it's granted: `SUPERUSER` (everything, every check skipped), `CREATEDB`, `CREATEROLE`, `BYPASSRLS`.
- **Membership.** `GRANT learn_reporting TO learn_powerbi` makes one role a member of another. A member uses the group's privileges directly (`INHERIT`, the default) and may switch to it with `SET ROLE`. So privileges go to a group, and each person or program gets a login that is a member: adding a dashboard is one `GRANT`, and removing it touches nothing else.
- **Owners.** Every table, schema and function has an owner, the role that made it (or that `ALTER … OWNER TO` names). The owner can do anything to it, including drop it and grant on it; everyone else gets only what is granted. You own the lab: you loaded `learn_curriculum`.
- **Privileges** are granted per object, and a reader needs one at every level: `CONNECT` on the database, `USAGE` on the schema (to look up names in it), then `SELECT` on each table. Writing is `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE`; making tables is `CREATE` on the schema. `GRANT SELECT (id, slug) ON species` grants columns only. `REVOKE` takes a privilege back.
- **PUBLIC** is every role, present and future. By default PUBLIC may connect to a database and make temporary tables in it, use (but since PostgreSQL 15 not create in) schema `public`, and run every function. So a new role can already connect and call PostGIS; to keep it out of a database, revoke `CONNECT` from PUBLIC on that database and grant it to the roles that need it.
- **Schemas** are folders of tables, views and functions inside one database. They group objects by purpose and by who may touch them: the lab in `learn_curriculum`, your own work in a schema of yours (a reload replaces `learn_curriculum`, §3.2), reports in a third. The `search_path` (§0) is the list of schemas a plain table name is looked up in. Anyone who can create objects in a schema on your `search_path` can put a table or function there that shadows one you meant; that is why PostgreSQL 15 stopped letting PUBLIC create in `public`.
- **Default privileges.** `GRANT SELECT ON ALL TABLES IN SCHEMA s` grants on the tables that exist now; a table made tomorrow is covered by nothing. `ALTER DEFAULT PRIVILEGES FOR ROLE maker IN SCHEMA s GRANT SELECT ON TABLES TO reader` records a grant that PostgreSQL adds to every table `maker` creates in `s` from then on. Only tables made by that role: the defaults belong to the creator, not to the schema.
- **Least privilege:** each role gets exactly what its job needs. A reporting tool reads; it doesn't write, make tables, or see schemas outside its job. If its password leaks, that is all the leak gives away.
- **Removing a role.** `DROP ROLE` refuses while anything depends on the role: objects it owns, privileges granted to it, default privileges, policies. `DROP OWNED BY r` drops what `r` owns in the current database and revokes everything granted to it there; `REASSIGN OWNED BY r TO other` hands its objects over instead. Both work on one database at a time, so on a server where the role has privileges in several, run it in each.
- **Row-level security** (RLS) filters rows per role. `ALTER TABLE t ENABLE ROW LEVEL SECURITY`, then a **policy**, `CREATE POLICY name ON t FOR SELECT TO role USING (condition)`, adds the condition to every query that role runs on `t`, so it sees only matching rows, with no view or application code to forget. Once RLS is on, a role with no policy for a command sees no rows at all (default deny). `USING` filters the rows a command reads or changes; `WITH CHECK` tests new rows (`INSERT`, `UPDATE`). Policies for the same command are combined with `OR`, unless created `AS RESTRICTIVE` (`AND`). The table's owner, superusers and `BYPASSRLS` roles skip the policies; `FORCE ROW LEVEL SECURITY` applies them to the owner too.

How to look: in psql, `\du` lists roles and memberships, `\dn+` schemas with their privileges, `\dp` tables' privileges and policies, `\ddp` default privileges. In SQL, `has_table_privilege(role, table, privilege)` and its siblings (`has_schema_privilege`, `has_database_privilege`, `has_function_privilege`) answer for any role, and `information_schema.role_table_grants` lists table grants.

These labs create roles, so they need the CREATEROLE privilege. The `postgres` superuser has it. On your own install, as another user, run once as the superuser: `ALTER ROLE <you> CREATEROLE;` and, on PostgreSQL 16 and later, `ALTER ROLE <you> SET createrole_self_grant = 'set, inherit';`, then reconnect. Since PostgreSQL 16, a non-superuser who creates a role may administer it but not act as it: without the second setting, the labs' `SET ROLE`, `ALTER DEFAULT PRIVILEGES FOR ROLE` and `DROP OWNED BY` are refused. (Tested on PostgreSQL 16 as a login with only those two settings.)

Every lab below is one transaction, typed exactly as shown in psql, `BEGIN` to `ROLLBACK`, with `ON_ERROR_STOP` off as in d4: a statement marked `-- fails:` fails on purpose, and the savepoint before it lets the transaction go on. Each lab drops its roles before the `ROLLBACK` anyway: that is the cleanup a script you `COMMIT` on a real server needs, and roles, being the server's, are the thing most easily left behind.

**Worked example:** How do I give a reporting tool read-only access to one schema and nothing else? Make a group role that holds the privileges, `learn_reporting`, and a login for the tool, `learn_powerbi`, that is a member of it. The group gets `USAGE` on `learn_curriculum` and `SELECT` on its tables; nothing else. Then act as the tool: reading works, writing and making tables don't.

```sql
-- q: d5-reporting
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO learn_reporting;
CREATE ROLE learn_powerbi LOGIN IN ROLE learn_reporting;
SET ROLE learn_powerbi;
SAVEPOINT try;
-- fails: permission denied for table species
UPDATE species SET common_name = 'Devil' WHERE id = 48;
ROLLBACK TO SAVEPOINT try;
-- fails: permission denied for schema learn_curriculum
CREATE TABLE my_report (id integer);
ROLLBACK TO SAVEPOINT try;
SELECT current_user AS reading_as, count(*) AS records, count(DISTINCT species_id) AS species
FROM occurrences;
RESET ROLE;
DROP OWNED BY learn_powerbi, learn_reporting;
DROP ROLE learn_powerbi, learn_reporting;
ROLLBACK;
```

```text
-- result: d5-reporting · 1 row · sha256 df4ba6a052e1
reading_as | records | species
learn_powerbi | 40395 | 71
```

`learn_powerbi` holds no privilege of its own: it reads through its membership in `learn_reporting`. `SET ROLE` is how you test a role without its password; a superuser may switch to any role, and you, with `createrole_self_grant`, to those you made. For the real tool, give the login a password with psql's `\password learn_powerbi` (it isn't echoed or logged), and put the server's address, the database and that login in the tool's connection settings (p1).

**Lab:**
1. What the reporting role may do, as the server sees it. `has_…_privilege` answers for any role, so you needn't switch to it:

```sql
-- q: d5-privileges
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO learn_reporting;
SELECT object, privilege, allowed
FROM (
  SELECT 1 AS level, 'this database' AS object, p AS privilege,
         has_database_privilege('learn_reporting', current_database(), p) AS allowed
  FROM unnest(ARRAY['CONNECT', 'TEMPORARY', 'CREATE']) AS p
  UNION ALL
  SELECT 2, 'schema ' || s, p, has_schema_privilege('learn_reporting', s, p)
  FROM unnest(ARRAY['learn_curriculum', 'public']) AS s, unnest(ARRAY['USAGE', 'CREATE']) AS p
  UNION ALL
  SELECT 3, 'table species', p, has_table_privilege('learn_reporting', 'species', p)
  FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p
  UNION ALL
  SELECT 4, 'function ST_Area(geometry)', 'EXECUTE',
         has_function_privilege('learn_reporting', 'ST_Area(geometry)', 'EXECUTE')
) AS checked
ORDER BY level, object, privilege;
DROP OWNED BY learn_reporting;
DROP ROLE learn_reporting;
ROLLBACK;
```

```text
-- result: d5-privileges · 13 rows · sha256 4550419dc70c
object | privilege | allowed
this database | CONNECT | true
this database | CREATE | false
this database | TEMPORARY | true
schema learn_curriculum | CREATE | false
schema learn_curriculum | USAGE | true
… 8 more rows
```

The two grants show as `SELECT` on the table and `USAGE` on `learn_curriculum`. Everything else that is true comes from PUBLIC: connecting, temporary tables, `USAGE` on `public` and every function. That is harmless for reading, but "nothing else" also means other databases on the server: there, revoke `CONNECT` from PUBLIC. As the database's owner, on a server you run (the tests never change a database's privileges, so this block isn't run here; `learn` is your lab database):

```sql
-- q: d5-database
-- status: untested: changes the database's own privileges, which the tests never do
-- engine: postgis
REVOKE CONNECT, TEMPORARY ON DATABASE learn FROM PUBLIC;
GRANT CONNECT ON DATABASE learn TO learn_reporting;
ALTER ROLE learn_powerbi SET default_transaction_read_only = on;
```

The last line is a guard against mistakes, not a lock: every session of that login starts read-only, so a privilege granted by mistake doesn't turn into a write, but the session itself may switch it off. Settings like this belong to the login; members don't inherit them from a group.

2. Default privileges. The loading job, `learn_etl`, owns a schema of report tables, `learn_reports`, and the reporting role reads them. Grant on all tables, make another, then set default privileges and make a third:

```sql
-- q: d5-defaults
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_etl NOLOGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_etl;
GRANT SELECT ON occurrences TO learn_etl;
CREATE SCHEMA learn_reports AUTHORIZATION learn_etl;
GRANT USAGE ON SCHEMA learn_reports TO learn_reporting;
SET ROLE learn_etl;
CREATE TABLE learn_reports.report_1_by_year AS
SELECT year, count(*) AS records FROM occurrences WHERE year IS NOT NULL GROUP BY year;
GRANT SELECT ON ALL TABLES IN SCHEMA learn_reports TO learn_reporting;
CREATE TABLE learn_reports.report_2_by_species AS
SELECT species_id, count(*) AS records FROM occurrences GROUP BY species_id;
RESET ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE learn_etl IN SCHEMA learn_reports
  GRANT SELECT ON TABLES TO learn_reporting;
SET ROLE learn_etl;
CREATE TABLE learn_reports.report_3_by_country AS
SELECT country_code, count(*) AS records FROM occurrences GROUP BY country_code;
RESET ROLE;
SELECT tablename AS table_name, tableowner AS owner,
       has_table_privilege('learn_reporting', format('%I.%I', schemaname, tablename), 'SELECT') AS reporting_can_read
FROM pg_tables
WHERE schemaname = 'learn_reports'
ORDER BY tablename;
DROP SCHEMA learn_reports CASCADE;
DROP OWNED BY learn_etl, learn_reporting;
DROP ROLE learn_etl, learn_reporting;
ROLLBACK;
```

```text
-- result: d5-defaults · 3 rows · sha256 637b64b91525
table_name | owner | reporting_can_read
report_1_by_year | learn_etl | true
report_2_by_species | learn_etl | false
report_3_by_country | learn_etl | true
```

The grant on all tables covered the one table that existed; the second was made after it and nobody can read it, the usual "the dashboard broke after last night's load". The third was covered by the default privileges, because `learn_etl` made it. Had you made it yourself, they wouldn't apply: name the role that really creates the tables in `FOR ROLE`. `\ddp` lists the defaults; the fix for tables already missed is one more `GRANT … ON ALL TABLES`. `DROP SCHEMA … CASCADE` removes the reports; `DROP OWNED BY learn_etl` would have removed them too, since it owns them.

3. Why `DROP ROLE` alone fails. A role that was granted anything can't be dropped:

```sql
-- q: d5-drop-role
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_reporting;
GRANT SELECT ON species, occurrences TO learn_reporting;
SAVEPOINT before_drop;
-- fails: role "learn_reporting" cannot be dropped because some objects depend on it
DROP ROLE learn_reporting;
ROLLBACK TO SAVEPOINT before_drop;
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'learn_reporting'
ORDER BY table_name;
DROP OWNED BY learn_reporting;
DROP ROLE learn_reporting;
ROLLBACK;
```

```text
-- result: d5-drop-role · 2 rows · sha256 6be36802af13
table_name | privilege_type
occurrences | SELECT
species | SELECT
```

The error's detail lists what holds the role: `privileges for schema learn_curriculum`, then each table. `DROP OWNED BY` revokes them all at once; listing them by hand and revoking each works too, but misses what you didn't list.

4. A taste of row-level security. Two partners, one in Australia and one in Brazil, may each read only the records from their country; a third role has `SELECT` but no policy. Each role writes what it sees into a temporary table (granted `INSERT` for this), so one query can compare them:

```sql
-- q: d5-rls
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_partner_au NOLOGIN;
CREATE ROLE learn_partner_br NOLOGIN;
CREATE ROLE learn_no_policy NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_partner_au, learn_partner_br, learn_no_policy;
GRANT SELECT ON occurrences TO learn_partner_au, learn_partner_br, learn_no_policy;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_au ON occurrences FOR SELECT TO learn_partner_au USING (country_code = 'AU');
CREATE POLICY partner_br ON occurrences FOR SELECT TO learn_partner_br USING (country_code = 'BR');
CREATE TEMPORARY TABLE seen (reader text PRIMARY KEY, records bigint, species bigint, countries bigint);
GRANT INSERT ON seen TO learn_partner_au, learn_partner_br, learn_no_policy;
INSERT INTO seen
SELECT '(you, the owner)', count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
SET ROLE learn_partner_au;
INSERT INTO seen
SELECT current_user, count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
SET ROLE learn_partner_br;
INSERT INTO seen
SELECT current_user, count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
SET ROLE learn_no_policy;
INSERT INTO seen
SELECT current_user, count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
RESET ROLE;
SELECT reader, records, species, countries FROM seen ORDER BY records DESC, reader;
DROP OWNED BY learn_partner_au, learn_partner_br, learn_no_policy;
ALTER TABLE occurrences DISABLE ROW LEVEL SECURITY;
DROP ROLE learn_partner_au, learn_partner_br, learn_no_policy;
ROLLBACK;
```

```text
-- result: d5-rls · 4 rows · sha256 391fc1e17327
reader | records | species | countries
(you, the owner) | 40395 | 71 | 106
learn_partner_br | 5033 | 14 | 1
learn_partner_au | 4636 | 5 | 1
learn_no_policy | 0 | 0 | 0
```

The same query, `count(*) FROM occurrences`, gives each role a different answer, and none of them asked for a country. You, the owner, skip the policies and see every record. The role with `SELECT` and no policy sees nothing: with RLS on, no policy means no rows. `DROP OWNED BY` dropped both policies, since each named only its role. A policy can also read a table, `USING (country_code IN (SELECT country_code FROM partner_countries WHERE role_name = current_user))`, so one policy serves every partner; index the columns it filters on, because it runs inside every query.

**Result:** A group role with `USAGE` on one schema and `SELECT` on its tables, and a login that is its member, reads the 40,395 records and is refused writing and making tables. Its other abilities come from PUBLIC (connect, temporary tables, `public`, functions), which a server you run can revoke per database. `GRANT … ON ALL TABLES` covers only tables that exist; default privileges cover the tables a named role makes later. `DROP ROLE` fails while the role holds privileges, and `DROP OWNED BY` clears them. With row-level security, the Australian partner saw 4,636 records, the Brazilian 5,033, a role without a policy none, and the owner all of them.

**Exercise:** The Tasmanian devil project's dashboard needs a role, `learn_devil_dashboard`, that reads the species list and the devil's records (species 48), and nothing else: no other species' records, no other lab table, no writing. Create it, prove that reading `datasets` and updating a record are refused, and show what it sees in `occurrences` and `species`. Clean up as the labs do.

**Answer:** `USAGE` on the schema and `SELECT` on the two tables; a policy limits `occurrences` to species 48. `species` has no policy and no RLS, so all its rows are readable.

```sql
-- q: d5-ex
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_devil_dashboard NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_devil_dashboard;
GRANT SELECT ON species, occurrences TO learn_devil_dashboard;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY devil_only ON occurrences FOR SELECT TO learn_devil_dashboard USING (species_id = 48);
SET ROLE learn_devil_dashboard;
SAVEPOINT try;
-- fails: permission denied for table datasets
SELECT count(*) FROM datasets;
ROLLBACK TO SAVEPOINT try;
-- fails: permission denied for table occurrences
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
ROLLBACK TO SAVEPOINT try;
SELECT count(*) AS records, count(DISTINCT species_id) AS species_with_records,
       (SELECT count(*) FROM species) AS species_rows
FROM occurrences;
RESET ROLE;
DROP OWNED BY learn_devil_dashboard;
ALTER TABLE occurrences DISABLE ROW LEVEL SECURITY;
DROP ROLE learn_devil_dashboard;
ROLLBACK;
```

```text
-- result: d5-ex · 1 row · sha256 bae58d1ab786
records | species_with_records | species_rows
2000 | 1 | 76
```

**Check:** As your role, `occurrences` shows 2,000 records of 1 species and `species` all 76 rows; reading `datasets` and the `UPDATE` both fail with `permission denied`; after your block, `SELECT count(*) FROM pg_roles WHERE rolname LIKE 'learn\_%'` is 0 and `\dp occurrences` shows no policy. If `datasets` was readable, you granted `ON ALL TABLES`; if the role saw 40,395 records, RLS isn't on (or you checked as yourself, the owner, instead of after `SET ROLE`).

**Dialects:**
- **PostgreSQL:** roles are server-wide, users and groups alike; schema `public` is no longer writable by PUBLIC since 15; `ALTER DEFAULT PRIVILEGES` per creating role; predefined roles such as `pg_read_all_data` (14+) read every table in every database, too broad for "one schema"; a non-superuser's `CREATEROLE` gives only `ADMIN` on the roles it makes since 16 (`createrole_self_grant`); RLS since 9.5; views check their owner's privileges unless `security_invoker` (15+).
- **DuckDB:** no users, roles or `GRANT`: whoever can open the database file can read it. Access is the file's permissions, or opening it read only (`ATTACH 'lab.duckdb' (READ_ONLY)`, `duckdb -readonly`); schemas exist and group tables, without privileges.
- **SQL Server:** a login belongs to the server and a user to one database; fixed database roles such as `db_datareader`; `GRANT SELECT ON SCHEMA::reports TO reporting` covers tables created in the schema later, so there is nothing like default privileges to set; `DENY` overrides any grant; row-level security is a security policy with a predicate function (2016+).

#### d6 · star

**Tool:** PG + B (browser) · **Time:** 2.5 h · **Prereqs:** d2, d4

**Concept:** Reports ask "how many, by what": records by class and continent, habitat area by country, records per decade. A **dimensional model** answers them with a shape built for reading:
- **Facts and dimensions.** A **fact table** holds the events you count or measure, one row each. A **dimension table** holds one way to slice them: the species, the country, the dataset, the year. Each fact row carries a foreign key to every dimension it can be sliced by. Drawn, the fact sits in the middle with its dimensions around it: a **star**.
- **The grain comes first.** The grain is what one fact row is, said in words before any column is chosen: "one sample record", "one country and one habitat class". Every column must be true at that grain; a table that mixes two grains (records and yearly totals in one table) counts things twice. Keep the finest grain you have: a coarser summary can always be built from it, never the reverse.
- **Measures** are the fact's numbers. **Additive** ones add up across every dimension (records, area in km²). **Semi-additive** ones add up across some (a yearly population count adds across countries, not across years). **Non-additive** ones never add up (ratios, averages, distinct counts): store their parts and compute them in the report. A record fact's measure is the row itself: each row counts one, `count(*)`.
- **Dimensions are wide and flat**: everything you'd filter or group by, as readable text, with a hierarchy's levels as columns side by side (class, order, family, genus). That repeats values on purpose, the denormalizing d2 named: safe here because the star is rebuilt from the normalized tables on every build and never edited.
- **Star or snowflake.** A **snowflake** normalizes the dimensions back into chains (species → genus → family → order → class, as `taxa` does). It stores each name once, but every report walks the chain and every reporting tool has to be taught it. A star needs one join per dimension. Snowflake a dimension only when it is huge or one level is shared by several dimensions.
- **Keys.** A dimension has a primary key; the fact's foreign keys point at it; the fact's own primary key is its grain (`record_id`; `species_id, country_code`). Warehouses usually give dimensions **surrogate keys**, integers the load makes up (d1), so that one species can have several versions (type 2, below) and a source system's codes can change underneath. This star uses critwire's ids, already surrogates, and natural keys an authority keeps stable (ISO country codes, GBIF dataset keys).
- **Unknown members.** A fact's foreign key is never NULL: an inner join drops the row, and a report tool shows a blank that no filter catches. Instead the dimension gets one row that means "unknown" (`ZZ`, year `-1`), and the load maps a missing value to it in exactly one place. Then the totals agree whichever dimension you slice by. When "unknown" and "doesn't apply" both occur, give each its own member.
- **Degenerate dimensions** are codes that stay on the fact as plain columns (basis of record, license) because there is nothing more to say about them. A **factless fact** has no measure at all; its rows are the facts (a species has open records in a country).
- **Conformed dimensions** are one dimension table shared by several facts, with the same keys and values. They let a report **drill across**: summarize each fact to the shared dimension's level, then join the summaries. Joining two facts row to row instead pairs every row of one with every matching row of the other (f3's fan-out), and every total is wrong.
- **Slowly changing dimensions.** A dimension's attributes change: a common name is corrected, a species moves to another genus. **Type 1** overwrites the value: history is restated, every past fact now reports under the new value; right for corrections. **Type 2** keeps history: the change adds a new row, a version with its own surrogate key, the years it is valid and a current flag, and each fact points at the version in force at its date. A report can then group "as it was" (by the fact's version) or "as it is" (by the current version). Type 0 never changes a value; type 3 keeps one "previous value" column. The choice is made per attribute.
- **Export.** A star travels well as files: one CSV per table plus a manifest (columns, keys, rows, sha256, credits), rows in primary-key order so the same data always gives the same bytes. That is what critwire publishes for Power BI (§4, p1), checked file by file (§A.3).

**Worked example:** What is one record fact's grain? The reports to support are records by species, place, source and time, so the grain is **one sample record**, one row of `occurrences`, and the dimensions are what a record can be sliced by: its species, country, dataset and year. The habitat stand-ins add a second fact at another grain, one country and one habitat class, that shares `dim_country`.

These blocks are `star.sql`, the one definition of the star: standard SQL with no schema names, so the same text runs in PostGIS (this lab, in `learn_curriculum`) and in DuckDB (critwire's build, which writes the CSV files Power BI reads). Each block creates one table, fills it from the lab tables and reports what it holds. Keys are declared in each `CREATE TABLE`, because DuckDB accepts foreign keys only there. The tests run each block in its own transaction, after the blocks its `-- after:` names, and roll it back; in psql, type `BEGIN;`, run them in order, and `ROLLBACK;` when you are done (or keep them until the next reload replaces `learn_curriculum`).

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

Now a report is one join per dimension it slices by. Records since 2000 by class and continent:

```sql
-- q: d6-report
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT sp.class, c.continent, count(*) AS records
FROM fact_records AS f
JOIN dim_species AS sp ON sp.species_id = f.species_id
JOIN dim_country AS c ON c.country_code = f.country_code
JOIN dim_year AS y ON y.year = f.year
WHERE y.decade >= 2000
GROUP BY sp.class, c.continent
ORDER BY sp.class, c.continent;
```

```text
-- result: d6-report · 18 rows · sha256 1b76ca3b5cff
class | continent | records
Amphibia | Africa | 103
Amphibia | Asia | 16
Amphibia | Europe | 2
Amphibia | North America | 343
Amphibia | South America | 411
… 13 more rows
```

The query never mentions genus, family or `taxa`: the dimension already holds the class. Every join is from the fact to one dimension by its key, which is the shape reporting tools expect (Power BI draws each as a one-to-many relationship, p2). `Seven seas (open ocean)` is Natural Earth's continent for island countries far from any continent, such as Mauritius and Réunion. Records with no year fall out here only because the `WHERE` asks for a decade; they still join, to year `-1`.

**Lab:**
1. Star or snowflake. The same count by class, once from the star and once by walking the normalized tables, `species` → genus → family → order → class in `taxa`:

```sql
-- q: d6-snowflake
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT star.class, star.records AS star_records, snowflake.records AS snowflake_records
FROM (
  SELECT sp.class, count(*) AS records
  FROM fact_records AS f
  JOIN dim_species AS sp ON sp.species_id = f.species_id
  GROUP BY sp.class
) AS star
JOIN (
  SELECT c.name AS class, count(*) AS records
  FROM occurrences AS o
  JOIN species AS s ON s.id = o.species_id
  JOIN taxa AS g ON g.name = s.genus
  JOIN taxa AS fam ON fam.name = g.parent_name
  JOIN taxa AS ord ON ord.name = fam.parent_name
  JOIN taxa AS c ON c.name = ord.parent_name
  GROUP BY c.name
) AS snowflake ON snowflake.class = star.class
ORDER BY star.class;
```

```text
-- result: d6-snowflake · 3 rows · sha256 3ba889abc98e
class | star_records | snowflake_records
Amphibia | 4776 | 4776
Mammalia | 31905 | 31905
Reptilia | 3714 | 3714
```

Same answer, one join against five. The snowflake stores each family's name once; the star repeats it on each of its species' rows, 76 rows in all, which costs nothing. The snowflake's real cost is that every report, and every person writing one, has to know the chain.

2. Conformed dimensions. Which dimensions does the record fact share with habitat area per country? Only `dim_country`: `fact_country_habitat` has a country and a habitat class, `fact_records` a species, country, dataset and year. So a report that shows both goes through the country. The habitat stand-ins cover two countries, Åland (`AX`) and Trinidad and Tobago (`TT`). First the wrong way, joining the facts to each other, then the right one:

```sql
-- q: d6-drill-across
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT 'facts joined to each other' AS way, f.country_code, count(*) AS records, sum(h.est_area_km2) AS habitat_km2
FROM fact_records AS f
JOIN fact_country_habitat AS h ON h.country_code = f.country_code
GROUP BY f.country_code
UNION ALL
SELECT 'each fact summed, then joined', c.country_code, coalesce(r.records, 0), h.habitat_km2
FROM dim_country AS c
JOIN (SELECT country_code, sum(est_area_km2) AS habitat_km2
      FROM fact_country_habitat GROUP BY country_code) AS h ON h.country_code = c.country_code
LEFT JOIN (SELECT country_code, count(*) AS records
           FROM fact_records GROUP BY country_code) AS r ON r.country_code = c.country_code
ORDER BY way, country_code;
```

```text
-- result: d6-drill-across · 3 rows · sha256 f094fefd46c9
way | country_code | records | habitat_km2
each fact summed, then joined | AX | 0 | 945.03
each fact summed, then joined | TT | 2 | 5117.23
facts joined to each other | TT | 44 | 10234.46
```

Trinidad and Tobago has 2 records and 22 habitat classes, so joining the facts gives 44 "records" and twice the habitat area, and Åland, with no records, vanishes. Summing each fact to the country first gives each number once. Reporting tools do this for you when both facts relate to the same dimension table and you never relate the facts to each other.

3. Where does a record with no country go? The sample has none (GBIF's geospatial filter removed them, §4), but a refresh can bring one: a record at sea has GBIF code `XZ` and no `country_code`. Add a made-up one, in Bass Strait between Victoria and Tasmania, with no year either:

```sql
-- q: d6-at-sea
-- status: ran
-- engine: postgis
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude,
                         coordinate_uncertainty_m, country_code_gbif, country_code, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, 146.5, -39.5, NULL, 'XZ', NULL, NULL, NULL
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
SELECT id, species_id, country_code_gbif, country_code, year FROM occurrences WHERE id = 1;
```

```text
-- result: d6-at-sea · 1 row · sha256 63fdf4312748
id | species_id | country_code_gbif | country_code | year
1 | 48 | XZ | NULL | NULL
```

Then build the star after it and count the records each way:

```sql
-- q: d6-unknown
-- status: ran
-- engine: postgis
-- after: d6-at-sea, d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT 1 AS step, 'occurrences' AS counted, count(*) AS records FROM occurrences
UNION ALL
SELECT 2, 'occurrences joined to countries', count(*)
FROM occurrences AS o JOIN countries AS c ON c.code = o.country_code
UNION ALL
SELECT 3, 'fact_records joined to dim_country', count(*)
FROM fact_records AS f JOIN dim_country AS c ON c.country_code = f.country_code
UNION ALL
SELECT 4, 'of them in ZZ', count(*) FROM fact_records WHERE country_code = 'ZZ'
UNION ALL
SELECT 5, 'of them in year -1', count(*) FROM fact_records WHERE year = -1
ORDER BY step;
```

```text
-- result: d6-unknown · 5 rows · sha256 bda14c66315b
step | counted | records
1 | occurrences | 40396
2 | occurrences joined to countries | 40395
3 | fact_records joined to dim_country | 40396
4 | of them in ZZ | 1
5 | of them in year -1 | 2290
```

The normalized tables lose the record as soon as a report joins countries; the star keeps it, under "Unknown or outside any country", and under year `-1` with the 2,289 records that have no year. The `coalesce` in `d6-star-fact-records` is the one place this happens, so no report has to remember a `LEFT JOIN`.

4. Type 1: overwrite. "Temminck's ground pangolin" is the name more lists use now. Correct it in the dimension and look at the records:

```sql
-- q: d6-scd1
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
UPDATE dim_species SET common_name = 'Temminck''s Ground Pangolin' WHERE species_id = 63;
SELECT sp.common_name, count(*) AS records, min(f.year) FILTER (WHERE f.year > 0) AS first_year
FROM fact_records AS f
JOIN dim_species AS sp ON sp.species_id = f.species_id
WHERE f.species_id = 63
GROUP BY sp.common_name;
```

```text
-- result: d6-scd1 · 1 row · sha256 bf8b1f306b36
common_name | records | first_year
Temminck's Ground Pangolin | 9 | 1930
```

All 9 records, back to 1930, now report under the new name, and nothing remembers the old one. For a correction that is what you want. In critwire's build the dimension is rebuilt from `species` each time, so the correction belongs in the source, and the star picks it up.

5. Type 2: keep history. Older lists, such as Mammal Species of the World (2005), put all eight pangolins in genus *Manis*; the African ground pangolins have been *Smutsia* in general use since a 2018 study of the pangolins' family tree (Gaubert et al., Journal of Heredity), and critwire uses *Smutsia*. To report records under the name in use when each was made, the dimension keeps both versions. In this lab, version 1 is valid to 2017 and version 2 from 2018 (by year, since a record's date here is its year); a record with no year gets the current version:

```sql
-- q: d6-scd2
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
CREATE TABLE dim_species_history (
  species_key     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id      INTEGER NOT NULL,
  scientific_name VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL,
  valid_from      INTEGER NOT NULL,
  valid_to        INTEGER NOT NULL,
  is_current      BOOLEAN NOT NULL,
  UNIQUE (species_id, valid_from)
);
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
SELECT species_id, scientific_name, genus, 0, 9999, true FROM dim_species;
UPDATE dim_species_history SET valid_from = 2018 WHERE species_id IN (55, 63);
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
VALUES (55, 'Manis gigantea', 'Manis', 0, 2017, false),
       (63, 'Manis temminckii', 'Manis', 0, 2017, false);
ALTER TABLE fact_records ADD COLUMN species_key INTEGER REFERENCES dim_species_history (species_key);
UPDATE fact_records AS f SET species_key = h.species_key
FROM dim_species_history AS h
WHERE h.species_id = f.species_id
  AND CASE WHEN f.year = -1 THEN h.is_current ELSE f.year BETWEEN h.valid_from AND h.valid_to END;
SELECT f.species_id, version.scientific_name AS filed_then, current_version.scientific_name AS name_now,
       count(*) AS records
FROM fact_records AS f
JOIN dim_species_history AS version ON version.species_key = f.species_key
JOIN dim_species_history AS current_version
  ON current_version.species_id = f.species_id AND current_version.is_current
WHERE f.species_id IN (55, 63)
GROUP BY f.species_id, version.scientific_name, current_version.scientific_name
ORDER BY f.species_id, filed_then;
```

```text
-- result: d6-scd2 · 4 rows · sha256 ffa4867a086c
species_id | filed_then | name_now | records
55 | Manis gigantea | Smutsia gigantea | 6
55 | Smutsia gigantea | Smutsia gigantea | 4
63 | Manis temminckii | Smutsia temminckii | 7
63 | Smutsia temminckii | Smutsia temminckii | 2
```

Grouped by the fact's `species_key`, 13 of the 19 pangolin records report as *Manis*, "as it was"; grouped through the current version, all 19 are *Smutsia*, "as it is". The fact holds the version key, set once when the record is loaded, so the lookup by date runs at load time, never in a report. Every version of a species keeps its `species_id`, so a report can still ask about the animal across versions. `ALTER TABLE … ADD COLUMN` and the `UPDATE` stand in for that load here; a real build sets `species_key` in the `INSERT`. Before you trust a type 2 dimension, check that versions don't overlap and leave no gaps, and that each species has exactly one current row; a partial unique index, `CREATE UNIQUE INDEX ON dim_species_history (species_id) WHERE is_current`, enforces the last.

6. Export. In DuckDB a table becomes a file with one `COPY`; it runs here in the browser, which has the same `countries` table:

```sql
-- q: d6-export
-- status: ran
COPY (
  SELECT code AS country_code, name, continent, region, subregion FROM countries ORDER BY code
) TO 'dim_country.csv' (FORMAT csv, HEADER);
SELECT count(*) AS rows, min(country_code) AS first_code, max(country_code) AS last_code
FROM read_csv('dim_country.csv', header = true, all_varchar = true);
```

```text
-- result: d6-export · 1 row · sha256 11b705c8d161
rows | first_code | last_code
250 | AD | ZW
```

critwire's build exports every star table this way, `COPY (SELECT * FROM <table> ORDER BY <primary key>) TO '<table>.csv' (FORMAT csv, HEADER)`, and writes `manifest.json` beside the files (§A.3). In PostgreSQL, psql's `\copy` does the same from your own computer, `\copy (SELECT * FROM dim_country ORDER BY country_code) TO 'dim_country.csv' WITH (FORMAT csv, HEADER)`; plain `COPY … TO 'file'` writes on the server and needs a server-file privilege. Read the files back with `all_varchar` (or explicit types) so a code like Namibia's `NA` stays text.

**Result:** The record fact's grain is one sample record: 40,395 rows, one per row of `occurrences`, sliced by species, country, dataset and year, each one join away. The star and the snowflake give the same counts by class (Amphibia 4,776, Mammalia 31,905, Reptilia 3,714); only the joins differ. The two facts share `dim_country`, so habitat area and records meet by country: joined to each other, Trinidad and Tobago's 2 records became 44. A record with no country goes to `ZZ` and one with no year to `-1`, so every total still adds up. Type 1 restated all 9 of Temminck's pangolin's records under the corrected name; type 2 kept 13 of the 19 pangolin records under *Manis* "as it was", while "as it is" shows all 19 under *Smutsia*.

**Exercise:** Big facts make slow dashboards, so warehouses add **aggregate facts**: a coarser grain, built from the fine one. In the browser (DuckDB), build `fact_species_decade` at the grain one species and one decade, with a measure `records`, and a dimension `dim_decade` (the decades that occur, labelled like `1990s`, plus an unknown member). Use `species` as the species dimension. Then prove it reconciles: its records must add up to the records in `occurrences`, and say how many are in the unknown decade.

**Answer:** The decade dimension follows `dim_year`'s rule, with `-1` for "no year"; the fact's primary key is its grain, and its foreign keys are never NULL.

```sql
-- q: d6-ex
-- status: ran
CREATE TABLE dim_decade (
  decade INTEGER PRIMARY KEY,
  label  VARCHAR NOT NULL
);
INSERT INTO dim_decade
SELECT DISTINCT year - year % 10, CAST(year - year % 10 AS VARCHAR) || 's'
FROM occurrences
WHERE year IS NOT NULL
UNION ALL
SELECT -1, 'Unknown';
CREATE TABLE fact_species_decade (
  species_id INTEGER NOT NULL REFERENCES species (id),
  decade     INTEGER NOT NULL REFERENCES dim_decade (decade),
  records    INTEGER NOT NULL,
  PRIMARY KEY (species_id, decade)
);
INSERT INTO fact_species_decade
SELECT species_id, coalesce(year - year % 10, -1), count(*)
FROM occurrences
GROUP BY species_id, coalesce(year - year % 10, -1);
SELECT count(*) AS fact_rows, sum(records) AS records,
       sum(records) = (SELECT count(*) FROM occurrences) AS reconciles,
       sum(records) FILTER (WHERE decade = -1) AS unknown_decade
FROM fact_species_decade;
```

```text
-- result: d6-ex · 1 row · sha256 cf25e6ca69ad
fact_rows | records | reconciles | unknown_decade
645 | 40395 | true | 2289
```

645 rows replace 40,395, and the measure is additive, so any report by species, decade or class (through `species`) gives the same totals from either table. What the aggregate can't answer is anything below its grain: a month, a country, a dataset, a basis of record. Keep the fine fact and build summaries from it.

**Check:** `fact_species_decade` has 645 rows, its records add up to 40,395 (`reconciles` is `true`), and 2,289 are in the unknown decade. If the total is short, a NULL year was grouped away or dropped by a join; if the `INSERT` fails on the primary key, two rows share a species and decade, so the `GROUP BY` and the key disagree about the grain.

**Dialects:**
- **PostgreSQL:** nothing star-specific: plain tables, foreign keys (which some warehouses drop on facts for load speed and check in the load instead), identity columns for surrogate keys, `MERGE` (15+) for type 2 loads, a partial unique index for "one current version", `\copy` for files on your computer.
- **DuckDB:** foreign keys only in `CREATE TABLE`, no identity columns (a `SEQUENCE` with `DEFAULT nextval(…)` instead), and `COPY … TO` writes CSV or Parquet directly; column storage makes wide dimensions and large facts quick to scan, which is why critwire's build runs the star there.
- **SQL Server:** `IDENTITY` surrogate keys, clustered columnstore indexes for large facts, `MERGE` for type 2 loads, and temporal tables (2016+) that keep a row's history automatically, by when it was changed rather than when it was true.

### 5.3 GIS in SQL

Seven modules, twelve and a half hours, all in your own PostGIS (§3.2), on the lab tables of §4. These are outlines: each gives the goal, the data, the key code with its tested result, and what a learner should find. Build mission L3 (§9) writes them in full, in §5.2's form, and adds g7's habitat clips. Every block runs in `learn_curriculum` after `pg-session` (§0), in a transaction the tests roll back. Shapes are stored in longitude and latitude (SRID 4326); the modules measure in metres, which is g1's subject. The skills are the ones ArcGIS Pro's geoprocessing tools hide behind a dialog (Project, Repair Geometry, Spatial Join, Near, Generate Tessellation, Extract by Mask); here they are SQL, so they run inside a pipeline (§5.5) and their steps can be read.

#### g1 · crs

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** f3

**Goal:** know what an SRID says and which one to measure in. A geometry's coordinates mean nothing without its spatial reference system: SRID 4326 is longitude and latitude in degrees on the WGS 84 ellipsoid; 3857 (Web Mercator) is the flat map most web maps draw; 3577 (Australian Albers) is an equal-area projection for Australia. `ST_Transform` moves a geometry from one to another; `geography` measures on the ellipsoid itself, in metres, with no projection. Web Mercator keeps shapes in a small area but stretches every length by 1 ÷ cos(latitude), so every area by 1 ÷ cos²(latitude) (003 §4, spatial lesson 5).

**Data:** `admin1_shapes` (Australia's states and territories, Natural Earth 1:50m); two points typed in.

**Key code:** each Australian state's area three ways, beside the stretch Web Mercator gives it and the 1 ÷ cos² of its centroid's latitude:

```sql
-- q: g1-area
-- status: ran
-- engine: postgis
SELECT name,
       round(ST_Y(ST_Centroid(geom))::numeric, 1) AS lat,
       round((ST_Area(geom::geography) / 1e6)::numeric) AS geography_km2,
       round((ST_Area(ST_Transform(geom, 3577)) / 1e6)::numeric) AS albers_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / 1e6)::numeric) AS mercator_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / ST_Area(geom::geography))::numeric, 2) AS stretch,
       round((1 / cos(radians(ST_Y(ST_Centroid(geom)))) ^ 2)::numeric, 2) AS one_over_cos2
FROM admin1_shapes
WHERE country_code = 'AU'
ORDER BY ST_Y(ST_Centroid(geom)), name;
```

```text
-- result: g1-area · 9 rows · sha256 0d3150fc692e
name | lat | geography_km2 | albers_km2 | mercator_km2 | stretch | one_over_cos2
Tasmania | -41.9 | 67697 | 67696 | 122485 | 1.81 | 1.81
Victoria | -36.9 | 227926 | 227940 | 356935 | 1.57 | 1.56
Australian Capital Territory | -35.5 | 2308 | 2308 | 3491 | 1.51 | 1.51
Jervis Bay Territory | -35.2 | 38 | 38 | 57 | 1.50 | 1.50
New South Wales | -32.2 | 798508 | 798822 | 1124405 | 1.41 | 1.40
… 4 more rows
```

A distance in each system: Hobart to Launceston. In SRID 4326, `ST_Distance` returns degrees, which are not a length (a degree of longitude shrinks towards the poles).

```sql
-- q: g1-distance
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom),
launceston AS (SELECT ST_SetSRID(ST_Point(147.14, -41.44), 4326) AS geom)
SELECT round(ST_Distance(h.geom, l.geom)::numeric, 4) AS degrees,
       round((ST_Distance(h.geom::geography, l.geom::geography) / 1000)::numeric, 2) AS geography_km,
       round((ST_Distance(ST_Transform(h.geom, 3577), ST_Transform(l.geom, 3577)) / 1000)::numeric, 2) AS albers_km,
       round((ST_Distance(ST_Transform(h.geom, 3857), ST_Transform(l.geom, 3857)) / 1000)::numeric, 2) AS mercator_km
FROM hobart AS h, launceston AS l;
```

```text
-- result: g1-distance · 1 row · sha256 49e8f70e0b8d
degrees | geography_km | albers_km | mercator_km
1.4525 | 160.72 | 156.57 | 217.30
```

**Expected:** the geography and Albers areas agree to within 0.1 % for every state (Tasmania 67,697 and 67,696 km²); Web Mercator overstates each by 1.13 (Northern Territory) to 1.81 times, the stretch growing southward and matching 1 ÷ cos² of the centroid's latitude to 0.01 (Tasmania 1.81). Hobart to Launceston is 1.4525 "degrees", 160.72 km on the ellipsoid, 156.57 km in Albers (a projection keeps areas, not distances) and 217.30 km in Web Mercator.

#### g2 · load-validate

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** g1

**Goal:** know how shapes travel and when they are broken. WKT is the readable text form (`POINT(1 2)`), WKB the binary one that files and databases exchange; the lab file carries every shape as WKB, and the loader turns it into `geometry` (§4.3). A polygon is valid when its rings don't cross themselves or each other, holes lie inside their shell, and shells don't nest. An invalid polygon still loads, and most functions return an answer for it, but the answer can be wrong: a bow-tie's two halves cancel, so its area is 0. `ST_IsValidDetail` says why a shape is invalid and where; `ST_MakeValid` repairs it, sometimes into a different type. The loader keeps invalid shapes on purpose (§4.3), so this module finds them.

**Data:** a bow-tie typed in; `country_shapes`, `admin1_shapes` and `ecoregions` (RESOLVE, simplified to 0.05°, §4.1).

**Key code:** one point in WKT, in WKB as hex, and in EWKT, PostGIS's WKT with the SRID in front:

```sql
-- q: g2-wkb
-- status: ran
-- engine: postgis
SELECT ST_AsText(p) AS wkt, encode(ST_AsBinary(p), 'hex') AS wkb_hex, ST_AsEWKT(p) AS ewkt,
       ST_Equals(ST_GeomFromWKB(ST_AsBinary(p), 4326), p) AS round_trip
FROM (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS p) AS one;
```

```text
-- result: g2-wkb · 1 row · sha256 ed472fca4e6e
wkt | wkb_hex | ewkt | round_trip
POINT(147.33 -42.88) | 0101000000c3f5285c8f6a6240713d0ad7a37045c0 | SRID=4326;POINT(147.33 -42.88) | true
```

A bow-tie: one ring that crosses itself. Its area is 0, and `ST_MakeValid` returns its two triangles:

```sql
-- q: g2-bowtie
-- status: ran
-- engine: postgis
SELECT (ST_IsValidDetail(geom)).valid, (ST_IsValidDetail(geom)).reason,
       ST_AsText((ST_IsValidDetail(geom)).location) AS at,
       ST_Area(geom) AS area,
       ST_AsText(ST_MakeValid(geom)) AS made_valid,
       ST_Area(ST_MakeValid(geom)) AS valid_area
FROM (SELECT ST_GeomFromText('POLYGON((0 0, 2 2, 2 0, 0 2, 0 0))') AS geom) AS shape;
```

```text
-- result: g2-bowtie · 1 row · sha256 b08f9bdf9a6d
valid | reason | at | area | made_valid | valid_area
false | Self-intersection | POINT(1 1) | 0 | MULTIPOLYGON(((0 2,1 1,0 0,0 2)),((2 0,1 1,2 2,2 0))) | 2
```

The lab's invalid shapes, why, and what `ST_MakeValid` changes:

```sql
-- q: g2-invalid
-- status: ran
-- engine: postgis
WITH shapes AS (
  SELECT 'country_shapes' AS table_name, country_code AS key, geom FROM country_shapes
  UNION ALL SELECT 'admin1_shapes', adm1_code, geom FROM admin1_shapes
  UNION ALL SELECT 'ecoregions', eco_id::text, geom FROM ecoregions
), checked AS (
  SELECT table_name, key, geom, ST_IsValidDetail(geom) AS d FROM shapes
)
SELECT table_name, key, (d).reason,
       ST_NumGeometries(geom) AS parts, ST_NumGeometries(ST_MakeValid(geom)) AS parts_after,
       GeometryType(ST_MakeValid(geom)) AS type_after,
       round(((ST_Area(ST_MakeValid(geom)::geography) - ST_Area(geom::geography)) / 1e6)::numeric, 1) AS km2_change
FROM checked
WHERE NOT (d).valid
ORDER BY table_name, key;
```

```text
-- result: g2-invalid · 11 rows · sha256 5b7784549a38
table_name | key | reason | parts | parts_after | type_after | km2_change
admin1_shapes | BRA-1294 | Ring Self-intersection | 1 | 1 | MULTIPOLYGON | 0.0
ecoregions | 112 | Nested shells | 1846 | 1845 | MULTIPOLYGON | 0.0
ecoregions | 114 | Nested shells | 13 | 12 | MULTIPOLYGON | -0.4
ecoregions | 309 | Ring Self-intersection | 27 | 27 | MULTIPOLYGON | 0.0
ecoregions | 320 | Nested shells | 2968 | 2966 | MULTIPOLYGON | 0.0
… 6 more rows
```

**Expected:** the point's WKB is 21 bytes: byte order, type 1 (point), then two 8-byte numbers; EWKT adds `SRID=4326;`, and the round trip is equal. The bow-tie is invalid ("Self-intersection" at `POINT(1 1)`), its area is 0, and `ST_MakeValid` returns two triangles of area 2. In the lab, all 247 country outlines are valid; 11 shapes aren't: one admin-1 area (Goiás, `BRA-1294`, a ring crossing itself) and 10 RESOLVE ecoregions, 7 with a ring crossing itself and 3 with nested shells, which simplification left behind. `ST_MakeValid` keeps every one a MultiPolygon, merges a few parts (ecoregion 811 goes from 481 to 477), and changes no area by more than 0.4 km². A learner's next step is ArcGIS Pro's Check and Repair Geometry, compared.

#### g3 · spatial-join

**Tool:** PG · **Time:** 2.0 h · **Prereqs:** g2

**Goal:** join tables by where things are, and check one source against another. `ST_Contains(a, b)` is true when b is inside a and not only on its edge; `ST_Covers(a, b)` also counts the edge; `ST_Intersects` is true when they share any point. A join on one of them is a spatial join (ArcGIS Pro's Spatial Join tool). Every GBIF record carries a country code, from its publisher or worked out by GBIF; joining the records to the outlines checks one against the other (003 §4, spatial lesson 4, run here on the whole sample at 1:50m). Neither side is the truth: the outline is a simplified map, the code a claim.

**Data:** `occurrences` (`geom`, `country_code_gbif`), `country_shapes`.

**Key code:** the three predicates on a point inside, on the edge of and outside a square:

```sql
-- q: g3-boundary
-- status: ran
-- engine: postgis
WITH square AS (SELECT ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))', 4326) AS geom),
points (place, geom) AS (
  VALUES ('inside', ST_SetSRID(ST_Point(0.5, 0.5), 4326)),
         ('on the edge', ST_SetSRID(ST_Point(1, 0.5), 4326)),
         ('outside', ST_SetSRID(ST_Point(2, 0.5), 4326))
)
SELECT p.place, ST_Contains(s.geom, p.geom) AS contains, ST_Covers(s.geom, p.geom) AS covers,
       ST_Intersects(s.geom, p.geom) AS intersects
FROM square AS s, points AS p
ORDER BY p.place;
```

```text
-- result: g3-boundary · 3 rows · sha256 d10ead98357a
place | contains | covers | intersects
inside | true | true | true
on the edge | false | true | true
outside | false | false | false
```

Each record agrees (an outline it falls in is GBIF's country), disagrees, or falls in no outline. The join starts from the outlines, so PostGIS prepares each outline once and tests the records its index finds; started from the records (`occurrences LEFT JOIN country_shapes`), it tests each record against an outline prepared afresh, about 25 times slower on this sample (7 s against 0.3 s on the test server; compare the two with `EXPLAIN ANALYZE`, as in d3). The `LEFT JOIN` comes after, on the per-record summary:

```sql
-- q: g3-agree
-- status: ran
-- engine: postgis
WITH hits AS (
  SELECT o.id, count(*) AS outlines, bool_or(c.country_code = o.country_code_gbif) AS agrees
  FROM country_shapes AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
  GROUP BY o.id
)
SELECT CASE WHEN h.id IS NULL THEN 'no outline' WHEN h.agrees THEN 'agree' ELSE 'disagree' END AS outcome,
       count(*) AS records,
       count(*) FILTER (WHERE h.outlines > 1) AS in_two_outlines
FROM occurrences AS o
LEFT JOIN hits AS h ON h.id = o.id
GROUP BY 1
ORDER BY 1;
```

```text
-- result: g3-agree · 3 rows · sha256 a48ca6bc5bd6
outcome | records | in_two_outlines
agree | 39190 | 932
disagree | 206 | 1
no outline | 999 | 0
```

Where they disagree, GBIF's code against the outline's:

```sql
-- q: g3-disagree
-- status: ran
-- engine: postgis
WITH hits AS (
  SELECT o.id, o.country_code_gbif AS gbif_code,
         string_agg(c.country_code, '+' ORDER BY c.country_code) AS outline_code,
         bool_or(c.country_code = o.country_code_gbif) AS agrees
  FROM country_shapes AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
  GROUP BY o.id, o.country_code_gbif
)
SELECT gbif_code, outline_code, count(*) AS records
FROM hits
WHERE NOT agrees
GROUP BY gbif_code, outline_code
ORDER BY records DESC, gbif_code, outline_code
LIMIT 10;
```

```text
-- result: g3-disagree · 10 rows · sha256 ba081d2e5cbb
gbif_code | outline_code | records
US | MX | 78
BJ | BF | 28
GF | BR | 18
EC | PE | 15
GF | SR | 12
… 5 more rows
```

And the records inside two outlines at once:

```sql
-- q: g3-two-outlines
-- status: ran
-- engine: postgis
WITH hits AS (
  SELECT o.id, o.country_code_gbif AS gbif_code, string_agg(c.country_code, '+' ORDER BY c.country_code) AS outlines
  FROM country_shapes AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
  GROUP BY o.id, o.country_code_gbif
  HAVING count(*) > 1
)
SELECT outlines, gbif_code, count(*) AS records
FROM hits
GROUP BY outlines, gbif_code
ORDER BY records DESC, outlines, gbif_code;
```

```text
-- result: g3-two-outlines · 4 rows · sha256 f16f1fc4d7c9
outlines | gbif_code | records
FR+GF | GF | 923
FR+RE | RE | 6
FR+MQ | MQ | 3
FR+GF | SR | 1
```

**Optional appendix: records against a range you downloaded yourself** (003 §6). IUCN's range maps may be downloaded with a free account for your own non-commercial use, and nothing made from them may be shared; critwire never holds them (003 §6), so this block is never run here. Load your shapefile into a schema of your own, which the lab loader never touches (`CREATE SCHEMA my_iucn`, then QGIS, `ogr2ogr` or `shp2pgsql` into `my_iucn.ranges`, one multipolygon per taxon, the SIS taxon id in `iucn_id`). The key is that id, which critwire publishes as `species.iucn_id`, never a name: IUCN renamed its name column in 2023 (003 §6). Records outside a range aren't errors by themselves: captive animals, misidentifications and incomplete ranges all put them there.

```sql
-- q: g3-iucn
-- status: untested: reads your own IUCN download, which critwire never holds
-- engine: postgis
SELECT s.common_name, count(*) AS records,
       count(*) FILTER (WHERE ST_Covers(r.geom, o.geom)) AS inside_range
FROM my_iucn.ranges AS r
JOIN species AS s ON s.iucn_id = r.iucn_id
JOIN occurrences AS o ON o.species_id = s.id
GROUP BY s.common_name
ORDER BY s.common_name;
```

**Expected:** on the square, only `ST_Covers` and `ST_Intersects` count the point on the edge. Of the sample's 40,395 records, 39,190 agree, 206 disagree and 999 are in no outline; no record lacks a GBIF code. The disagreements are border pairs (78 records coded US inside Mexico's outline, 28 coded Benin inside Burkina Faso's, 18 coded French Guiana inside Brazil's, 15 Ecuador in Peru's, 12 French Guiana in Suriname's): a record a few kilometres over a border, or a publisher's country that isn't where the point is. 933 records sit in two outlines at once (932 that agree, 1 that doesn't), every one inside France's and an overseas region's (French Guiana 924, Réunion 6, Martinique 3): Natural Earth's France includes its overseas regions, which also have outlines of their own, so a spatial join can count a record twice unless the outlines are a partition. g5 finds where the 999 are.

#### g4 · measure-overlay

**Tool:** PG · **Time:** 2.0 h · **Prereqs:** g3

**Goal:** measure lengths, areas and distances in metres, and cut one layer by another. `ST_Intersection` keeps the part two shapes share (ArcGIS Pro's Intersect), and the area of that part, on the ellipsoid, is an overlay's answer. `ST_DWithin(a, b, d)` asks "within d?" and, unlike `ST_Distance(a, b) < d`, can use an index (d3); on `geography`, d is in metres. Two maps drawn separately never fit exactly: their pieces add up to a little less or more than the whole, and an overlay should say by how much.

**Data:** `country_shapes`, `ecoregions` and `biomes` (RESOLVE 2017, CC BY 4.0), `occurrences`; Costa Rica.

**Key code:** how much of Costa Rica each ecoregion covers:

```sql
-- q: g4-ecoregions
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom, ST_Area(geom::geography) AS m2 FROM country_shapes WHERE country_code = 'CR')
SELECT e.eco_id, e.name, b.name AS biome,
       round((ST_Area(ST_Intersection(e.geom, cr.geom)::geography) / 1e6)::numeric) AS km2,
       round((100 * ST_Area(ST_Intersection(e.geom, cr.geom)::geography) / cr.m2)::numeric, 1) AS pct
FROM ecoregions AS e
JOIN cr ON ST_Intersects(e.geom, cr.geom)
LEFT JOIN biomes AS b ON b.biome_id = e.biome_id
ORDER BY km2 DESC, e.eco_id;
```

```text
-- result: g4-ecoregions · 7 rows · sha256 ed3884acd3d8
eco_id | name | biome | km2 | pct
470 | Isthmian-Atlantic moist forests | Tropical & Subtropical Moist Broadleaf Forests | 17288 | 33.7
471 | Isthmian-Pacific moist forests | Tropical & Subtropical Moist Broadleaf Forests | 9012 | 17.6
458 | Costa Rican seasonal moist forests | Tropical & Subtropical Moist Broadleaf Forests | 8400 | 16.4
506 | Talamancan montane forests | Tropical & Subtropical Moist Broadleaf Forests | 8311 | 16.2
527 | Central American dry forests | Tropical & Subtropical Dry Broadleaf Forests | 6062 | 11.8
… 2 more rows
```

Do the pieces add up to the country?

```sql
-- q: g4-gap
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR')
SELECT round((ST_Area(cr.geom::geography) / 1e6)::numeric) AS country_km2,
       round((sum(ST_Area(ST_Intersection(e.geom, cr.geom)::geography)) / 1e6)::numeric) AS ecoregion_pieces_km2,
       round((ST_Area(ST_Difference(cr.geom, ST_Union(e.geom))::geography) / 1e6)::numeric) AS in_no_ecoregion_km2
FROM cr
JOIN ecoregions AS e ON ST_Intersects(e.geom, cr.geom)
GROUP BY cr.geom;
```

```text
-- result: g4-gap · 1 row · sha256 5811a1ff6de4
country_km2 | ecoregion_pieces_km2 | in_no_ecoregion_km2
51303 | 49908 | 2070
```

Costa Rica's land borders, their length, and the records within 10 km of each, by the code GBIF gave them:

```sql
-- q: g4-border
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR'),
border AS (
  SELECT n.country_code AS neighbour,
         ST_LineMerge(ST_CollectionExtract(ST_Intersection(ST_Boundary(cr.geom), ST_Boundary(n.geom)), 2)) AS geom
  FROM cr
  JOIN country_shapes AS n ON n.country_code <> 'CR' AND ST_Touches(n.geom, cr.geom)
)
SELECT b.neighbour,
       round((ST_Length(b.geom::geography) / 1000)::numeric) AS border_km,
       count(o.id) AS records_within_10km,
       count(o.id) FILTER (WHERE o.country_code_gbif = 'CR') AS coded_cr,
       count(o.id) FILTER (WHERE o.country_code_gbif = b.neighbour) AS coded_neighbour
FROM border AS b
LEFT JOIN occurrences AS o
  ON o.country_code_gbif IN ('CR', b.neighbour) AND ST_DWithin(o.geom::geography, b.geom::geography, 10000)
GROUP BY b.neighbour, b.geom
ORDER BY b.neighbour;
```

```text
-- result: g4-border · 2 rows · sha256 539a1bf4a653
neighbour | border_km | records_within_10km | coded_cr | coded_neighbour
NI | 267 | 5 | 1 | 4
PA | 250 | 9 | 6 | 3
```

**Expected:** seven ecoregions cover Costa Rica, led by the Isthmian-Atlantic moist forests (17,288 km², 33.7 %); five are moist or dry broadleaf forest and two are mangroves. The pieces add to 49,908 km² of the outline's 51,303, though 2,070 km² lie in no ecoregion: the two layers, simplified separately, leave gaps along the coast and overlap by about 675 km² (49,908 + 2,070 − 51,303), which is the size of the error any area from this overlay carries. The land borders are 267 km (Nicaragua) and 250 km (Panama); within 10 km of them, on either side, lie 5 and 9 records, 7 of them coded for the neighbour. So close to a line, the code and the outline can each be right or wrong: a 1:50m border is generalized and can be kilometres off, and g3's disagreements are mostly records like these.

#### g5 · spatial-index

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** g3, d3

**Goal:** know when the GiST index does the work and when it can't. d3 showed the index finding boxes (`&&`, `@`, `ST_DWithin`); this module adds nearest-neighbour search, where `ORDER BY geom <-> point LIMIT k` walks the index outward from the point and stops after k rows (ArcGIS Pro's Near, without a search radius). Two traps: on SRID 4326 `<->` orders by degrees, not metres, so near the poles it can rank wrongly (re-rank a few more candidates by `geography`); and a cast in the condition (`geom::geography`) hides the column from a `geometry` index, so the scan reads every row unless the index is built on the same expression.

**Data:** `occurrences`, `country_shapes`; a point in Hobart.

**Key code:** the five records nearest Hobart, with their true distance:

```sql
-- q: g5-nearest
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom)
SELECT o.id, s.common_name,
       round((ST_Distance(o.geom::geography, h.geom::geography) / 1000)::numeric, 2) AS km
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
CROSS JOIN hobart AS h
ORDER BY o.geom <-> h.geom, o.id
LIMIT 5;
```

```text
-- result: g5-nearest · 5 rows · sha256 80d98a44e701
id | common_name | km
6004135246 | Tasmanian Devil | 2.44
6004145372 | Tasmanian Devil | 4.40
1647204917 | Tasmanian Devil | 5.57
1647151244 | Tasmanian Devil | 7.08
1647151259 | Tasmanian Devil | 7.08
```

Its plan: an index scan ordered by distance, stopped by the `LIMIT`:

```sql
-- q: g5-knn-plan
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
ORDER BY o.geom <-> ST_SetSRID(ST_Point(147.33, -42.88), 4326)
LIMIT 5;
```

```text
-- result: g5-knn-plan · 3 rows · sha256 c1ec5c12ff81
QUERY PLAN
Limit (actual rows=5 loops=1)
  ->  Index Scan using occurrences_geom_idx on occurrences o…
        Order By: (geom <-> '0101000020E6100000C3F5285C8F6A6…
```

The records within 20 km of Hobart, measured on the ellipsoid. The cast hides `geom` from its index, so every row is read:

```sql
-- q: g5-cast-plan
-- status: ran
-- engine: postgis
-- after: d3-analyze
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
WHERE ST_DWithin(o.geom::geography, ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography, 20000);
```

```text
-- result: g5-cast-plan · 3 rows · sha256 05bf25e03416
QUERY PLAN
Seq Scan on occurrences o (actual rows=55 loops=1)
  Filter: st_dwithin((geom)::geography, '0101000020E6100000C…
  Rows Removed by Filter: 40340
```

An index on the expression itself fixes it (the transaction is rolled back, so the index goes too):

```sql
-- q: g5-geography-index
-- status: ran
-- engine: postgis
-- after: d3-analyze
CREATE INDEX occurrences_geography_idx ON occurrences USING gist ((geom::geography));
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
WHERE ST_DWithin(o.geom::geography, ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography, 20000);
```

```text
-- result: g5-geography-index · 6 rows · sha256 681f15e00739
QUERY PLAN
Bitmap Heap Scan on occurrences o (actual rows=55 loops=1)
  Filter: st_dwithin((geom)::geography, '0101000020E6100000C…
  Rows Removed by Filter: 11
  Heap Blocks: exact=18
  ->  Bitmap Index Scan on occurrences_geography_idx (actual…
… 1 more row
```

g3's records in no outline: how far is each from the nearest one? Nearest-neighbour search works on polygons too:

```sql
-- q: g5-coast
-- status: ran
-- engine: postgis
WITH inside AS (
  SELECT DISTINCT o.id FROM country_shapes AS c JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
), nearest AS (
  SELECT o.id, o.country_code_gbif, n.country_code,
         ST_Distance(o.geom::geography, n.geom::geography) / 1000 AS km
  FROM occurrences AS o
  CROSS JOIN LATERAL (SELECT c.country_code, c.geom FROM country_shapes AS c ORDER BY c.geom <-> o.geom LIMIT 1) AS n
  WHERE o.id NOT IN (SELECT id FROM inside)
)
SELECT CASE WHEN km < 1 THEN 'under 1 km' WHEN km < 5 THEN '1 to 5 km' WHEN km < 25 THEN '5 to 25 km' ELSE '25 km or more' END AS distance,
       count(*) AS records,
       count(*) FILTER (WHERE country_code = country_code_gbif) AS nearest_is_gbif_country,
       round(max(km)::numeric, 1) AS max_km
FROM nearest
GROUP BY 1
ORDER BY min(km);
```

```text
-- result: g5-coast · 4 rows · sha256 ef446e9ae320
distance | records | nearest_is_gbif_country | max_km
under 1 km | 236 | 226 | 1.0
1 to 5 km | 200 | 193 | 4.5
5 to 25 km | 529 | 529 | 24.8
25 km or more | 34 | 31 | 343.9
```

**Expected:** the nearest records to Hobart are Tasmanian devils, 2.44 to 7.08 km away (two at the same spot, so the tie goes to `o.id`). The nearest-neighbour plan is an `Index Scan … Order By` under `Limit`, reading 5 rows; the geography condition is a `Seq Scan` that removes 40,340 rows to keep 55; with the expression index, a `Bitmap Index Scan` finds 66 candidates and the exact test keeps the same 55. Of g3's 999 records in no outline, 436 lie within 5 km of one (beaches, mangroves, simplified coastlines), and in nearly all of them the nearest outline is GBIF's country; 529 lie 5 to 25 km out, mostly on islands too small for 1:50m (346 bilby records on one island off South Australia, 133 pig-nosed turtle records on the Gulf of Papua's delta); 34 are 25 km or more away (up to 343.9 km), worth reading one by one.

#### g6 · grids

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** g4

**Goal:** count points into areal units, and see how much the units decide. `ST_HexagonGrid(edge, bounds)` returns the hexagons of edge `edge` that cover `bounds`, in the bounds' units, so it is used in an equal-area projection (here 3577, metres) and every cell has the same area (ArcGIS Pro's Generate Tessellation). Hexagons are the usual choice: every neighbour shares an edge and sits at the same distance. The **modifiable areal unit problem** (MAUP) is that counts, and every statistic built on them, change with the cells' size (scale) and with where the grid starts (zoning). s4 uses exactly these grids (`s4-cells`), so the numbers here are the ones its Moran's I runs on.

**Data:** `occurrences` (the Tasmanian devil, *Sarcophilus harrisii*), `admin1_shapes` (Tasmania's main island).

**Key code:** the devil's records in 5 km and 10 km hexagons, and in the 10 km grid moved half an edge east and north. `ST_HexagonGrid` always starts its grid at the projection's origin, so the moved grid is drawn over the island moved back, then moved forward:

```sql
-- q: g6-maup
-- status: ran
-- engine: postgis
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
), grids (edge_m, shift_m) AS (
  VALUES (5000, 0), (10000, 0), (10000, 5000)
), cells AS (
  SELECT g.edge_m, g.shift_m, h.i, h.j, ST_Translate(h.geom, g.shift_m, g.shift_m) AS geom
  FROM island, grids AS g, ST_HexagonGrid(g.edge_m, ST_Translate(island.geom, -g.shift_m, -g.shift_m)) AS h
  WHERE ST_Intersects(ST_Translate(h.geom, g.shift_m, g.shift_m), island.geom)
), counts AS (
  SELECT c.edge_m, c.shift_m, c.i, c.j, count(d.geom) AS n
  FROM cells AS c LEFT JOIN devils AS d ON ST_Contains(c.geom, d.geom)
  GROUP BY c.edge_m, c.shift_m, c.i, c.j
)
SELECT edge_m, shift_m, count(*) AS cells, count(*) FILTER (WHERE n > 0) AS occupied,
       sum(n) AS records, max(n) AS max_n,
       round(100.0 * count(*) FILTER (WHERE n > 0) / count(*), 1) AS pct_occupied,
       round(100.0 * max(n) / sum(n), 1) AS top_cell_pct
FROM counts
GROUP BY edge_m, shift_m
ORDER BY edge_m, shift_m;
```

```text
-- result: g6-maup · 3 rows · sha256 4d11b1459ccb
edge_m | shift_m | cells | occupied | records | max_n | pct_occupied | top_cell_pct
5000 | 0 | 1094 | 307 | 1972 | 256 | 28.1 | 13.0
10000 | 0 | 296 | 178 | 1990 | 475 | 60.1 | 23.9
10000 | 5000 | 300 | 182 | 1976 | 310 | 60.7 | 15.7
```

**Expected:** the same 1,972 to 1,990 devil records give three pictures. At 5 km, 307 of 1,094 cells (28.1 %) hold a record and the fullest holds 256 (13.0 % of all records); at 10 km, 178 of 296 (60.1 %) and the fullest 475 (23.9 %); moving the 10 km grid by half an edge keeps the occupancy (60.7 %) but drops the fullest cell to 310 (15.7 %), because one cluster of records is now split across cells. The records in no cell (10 to 28) lie off the main island or near its coast. The 5 km and 10 km rows equal `s4-cells`.

#### g7 · raster

**Tool:** PG · **Time:** 2.5 h · **Prereqs:** g6

**Goal:** read a raster: the value under a point (`ST_Value`), the cells inside a polygon (`ST_Clip`, which keeps a cell when its centre is inside), and their counts by value (`ST_ValueCount`); then turn counts of cells into an **estimated** area. The habitat map (Jung et al. 2020, v004, CC BY 4.0; 003 §5) gives each cell of about 100 m a class of the IUCN habitat classification scheme, written as a number (`106` is class 1.6, "Forest – Subtropical/tropical moist lowland"). Its grid is Web Mercator, so a cell 103.02 m wide on the map is 103.02 × cos(latitude) m on the ground (g1): a count of cells is not an area until each cell is corrected (003 §4, spatial lessons 5–7). The result is still an estimate from a classified map, never a measurement.

**Data:** `habitat_clips` (clips of the map for Costa Rica, `cr`, and Tasmania, `tas`, stored in the database), `habitat_classes`, `country_shapes`, `occurrences`. L3 adds the clips (§4.1, §9), so until then these blocks can't run. The clips are stored in the database, not read from a file, so no raster setting is needed: 003's `pg-once` grants were for reading the whole map out-db, which the labs don't do.

**Key code:** the class under each of Costa Rica's records:

```sql
-- q: g7-records
-- status: untested: L3 builds the clips
-- engine: postgis
-- needs: raster
SELECT v.habitat_code, c.name, count(*) AS records
FROM occurrences AS o
JOIN habitat_clips AS h ON h.clip = 'cr'
CROSS JOIN LATERAL (SELECT ST_Value(h.rast, 1, ST_Transform(o.geom, ST_SRID(h.rast))) AS habitat_code) AS v
LEFT JOIN habitat_classes AS c ON c.code = v.habitat_code
WHERE o.country_code = 'CR'
GROUP BY v.habitat_code, c.name
ORDER BY records DESC, v.habitat_code NULLS LAST;
```

The cells inside Costa Rica's outline, by class, as `ST_ValueCount` gives them:

```sql
-- q: g7-valuecount
-- status: untested: L3 builds the clips
-- engine: postgis
-- needs: raster
SELECT vc.value AS habitat_code, vc.count AS cells
FROM habitat_clips AS h
JOIN country_shapes AS cs ON cs.country_code = 'CR'
CROSS JOIN LATERAL ST_ValueCount(ST_Clip(h.rast, ST_Transform(cs.geom, ST_SRID(h.rast))), 1) AS vc
WHERE h.clip = 'cr'
ORDER BY cells DESC, habitat_code;
```

The same cells as areas: on the map, and corrected cell by cell for the latitude of its row (a Web Mercator y gives latitude 2·atan(e^(y ÷ R)) − π ÷ 2, R = 6,378,137 m), beside L3's published country summary:

```sql
-- q: g7-estimate
-- status: untested: L3 builds the clips
-- engine: postgis
-- needs: raster
WITH cells AS (
  SELECT p.val AS habitat_code, 2 * atan(exp(ST_Y(p.geom) / 6378137)) - pi() / 2 AS lat
  FROM habitat_clips AS h
  JOIN country_shapes AS cs ON cs.country_code = 'CR'
  CROSS JOIN LATERAL ST_PixelAsCentroids(ST_Clip(h.rast, ST_Transform(cs.geom, ST_SRID(h.rast))), 1) AS p
  WHERE h.clip = 'cr'
)
SELECT c.habitat_code, count(*) AS cells,
       round((count(*) * 103.02166779498629 ^ 2 / 1e6)::numeric, 1) AS map_km2,
       round((sum((103.02166779498629 * cos(c.lat)) ^ 2) / 1e6)::numeric, 1) AS est_km2,
       ch.est_area_km2 AS published_km2
FROM cells AS c
LEFT JOIN country_habitats AS ch ON ch.country_code = 'CR' AND ch.habitat_code = c.habitat_code
GROUP BY c.habitat_code, ch.est_area_km2
ORDER BY cells DESC, c.habitat_code;
```

**Expected:** a class (or `NULL`, off the clip or on a nodata cell) for each of Costa Rica's 619 records; `ST_ValueCount`'s cells and `g7-estimate`'s cells agree class by class (both count the cells whose centres fall inside the outline); at about 10° N each corrected area is about 3 % smaller than its map area (cos² 10° ≈ 0.97); and the corrected areas agree with L3's published summary within the error 003 §5 measured for its method. L3 records the real numbers when it builds the clips and writes g7 in full; s6 then compares the records' classes with the classes' areas.

### 5.4 Spatial statistics

Six modules, twelve and a half hours, in your own PostGIS (§3.2) and the Python environment (§3.3), on the lab tables of §4. These are outlines, in §5.3's form; build mission L4 (§9) writes them in full. The track asks one question several ways: are the Tasmanian devil's records clustered, and where? The answer is always about **records**, not animals. A record is where someone looked, found the animal and published what they found, so every pattern below mixes where the animal is with where people recorded: roads, towns, research projects, GPS collars. s1 measures that mix first, and every later module says which part its numbers can speak to. The units for s2–s5 are the equal-area hexagons over Tasmania's main island that g6 drew; `s4-cells` builds them once when a PostGIS run starts (table `s4_cells`, view `s4_neighbours`), so every module reads the same cells. The weights, Moran's I, Gi\* and the zonal counts are computed twice, in SQL and in Python (PySAL, GeoPandas), and agree. Each method has an ArcGIS Pro tool (§3.4): Average Nearest Neighbor, Density-based Clustering, Kernel Density, Generate Spatial Weights Matrix, Spatial Autocorrelation, Hot Spot Analysis, Cluster and Outlier Analysis, Zonal Statistics as Table.

#### s1 · bias

**Tool:** PG + B · **Time:** 1.5 h · **Prereqs:** g3

**Goal:** before any statistic, know what the records are. GBIF records come from datasets of very different kinds: a museum's specimens, a national atlas, a citizen-science app, camera traps, one research team's GPS collars. Each kind records a different thing: a collar logs one animal every few hours wherever it walks; an atlas logs where people looked. `basis_of_record` says what kind of evidence a record is, the dataset says who collected it, and together they tell how much a map of records shows the animal and how much it shows the people. The honest wording follows from that: "records of jaguars", "where devils were recorded", never "where jaguars live" or "the devil's range" (critwire's countries field says the same, `AGENTS.md`).

**Data:** `occurrences`, `datasets`, `species`; the browser blocks run on the same sample in DuckDB (§3.1).

**Key code:** the sample by basis of record, in the browser:

```sql
-- q: s1-basis
-- status: ran
SELECT basis_of_record,
       count(*) AS records,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
       count(DISTINCT species_id) AS species
FROM occurrences
GROUP BY basis_of_record
ORDER BY records DESC, basis_of_record;
```

```text
-- result: s1-basis · 7 rows · sha256 f870388664cc
basis_of_record | records | pct | species
HUMAN_OBSERVATION | 17587 | 43.5 | 55
PRESERVED_SPECIMEN | 10568 | 26.2 | 67
MACHINE_OBSERVATION | 8418 | 20.8 | 22
MATERIAL_SAMPLE | 1805 | 4.5 | 47
OBSERVATION | 1384 | 3.4 | 5
… 2 more rows
```

How much of each species' records one dataset holds, for the species with at least 100 records, in the browser:

```sql
-- q: s1-dominance
-- status: ran
WITH per_dataset AS (
  SELECT species_id, dataset_key, count(*) AS n
  FROM occurrences
  GROUP BY species_id, dataset_key
)
SELECT s.common_name,
       sum(p.n) AS records,
       count(*) AS datasets,
       max(p.n) AS top_dataset,
       round(100.0 * max(p.n) / sum(p.n), 1) AS top_pct
FROM per_dataset AS p
JOIN species AS s ON s.id = p.species_id
GROUP BY s.id, s.common_name
HAVING sum(p.n) >= 100
ORDER BY top_pct DESC, records DESC, s.id;
```

```text
-- result: s1-dominance · 38 rows · sha256 f0a5d35580a8
common_name | records | datasets | top_dataset | top_pct
Livingstone's Flying Fox | 109 | 1 | 109 | 100
Golden-rumped Sengi | 1613 | 11 | 1583 | 98.1
Jaguar | 2000 | 25 | 1948 | 97.4
Dama Gazelle | 403 | 9 | 390 | 96.8
Golden Poison Frog | 299 | 5 | 287 | 96
… 33 more rows
```

The jaguar's records: GPS collars against everything else, with the places and years each covers:

```sql
-- q: s1-jaguar
-- status: ran
-- engine: postgis
SELECT CASE WHEN o.basis_of_record = 'MACHINE_OBSERVATION' AND d.title ILIKE '%GPS%'
            THEN 'GPS collars' ELSE 'everything else' END AS source,
       count(DISTINCT o.dataset_key) AS datasets,
       count(*) AS records,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
       count(DISTINCT o.country_code) AS countries,
       count(DISTINCT (o.longitude, o.latitude)) AS locations,
       min(o.year) AS first_year,
       max(o.year) AS last_year
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name = 'Panthera onca'
GROUP BY 1
ORDER BY records DESC;
```

```text
-- result: s1-jaguar · 2 rows · sha256 c6055b9de80b
source | datasets | records | pct | countries | locations | first_year | last_year
GPS collars | 1 | 1948 | 97.4 | 5 | 1948 | 2001 | 2016
everything else | 24 | 52 | 2.6 | 8 | 47 | 1949 | 2025
```

The devil's records, which s2–s5 analyse, by dataset and basis of record:

```sql
-- q: s1-devil
-- status: ran
-- engine: postgis
SELECT d.title, o.basis_of_record,
       count(*) AS records,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
       min(o.year) AS first_year,
       max(o.year) AS last_year
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY d.title, o.basis_of_record
ORDER BY records DESC, d.title, o.basis_of_record;
```

```text
-- result: s1-devil · 12 rows · sha256 889e2a2404f5
title | basis_of_record | records | pct | first_year | last_year
Tasmanian Natural Values Atlas | OBSERVATION | 1367 | 68.4 | 1599 | 2012
Tasmanian Museum and Art Gallery provider for OZCAM | MATERIAL_SAMPLE | 558 | 27.9 | 2000 | 2023
Tasmanian Natural Values Atlas | OCCURRENCE | 46 | 2.3 | 2005 | 2010
Tasmanian Museum and Art Gallery provider for OZCAM | PRESERVED_SPECIMEN | 10 | 0.5 | NULL | NULL
Museums Victoria provider for OZCAM | PRESERVED_SPECIMEN | 5 | 0.3 | NULL | NULL
… 7 more rows
```

**Expected:** human observations are 43.5 % of the 40,395 records, preserved specimens 26.2 % and machine observations (camera traps, collars, sound recorders) 20.8 %, from only 22 species. Of the 38 species with at least 100 records, 17 have more than half from one dataset and 6 have 90 % or more: Livingstone's flying fox's 109 come from a single dataset, the golden-rumped sengi's 98.1 % from one biodiversity survey, the jaguar's 97.4 %. That jaguar dataset is GPS collars: 1,948 records at 1,948 different points in 5 countries between 2001 and 2016, against 52 records from 24 other datasets (8 countries, 1949 to 2025). Any map of the jaguar's records is mostly a map of a few collared animals' paths. The devil's 2,000 records are 70.7 % the Tasmanian Natural Values Atlas (1,367 `OBSERVATION` and 46 `OCCURRENCE`) and 27.9 % material samples (such as tissue) at the Tasmanian Museum and Art Gallery (558 `MATERIAL_SAMPLE`, 2000 to 2023); the other 9 rows are museum specimens and one observation. The atlas's first year, 1599, predates the first European sighting of Tasmania (1642): a date to check before trusting a time series (e4). So s2–s5 measure where the atlas and the museum's field teams recorded devils, and say so.

#### s2 · point-patterns

**Tool:** PG + Py · **Time:** 2.5 h · **Prereqs:** s1, g6

**Goal:** measure whether points are more clustered than chance, four ways, and see what each assumes. "Chance" is complete spatial randomness: every point falls anywhere in the study area with equal probability, independently of the others, so counts in equal cells follow a Poisson distribution, whose variance equals its mean. **Quadrats** compare the two: a variance-to-mean ratio (VMR) well above 1 means clustered. The **nearest-neighbour index** (Clark and Evans) compares the mean distance from each point to its nearest other point with what randomness gives in the same area, 0.5 ÷ √(n ÷ A): a ratio R below 1 means clustered, and its z-score uses the standard error 0.26136 ÷ √(n² ÷ A). Both depend on the area chosen (ArcGIS Pro's Average Nearest Neighbor uses the points' bounding rectangle unless given one); here it is the main island. **Kernel density** spreads each point over a smooth bump of chosen width, the bandwidth, and sums the bumps into a surface of records per km². **DBSCAN** finds clusters as places where at least `minpoints` points lie within `eps` of each other, and labels the rest noise. Duplicate coordinates matter to all four: many records share one spot (an atlas grid point, a museum's locality), and every method counts them as separate points.

**Data:** `occurrences` (the devil's records), `admin1_shapes` (Tasmania's main island), `s4_cells` (the 5 km and 10 km hexagons).

**Key code:** quadrats: the variance-to-mean ratio of records per hexagon, at both sizes:

```sql
-- q: s2-quadrats
-- status: ran
-- engine: postgis
SELECT edge_m, count(*) AS cells, sum(n) AS records,
       round(avg(n), 3) AS mean,
       round(var_samp(n), 2) AS variance,
       round(var_samp(n) / avg(n), 1) AS vmr
FROM s4_cells
GROUP BY edge_m
ORDER BY edge_m;
```

```text
-- result: s2-quadrats · 2 rows · sha256 0cefd3b143f3
edge_m | cells | records | mean | variance | vmr
5000 | 1094 | 1972 | 1.803 | 115.68 | 64.2
10000 | 296 | 1990 | 6.723 | 934.23 | 139.0
```

The nearest-neighbour index for the records inside the main island, counting every record and then each distinct location once. `<->` with `LIMIT 1` finds each point's nearest other point (g5):

```sql
-- q: s2-nni
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), devils AS (
  SELECT o.id, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id, island
  WHERE s.scientific_name = 'Sarcophilus harrisii'
    AND ST_Contains(island.geom, ST_Transform(o.geom, 3577))
), sets AS (
  SELECT 'every record' AS points, id, geom FROM devils
  UNION ALL
  (SELECT DISTINCT ON (ST_X(geom), ST_Y(geom)) 'distinct locations', id, geom
   FROM devils ORDER BY ST_X(geom), ST_Y(geom), id)
), nearest AS (
  SELECT a.points,
         (SELECT ST_Distance(a.geom, b.geom) FROM sets AS b
          WHERE b.points = a.points AND b.id <> a.id
          ORDER BY a.geom <-> b.geom LIMIT 1) AS d_m
  FROM sets AS a
), stats AS (
  SELECT nr.points, count(*) AS n, count(*) FILTER (WHERE nr.d_m = 0) AS zero_m,
         avg(nr.d_m) AS observed_m, ST_Area(island.geom) AS area_m2
  FROM nearest AS nr, island
  GROUP BY nr.points, island.geom
)
SELECT points, n, zero_m,
       round(observed_m::numeric, 1) AS observed_m,
       round((0.5 / sqrt(n / area_m2))::numeric, 1) AS expected_m,
       round((observed_m / (0.5 / sqrt(n / area_m2)))::numeric, 3) AS r,
       round(((observed_m - 0.5 / sqrt(n / area_m2)) / (0.26136 / sqrt(n ^ 2 / area_m2)))::numeric, 1) AS z
FROM stats
ORDER BY n DESC;
```

```text
-- result: s2-nni · 2 rows · sha256 0c88009e49e6
points | n | zero_m | observed_m | expected_m | r | z
every record | 1784 | 1109 | 985.8 | 3000.5 | 0.329 | -54.3
distinct locations | 913 | 0 | 2298.4 | 4194.3 | 0.548 | -26.1
```

DBSCAN with `eps` 2 km and `minpoints` 20 (ArcGIS Pro's Density-based Clustering, DBSCAN method). `ST_ClusterDBSCAN` is a window function: it gives each point its cluster's number, or `NULL` for noise:

```sql
-- q: s2-dbscan
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), devils AS (
  SELECT o.id, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id, island
  WHERE s.scientific_name = 'Sarcophilus harrisii'
    AND ST_Contains(island.geom, ST_Transform(o.geom, 3577))
), labelled AS (
  SELECT id, geom, ST_ClusterDBSCAN(geom, eps := 2000, minpoints := 20) OVER () AS cluster
  FROM devils
), clusters AS (
  SELECT cluster, count(*) AS points, count(DISTINCT (ST_X(geom), ST_Y(geom))) AS locations
  FROM labelled
  GROUP BY cluster
)
SELECT count(*) FILTER (WHERE cluster IS NOT NULL) AS clusters,
       sum(points) FILTER (WHERE cluster IS NOT NULL) AS clustered,
       sum(points) FILTER (WHERE cluster IS NULL) AS noise,
       max(points) FILTER (WHERE cluster IS NOT NULL) AS largest,
       count(*) FILTER (WHERE cluster IS NOT NULL AND locations = 1) AS one_location_clusters
FROM clusters;
```

```text
-- result: s2-dbscan · 1 row · sha256 34fd8cce6ca6
clusters | clustered | noise | largest | one_location_clusters
10 | 871 | 913 | 357 | 1
```

Kernel density in Python (scikit-learn), a Gaussian kernel with a 5 km bandwidth, read at the 5 km hexagons' centroids. The density comes out per m² and sums to 1, so it is scaled to records per km²; summed over the cells it should give back roughly the records in them:

```python
# q: s2-kde
# status: ran
# after: py-connect
import numpy as np
from sklearn.neighbors import KernelDensity

with connect() as conn:
    points = np.array(conn.execute(
        """SELECT ST_X(g), ST_Y(g)
           FROM (SELECT ST_Transform(o.geom, 3577) AS g
                 FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
                 WHERE s.scientific_name = 'Sarcophilus harrisii') AS devils
           ORDER BY 1, 2"""
    ).fetchall())
    cells = conn.execute(
        "SELECT id, n, cx, cy, ST_Area(geom) FROM s4_cells WHERE edge_m = 5000 ORDER BY id"
    ).fetchall()

kde = KernelDensity(bandwidth=5000, kernel="gaussian").fit(points)
centroids = np.array([(c[2], c[3]) for c in cells])
per_km2 = np.exp(kde.score_samples(centroids)) * len(points) * 1e6
cell_km2 = cells[0][4] / 1e6

print(f"records: {len(points)}  cells: {len(cells)}  cell area: {cell_km2:.2f} km2")
print(f"density x area, summed over the cells: {(per_km2 * cell_km2).sum():.0f} records")
print("densest cells: id | records in cell | records per km2")
for k in np.argsort(-per_km2, kind="stable")[:5]:
    print(f"{cells[k][0]} | {cells[k][1]} | {per_km2[k]:.3f}")
```

```text
-- result: s2-kde · python · sha256 130460cdd472
records: 2000  cells: 1094  cell area: 64.95 km2
density x area, summed over the cells: 1895 records
densest cells: id | records in cell | records per km2
917 | 256 | 2.123
947 | 42 | 0.989
948 | 49 | 0.880
888 | 111 | 0.809
916 | 45 | 0.787
```

**Expected:** every test says clustered, and duplicates inflate every one. The quadrats' variance is 64.2 times the mean at 5 km and 139.0 times at 10 km (1 for random). Inside the main island, 1,109 of the 1,784 records sit on exactly the same spot as another record, so their nearest-neighbour distance is 0: R = 0.329 (z −54.3) counting every record, R = 0.548 (z −26.1) counting the 913 distinct locations once; both far below 1. DBSCAN finds 10 clusters holding 871 records and calls 913 noise; the largest holds 357 records, and one "cluster" is a single location repeated 20 times or more. The kernel surface peaks at 2.12 records per km² over cell 917, the cell with 256 records (s4's `max_n`); summed over the 1,094 cells of 64.95 km² it gives back 1,895 of the 2,000 records (the rest spill into the sea or lie off the main island). Clustered means the records bunch together; s1 says why: they were recorded by a few teams, at places they returned to.

#### s3 · weights

**Tool:** PG + Py · **Time:** 2.0 h · **Prereqs:** s2

**Goal:** build the neighbour list every spatial statistic needs, and see where it breaks. A **spatial weights matrix** W says, for each pair of units i and j, how much j counts as i's neighbour (`w_ij`; `w_ii` = 0). Three common rules: a **distance band** (neighbours within a threshold), **k-nearest** (each unit's k closest), and **contiguity** (units sharing an edge, "rook", or an edge or a corner, "queen"). **Row standardization** divides each row by its sum, so a unit's neighbours' weights add to 1 and the weighted sum becomes the neighbours' mean (`w_ij = 1/k_i`); a unit with one neighbour gives it all the weight. A unit with no neighbour, an **island**, has a row of zeros that can't be standardized, and the statistics are undefined for it. k-nearest weights are not symmetric (j can be among i's nearest without i being among j's), and when several units sit at the same distance the k-th neighbour is a tie that the software breaks its own way.

**Data:** `s4_cells`, `s4_neighbours` (s4's distance band: centroids within twice the edge), `country_shapes`, `occurrences`.

**Key code:** how many neighbours the distance band gives each cell:

```sql
-- q: s3-contiguity
-- status: ran
-- engine: postgis
SELECT c.edge_m, k.k AS neighbours, count(*) AS cells
FROM s4_cells AS c
CROSS JOIN LATERAL (SELECT count(*) AS k FROM s4_neighbours AS nb WHERE nb.i = c.id) AS k
GROUP BY c.edge_m, k.k
ORDER BY c.edge_m, k.k;
```

```text
-- result: s3-contiguity · 11 rows · sha256 13c0a4f1ea54
edge_m | neighbours | cells
5000 | 1 | 1
5000 | 2 | 7
5000 | 3 | 36
5000 | 4 | 66
5000 | 5 | 45
… 6 more rows
```

k-nearest neighbours on the 5 km cells, ranked by distance rounded to the centimetre and then by id, so ties are broken the same way every run. For k = 4 and k = 6: the links, the links whose reverse is missing, and the cells whose k-th and (k + 1)-th neighbours are tied:

```sql
-- q: s3-knn
-- status: ran
-- engine: postgis
WITH near AS (
  SELECT a.id AS i, b.id AS j, b.d_m
  FROM s4_cells AS a
  CROSS JOIN LATERAL (
    SELECT c.id, round(ST_Distance(ST_Point(a.cx, a.cy), ST_Point(c.cx, c.cy))::numeric, 2) AS d_m
    FROM s4_cells AS c
    WHERE c.edge_m = a.edge_m AND c.id <> a.id
    ORDER BY d_m, c.id
    LIMIT 7
  ) AS b
  WHERE a.edge_m = 5000
), ranked AS (
  SELECT i, j, d_m, row_number() OVER (PARTITION BY i ORDER BY d_m, j) AS rank FROM near
)
SELECT k.k,
       count(*) FILTER (WHERE r.rank <= k.k) AS links,
       count(*) FILTER (WHERE r.rank <= k.k AND NOT EXISTS (
         SELECT 1 FROM ranked AS back WHERE back.i = r.j AND back.j = r.i AND back.rank <= k.k)) AS one_way,
       count(*) FILTER (WHERE r.rank = k.k AND r.d_m = (
         SELECT nx.d_m FROM ranked AS nx WHERE nx.i = r.i AND nx.rank = k.k + 1)) AS tied_cells
FROM ranked AS r, (VALUES (4), (6)) AS k (k)
GROUP BY k.k
ORDER BY k.k;
```

```text
-- result: s3-knn · 2 rows · sha256 160008ed6781
k | links | one_way | tied_cells
4 | 4376 | 1968 | 1025
6 | 6564 | 254 | 129
```

Contiguity between countries, where the units are real outlines: countries with no neighbour that touches (`ST_Touches`: boundaries meet, interiors don't) or intersects (`ST_Intersects`) them, and the countries whose outlines overlap a neighbour's, which `ST_Touches` misses:

```sql
-- q: s3-countries
-- status: ran
-- engine: postgis
WITH pairs AS (
  SELECT a.country_code, b.country_code AS other, ST_Touches(a.geom, b.geom) AS touches
  FROM country_shapes AS a
  LEFT JOIN country_shapes AS b ON b.country_code <> a.country_code AND ST_Intersects(a.geom, b.geom)
), per_country AS (
  SELECT country_code, count(other) AS intersecting, count(other) FILTER (WHERE touches) AS touching
  FROM pairs
  GROUP BY country_code
)
SELECT count(*) AS countries,
       count(*) FILTER (WHERE intersecting = 0) AS islands,
       count(*) FILTER (WHERE touching = 0) AS islands_by_touches,
       count(*) FILTER (WHERE intersecting > touching) AS overlapping,
       max(intersecting) AS most_neighbours
FROM per_country;
```

```text
-- result: s3-countries · 1 row · sha256 5c0dcf803a58
countries | islands | islands_by_touches | overlapping | most_neighbours
247 | 76 | 84 | 12 | 16
```

The islands that hold records:

```sql
-- q: s3-islands
-- status: ran
-- engine: postgis
SELECT a.country_code, c.name, count(o.id) AS records
FROM country_shapes AS a
JOIN countries AS c ON c.code = a.country_code
JOIN occurrences AS o ON o.country_code = a.country_code
WHERE NOT EXISTS (SELECT 1 FROM country_shapes AS b
                  WHERE b.country_code <> a.country_code AND ST_Intersects(a.geom, b.geom))
GROUP BY a.country_code, c.name
ORDER BY records DESC, a.country_code;
```

```text
-- result: s3-islands · 10 rows · sha256 0039efb8454f
country_code | name | records
AU | Australia | 4636
MG | Madagascar | 2012
KM | Comoros | 109
LK | Sri Lanka | 26
PH | Philippines | 12
… 5 more rows
```

The same weights in PySAL: queen contiguity from the hexagons' shapes against the distance band from their centroids, row standardization, and k = 4 nearest neighbours, whose ties PySAL breaks its own way:

```python
# q: s3-pysal
# status: ran
# after: py-connect
import geopandas as gpd
import numpy as np
import shapely
from libpysal.weights import KNN, DistanceBand, Queen
from scipy.spatial import cKDTree

with connect() as conn:
    rows = conn.execute(
        "SELECT id, cx, cy, ST_AsBinary(geom) FROM s4_cells WHERE edge_m = 5000 ORDER BY id"
    ).fetchall()
ids = [r[0] for r in rows]
xy = np.array([(r[1], r[2]) for r in rows])
cells = gpd.GeoDataFrame({"id": ids}, geometry=shapely.from_wkb([bytes(r[3]) for r in rows]), crs=3577)

queen = Queen.from_dataframe(cells, ids="id")
band = DistanceBand(xy, threshold=10000, binary=True, ids=ids)
same = all(set(queen.neighbors[i]) == set(band.neighbors[i]) for i in ids)
print(f"queen = distance band: {same}  links: {queen.s0:.0f}  islands: {queen.islands}")
print("neighbours: cells | " + "  ".join(f"{k}: {c}" for k, c in queen.histogram))

queen.transform = "r"
rows_sum_to_one = np.allclose(np.asarray(queen.sparse.sum(axis=1)).ravel(), 1)
lone = next(i for i in ids if queen.cardinalities[i] == 1)
inner = next(i for i in ids if queen.cardinalities[i] == 6)
print(f"rows sum to 1: {rows_sum_to_one}  cell {lone} (1 neighbour): {queen.weights[lone]}  "
      f"cell {inner} (6): {[round(v, 4) for v in queen.weights[inner]]}")

knn = KNN(xy, k=4, ids=ids, silence_warnings=True)
one_way = sum(1 for i in ids for j in knn.neighbors[i] if i not in knn.neighbors[j])
d, _ = cKDTree(xy).query(xy, k=6)
tied = int(np.sum(np.round(d[:, 4], 2) == np.round(d[:, 5], 2)))
print(f"k = 4: links: {knn.s0:.0f}  one-way: {one_way}  cells with the 4th and 5th tied: {tied}")
```

```text
-- result: s3-pysal · python · sha256 b8f324551172
queen = distance band: True  links: 6246  islands: []
neighbours: cells | 1: 1  2: 7  3: 36  4: 66  5: 45  6: 939
rows sum to 1: True  cell 1051 (1 neighbour): [1.0]  cell 8 (6): [0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667]
k = 4: links: 4376  one-way: 600  cells with the 4th and 5th tied: 1025
```

**Expected:** on the 5 km grid, 939 of 1,094 cells have all 6 neighbours and the coast leaves the rest with fewer, down to one cell with a single neighbour (cell 1051); on the 10 km grid 221 of 296 have 6 and the fewest is 2. No cell has none. PySAL's queen contiguity from the hexagons' shapes gives exactly the distance band's 6,246 links, the same histogram and no islands. After row standardization every row sums to 1: cell 1051's one neighbour has weight 1.0, an interior cell's six have 0.1667 each. k-nearest is lopsided: with k = 4, 1,025 cells have their 4th and 5th neighbours at the same distance, so the choice is a tie-break; SQL's rule (lowest id) leaves 1,968 of 4,376 links one-way, PySAL's leaves 600, with the same distances. With k = 6 only 129 cells are tied and 254 links one-way. Between countries, 76 of the 247 outlines intersect no other: they are islands, and 10 of them hold records (Australia 4,636, Madagascar 2,012, Comoros 109, …), so contiguity weights over countries would give Australia and Madagascar no neighbour at all. `ST_Touches` alone finds 84 islands, because 12 countries' simplified outlines overlap a neighbour's instead of meeting it; contiguity on real outlines needs `ST_Intersects` (or a snapping tolerance), and the most neighbours any country has is 16.

#### s4 · moran

**Tool:** PG + Py · **Time:** 2.0 h · **Prereqs:** s3

**Goal:** one number for "do similar values sit together?", and its test. **Global Moran's I** compares each cell's deviation from the mean, `z_i = y_i − ȳ`, with its neighbours': `I = (n / S0) · Σ_i Σ_j w_ij z_i z_j / Σ_i z_i²`, where `S0` is the sum of all weights. With no pattern, I is close to its expectation `E[I] = −1/(n−1)`; above it, similar values cluster; below, they alternate. Whether I is far enough from `E[I]` is judged by a z-score, from a variance that has a closed form under two assumptions (normality: `z_norm`; randomization: `z_rand`, which ArcGIS Pro reports), or by a **permutation test**: shuffle the values over the cells many times, recompute I each time, and count how often a shuffle beats the real I; with 999 shuffles the smallest possible pseudo p-value is 1/1000. Here the plain SQL and PySAL compute the same statistic from the same cells and agree to 10⁻⁷ (§A.2). Then the honest question: what clusters? The cells count records, so I measures how recording effort clusters as much as how devils do.

**Data:** `occurrences` (the devil's records), `admin1_shapes` (Tasmania's main island); the cells it builds, `s4_cells` and `s4_neighbours`, are the ones s2, s3 and s5 read.

**Key code:**

Points can't be the units for Moran's I: a record has no value to compare with its neighbours', and many records share one spot. So the records are counted into equal-area hexagons over Tasmania's main island (EPSG:3577, Australian Albers), at two cell sizes, and each cell's value is `y = ln(1 + n)`. Its centroid is kept as two plain numbers, `cx` and `cy`, so SQL and PySAL measure distances from the same coordinates. The neighbour rule is a view: two cells of one grid are neighbours when their centroids are within twice the edge length. This block runs when a PostGIS run starts, and its tables stay until the lab data is loaded again. It drops them first, so running it again rebuilds them, and every download that reads them starts with it (§7.3).

```sql
-- q: s4-cells
-- status: ran
-- engine: postgis
-- boot
DROP VIEW IF EXISTS s4_neighbours;
DROP TABLE IF EXISTS s4_cells;
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

The permutation test on the 5 km cells. esda's global `Moran` takes no seed, so NumPy's is set first; 999 shuffles:

```python
# q: s4-permutations
# status: ran
# after: py-connect
import esda
import numpy as np
from libpysal.weights import DistanceBand

with connect() as conn:
    rows = conn.execute("SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = 5000 ORDER BY id").fetchall()
ids = [r[0] for r in rows]
y = np.array([r[1] for r in rows])
w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=10000, binary=True, ids=ids)

np.random.seed(2026)
mi = esda.Moran(y, w, transformation="r", permutations=999)
print(f"I: {mi.I:.6f}  shuffles: {mi.permutations}")
print(f"shuffled I: mean {mi.EI_sim:.6f}  sd {mi.seI_sim:.6f}  max {mi.sim.max():.6f}")
print(f"pseudo p: {mi.p_sim:.4f}  z_sim: {mi.z_sim:.2f}")
```

```text
-- result: s4-permutations · python · sha256 e4f919f6c5a8
I: 0.273296  shuffles: 999
shuffled I: mean -0.000776  sd 0.018192  max 0.065027
pseudo p: 0.0010  z_sim: 15.07
```

**Expected:** the grid checks pass at both sizes (the nearest centroids 8,660.25 m and 17,320.51 m apart, the next class 15,000 and 30,000 m, no duplicate centroid, no island, no pair near the threshold). Moran's I is 0.2733 on the 1,094 cells of 5 km (E[I] −0.0009, z 15.18) and 0.2036 on the 296 cells of 10 km (z 5.83): SQL and PySAL agree to every printed digit (§A.2 compares them to 5 × 10⁻⁷ and pair by pair). ArcGIS Pro's z would be `z_rand`, 15.25. In 999 shuffles no I came near the real one (the largest 0.0650), so the pseudo p-value is the smallest possible, 0.001, and the shuffles' spread gives z 15.07, close to the formulas'. Larger cells give a smaller I and a much smaller z: the modifiable areal unit problem (g6) reaches the statistic. And since s1 showed the records are mostly one atlas and one museum's samples, the honest sentence is "devil records cluster strongly at both scales", not "devils cluster".

#### s5 · local

**Tool:** PG + Py · **Time:** 2.5 h · **Prereqs:** s4

**Goal:** say **where** values cluster, and how many of those places a careful test keeps. **Getis-Ord Gi\*** compares the sum of a cell's values and its neighbours' (the star: the cell counts as its own neighbour) with what the sum would be if the values were spread at random; its z-score, `Gi* = (Σ_j w_ij x_j − x̄ Σ_j w_ij) / (S √((n Σ_j w_ij² − (Σ_j w_ij)²) / (n − 1)))` with `S` the values' standard deviation, is high in a **hot spot** and low in a **cold spot** (ArcGIS Pro's Hot Spot Analysis). **Local Moran's I** (LISA) gives each cell its own share of global Moran's I and sorts the significant ones into high-high and low-low clusters and high-low and low-high outliers (Cluster and Outlier Analysis); its p-values come from permutations. Either way a test runs once per cell, here 1,094 times, so at p ≤ 0.05 about 55 cells would pass by chance alone. The **false discovery rate** (Benjamini and Hochberg) corrects that: sort the m p-values, find the largest rank k with `p_(k) ≤ k · 0.05 / m`, and keep the k smallest. On cells that count records, a hot spot is a hot spot of recording.

**Data:** `s4_cells`, `s4_neighbours` (the 5 km cells, `y = ln(1 + n)`).

**Key code:** Gi\* in plain SQL with binary weights and the cell itself included, then two-sided p-values from the normal distribution (`erfc`, PostgreSQL 16) and the Benjamini-Hochberg cut, kept as a temporary view, `s5_gistar` (one row per cell: `id`, `z`, `p`, and `fdr`, true where the cell survives the correction), so c1 reads the same result instead of repeating the query:

```sql
-- q: s5-gistar
-- status: ran
-- engine: postgis
CREATE OR REPLACE TEMP VIEW s5_gistar AS
WITH c AS (
  SELECT id, y FROM s4_cells WHERE edge_m = 5000
), stats AS (
  SELECT count(*)::float8 AS n, avg(y) AS ybar, sqrt(avg(y * y) - avg(y) ^ 2) AS s FROM c
), w AS (
  SELECT i, j FROM s4_neighbours WHERE edge_m = 5000
  UNION ALL
  SELECT id, id FROM c
), sums AS (
  SELECT w.i, sum(c.y) AS wy, count(*)::float8 AS wsum
  FROM w JOIN c ON c.id = w.j
  GROUP BY w.i
), z AS (
  SELECT u.i, (u.wy - st.ybar * u.wsum) / (st.s * sqrt((st.n * u.wsum - u.wsum ^ 2) / (st.n - 1))) AS z
  FROM sums AS u, stats AS st
), p AS (
  SELECT i, z, erfc(abs(z) / sqrt(2)) AS p,
         row_number() OVER (ORDER BY erfc(abs(z) / sqrt(2)), i) AS rank,
         count(*) OVER () AS m
  FROM z
), cut AS (
  SELECT coalesce(max(rank) FILTER (WHERE p <= rank * 0.05 / m), 0) AS k FROM p
)
SELECT p.i AS id, p.z, p.p, p.rank <= cut.k AS fdr
FROM p, cut;
SELECT count(*) AS cells,
       count(*) FILTER (WHERE z > 0 AND p <= 0.05) AS hot_05,
       count(*) FILTER (WHERE z < 0 AND p <= 0.05) AS cold_05,
       count(*) FILTER (WHERE z > 0 AND fdr) AS hot_fdr,
       count(*) FILTER (WHERE z < 0 AND fdr) AS cold_fdr,
       round(max(z)::numeric, 6) AS max_z,
       round(min(z)::numeric, 6) AS min_z
FROM s5_gistar;
```

```text
-- result: s5-gistar · 1 row · sha256 84ede64c9841
cells | hot_05 | cold_05 | hot_fdr | cold_fdr | max_z | min_z
1094 | 99 | 0 | 39 | 0 | 10.632449 | -1.289294
```

The same in PySAL: `G_Local` with `star=True` and binary weights, and esda's `fdr`, which returns the p-value cut:

```python
# q: s5-gistar-pysal
# status: ran
# after: py-connect
import esda
import numpy as np
from libpysal.weights import DistanceBand
from scipy.stats import norm

with connect() as conn:
    rows = conn.execute("SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = 5000 ORDER BY id").fetchall()
ids = [r[0] for r in rows]
y = np.array([r[1] for r in rows])
w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=10000, binary=True, ids=ids)

g = esda.G_Local(y, w, transform="B", star=True, permutations=0)
p = 2 * norm.sf(np.abs(g.Zs))
cut = esda.fdr(p, 0.05)
print("cells | hot_05 | cold_05 | hot_fdr | cold_fdr | max_z | min_z")
print(f"{len(y)} | {np.sum((g.Zs > 0) & (p <= 0.05))} | {np.sum((g.Zs < 0) & (p <= 0.05))} | "
      f"{np.sum((g.Zs > 0) & (p <= cut))} | {np.sum((g.Zs < 0) & (p <= cut))} | {g.Zs.max():.6f} | {g.Zs.min():.6f}")
```

```text
-- result: s5-gistar-pysal · python · sha256 42a8f2bf8f68
cells | hot_05 | cold_05 | hot_fdr | cold_fdr | max_z | min_z
1094 | 99 | 0 | 39 | 0 | 10.632449 | -1.289294
```

Local Moran's I with 999 permutations (seeded), by quadrant: all cells, significant at p ≤ 0.05, and after the false discovery rate:

```python
# q: s5-lisa
# status: ran
# after: py-connect
import esda
import numpy as np
from libpysal.weights import DistanceBand

with connect() as conn:
    rows = conn.execute("SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = 5000 ORDER BY id").fetchall()
ids = [r[0] for r in rows]
y = np.array([r[1] for r in rows])
w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=10000, binary=True, ids=ids)

lisa = esda.Moran_Local(y, w, transformation="r", permutations=999, seed=2026)
cut = esda.fdr(lisa.p_sim, 0.05)
print(f"false discovery rate cut: p <= {cut:.4f}")
print("quadrant | cells | p <= 0.05 | after FDR")
for q, name in [(1, "high-high"), (2, "low-high"), (3, "low-low"), (4, "high-low")]:
    in_q = lisa.q == q
    print(f"{name} | {in_q.sum()} | {np.sum(in_q & (lisa.p_sim <= 0.05))} | {np.sum(in_q & (lisa.p_sim <= cut))}")
```

```text
-- result: s5-lisa · python · sha256 ff0ae1985d8b
false discovery rate cut: p <= 0.0021
quadrant | cells | p <= 0.05 | after FDR
high-high | 185 | 68 | 16
low-high | 230 | 34 | 2
low-low | 557 | 0 | 0
high-low | 122 | 29 | 29
```

**Expected:** SQL's Gi\* and PySAL's `G_Local` give the same line: 99 hot cells at p ≤ 0.05, 39 after the false discovery rate, the highest z 10.632449, and no cold spot at all, because 787 of the cells are empty and the lowest z is −1.29: where most cells hold nothing, "cold" can't stand out from the mean. Local Moran's I finds 68 high-high cells at p ≤ 0.05 and 16 after the correction (its cut is p ≤ 0.0021, so only cells with p_sim 0.001 or 0.002 survive, the floor 999 permutations allow); 29 high-low outliers survive too, single cells of many records among empty ones, the shape of an atlas grid point or a sampling site; no low-low cell is significant. The FDR removes more than half of Gi\*'s hot spots and removes three in four of LISA's high-high cells. What is left are the places the atlas and the museum's teams recorded devils most: hot spots of effort, which a report labels as such.

#### s6 · zonal

**Tool:** PG + Py · **Time:** 2.0 h · **Prereqs:** s5, g7

**Goal:** summarise points (or raster cells) by zones, and compare like with like. **Zonal statistics** take a layer of zones, here ecoregions cut to a country's outline, and summarise what falls in each: records, area, records per 1,000 km² (ArcGIS Pro's Zonal Statistics as Table does the same for a raster inside polygons; g7's `ST_ValueCount` is its SQL form). A zone's **ratio** of its share of records to its share of area is 1 when records are spread by area alone; above 1 the zone has more records than its size. That still mixes the animals with the effort, so the second ratio **normalizes for effort**: a species' share of the records in a zone against its share of all records in the country, the "target group" idea, which uses every species' records as a measure of where people recorded at all. A chi-square test then asks whether records follow area; with hundreds of records it almost always says no, which is a statement about the records, not about which habitat an animal prefers.

**Data:** `country_shapes` (Costa Rica), `ecoregions` (RESOLVE, simplified, §4.1), `occurrences`; L3 adds `occurrence_habitats` and the habitat summaries (§4.1).

**Key code:** Costa Rica's ecoregions as zones: area, records (those GBIF codes `CR` that lie inside the outline, g3), records per 1,000 km², the record-to-area ratio, and the jaguar's share relative to all records:

```sql
-- q: s6-zones
-- status: ran
-- engine: postgis
WITH country AS (
  SELECT geom FROM country_shapes WHERE country_code = 'CR'
), zones AS (
  SELECT e.eco_id, e.name, ST_Intersection(e.geom, country.geom) AS geom
  FROM ecoregions AS e, country
  WHERE ST_Intersects(e.geom, country.geom)
), records AS (
  SELECT o.id, o.species_id, o.geom
  FROM occurrences AS o, country
  WHERE o.country_code = 'CR' AND ST_Contains(country.geom, o.geom)
), per_zone AS (
  SELECT z.eco_id, z.name, ST_Area(z.geom::geography) / 1e6 AS km2,
         count(r.id) AS records,
         count(r.id) FILTER (WHERE r.species_id = (SELECT id FROM species WHERE scientific_name = 'Panthera onca')) AS jaguar
  FROM zones AS z
  LEFT JOIN records AS r ON ST_Contains(z.geom, r.geom)
  GROUP BY z.eco_id, z.name, z.geom
)
SELECT eco_id, name, round(km2::numeric) AS km2, records, jaguar,
       round((1000 * records / km2)::numeric, 1) AS per_1000_km2,
       round(((records / sum(records) OVER ()) / (km2 / sum(km2) OVER ()))::numeric, 2) AS record_ratio,
       round(((jaguar::numeric / nullif(records, 0)) / (sum(jaguar) OVER () / sum(records) OVER ()))::numeric, 2) AS jaguar_ratio
FROM per_zone
ORDER BY km2 DESC, eco_id;
```

```text
-- result: s6-zones · 7 rows · sha256 72c259664d1d
eco_id | name | km2 | records | jaguar | per_1000_km2 | record_ratio | jaguar_ratio
470 | Isthmian-Atlantic moist forests | 17288 | 215 | 0 | 12.4 | 1.23 | 0.00
471 | Isthmian-Pacific moist forests | 9012 | 96 | 0 | 10.7 | 1.05 | 0.00
458 | Costa Rican seasonal moist forests | 8400 | 107 | 0 | 12.7 | 1.26 | 0.00
506 | Talamancan montane forests | 8311 | 13 | 0 | 1.6 | 0.15 | 0.00
527 | Central American dry forests | 6062 | 62 | 61 | 10.2 | 1.01 | 7.29
… 2 more rows
```

The same zones in GeoPandas (an overlay, then a spatial join), with areas in an equal-area projection (EPSG:6933), and a chi-square test of records against area:

```python
# q: s6-geopandas
# status: ran
# after: py-connect
import geopandas as gpd
import shapely
from scipy.stats import chisquare

with connect() as conn:
    outline = conn.execute("SELECT ST_AsBinary(geom) FROM country_shapes WHERE country_code = 'CR'").fetchone()[0]
    eco = conn.execute(
        """SELECT e.eco_id, e.name, ST_AsBinary(e.geom)
           FROM ecoregions AS e JOIN country_shapes AS c ON c.country_code = 'CR' AND ST_Intersects(e.geom, c.geom)
           ORDER BY e.eco_id"""
    ).fetchall()
    recs = conn.execute("SELECT id, longitude, latitude FROM occurrences WHERE country_code = 'CR' ORDER BY id").fetchall()

country = gpd.GeoDataFrame(geometry=[shapely.from_wkb(bytes(outline))], crs=4326)
zones = gpd.GeoDataFrame({"eco_id": [e[0] for e in eco], "name": [e[1] for e in eco]},
                         geometry=shapely.from_wkb([bytes(e[2]) for e in eco]), crs=4326)
pieces = gpd.overlay(zones, country, how="intersection", keep_geom_type=True)
points = gpd.GeoDataFrame({"id": [r[0] for r in recs]},
                          geometry=gpd.points_from_xy([r[1] for r in recs], [r[2] for r in recs]), crs=4326)
inside = points[points.within(country.geometry.iloc[0])]
counts = gpd.sjoin(inside, pieces, predicate="within").groupby("eco_id").size()

pieces["km2"] = pieces.to_crs(6933).area / 1e6
pieces["records"] = pieces["eco_id"].map(counts).fillna(0).astype(int)
pieces = pieces.sort_values(["km2", "eco_id"], ascending=[False, True])
print(f"records coded CR: {len(points)}  inside the outline: {len(inside)}  in a zone: {pieces['records'].sum()}")
print("eco_id | km2 | records")
for z in pieces.itertuples():
    print(f"{z.eco_id} | {z.km2:.0f} | {z.records}")
expected = pieces["records"].sum() * pieces["km2"] / pieces["km2"].sum()
test = chisquare(pieces["records"], expected)
print(f"chi-square: {test.statistic:.1f}  df: {len(pieces) - 1}  p: {test.pvalue:.2g}")
```

```text
-- result: s6-geopandas · python · sha256 1c182b76d465
records coded CR: 619  inside the outline: 591  in a zone: 504
eco_id | km2 | records
470 | 17288 | 215
471 | 9012 | 96
458 | 8400 | 107
506 | 8311 | 13
527 | 6061 | 62
617 | 636 | 7
613 | 198 | 4
chi-square: 77.4  df: 6  p: 1.2e-14
```

Records by habitat class against the classes' estimated areas, once L3 has placed every record in a class of the habitat map (g7):

```sql
-- q: s6-habitat
-- status: untested: L3 builds occurrence_habitats
-- engine: postgis
WITH records AS (
  SELECT oh.habitat_code, count(*) AS records
  FROM occurrences AS o
  JOIN occurrence_habitats AS oh ON oh.occurrence_id = o.id
  WHERE o.country_code = 'CR'
  GROUP BY oh.habitat_code
)
SELECT ch.habitat_code, hc.name, ch.est_area_km2, coalesce(r.records, 0) AS records,
       round((coalesce(r.records, 0) / sum(coalesce(r.records, 0)) OVER ())
             / (ch.est_area_km2 / sum(ch.est_area_km2) OVER ()), 2) AS record_ratio
FROM country_habitats AS ch
LEFT JOIN records AS r ON r.habitat_code = ch.habitat_code
LEFT JOIN habitat_classes AS hc ON hc.code = ch.habitat_code
WHERE ch.country_code = 'CR'
ORDER BY ch.est_area_km2 DESC, ch.habitat_code;
```

**Expected:** 591 of Costa Rica's 619 records lie inside its outline (g3 found the rest), and 504 of those inside an ecoregion piece; the other 87 fall in the gaps the simplified ecoregions leave inside the outline (g4). PostGIS and GeoPandas count the same records in every zone, and their areas agree to 1 km² (geography against EPSG:6933). By area alone the records are uneven: the Talamancan montane forests, 8,311 km² of mountains, hold 13 records (ratio 0.15), the lowland moist forests 1.05 to 1.26, and the chi-square test rejects "records follow area" (77.4 on 6 degrees of freedom, p 1.2 × 10⁻¹⁴). Normalized for effort, the jaguar looks different again: 61 of the 62 records in the Central American dry forests and all 7 in the Pacific mangroves are jaguars, 7.29 and 7.41 times its share of all records, and it has none in the other zones; those are s1's GPS collars, worn by jaguars tracked in the dry northwest. The records say where people recorded, and where one collar study worked, not which forest a jaguar prefers. `s6-habitat` repeats the comparison by habitat class once L3 has placed every record in the habitat map; g7's `ST_ValueCount` is the raster side of the same zonal statistic.

### 5.5 ETL

Five modules, ten hours, in Python (§3.3) and your own PostGIS (§3.2). These are outlines, in §5.3's form; build mission L4 (§9) writes them in full. The track builds one pipeline, the one that made this course's sample (§4.2, §A.1): ask GBIF for a download (e1), load it typed and checked in one transaction (e2), make re-running it safe (e3), check it and credit its sources (e4), and run it on a schedule (e5). The code is the spike's (`SP/etl/`), cut down to what each lesson needs. Every block that can run without a GBIF account runs here, on the lab tables and the published lab files; the blocks write only TEMP tables or roll back, so `learn_curriculum` stays as the loader left it.

#### e1 · extract

**Tool:** Py · **Time:** 2.0 h · **Prereqs:** f2

**Goal:** get every open record of a species from GBIF, as a file you can cite. GBIF has two ways in:
- **The search API** (`/v1/occurrence/search`) answers at once, in pages of at most 300 records, and stops at an offset of 100,000. It suits a count or a quick look. A result assembled from pages has no DOI, and the data under it changes daily, so nobody can fetch exactly your records again.
- **The download API** is **asynchronous**: you POST a query (a *predicate*) with your GBIF account, GBIF runs it as a job, and you ask for its status until it is ready. The result is one zip of every matching record, with a **DOI** that cites exactly that file; GBIF keeps a download that has been cited and deletes an uncited one after six months.

The client is where most of the care goes. Pace the requests (critwire's rule: at most 2 a second), retry what can fail for a moment (429 "too many requests", 5xx, a dropped connection) with growing waits, and never retry a POST blindly, because a second POST is a second download. Stream large files to disk and hash them as they arrive; a file gets its real name only after its size and checksum match what the publisher says.

**Pin the taxonomy.** A query names taxa by key, and a key means something only in one checklist. GBIF's download documentation says: "If no `checklistKey` is supplied the obsolete GBIF Backbone Taxonomy will be used." Today that default is the checklist critwire's `ids.gbif` come from, but GBIF calls it obsolete, and the search API's default has already moved to the Catalogue of Life. A pipeline that leans on a default its provider has said will change can start matching other taxa with no error, so the request names `checklistKey` at the top level and on `TAXON_KEY`, and the client checks that GBIF's stored request echoes both (§4.2).

**Data:** `species.gbif_id` (73 keys) in the lab database; GBIF's API, with your own account (free, gbif.org); the lab files under `/learn/data/` and their `manifest.json` (§4.5).

**Key code:** the request, built from the lab's keys. For the Tasmanian devil alone, `TAXON_KEY` would hold one key, `2435451`.

```python
# q: e1-request
# status: ran
# after: py-connect
import json

BACKBONE = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"  # the GBIF Backbone Taxonomy, which critwire's ids.gbif come from
BASIS = ["HUMAN_OBSERVATION", "OBSERVATION", "MACHINE_OBSERVATION", "PRESERVED_SPECIMEN",
         "MATERIAL_SAMPLE", "MATERIAL_CITATION", "OCCURRENCE"]


def build_request(taxon_keys, user):
    """The download request: open records with coordinates, no geospatial issue, present, no living or fossil specimens."""
    return {
        "creator": user,
        "sendNotification": False,
        "format": "SIMPLE_CSV",
        "checklistKey": BACKBONE,
        "predicate": {
            "type": "and",
            "predicates": [
                {"type": "in", "key": "TAXON_KEY", "values": [str(k) for k in taxon_keys], "checklistKey": BACKBONE},
                {"type": "in", "key": "LICENSE", "values": ["CC0_1_0", "CC_BY_4_0"]},
                {"type": "equals", "key": "HAS_COORDINATE", "value": "true"},
                {"type": "equals", "key": "HAS_GEOSPATIAL_ISSUE", "value": "false"},
                {"type": "equals", "key": "OCCURRENCE_STATUS", "value": "PRESENT"},
                {"type": "in", "key": "BASIS_OF_RECORD", "values": BASIS},
            ],
        },
    }


with connect() as conn:
    keys = [k for (k,) in conn.execute("SELECT gbif_id FROM species WHERE gbif_id IS NOT NULL ORDER BY gbif_id")]
request = build_request(keys, "your-gbif-username")
taxa = request["predicate"]["predicates"][0]
print(f"taxon keys: {len(taxa['values'])}, first {taxa['values'][0]}, last {taxa['values'][-1]}")
print(f"checklistKey: request {request['checklistKey']}, TAXON_KEY {taxa['checklistKey']}")
for p in request["predicate"]["predicates"][1:]:
    print(p["key"], p["type"], p.get("values", p.get("value")))
print("bytes:", len(json.dumps(request)))
```

```text
-- result: e1-request · python · sha256 5cc14736466a
taxon keys: 73, first 2421431, last 7451150
checklistKey: request d7dddbf4-2cf0-4f39-9b2a-bb099caae36c, TAXON_KEY d7dddbf4-2cf0-4f39-9b2a-bb099caae36c
LICENSE in ['CC0_1_0', 'CC_BY_4_0']
HAS_COORDINATE equals true
HAS_GEOSPATIAL_ISSUE equals false
OCCURRENCE_STATUS equals PRESENT
BASIS_OF_RECORD in ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN', 'MATERIAL_SAMPLE', 'MATERIAL_CITATION', 'OCCURRENCE']
bytes: 1551
```

Submitting, waiting and fetching. This needs your account in `GBIF_USERNAME` and `GBIF_PASSWORD`, and makes a real download each time it runs, so the tests don't run it; the spike ran the same steps (`SP/etl/gbif_download.py`, §A.1).

```python
# q: e1-submit
# status: untested: makes a real GBIF download with your account (the spike ran the same steps, §A.1)
# after: py-connect, e1-request
import base64
import hashlib
import os
import time
import urllib.error
import urllib.request

API = "https://api.gbif.org/v1"
USER, PASSWORD = os.environ["GBIF_USERNAME"], os.environ["GBIF_PASSWORD"]  # from the environment, never in the code
AUTH = "Basic " + base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
_last = 0.0


def call(method, url, body=None, auth=False, retries=4):
    """One request, at most 2 a second. GETs retry 429, 5xx and network errors with backoff; a POST never retries,
    because a second POST is a second download."""
    global _last
    headers = {"Accept": "application/json, text/plain"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if auth:
        headers["Authorization"] = AUTH
    for attempt in range(retries + 1):
        time.sleep(max(0.0, _last + 0.5 - time.monotonic()))
        _last = time.monotonic()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data, headers, method=method), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if method != "GET" or (e.code != 429 and e.code < 500) or attempt == retries:
                raise
        except urllib.error.URLError:
            if method != "GET" or attempt == retries:
                raise
        time.sleep(2 ** attempt)


key = call("POST", f"{API}/occurrence/download/request", build_request(keys, USER), auth=True).decode()
print("download key:", key)
while True:  # a job, not a response: ask at most once a minute
    meta = json.loads(call("GET", f"{API}/occurrence/download/{key}"))
    if meta["status"] == "SUCCEEDED":
        break
    if meta["status"] in ("KILLED", "FAILED", "CANCELLED"):
        raise SystemExit(f"download {key} ended {meta['status']}")
    time.sleep(60)
stored = meta["request"]
if stored["checklistKey"] != BACKBONE or stored["predicate"]["predicates"][0]["checklistKey"] != BACKBONE:
    raise SystemExit("GBIF didn't keep the pinned taxonomy")  # the echo check: what ran is what was asked
print("DOI:", meta["doi"], "records:", meta["totalRecords"], "bytes:", meta["size"])

sha, size = hashlib.sha256(), 0
with urllib.request.urlopen(meta["downloadLink"], timeout=600) as r, open(f"{key}.zip.part", "wb") as f:
    for chunk in iter(lambda: r.read(1 << 20), b""):
        sha.update(chunk)
        size += len(chunk)
        f.write(chunk)
if size != meta["size"]:
    raise SystemExit(f"zip is {size} bytes; GBIF says {meta['size']}")
os.replace(f"{key}.zip.part", f"{key}.zip")
print("zip sha256:", sha.hexdigest())  # keep it with the DOI: it is how a later run knows it has the same file
```

Files with checksums, on the published lab files: stream each one to disk, hash it on the way, and keep it only if its size and sha256 equal the manifest's.

```python
# q: e1-checksum
# status: ran
import hashlib
import json
import os
import time
import urllib.error
import urllib.request

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")


def get(url, retries=4):
    """A GET that retries rate limits (429), server errors and dropped connections, waiting 1, 2, 4, 8 s."""
    for attempt in range(retries + 1):
        try:
            return urllib.request.urlopen(url, timeout=60)
        except urllib.error.HTTPError as e:
            if (e.code != 429 and e.code < 500) or attempt == retries:
                raise
        except urllib.error.URLError:
            if attempt == retries:
                raise
        time.sleep(2 ** attempt)


def fetch(name, manifest):
    """Stream a lab file to disk, hashing as it arrives; refuse it unless its size and sha256 match the manifest."""
    expected = manifest["files"][name]
    sha, size = hashlib.sha256(), 0
    with get(f"{BASE}/learn/data/{name}") as r, open(name + ".part", "wb") as f:
        for chunk in iter(lambda: r.read(1 << 20), b""):
            sha.update(chunk)
            size += len(chunk)
            f.write(chunk)
    if size != expected["bytes"] or sha.hexdigest() != expected["sha256"]:
        os.remove(name + ".part")
        raise SystemExit(f"{name}: {size} bytes, sha256 {sha.hexdigest()[:12]}; the manifest says "
                         f"{expected['bytes']}, {expected['sha256'][:12]}")
    os.replace(name + ".part", name)  # only a checked file gets its real name
    return size, sha.hexdigest()


with get(f"{BASE}/learn/data/manifest.json") as r:
    manifest = json.load(r)
for name in ["occurrences.parquet", "datasets.csv"]:
    size, digest = fetch(name, manifest)
    print(f"{name}: {size} bytes, sha256 {digest[:12]} = manifest, {manifest['files'][name]['rows']} rows")
```

```text
-- result: e1-checksum · python · sha256 429afc1d5bca
occurrences.parquet: 622971 bytes, sha256 53086c9a1fb8 = manifest, 40395 rows
datasets.csv: 72797 bytes, sha256 3bd8c1726239 = manifest, 400 rows
```

**Expected:** the request holds critwire's 73 GBIF keys and the six filters of §4.2, with the legacy checklist pinned twice; apart from `creator` and `sendNotification`, it equals, as JSON, the request GBIF stored for the spike's download. Submitted, that download was ready after 16 min 41 s: a 34,725,756-byte zip of 394,532 records from 454 datasets, DOI `10.15468/dl.fbpk9w`, and GBIF's stored request echoed both checklist keys (§A.1). Both lab files match the manifest; a file that doesn't is deleted and the block stops, naming both checksums.

#### e2 · transform-load

**Tool:** Py + PG · **Time:** 2.5 h · **Prereqs:** e1, d4

**Goal:** load a delivered file into typed, checked tables, all or nothing. The pattern has three parts:
- **Staging:** a table with one `text` column per column of the file, loaded exactly as delivered. Nothing can fail on a type here, and every later error is a SQL query that names its rows.
- **`COPY`**, not row-by-row `INSERT`: PostgreSQL reads the file as one stream. The spike staged GBIF's 394,532 rows in 6.7 s and finished the whole load, types and checks included, in 14.2 s. psycopg's `cursor.copy` streams from Python, so a zip member goes in without being extracted.
- **Typed tables, filled from staging with SQL:** casts, constraints, the geometry (a generated column, so it can't disagree with the coordinates), and the species rule. Then the checks. All of it runs in one transaction, so a failed check leaves the tables as they were before the run (d4).

**`COPY`'s default format is wrong for files you didn't write.** GBIF's `SIMPLE_CSV` is tab-separated and never quotes a field. Read with `FORMAT text`, `COPY`'s default, a backslash starts an escape: `\n` becomes a line break, other backslashes vanish, `\N` becomes NULL, and an empty field stays an empty string. Nothing raises an error. CSV mode with a tab delimiter and a quote character that never occurs (`\b`, backspace) reads every byte as data and an empty field as NULL. On the real download, text format silently changed 9 rows, while this form kept all 97 rows holding a `\` or a `"` byte for byte (§A.1). The same rule applies to the lab loader (§4.3): never use text format on data you didn't write.

**Synonyms.** Four of critwire's GBIF keys are synonyms in GBIF's checklist (Blanding's turtle, Baird's tapir, Temminck's and giant pangolins). GBIF files their records under the accepted species' `speciesKey` and keeps the key you asked for in `taxonKey`, so joining on `speciesKey` alone loses them: 2,385 records in the spike. The rule is the species whose key is the record's `speciesKey`, else its `taxonKey`; a record that matches no species, or two different ones, fails the load (§4.2).

**Data:** three made-up records in GBIF's format (a few of its 50 columns), which the first block holds; `species` (the GBIF keys); `occurrences` for the GeoPandas round trip.

**Key code:** the file and the staging step. The `COPY` statement is the spike's, character for character (`SP/etl/gbif_load.py`). The block prints nothing; the next two run it first.

```python
# q: e2-file
# status: ran
HEADER = ["gbifID", "datasetKey", "species", "countryCode", "locality", "decimalLatitude", "decimalLongitude",
          "coordinateUncertaintyInMeters", "year", "month", "taxonKey", "speciesKey", "basisOfRecord", "license",
          "recordedBy"]
ROWS = [
    ["1000000001", "00000000-0000-0000-0000-000000000001", "Sarcophilus harrisii", "AU",
     r"Cradle Mountain\Dove Lake track", "-41.6512", "145.9601", "30", "2019", "3", "2435451", "2435451",
     "HUMAN_OBSERVATION", "CC_BY_4_0", 'A. "Sam" Lee'],
    ["1000000002", "00000000-0000-0000-0000-000000000001", "Smutsia temminckii", "ZA",
     r"Pafuri\north bank", "-22.4310", "31.2120", "", "2021", "", "5786560", "5219630",
     "HUMAN_OBSERVATION", "CC0_1_0", ""],
    ["1000000003", "00000000-0000-0000-0000-000000000002", "Tapirus bairdii", "CR",
     "Sirena station", "8.4800", "-83.5900", "250", "", "", "2440897", "8395500",
     "MACHINE_OBSERVATION", "CC_BY_4_0", r"\N"],
]
# Three made-up records in GBIF's SIMPLE_CSV form: tab-separated, no quoting, an empty field for "no value".
GBIF_FILE = ("\n".join("\t".join(row) for row in [HEADER, *ROWS]) + "\n").encode()

# Every column text: the file is read exactly as delivered, and typed in SQL afterwards.
CREATE_STAGING = "CREATE TEMP TABLE gbif_staging (" + ", ".join(f'"{h}" text' for h in HEADER) + ")"
# CSV mode with a quote character that never occurs, so backslashes and double quotes stay data; '' is NULL.
COPY_STAGING = ("COPY gbif_staging FROM STDIN "
                "(FORMAT csv, DELIMITER E'\\t', QUOTE E'\\b', NULL '', HEADER true)")


def stage(cur, data, copy_sql=COPY_STAGING):
    """Load the file's bytes into gbif_staging, streamed: COPY reads what it is sent, in pieces of any size."""
    cur.execute(CREATE_STAGING)
    with cur.copy(copy_sql) as copy:
        for start in range(0, len(data), 1 << 20):
            copy.write(data[start:start + (1 << 20)])
```

```text
-- result: e2-file · python · sha256 e3b0c44298fc
```

The same bytes through both `COPY` forms:

```python
# q: e2-copy
# status: ran
# after: py-connect, e2-file
TEXT_FORMAT = "COPY gbif_staging FROM STDIN (FORMAT text, HEADER true)"  # the default format: wrong for this file


def show(value):
    """NULL, '' and a line break made visible."""
    return "NULL" if value is None else "''" if value == "" else value.replace("\n", "↵")


with connect() as conn, conn.cursor() as cur:
    read = {}
    for name, sql in [("csv form", COPY_STAGING), ("text format", TEXT_FORMAT)]:
        stage(cur, GBIF_FILE, sql)
        read[name] = cur.execute('SELECT "gbifID", locality, "recordedBy" FROM gbif_staging ORDER BY "gbifID"').fetchall()
        cur.execute("DROP TABLE gbif_staging")
    conn.rollback()

sent = {row[0]: (row[4], row[14] or None) for row in ROWS}
print("COPY | gbifID | locality | recordedBy | read")
for name, rows in read.items():
    for gbif_id, locality, recorded_by in rows:
        same = (locality, recorded_by) == sent[gbif_id]
        print(f"{name} | {gbif_id} | {show(locality)} | {show(recorded_by)} | {'as sent' if same else 'CHANGED'}")
```

```text
-- result: e2-copy · python · sha256 23d586f7e1b2
COPY | gbifID | locality | recordedBy | read
csv form | 1000000001 | Cradle Mountain\Dove Lake track | A. "Sam" Lee | as sent
csv form | 1000000002 | Pafuri\north bank | NULL | as sent
csv form | 1000000003 | Sirena station | \N | as sent
text format | 1000000001 | Cradle MountainDove Lake track | A. "Sam" Lee | CHANGED
text format | 1000000002 | Pafuri↵orth bank | '' | CHANGED
text format | 1000000003 | Sirena station | NULL | CHANGED
```

Typed, matched to species and checked, in one transaction. A `TEMP` table can't have a foreign key to a lasting table, so here the species rule's `NOT NULL` does that job; in your own schema, declare the key.

```python
# q: e2-typed
# status: ran
# after: py-connect, e2-file
TYPED = """
CREATE TEMP TABLE occurrences_new (
  id                       bigint PRIMARY KEY,
  species_id               integer NOT NULL,
  dataset_key              uuid NOT NULL,
  license                  text NOT NULL,
  basis_of_record          text NOT NULL,
  longitude                double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude                 double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  coordinate_uncertainty_m double precision,
  country_code_gbif        text,
  year                     integer,
  month                    integer CHECK (month BETWEEN 1 AND 12),
  geom                     geometry(Point, 4326) GENERATED ALWAYS AS (ST_Point(longitude, latitude, 4326)) STORED
)"""

# The species whose GBIF key is the record's speciesKey, else its taxonKey (a synonym keeps our key in taxonKey).
INSERT_TYPED = """
INSERT INTO occurrences_new
SELECT g."gbifID"::bigint, coalesce(by_species.id, by_taxon.id), g."datasetKey"::uuid,
       replace(replace(g.license, 'CC_BY_4_0', 'CC BY 4.0'), 'CC0_1_0', 'CC0 1.0'), g."basisOfRecord",
       g."decimalLongitude"::float8, g."decimalLatitude"::float8, g."coordinateUncertaintyInMeters"::float8,
       g."countryCode", g.year::integer, g.month::integer
FROM gbif_staging AS g
LEFT JOIN species AS by_species ON by_species.gbif_id = g."speciesKey"::bigint
LEFT JOIN species AS by_taxon ON by_taxon.gbif_id = g."taxonKey"::bigint
"""

# One row per check, with the rows that break it. Any non-zero count rolls the whole load back.
CHECKS = """
SELECT 'rows typed = rows staged', (SELECT count(*) FROM gbif_staging) - (SELECT count(*) FROM occurrences_new)
UNION ALL SELECT 'speciesKey and taxonKey name two species', count(*) FROM gbif_staging AS g
  JOIN species AS a ON a.gbif_id = g."speciesKey"::bigint
  JOIN species AS b ON b.gbif_id = g."taxonKey"::bigint
  WHERE a.id <> b.id
UNION ALL SELECT 'license not CC0 1.0 or CC BY 4.0', count(*) FROM occurrences_new
  WHERE license NOT IN ('CC0 1.0', 'CC BY 4.0')
"""

with connect() as conn, conn.cursor() as cur:
    with conn.transaction():  # all or nothing: an exception inside rolls every statement back
        stage(cur, GBIF_FILE)
        cur.execute(TYPED)
        cur.execute(INSERT_TYPED)  # a record that maps to no species fails NOT NULL here, and so the load
        failed = [(name, n) for name, n in cur.execute(CHECKS).fetchall() if n]
        if failed:
            raise SystemExit(f"load refused, nothing kept: {failed}")
        by_species_only = cur.execute(
            'SELECT count(*) FROM gbif_staging AS g JOIN species AS s ON s.gbif_id = g."speciesKey"::bigint').fetchone()[0]
        rows = cur.execute("""
            SELECT o.id, s.scientific_name, o.license, o.coordinate_uncertainty_m, o.year, ST_AsText(o.geom)
            FROM occurrences_new AS o JOIN species AS s ON s.id = o.species_id ORDER BY o.id""").fetchall()

print(f"joined on speciesKey alone: {by_species_only} of {len(rows)} records")
print("id | species | license | uncertainty_m | year | geom")
for row in rows:
    print(" | ".join("NULL" if v is None else str(v) for v in row))
```

```text
-- result: e2-typed · python · sha256 dcec9a549c6f
joined on speciesKey alone: 1 of 3 records
id | species | license | uncertainty_m | year | geom
1000000001 | Sarcophilus harrisii | CC BY 4.0 | 30.0 | 2019 | POINT(145.9601 -41.6512)
1000000002 | Smutsia temminckii | CC0 1.0 | NULL | 2021 | POINT(31.212 -22.431)
1000000003 | Tapirus bairdii | CC BY 4.0 | 250.0 | NULL | POINT(-83.59 8.48)
```

GeoPandas to and from PostGIS, for work that is easier in Python. `read_postgis` turns a query into a GeoDataFrame, `to_postgis` writes one back as a table (it needs SQLAlchemy and GeoAlchemy2, both in §3.3's environment). The write stays in the connection's transaction, which the block rolls back.

```python
# q: e2-geopandas
# status: ran
import geopandas as gpd
from sqlalchemy import create_engine, text

# The same lab connection for SQLAlchemy: libpq's PG* variables pick the database, the options set the search path.
engine = create_engine("postgresql+psycopg://", connect_args={"options": "-c search_path=learn_curriculum,public"})

with engine.connect() as conn:
    devils = gpd.read_postgis(
        text("SELECT o.id, o.year, o.geom FROM occurrences AS o JOIN species AS s ON s.id = o.species_id "
             "WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id"),
        conn, geom_col="geom")
    print(f"read: {len(devils)} rows, CRS {devils.crs.to_string()}, geometry {devils.geom_type.iloc[0]}")

    metres = devils.to_crs(3577)  # GDA94 / Australian Albers, an equal-area projection in metres
    metres["geom"] = metres.buffer(1000)  # a 1 km circle around each record
    metres.to_postgis("devil_buffers", conn, if_exists="fail", index=False)  # in this transaction
    n, srid, kind, km2 = conn.execute(text(
        "SELECT count(*), min(ST_SRID(geom)), min(GeometryType(geom)), round(sum(ST_Area(geom))::numeric / 1e6, 1) "
        "FROM devil_buffers")).one()
    print(f"written: {n} rows, SRID {srid}, {kind}, {km2} km² in all")
    conn.rollback()  # the lab leaves learn_curriculum as it found it
```

```text
-- result: e2-geopandas · python · sha256 2cde0f113ff8
read: 2000 rows, CRS EPSG:4326, geometry Point
written: 2000 rows, SRID 3577, POLYGON, 6273.1 km² in all
```

**Expected:** CSV mode keeps all three records as sent. Text format changes all three, silently: the backslash in `Cradle Mountain\Dove Lake track` disappears, `Pafuri\north bank` gains a line break, the empty `recordedBy` becomes an empty string instead of NULL, and the recorder `\N` becomes NULL. Typed, the three records map to the devil, Temminck's pangolin and Baird's tapir, but a join on `speciesKey` alone finds only the devil: the other two are synonyms. Missing values arrive as NULL, and each record has a point in SRID 4326. GeoPandas reads the devil's 2,000 records as points in EPSG:4326 and writes 2,000 one-kilometre buffers in EPSG:3577 (Australian Albers, in metres), 6,273.1 km² together.

#### e3 · idempotent

**Tool:** Py + PG · **Time:** 2.0 h · **Prereqs:** e2

**Goal:** a pipeline you can re-run without fear. An operation is **idempotent** when doing it twice leaves the same result as doing it once. Schedules retry, people re-run a failed job, and two runs overlap, so a load that appends rows doubles them. The tools:
- **Keys and upserts** (d4): rows carry their source's key (GBIF's `gbifID`) and are inserted with `ON CONFLICT`, so a second copy updates instead of adding.
- **Replace in one transaction:** the lab loader drops and rebuilds its schema inside one transaction (§4.3), so a run either replaces everything or changes nothing.
- **Run ids from content:** a run's id is the checksum of its input. The same input is recognized and skipped; a changed one loads under a new id. A clock-based id would load the same input twice.
- **Deterministic choices:** "any 2,000 records" must be the same 2,000 every time. `LIMIT` without `ORDER BY`, or `random()` without a seed, is not. The lab sample orders each species' records by the `md5` of their id (§4.2), which every engine computes the same way.
- **Deterministic outputs:** rows in key order and stable formats, so the same input gives byte-identical files and a sha256 proves that nothing changed.

**Data:** `occurrences`; the browser's copy of the same sample.

**Key code:** the sample's selection rule, 100 records per species by `md5`, in the browser:

```sql
-- q: e3-pick
-- status: ran
WITH ranked AS (
  SELECT id, species_id,
         row_number() OVER (PARTITION BY species_id ORDER BY md5(CAST(id AS VARCHAR))) AS pick
  FROM occurrences
)
SELECT count(*) AS records,
       count(DISTINCT species_id) AS species,
       md5(string_agg(CAST(id AS VARCHAR), ',' ORDER BY id)) AS ids_md5
FROM ranked
WHERE pick <= 100;
```

```text
-- result: e3-pick · 1 row · sha256 3db586ec53fe
records | species | ids_md5
4766 | 71 | 6e68cc753c01b6150c7308b6de8e85b6
```

The same SQL in PostgreSQL. Its result block has the same hash as the browser's: the same rows, in two engines.

```sql
-- q: e3-pick-pg
-- status: ran
-- engine: postgis
WITH ranked AS (
  SELECT id, species_id,
         row_number() OVER (PARTITION BY species_id ORDER BY md5(CAST(id AS VARCHAR))) AS pick
  FROM occurrences
)
SELECT count(*) AS records,
       count(DISTINCT species_id) AS species,
       md5(string_agg(CAST(id AS VARCHAR), ',' ORDER BY id)) AS ids_md5
FROM ranked
WHERE pick <= 100;
```

```text
-- result: e3-pick-pg · 1 row · sha256 3db586ec53fe
records | species | ids_md5
4766 | 71 | 6e68cc753c01b6150c7308b6de8e85b6
```

A plain append against an idempotent load, run twice each, then once more with a corrected input:

```python
# q: e3-rerun
# status: ran
# after: py-connect
import hashlib

SETUP = """
CREATE TEMP TABLE devil_records (id bigint PRIMARY KEY, year integer, longitude float8, latitude float8);
CREATE TEMP TABLE devil_records_naive (id bigint, year integer, longitude float8, latitude float8);
CREATE TEMP TABLE load_runs (run_id text PRIMARY KEY, input_rows integer NOT NULL)
"""


def checksum(cur, table):
    """md5 of every row in key order: two loads that leave the same rows give the same value."""
    return cur.execute(f"SELECT count(*), md5(coalesce(string_agg(t::text, E'\\n' ORDER BY t::text), '')) "
                       f"FROM {table} AS t").fetchone()


def load(cur, batch):
    """Idempotent: the run id is the input's sha256, so the same input is loaded once; rows upsert by key."""
    run_id = hashlib.sha256("\n".join(",".join(map(str, r)) for r in batch).encode()).hexdigest()
    if cur.execute("INSERT INTO load_runs VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING run_id",
                   (run_id, len(batch))).fetchone() is None:
        return run_id, "already loaded: skipped"
    cur.executemany("INSERT INTO devil_records VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO UPDATE "
                    "SET year = EXCLUDED.year, longitude = EXCLUDED.longitude, latitude = EXCLUDED.latitude", batch)
    return run_id, f"loaded {len(batch)} rows"


with connect() as conn, conn.cursor() as cur:
    cur.execute(SETUP)
    batch = cur.execute("""SELECT o.id, o.year, o.longitude, o.latitude FROM occurrences AS o
                           JOIN species AS s ON s.id = o.species_id
                           WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id""").fetchall()
    for run in (1, 2):
        cur.executemany("INSERT INTO devil_records_naive VALUES (%s, %s, %s, %s)", batch)
        rows, md5 = checksum(cur, "devil_records_naive")
        print(f"append, run {run}: {rows} rows, md5 {md5[:12]}")
    for run in (1, 2):
        run_id, what = load(cur, batch)
        rows, md5 = checksum(cur, "devil_records")
        print(f"idempotent, run {run}: run {run_id[:12]}, {what}; {rows} rows, md5 {md5[:12]}")
    corrected = [(batch[0][0], 1999, *batch[0][2:]), *batch[1:]]  # next week the publisher adds one missing year
    run_id, what = load(cur, corrected)
    rows, md5 = checksum(cur, "devil_records")
    print(f"idempotent, run 3 (one year added): run {run_id[:12]}, {what}; {rows} rows, md5 {md5[:12]}")
    conn.rollback()
```

```text
-- result: e3-rerun · python · sha256 584e78cd936d
append, run 1: 2000 rows, md5 7eda803a3b13
append, run 2: 4000 rows, md5 78fe836dfda5
idempotent, run 1: run a6672cf0d579, loaded 2000 rows; 2000 rows, md5 7eda803a3b13
idempotent, run 2: run a6672cf0d579, already loaded: skipped; 2000 rows, md5 7eda803a3b13
idempotent, run 3 (one year added): run 35146b2ce8b7, loaded 2000 rows; 2000 rows, md5 6294a8e1f695
```

**The case study: critwire itself** (`AGENTS.md`). Each step has one writer and refuses to run on stale input:

```sh
pnpm ingest gbif   # the only step that uses the network: normalized responses, keys sorted, one `retrieved` time per file
pnpm derive        # pure: no network, no clock; refuses raw snapshots older than the data they describe
pnpm build         # rebuilds the database from data/ each time; refuses derived files that differ from a fresh derive
```

- Snapshots are committed to git, so any past build can be repeated from its commit.
- `derive` reads only files, so its outputs are a function of its inputs, and the build checks that by deriving again.
- The deploy swaps in the new `dist/` only if the whole build passed.
- A GBIF derived-dataset DOI is minted only for a pushed commit, tagged, so the deposit it points at never moves; an interrupted registration is re-run and reconciles with GBIF's listing before it posts again (`pnpm gbif:register`).

**Expected:** both engines pick 4,766 records of 71 species (100 each, or all of a species' records when it has fewer), with the same md5 over their ids, `6e68cc753c01b6150c7308b6de8e85b6`. The append holds 2,000 rows after one run and 4,000 after two. The idempotent load holds 2,000 rows after both runs with the same md5, because the second run's input has the same checksum and is skipped. The corrected input gets a new run id and loads: still 2,000 rows, one changed, and a new md5.

#### e4 · quality-provenance

**Tool:** Py + PG · **Time:** 2.0 h · **Prereqs:** e3

**Goal:** know what you loaded, and who to thank for it.
- **Checks written as SQL:** each check is a query that counts the rows breaking one rule, so 0 means it passed, and the same query finds the rows when it didn't. A **reject** check stops the load (e2 runs those inside its transaction); a **flag** check is reported, and the rows stay with a note, because a strange value isn't always a wrong one.
- **License filters:** keep only what you may publish. critwire keeps CC0 1.0 and CC BY 4.0, using each record's *effective* license, the more restrictive of its own and its dataset's (§4.2).
- **Provenance:** every row can be traced to its source. Here that is the download's DOI, each record's `dataset_key` and the `datasets` table of titles, publishers and DOIs (§4.5).
- **Citations:** GBIF's terms ask you to cite the download's DOI. CC BY 4.0 records also require credit to their dataset. When you publish a subset, cite a **derived dataset**: you register the subset's per-dataset record counts with GBIF and receive a DOI that credits every dataset in it. critwire does this for its countries field (`pnpm gbif:register`) and, from L1, for the lab sample (§4.2).

**Data:** `occurrences`, `datasets`, `species`.

**Key code:** the checks, run on the lab sample:

```sql
-- q: e4-checks
-- status: ran
-- engine: postgis
SELECT 'coordinates out of range' AS check_name, 'reject' AS action, count(*) AS records
FROM occurrences WHERE longitude NOT BETWEEN -180 AND 180 OR latitude NOT BETWEEN -90 AND 90
UNION ALL
SELECT 'coordinates exactly 0, 0', 'reject', count(*)
FROM occurrences WHERE longitude = 0 AND latitude = 0
UNION ALL
SELECT 'license not CC0 1.0 or CC BY 4.0', 'reject', count(*)
FROM occurrences WHERE license NOT IN ('CC0 1.0', 'CC BY 4.0')
UNION ALL
SELECT 'dataset with no title or publisher', 'reject', count(*)
FROM occurrences AS o JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE coalesce(trim(d.title), '') = '' OR coalesce(trim(d.publisher), '') = ''
UNION ALL
SELECT 'GBIF country code with no countries row', 'reject', count(*)
FROM occurrences WHERE country_code_gbif IS NOT NULL AND country_code IS NULL AND country_code_gbif NOT IN ('ZZ', 'XZ')
UNION ALL
SELECT 'year after the download (2026)', 'reject', count(*)
FROM occurrences WHERE year > 2026
UNION ALL
SELECT 'year before 1700', 'flag', count(*)
FROM occurrences WHERE year < 1700
UNION ALL
SELECT 'coordinate uncertainty over 100 km', 'flag', count(*)
FROM occurrences WHERE coordinate_uncertainty_m > 100000
UNION ALL
SELECT 'no coordinate uncertainty', 'flag', count(*)
FROM occurrences WHERE coordinate_uncertainty_m IS NULL
UNION ALL
SELECT 'repeats a record: same species, dataset, place, year and month', 'flag', count(*) - count(DISTINCT (species_id, dataset_key, longitude, latitude, year, month))
FROM occurrences
ORDER BY records DESC, check_name;
```

```text
-- result: e4-checks · 10 rows · sha256 2ac7773edbfd
check_name | action | records
no coordinate uncertainty | flag | 24002
repeats a record: same species, dataset, place, year and mon… | flag | 15643
coordinate uncertainty over 100 km | flag | 297
year before 1700 | flag | 10
GBIF country code with no countries row | reject | 0
… 5 more rows
```

Which datasets the Tasmanian devil's and the jaguar's records come from, and under which license:

```sql
-- q: e4-credits
-- status: ran
-- engine: postgis
SELECT d.title, d.publisher, d.doi, o.license, count(*) AS records
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name IN ('Sarcophilus harrisii', 'Panthera onca')
GROUP BY d.title, d.publisher, d.doi, o.license
ORDER BY records DESC, d.doi, o.license;
```

```text
-- result: e4-credits · 33 rows · sha256 80800d03f9ae
title | publisher | doi | license | records
Jaguar Movement Database: a GPS-based movement dataset of th… | Instituto Chico Mendes de Conservação da Biodiversidade - IC… | 10.71819/lr0yrg | CC BY 4.0 | 1948
Tasmanian Natural Values Atlas | Department of Natural Resources and Environment Tasmania | 10.15468/rtnb4m | CC BY 4.0 | 1413
Tasmanian Museum and Art Gallery provider for OZCAM | Tasmanian Museum and Art Gallery | 10.15468/ijp8p9 | CC BY 4.0 | 569
Feline and other mammals monitoring 2025 in Tres Mesas wind … | ENGIE | 10.15468/ze7rdr | CC BY 4.0 | 8
ICMBio \| Dados de ocorrência de espécies do Sistema de Autor… | Instituto Chico Mendes de Conservação da Biodiversidade - IC… | 10.71819/wrldzz | CC BY 4.0 | 8
… 28 more rows
```

The derived-dataset registration for that subset: the request body, built but never posted.

```python
# q: e4-derived
# status: ran
# after: py-connect
import json

DOWNLOAD_DOI = "10.15468/dl.fbpk9w"  # the GBIF download the records came from (§4.2)

with connect() as conn:
    counts = dict(conn.execute("""
        SELECT CAST(o.dataset_key AS text), count(*)
        FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
        WHERE s.scientific_name IN ('Sarcophilus harrisii', 'Panthera onca')
        GROUP BY o.dataset_key ORDER BY o.dataset_key""").fetchall())

# The body of POST https://api.gbif.org/v1/derivedDataset: what GBIF needs to mint a DOI that credits each dataset.
body = {
    "title": "Tasmanian devil and jaguar records used in my analysis",
    "description": "A subset of GBIF download 10.15468/dl.fbpk9w: open records of two species.",
    "originalDownloadDOI": DOWNLOAD_DOI,
    "sourceUrl": "https://example.org/where-my-subset-is-published",
    "relatedDatasets": counts,
}
print(f"relatedDatasets: {len(counts)} datasets, {sum(counts.values())} records")
for key, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:3]:
    print(f"  {key}: {n}")
print(f"body: {len(json.dumps(body))} bytes, ready to POST with your GBIF account")
```

```text
-- result: e4-derived · python · sha256 da576d8cb1de
relatedDatasets: 33 datasets, 4000 records
  06e98c3e-2801-4d29-8e81-943a13bb3785: 1948
  2985efd1-45b1-46de-b6db-0465d2834a5a: 1413
  4ffe66a0-6c8b-11de-8226-b8a03c50a862: 569
body: 1718 bytes, ready to POST with your GBIF account
```

**Expected:** every reject check is 0: the sample was loaded with them (§A.1), and they guard each refresh. The flags are what a reviewer reads:
- 24,002 records (59.4 %) give no coordinate uncertainty, so their precision is unknown;
- 15,643 repeat another record's species, dataset, place, year and month. That can be several animals, several visits, or one record published twice: inspect them, don't delete them;
- 297 records are uncertain by more than 100 km, too coarse for the 5 km cells of s2–s5;
- 10 Tasmanian devil records are dated 1599, before Europeans first sighted Tasmania (1642). The year is a placeholder or an error, and s1 already met it.

The devil and the jaguar have 4,000 records from 33 datasets. 29 datasets supply CC BY 4.0 records (3,992) and must be credited, led by the Jaguar Movement Database (1,948 GPS-collar records), the Tasmanian Natural Values Atlas (1,413) and the Tasmanian Museum and Art Gallery (569). The 4 CC0 datasets (8 records) ask for no credit, and are credited anyway. The registration body lists the same 33 datasets and 4,000 records, with `originalDownloadDOI` set to the download's DOI.

#### e5 · schedule

**Tool:** Py · **Time:** 1.5 h · **Prereqs:** e4

**Goal:** a pipeline that runs without you, and tells you when it breaks.
- **A job is one command** with an exit code: 0 for success, anything else for failure. The scheduler only sees that code, so a job catches nothing silently, logs the traceback and exits 1.
- **Logs:** one line per step, with a timestamp, to a file or the journal.
- **Alerts:** on Linux, systemd's `OnFailure=` starts another unit when a job fails, and cron mails a job's output to `MAILTO`. Windows' Task Scheduler records the last result, and can be set to restart a failed task.
- **Incremental loads** move only what changed. A file with a published checksum tells you whether anything changed at all. Records that changed or were deleted upstream are the hard part: an append-only increment never sees them. For a sample this size, the honest increment is a whole reload, in one transaction, when the input's checksum changes. A weekly GBIF refresh is a new download with a new DOI, so it is a new run of e1–e4.

**Data:** `/learn/data/manifest.json` and `datasets.csv`; the lab's `datasets` table, for the shape of its copy.

**Key code:** a weekly refresh job: it compares the published checksum with the one it loaded last, reloads in one transaction when they differ, checks the row count, and exits 1 with the traceback on any failure.

```python
# q: e5-job
# status: ran
# after: py-connect
import hashlib
import json
import logging
import os
import sys
import urllib.request

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")
FILE = "datasets.csv"
# A scheduled job writes a timestamp on every line (add %(asctime)s); this lab leaves it out so its output can be checked.
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("refresh")


def read(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def refresh(conn):
    """One scheduled run: nothing to do if the published file is unchanged; else reload it in one transaction, checked."""
    entry = json.loads(read(f"{BASE}/learn/data/manifest.json"))["files"][FILE]
    last = conn.execute("SELECT sha256 FROM refresh_state WHERE file = %s", (FILE,)).fetchone()
    if last is not None and last[0] == entry["sha256"]:
        log.info("%s unchanged (sha256 %s): nothing to do", FILE, entry["sha256"][:12])
        return
    data = read(f"{BASE}/learn/data/{FILE}")
    if hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise RuntimeError(f"{FILE} doesn't match its manifest")
    with conn.transaction():  # a failed check below leaves the previous copy and state as they were
        conn.execute("TRUNCATE my_datasets")
        with conn.cursor().copy("COPY my_datasets FROM STDIN (FORMAT csv, HEADER true)") as copy:
            copy.write(data)
        rows = conn.execute("SELECT count(*) FROM my_datasets").fetchone()[0]
        if rows != entry["rows"]:
            raise RuntimeError(f"loaded {rows} rows of {FILE}; the manifest says {entry['rows']}")
        conn.execute("INSERT INTO refresh_state VALUES (%s, %s) ON CONFLICT (file) DO UPDATE SET sha256 = EXCLUDED.sha256",
                     (FILE, entry["sha256"]))
    log.info("%s loaded: %d rows, sha256 %s", FILE, rows, entry["sha256"][:12])


def main():
    """Exit 0 on success, 1 on any failure, with the traceback in the log: cron mails it, systemd marks the unit failed."""
    try:
        with connect() as conn:
            # The lab's tables are TEMP, so it leaves learn_curriculum as it was; a real job's live in its own schema.
            conn.execute("CREATE TEMP TABLE my_datasets (LIKE datasets)")
            conn.execute("CREATE TEMP TABLE refresh_state (file text PRIMARY KEY, sha256 text NOT NULL)")
            for run in (1, 2):  # this week's run, then next week's with nothing new
                log.info("run %d", run)
                refresh(conn)
    except Exception:
        log.exception("refresh failed")
        return 1
    return 0


raise SystemExit(main())
```

```text
-- result: e5-job · python · sha256 886a4128154e
INFO refresh: run 1
INFO refresh: datasets.csv loaded: 400 rows, sha256 3bd8c1726239
INFO refresh: run 2
INFO refresh: datasets.csv unchanged (sha256 3bd8c1726239): nothing to do
```

Scheduling it. On Linux with cron, every Monday at 04:17:

```sh
crontab -e
# then add this line:
17 4 * * 1 cd "$HOME/etl" && .venv/bin/python -I refresh.py >> refresh.log 2>&1
```

Or a systemd user timer, which catches up on a run missed while the machine was off (`Persistent=true`) and logs to the journal:

```sh
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/refresh.service <<'EOF'
[Unit]
Description=Weekly lab data refresh
OnFailure=refresh-failed.service

[Service]
Type=oneshot
WorkingDirectory=%h/etl
ExecStart=%h/etl/.venv/bin/python -I refresh.py
EOF
cat > ~/.config/systemd/user/refresh-failed.service <<'EOF'
[Unit]
Description=Tell someone the refresh failed

[Service]
Type=oneshot
ExecStart=/usr/bin/logger -p user.err "refresh failed: journalctl --user -u refresh.service"
EOF
cat > ~/.config/systemd/user/refresh.timer <<'EOF'
[Unit]
Description=Run the refresh every Monday

[Timer]
OnCalendar=Mon *-*-* 04:17:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now refresh.timer
loginctl enable-linger "$USER"     # run it even when you aren't logged in
journalctl --user -u refresh.service   # the log
```

`refresh-failed.service` only writes to the system log here. To be told on your phone or by email, replace its `ExecStart` with your mail or push command.

On Windows, with Task Scheduler, from PowerShell:

```powershell
$action = New-ScheduledTaskAction -Execute "$HOME\etl\.venv\Scripts\python.exe" -Argument "-I refresh.py" -WorkingDirectory "$HOME\etl"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 4:17am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "Lab data refresh" -Action $action -Trigger $trigger -Settings $settings
Get-ScheduledTaskInfo -TaskName "Lab data refresh"   # LastTaskResult 0 means success
```

**Expected:** the first run loads `datasets.csv`, 400 rows, and records its sha256 (`3bd8c1726239…`); the second finds the same checksum and does nothing. Both runs log one line per step and the job exits 0. Break it, for example by pointing `LEARN_BASE` at a server that isn't running, and the job logs the traceback and exits 1: cron mails the output, systemd marks the unit failed and starts `refresh-failed.service`, and Task Scheduler shows a non-zero last result.

### 5.6 Power BI

Four modules, seven hours, in Power BI Desktop (§3.5), on the star d6 builds: eight CSV files under `https://critwire.com/learn/data/star/` (§A.3). These are outlines, in §5.3's form; build mission L5 (§9) writes them in full. Power BI runs only on Windows, so its blocks are `untested` here, and the tests check what they can instead (§0): every file a block names, against the star's manifest. Each DAX block is a query for Power BI's DAX query view (Home → DAX query view): its `DEFINE MEASURE` lines can be added to the model from there, and its `EVALUATE` returns a small table. A PostGIS block beside it computes the same table from the same star with `star.sql` (d6), so its result is the table Power BI should show. §10 asks the owner for one check on Windows.

#### p1 · power-query

**Tool:** PBI · **Time:** 1.5 h · **Prereqs:** d6

**Goal:** get the star into Power BI with Power Query, so it loads the same way on any computer and refreshes in the Power BI Service. Power Query records each step as a line of M, its formula language, so a load is code you can read, copy and review:
- `Web.Contents` fetches the file. A fixed base URL, with the file name in `RelativePath`, is a source the Service can refresh on a schedule with anonymous access; a URL built by joining text is a dynamic source, which it won't refresh (§3.5).
- `Csv.Document` parses it, with UTF-8 and CSV quoting stated, then `Table.PromoteHeaders` takes the first row as column names.
- `Table.TransformColumnTypes` sets each column's type **with an explicit culture**. Without one, Power Query parses numbers and dates in the computer's locale, so `12.5` means something else on a computer set to a comma decimal.
- Codes are text. `country_code` holds `NA` (Namibia), which other tools read as "not available", and keys like `dataset_key` are identifiers, never numbers to add.

One function serves all eight tables, so the rules above are written once (DRY, in M).

**Data:** the eight star files and `star/manifest.json`, whose columns and types the queries follow (§6.3).

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

The largest table's query. Name the query `fact_records`; whole numbers are `Int64.Type`, decimals `type number`, and an empty cell (a record with no month, or no stated uncertainty) becomes null:

```m
// q: p1-fact-records
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv
LoadStar("fact_records", {
    {"record_id", Int64.Type}, {"species_id", Int64.Type}, {"country_code", type text},
    {"dataset_key", type text}, {"year", Int64.Type}, {"month", Int64.Type},
    {"basis_of_record", type text}, {"license", type text}, {"longitude", type number},
    {"latitude", type number}, {"coordinate_uncertainty_m", type number}
})
```

**Expected:** eight tables, with the manifest's rows: `dim_species` 76, `dim_country` 251, `dim_dataset` 400, `dim_year` 177, `fact_records` 40,395, `fact_species_country` 472, `dim_habitat_class` 75 and `fact_country_habitat` 35. In `fact_records`, 2,289 records have year `-1` (unknown) and none has country `ZZ`; `month` and `coordinate_uncertainty_m` hold nulls; `NA` stays Namibia. Refresh repeats the load from critwire.com and gives the same tables until the files change.

#### p2 · model

**Tool:** PBI · **Time:** 2.0 h · **Prereqs:** p1

**Goal:** turn eight tables into one model that filters correctly. In Model view, each fact gets a relationship to each of its dimensions:
- **Cardinality many-to-one** (`*:1`): many fact rows point at one dimension row, by the key d6 declared.
- **Filter direction single:** a filter flows from the dimension to the fact. Choosing a country in a slicer filters `fact_records` and `fact_country_habitat`, never the other way round. Both directions invite ambiguous paths and slow, surprising totals; keep them for the rare case that needs them.
- **Conformed dimensions:** `dim_country` and `dim_species` are shared by the facts, so one slicer filters all of them at once (d6).
- **Facts are never related to each other.** Joining two facts directly multiplies their rows (d6's drill across). Each fact is summed under the shared dimension instead, which is what a model with only fact-to-dimension relationships does.
- **The factless fact:** `fact_species_country` has no measure column; its measure is a count of its rows (species listed in a country). It answers "where does critwire list the species?", while `fact_records` answers "what was recorded where?", and the two need not agree.

Power BI may create relationships on its own, from matching column names. Check each one against the table below.

| From (many) | To (one) | Key |
|---|---|---|
| `fact_records` | `dim_species`, `dim_country`, `dim_dataset`, `dim_year` | `species_id`, `country_code`, `dataset_key`, `year` |
| `fact_species_country` | `dim_species`, `dim_country` | `species_id`, `country_code` |
| `fact_country_habitat` | `dim_country`, `dim_habitat_class` | `country_code`, `habitat_code` |

**Data:** the eight tables from p1.

**Key code:** three measures, and a query that slices both facts by continent through `dim_country`:

```dax
// q: p2-measures
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/fact_species_country.csv, star/dim_country.csv
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_records[Species recorded] = DISTINCTCOUNT ( fact_records[species_id] )
    MEASURE fact_species_country[Species listed] = DISTINCTCOUNT ( fact_species_country[species_id] )
EVALUATE
SUMMARIZECOLUMNS (
    dim_country[continent],
    "Records", [Records],
    "Species recorded", [Species recorded],
    "Species listed", [Species listed]
)
ORDER BY [Records] DESC, dim_country[continent]
```

The table it should return, from the same star in PostGIS:

```sql
-- q: p2-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-fact-species-country
SELECT c.continent,
       r.records,
       r.species AS species_recorded,
       l.species AS species_listed
FROM (SELECT DISTINCT continent FROM dim_country) AS c
LEFT JOIN (SELECT d.continent, count(*) AS records, count(DISTINCT f.species_id) AS species
           FROM fact_records AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS r ON r.continent = c.continent
LEFT JOIN (SELECT d.continent, count(DISTINCT f.species_id) AS species
           FROM fact_species_country AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS l ON l.continent = c.continent
WHERE r.records IS NOT NULL OR l.species IS NOT NULL
ORDER BY r.records DESC NULLS LAST, c.continent;
```

```text
-- result: p2-check · 7 rows · sha256 022cceeadc7e
continent | records | species_recorded | species_listed
South America | 11308 | 18 | 17
Africa | 10791 | 29 | 28
North America | 9688 | 39 | 36
Oceania | 5147 | 8 | 9
Asia | 2985 | 21 | 20
… 2 more rows
```

**Expected:** seven continents, the same rows as `p2-check`: South America 11,308 records, Africa 10,791, North America 9,688, Oceania 5,147, Asia 2,985, Europe 469, and 7 at sea ("Seven seas"). Antarctica and the unknown member `Unknown` (`ZZ`) have neither records nor listings, so the query leaves them out. The two facts disagree, and should: Europe has records of 19 species but critwire lists only 11 there, because critwire's countries rule withholds a country outside a species' core region that has a single record there, such as an okapi in Germany: often a captive animal or a museum specimen (`AGENTS.md`). The sample keeps those records, and `fact_records` shows them. Oceania lists 9 species but the sample has records of 8, because the listings count every open record while the sample holds at most 2,000 per species (§4.2).

#### p3 · dax

**Tool:** PBI · **Time:** 2.0 h · **Prereqs:** p2

**Goal:** measures that stay right under any filter. A **measure** is a formula evaluated in the current filter context: the slicers, the visual's rows and columns. It is not stored per row, which is what a calculated column does.
- `COUNTROWS` counts a table's visible rows, `DISTINCTCOUNT` a column's distinct values.
- `CALCULATE` evaluates an expression under changed filters: here, the habitat area with the class filter set to forest.
- `DIVIDE` returns blank instead of an error when the denominator is 0 or blank.
- A ratio of two facts at different grains (records per record, area per country and class) works because both are filtered by the same `dim_country`. Its meaning is the honest part: records per 1,000 km² of forest measures how much recording happened per area of forest, not how many animals live there.

**Data:** `fact_records`, `fact_country_habitat`, `dim_habitat_class`, `dim_country`. The habitat facts are A2's stand-ins (two countries, §4.1) until L3 loads the real summaries for every country.

**Key code:**

```dax
// q: p3-measures
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/fact_country_habitat.csv, star/dim_habitat_class.csv, star/dim_country.csv
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_country_habitat[Forest km2] =
        CALCULATE ( SUM ( fact_country_habitat[est_area_km2] ), dim_habitat_class[level1_name] = "Forest" )
    MEASURE fact_records[Records per 1,000 km2 of forest] =
        VAR forest = [Forest km2]
        RETURN IF ( NOT ISBLANK ( forest ), 1000 * DIVIDE ( COALESCE ( [Records], 0 ), forest ) )
EVALUATE
FILTER (
    ADDCOLUMNS (
        VALUES ( dim_country[country_code] ),
        "Records", COALESCE ( [Records], 0 ),
        "Forest km2", [Forest km2],
        "Records per 1,000 km2 of forest", [Records per 1,000 km2 of forest]
    ),
    NOT ISBLANK ( [Forest km2] )
)
ORDER BY dim_country[country_code]
```

The same numbers in PostGIS:

```sql
-- q: p3-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT h.country_code,
       coalesce(r.records, 0) AS records,
       h.forest_km2,
       round(1000 * coalesce(r.records, 0) / h.forest_km2, 3) AS records_per_1000_km2_forest
FROM (SELECT f.country_code, sum(f.est_area_km2) AS forest_km2
      FROM fact_country_habitat AS f
      JOIN dim_habitat_class AS c ON c.habitat_code = f.habitat_code
      WHERE c.level1_name = 'Forest'
      GROUP BY f.country_code) AS h
LEFT JOIN (SELECT country_code, count(*) AS records FROM fact_records GROUP BY country_code) AS r
  ON r.country_code = h.country_code
ORDER BY h.country_code;
```

```text
-- result: p3-check · 2 rows · sha256 66ff688f234f
country_code | records | forest_km2 | records_per_1000_km2_forest
AX | 0 | 233.33 | 0.000
TT | 2 | 2865.12 | 0.698
```

**Expected:** two rows, as `p3-check`. Trinidad and Tobago has 2 records and 2,865.12 km² of forest, so 0.698 records per 1,000 km²; Åland has 233.33 km² of forest and no records, so 0. A slicer on one species changes the records but not the forest area, because `dim_species` filters `fact_records` only.

#### p4 · maps-report

**Tool:** PBI · **Time:** 1.5 h · **Prereqs:** p3

**Goal:** a report that maps records honestly, credits its sources and refreshes by itself.
- **Map visuals:** the Azure Maps visual places each record by `fact_records[latitude]` and `[longitude]` (set their data category to Latitude and Longitude); Microsoft recommends it over the older Bing-based Map and Filled map visuals, and your organization's admin may have to enable it. Colour by `basis_of_record` or by dataset, and the GPS collars and atlas grids of s1 become visible. To shade countries, use `dim_country[name]` with the data category Country, not the two-letter code, which a map can misread (`NA`).
- **Honest labels:** a map of records shows where people recorded the animal. Its title says "records", gives the count and the source, and never says "range", "distribution" or "where it lives" (`AGENTS.md`). A measure writes the title, so it stays true when a slicer changes the species.
- **Credits:** the report cites the GBIF download's DOI and the datasets with CC BY 4.0 records among those shown (e4), counted by a measure and listed in a table visual from `dim_dataset`.
- **Publishing and refresh:** Home → Publish sends the report to the Power BI Service. Under the semantic model's settings, set the critwire.com source to Anonymous with privacy level Public, then schedule a refresh. The Service refreshes the CSV sources directly, with no gateway, because the base URL is fixed (p1).

**Data:** the model from p2 and its measures.

**Key code:** the title and credit measures, evaluated for the Tasmanian devil:

```dax
// q: p4-labels
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/dim_species.csv, star/dim_dataset.csv
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_records[Map title] =
        SELECTEDVALUE ( dim_species[common_name], "Selected species" ) & ": "
            & FORMAT ( [Records], "#,0" ) & " open GBIF records (where people recorded it, not its range)"
    MEASURE fact_records[Datasets to credit] =
        COUNTROWS (
            CALCULATETABLE (
                VALUES ( dim_dataset[dataset_key] ),
                FILTER ( fact_records, fact_records[license] = "CC BY 4.0" )
            )
        )
EVALUATE
CALCULATETABLE (
    ROW (
        "Map title", [Map title],
        "Records", [Records],
        "Datasets", DISTINCTCOUNT ( fact_records[dataset_key] ),
        "Datasets to credit", [Datasets to credit]
    ),
    dim_species[scientific_name] = "Sarcophilus harrisii"
)
```

What they should return, from the same star in PostGIS:

```sql
-- q: p4-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT s.common_name || ': ' || to_char(count(*), 'FM999,999')
         || ' open GBIF records (where people recorded it, not its range)' AS map_title,
       count(*) AS records,
       count(DISTINCT f.dataset_key) AS datasets,
       count(DISTINCT f.dataset_key) FILTER (WHERE f.license = 'CC BY 4.0') AS datasets_to_credit
FROM fact_records AS f
JOIN dim_species AS s ON s.species_id = f.species_id
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY s.common_name;
```

```text
-- result: p4-check · 1 row · sha256 26cbac454e1c
map_title | records | datasets | datasets_to_credit
Tasmanian Devil: 2,000 open GBIF records (where people recor… | 2000 | 9 | 7
```

**Expected:** the title reads "Tasmanian Devil: 2,000 open GBIF records (where people recorded it, not its range)"; the devil's records come from 9 datasets, 7 of which supply CC BY 4.0 records and must be credited. Select another species and the title, count and credits change with it.

### 5.7 Capstone

One module, eight hours, on every tool. It is an outline, in §5.3's form; build mission L5 (§9) writes it in full. It asks a game designer's question, "what could a player meet here?", and answers it with a pipeline built from the earlier modules, ending in a file a game can read. Records can only say where people recorded an animal, so the file says that too, in its own fields.

#### c1 · game-feed

**Tool:** PG + Py + PBI · **Time:** 8.0 h · **Prereqs:** s5, e4, p4

**Goal:** one pipeline from GBIF to a game, each stage a module already done, with the honesty rules kept at every stage.
- **Extract and load** (e1–e4): a GBIF download for the species and region the game needs (your own predicate, or the lab sample), loaded into PostGIS in one transaction, re-runnable, checked, and with its credits.
- **Look before counting** (s1): which datasets, which basis of record, any GPS collars? A species whose records are mostly one telemetry study gives a feed about that study, and the feed's numbers would say so only if you looked.
- **Grid and hot spots** (g6, s5): equal-area hexagons, records per cell, Gi\* with the false discovery rate. The feed flags the surviving cells as **recording hot spots**: places people recorded the animal most, not places it is most common.
- **Report** (p1–p4): the cell table goes beside the star (exported as CSV, as d6 exports the star, and loaded with p1's pattern); the report maps cells by their centre, sizes them by records, colours them by hot spot, and takes its title from p4's measure.
- **The feed:** one static JSON file per species and region, written by one SQL statement, valid against the JSON Schema below, versioned. Each cell has an encounter **weight**, its share of the records; the game draws a cell with probability weight ÷ Σ weight (a cumulative sum and one random number), so rounding never matters. A cell missing from the feed means "no record", never "no animal". The feed carries the download's citation and every dataset with CC BY 4.0 records in it (e4), because the attribution travels with anything derived from them; the game shows both on its credits screen.
- **Shipping and refresh:** the game ships the file with its own static files, so it is read from the game's own origin and needs no CORS (§4.6). e5's schedule rebuilds it; a change to its fields bumps `version` and the schema. A game with its own PostGIS, such as Critter Connect's, can run the same statement there instead.

**Data:** `s4_cells` (s4's 5 km hexagons over Tasmania's main island, with the devil's record counts), `s5_gistar` (s5's Gi\* per cell), `occurrences`, `datasets`, `species`. The worked example is the Tasmanian devil; in L5's lab the learner repeats it for a species and region of their own.

**Key code:** the feed, built in PostGIS from s4's cells and s5's Gi\*; the query returns the feed's summary and its fullest cell (`SELECT doc FROM feed` returns the file itself):

```sql
-- q: c1-feed
-- status: ran
-- engine: postgis
-- after: s5-gistar
WITH sp AS (
  SELECT id, scientific_name, common_name FROM species WHERE scientific_name = 'Sarcophilus harrisii'
), cells AS (
  SELECT c.id, c.n, c.geom, ST_Transform(ST_Point(c.cx, c.cy, 3577), 4326) AS centre,
         round(c.n::numeric / sum(c.n) OVER (), 6) AS weight,
         g.z > 0 AND g.fdr AS hot_spot
  FROM s4_cells AS c JOIN s5_gistar AS g ON g.id = c.id
  WHERE c.edge_m = 5000 AND c.n > 0
), credit AS (
  SELECT DISTINCT d.title, d.publisher
  FROM occurrences AS o
  JOIN sp ON sp.id = o.species_id
  JOIN cells AS c ON ST_Contains(c.geom, ST_Transform(o.geom, 3577))
  JOIN datasets AS d ON d.dataset_key = o.dataset_key
  WHERE o.license = 'CC BY 4.0'
), feed AS (
  SELECT jsonb_build_object(
    'version', 1,
    'species', (SELECT jsonb_build_object('scientific_name', scientific_name, 'common_name', common_name) FROM sp),
    'cell', '5 km hexagon, EPSG:3577',
    'meaning', 'share of the open GBIF records in each cell: where people recorded the animal, not its range',
    'source', 'GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w',
    'credit', coalesce((SELECT jsonb_agg(to_jsonb(credit) ORDER BY title, publisher) FROM credit), '[]'),
    'cells', jsonb_agg(jsonb_build_object(
      'id', id, 'lon', round(ST_X(centre)::numeric, 4), 'lat', round(ST_Y(centre)::numeric, 4),
      'records', n, 'weight', weight, 'recording_hot_spot', hot_spot) ORDER BY id)
  ) AS doc
  FROM cells
)
SELECT jsonb_array_length(doc -> 'cells') AS cells,
       (SELECT sum((c ->> 'records')::int) FROM jsonb_array_elements(doc -> 'cells') AS c) AS records,
       (SELECT sum((c ->> 'weight')::numeric) FROM jsonb_array_elements(doc -> 'cells') AS c) AS weight_sum,
       (SELECT count(*) FROM jsonb_array_elements(doc -> 'cells') AS c
        WHERE (c ->> 'recording_hot_spot')::boolean) AS hot_spots,
       jsonb_array_length(doc -> 'credit') AS datasets_to_credit,
       octet_length(doc::text) AS bytes,
       (SELECT c::text FROM jsonb_array_elements(doc -> 'cells') AS c
        ORDER BY (c ->> 'records')::int DESC, (c ->> 'id')::int LIMIT 1) AS fullest
FROM feed;
```

```text
-- result: c1-feed · 1 row · sha256 0ed7d7c256c4
cells | records | weight_sum | hot_spots | datasets_to_credit | bytes | fullest
307 | 1972 | 0.999954 | 37 | 7 | 34848 | {"id": 917, "lat": -42.8981, "lon": 147.8865, "weight": 0.12…
```

The feed's JSON Schema (draft 2020-12), which L5 publishes beside its worked feed and checks the feed against:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://critwire.com/learn/labs/c1-feed.schema.json",
  "title": "Encounter weights from open GBIF records",
  "description": "Where people recorded a species, per equal-area cell. Records, not a range: a missing cell means no record, not no animal.",
  "type": "object",
  "required": ["version", "species", "cell", "meaning", "source", "credit", "cells"],
  "additionalProperties": false,
  "properties": {
    "version": { "const": 1 },
    "species": {
      "type": "object",
      "required": ["scientific_name", "common_name"],
      "additionalProperties": false,
      "properties": { "scientific_name": { "type": "string" }, "common_name": { "type": "string" } }
    },
    "cell": { "type": "string", "description": "The cells' shape, size and projection" },
    "meaning": { "type": "string", "description": "What a weight is, in words a player-facing screen can quote" },
    "source": { "type": "string", "description": "GBIF's citation of the download, with its DOI" },
    "credit": {
      "type": "array",
      "description": "Every dataset with CC BY 4.0 records in the feed",
      "items": {
        "type": "object",
        "required": ["title", "publisher"],
        "additionalProperties": false,
        "properties": { "title": { "type": "string" }, "publisher": { "type": "string" } }
      }
    },
    "cells": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "lon", "lat", "records", "weight", "recording_hot_spot"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "integer" },
          "lon": { "type": "number", "minimum": -180, "maximum": 180 },
          "lat": { "type": "number", "minimum": -90, "maximum": 90 },
          "records": { "type": "integer", "minimum": 1 },
          "weight": { "type": "number", "minimum": 0, "maximum": 1 },
          "recording_hot_spot": { "type": "boolean" }
        }
      }
    }
  }
}
```

**Expected:** 307 of the 1,094 cells hold a record, so the feed has 307 cells and 1,972 records (the devil's 2,000, less the 28 off the main island's cells, as in g6). The weights, rounded to six places, sum to 0.999954, which is why the game divides by their sum. 37 cells are recording hot spots: s5's 39, less 2 cells with no record of their own, flagged by Gi\* because their neighbours are full (Gi\* counts a cell's neighbours too), and absent from a feed of recorded cells. The fullest cell (id 917) holds 256 records, 13.0 % of the weight, and is a hot spot. 7 datasets must be credited. The file is 34,848 bytes, small enough to ship with any game. L5 adds the report (`untested: Power BI is Windows-only`, its cell CSV checked as p1–p4's inputs are) and publishes the worked feed and schema under `/learn/labs/` (§7).

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

- **Lab-made:** tables the lessons create in the lab (s4's hexagon grids, the smoke check's table, d1's field notes, d3's copy in year order, d4's sightings feed and its run log, the ETL's staging tables, d6's star and its species history). They aren't part of the loaded lab, so they aren't drawn; the check excuses them when a lesson's setup has made them.
- **Planned:** `occurrence_habitats` (the habitat class at each record) and `habitat_clips` (small clips of the habitat map, as rasters), which build mission L3 adds. They are drawn so the design is whole; the check excuses them while they don't exist, and fails once they do, so the marker can't go stale.

```mermaid
%% critwire Learn: the lab database, PostGIS schema learn_curriculum (plans/004-learn-curriculum.md §3, §4, §6), in PostgreSQL types.
%% Tables only; the view species_taxonomy is listed beside it. Shapes are geometry in WGS 84 (SRID 4326), each with a GiST index.
%% Tables the lessons make in the lab (s4's grids, the smoke check's, the ETL's staging, d6's star): beside the diagram, not in it.
%% lab-made: s4_cells, tx_smoke, field_notes, occurrences_by_year, sightings, sightings_runs, gbif_staging, occurrences_all, dim_species, dim_country, dim_dataset, dim_year, dim_habitat_class, fact_records, fact_species_country, fact_country_habitat, dim_species_history
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
| `coordinate_uncertainty_m` | float8 |  | metres, at least 0 and finite; NULL when not given | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `country_code_gbif` | text |  | GBIF's code as delivered; ZZ unknown, XZ high seas | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
| `country_code` | text | FK | that code when it is a countries row, else NULL | `country_code_gbif`, when a `countries` row |
| `year` | integer |  | above 0; NULL when the record has none | GBIF download 10.15468/dl.fbpk9w, sampled (§4) |
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
| `est_area_km2` | numeric |  | estimated from the map, never measured; at least 0 | stand-in from Jung et al. 2020 (CC BY 4.0) until L3 |

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

Learn stays what 002 §8 designed: static pages in the same `dist/`, written by the same offline `pnpm build`, served by the same Caddy block, with no server process and no web framework. Every page is complete HTML; one bundled script adds the browser engine, the editors, cards and checks. 002 §8's editor, accessibility rules, light and dark themes, "before the database loads" behaviour, one engine start per visit, serving rules and playground are kept as written (§1). What changes is the shape of the course: tracks and modules instead of a 16-lesson path, pages for labs that run on the learner's own tools, downloadable lab files, and a lab-data index.

### 7.1 URLs

| URL | Page | Built in |
|---|---|---|
| `/learn/` | The curriculum map (§2): the seven tracks in order, each module with its tool badges, hours, prerequisites and a done tick; "Clear progress"; links to setup, the schemas, the data and the playground. Modules not yet built are listed, unlinked, as "in preparation" | L2 |
| `/learn/<track>/` | A track's index: its modules in order, with their questions (§2). Tracks: `foundations`, `database-architecture`, `gis-in-sql`, `spatial-statistics`, `etl`, `power-bi`, `capstone` | L2 |
| `/learn/<track>/<module>/` | A module (`/learn/foundations/select/` … `/learn/capstone/game-feed/`), with Previous and Next within its track and its prerequisites linked | L2 (f, d), L3 (g), L4 (s, e), L5 (p, c) |
| `/learn/setup/` | §3, every environment: the browser, PostGIS (Windows: Docker or the installer; then the loader), Python with `uv`, the arcpy notes, Power BI Desktop | L2; L4 adds Python |
| `/learn/schema/`, `/learn/schema/lab/`, `/learn/schema/star/` | The three ERDs and their data dictionaries (§6), each with its SVG alone for zooming (`schema.svg`, `lab.svg`, `star.svg`) | L2 |
| `/learn/playground/` | 002's playground on schema v2 | L2 |
| `/learn/labs/<module>.sql`, `<module>.py`, `<module>.ipynb`; `/learn/labs/setup.py`, `setup.ipynb`; `/learn/labs/requirements.txt`; `/learn/labs/c1-feed.json`, `c1-feed.schema.json` | Downloadable lab files (7.3) | L2 (SQL), L4 (Python), L5 (the feed) |
| `/learn/data/` | The lab data (§4): an index page (files, sizes, sources and licenses, DOIs, the sample's dataset table), the files, `manifest.json`, `postgis/learn_curriculum.sql`, `star/` | L1; L2 the star; L3 habitat |
| `/learn/assets/` | The engine, the `parquet` extension mirror and the hashed app files (002 §8) | L2 |

- **Slugs, not numbers,** as in 002: a module inserted later breaks no link. The module id (`d3`) appears in the page beside its title, because block ids (`d3-plan`) and downloads use it.
- The docs page (`/`) gets a "Learn" link; `/learn/` links back to the docs and to `/v1`.
- `/v1` is untouched apart from 002's `countries` files (§4); everything the course alone needs lives under `/learn/`.

### 7.2 Pages

Every module page has the same frame: the title and id, `**Tool:** · **Time:** · **Prereqs:**` as badges, the sections of §5 in §5's order (full modules: Concept, Worked example, Lab, Result, Exercise, Answer, Check, Dialects; foundations add "Already know this?" first), a "Mark done" button, and Previous and Next. What a code block looks like depends on where it runs:
- **Browser (B) blocks** are 002's: an editor holding the block's SQL, Run, Stop, Reset database, results as a table or cards (`-- show: cards`), the Schema dialog on schema v2. An exercise has "Your answer", Check and Show answer; checking runs the reference answer on the pristine database, as 002 §1 does. Nothing is pre-rendered (002 §8).
- **PostGIS and Python blocks** can't run in the page. Each shows its code (read-only, with a Copy button), the result `learn:check` recorded, with the date and the versions it ran on (PostgreSQL, PostGIS, Python and the `requirements.txt` hash, from `checked.json`), and a link to the module's download. A "Lab schema" button opens the lab ERD as the Schema button opens schema v2's. A block marked `untested` shows its reason in place of a result, in the same words as here.
- **Power BI blocks** (```` ```m ````, ```` ```dax ````) show their code and, instead of a result, the files they read with their rows and sha256 (the `-- input:` checks), the PostGIS twin's table where there is one (`p2-check`…), and the line "Not run by critwire: Power BI Desktop is Windows-only."
- **Results are numbers from the published files.** A result shown under a PostGIS or Python block was produced by `learn:check` on the same `/learn/data/` files the page links to; the build refuses it otherwise (7.4).

The playground and the browser blocks use one engine start per visit (002 §8): moving between module pages keeps the running database.

### 7.3 Downloads

The lab files are written by the build from the same blocks the pages show, so the page and the download can't disagree (E2E checks it, 7.6):
- **`<module>.sql`**: the module's PostGIS blocks in page order, each exactly as `learn:check` runs it: its `-- after:` blocks first, the whole wrapped in `BEGIN; … ROLLBACK;`, except `-- tx: own` blocks (as written). Headers stay as comments, so every block keeps its id. It starts with §0's `pg-session` (`SET search_path`), then the boot setup (below), and runs with `psql -X -d <your database> -f <module>.sql` after the loader (§4.3). No `ON_ERROR_STOP`, because some blocks show an error on purpose (`-- expect: error`, `-- fails:`), and the file says so at the top.
- **The boot setup.** A download includes every `-- boot` block it needs, once, right after `pg-session` (or `py-connect`), committed, and not again at its page position. It needs one when any block in it, or an `-- after:` block they bring, names a table or view the boot block creates (the names in its `CREATE TABLE` and `CREATE VIEW` statements, matched as whole words). Today that is `s4-cells`, in `s2`, `s3`, `s4`, `s5` and `c1` (`.sql`; c1 through `s5-gistar`) and in `s2`, `s3`, `s4`, `s5` and `setup` (`.py`; `setup` for §3.3's `gpkg-export`). A boot block drops what it builds before building it, so a file runs on a freshly loaded database, and again: a learner can open any module's file first, in any order. In a `.py` the boot block runs through the helper, `with connect() as conn: conn.execute("""<its SQL>""")` (psycopg sends a statement list without parameters as one simple query, and the `with` commits it), and in a notebook it is its own cell. A miss is caught by the assembled run (7.6), which starts each file from a fresh load.
- **Untested blocks** are in their download, so the learner has them, but never run from it: running `e1.py` mustn't submit a GBIF download or stop on missing credentials, and `d4.sql` mustn't run a window's lines in one session. In a `.sql` or `.py`, such a block at its page position is one line `-- not run from this file: <its reason>. Run it by hand, as its page says.` (`#` in Python), its headers as written, then every other line of its code behind `-- ` (`# `): no `BEGIN; … ROLLBACK;`, no `-- after:` blocks brought for it, and it doesn't count towards the boot setup. In a notebook it is a Markdown cell, the same line and then the code as a fenced block, never a code cell. Which blocks follows their status in the build's own run, so a block a later mission makes `ran` is live in its file from then on. Today: `d4-wait`, `d4-isolation`, `d5-database` (L2), `g3-iucn` (L3; g7's three blocks until L3 makes them `ran`) and `e1-submit` (L4; `s6-habitat` until L4 makes it `ran`). §3.4's `arcpy-moran` runs in Pro's Python window and is in no download; nor is Power BI's M and DAX (below).
- **`<module>.py`** and **`<module>.ipynb`**: the module's Python blocks, `py-connect` first, then the boot setup, then each block once, in page order, with its `# q:` line as a comment (the notebook: one cell per block, and a Markdown cell with the block's heading). They read the lab data from `LEARN_BASE` (default `https://critwire.com`) and connect with libpq's `PG*` variables, as in §3.3. §3.3's Python blocks (`py-smoke`, `gpkg-export`) download as `setup.py` and `setup.ipynb`.
- **`requirements.txt`**: §3.3's pins; the setup page gives the `uv` commands.
- **Power BI** has no download of its own: a `.pbix` can't be built or tested here (§3.5). Its data files are the star's CSVs under `/learn/data/star/`, which p1 loads by URL.
- **The capstone's worked feed** (`c1-feed.json`, written by `c1-feed`'s query) and its schema (`c1-feed.schema.json`, §5.7).

### 7.4 Progress, without accounts

One `localStorage` key, `critwire.learn.done.v1`, holds `{ "<module id>": "<YYYY-MM-DD>" }`. "Mark done" on a module page sets it, and so does solving a foundations module's "Already know this?" exercise. The map and the track pages show a tick for each done module; "Clear progress" on `/learn/` removes the key. Nothing else is stored: no editor text (002), no answers, no cookie, nothing sent anywhere. A browser that refuses storage still runs every module; the ticks just don't persist.

### 7.5 How the build writes it

`writeLearn` (002 §8), generalized, still offline and still one step of `pnpm build`.

**Sources in the repository:**
- `site/learn/curriculum.json`: the tracks in order, and each module's `id`, `slug`, `title`, `track`, `tool`, `hours`, `prereqs` and `state` (`built` or `planned`). §2's table is its first content.
- `site/learn/modules/<id>.html`: each built module's text, with `{{block:<q-id>}}` slots where its blocks go.
- `site/learn/sql/<q-id>.sql` and `site/learn/labs/<q-id>.py`: every block, without its plan-only header lines, as 002 §8 keeps lesson SQL; Power BI blocks the same, as `.m` and `.dax`.
- `site/learn/labs/checked/`: what `learn:check` recorded, one file per block (its result) and `checked.json` (below).

**It refuses** (each a build failure naming the file):
- a module whose prerequisite is unknown, or prerequisites that form a cycle; a module slot with no block file, or a block file no page uses;
- a stale ERD SVG (002 §3);
- a PostGIS or Python block whose freshness key differs from `checked.json`: "lab <id> is stale: run pnpm learn:check";
- a breach of the 50 MB cap (§4.4); a lab file without `sources`, or another credit failure (§4.5);
- any missing file.

**`checked.json` freshness.** For each lab block, one sha256 over everything that decides its result: its own source; the source of every block it runs with, which is its `-- after:` (`# after:`) blocks, transitively, every `-- boot` block (committed before every PostGIS and Python block, so `gpkg-export`, which reads `s4_cells`, depends on `s4-cells`), and `pg-session` or `py-connect`; the data manifest; the loader; the checker's own source files; and `requirements.txt`. Each input enters with its id or path, in a fixed order (block ids sorted, then the files), so editing `s4-cells`, `py-connect` or an exercise's lesson makes every block that runs it stale, not just the block edited. Beside the block keys, each download's sha256 as assembled (7.3), so a download that changes, through its blocks or the assembly itself, is stale until 7.6 runs it again. All are files in the repository or in `dist/`, so the build recomputes them offline and compares. The versions of PostgreSQL, PostGIS, Python and the packages are recorded beside them and shown on the page, but not compared: the build may run on a machine with other versions, and `deploy` must not depend on the checker's machine.

### 7.6 `pnpm learn:check`

A development command, never part of `build` or `deploy`. It is the repository's port of §0's runner, PostGIS and Python engines, not a second harness: once L2 lands it, the spike is frozen as this mission's evidence and never extended.
- It runs the loader and every PostGIS block, and (from L4) every Python block in `.venv-learn`, and writes their results and `checked.json`.
- **Then it runs every download as assembled**, as a learner would: the files the build's own assembly function writes (7.3), each on a freshly loaded database (the loader, then the file), so no file leans on another's tables. A `.sql` runs with `psql -X -f`; its `ERROR:` lines must be exactly those its `-- expect: error` and `-- fails:` statements announce, in order, each containing the announced text. A `.py` runs in `.venv-learn` from an empty folder, with no `GBIF_*` variable in its environment, and must exit 0, so an `e1-submit` left live fails here. The `.ipynb` isn't run again: E2E proves its cells equal the `.py` (7.7). The leak check (§0) runs after each file. A failure names the file and its first unexpected error, and nothing is written to `checked.json`.
- It connects with libpq's `PG*` variables, or `LEARN_PG_URL`, never `DATABASE_URL` (whose role, `critwire`, can't create roles). On critwire's server that is `critwire_dev` as `critwire_lab` through `LEARN_PG_URL` (§0; `learn:check --setup` creates the role and writes the URL); on the owner's WSL, the owner's own PostGIS (`AGENTS.md`'s two machines).
- It refuses the database `critwire` twice: by name before connecting, and by `current_database()` after, so a service file or `PGDATABASE` can't slip past. It checks for CREATEROLE first and says it's needed. The `learn_spatial` canary (§0) runs only where that schema exists, read as libpq's default role (the schema's owner), so `critwire_lab` needs no grant on A2's schema.
- **The loader stage (L1)**, under one advisory lock (`critwire.learn`) for the whole run: the loader's sha256 against the manifest; two loads, each giving the manifest's `tables` counts; then the **forced failure**: a temp copy of the loader with the first `occurrences` row repeated before that COPY's `\.`. Every COPY succeeds and psql must exit non-zero at `ALTER TABLE occurrences ADD PRIMARY KEY`, naming the duplicate id, with every table's count and md5 equal to the second load's: the whole load is one transaction. A cut COPY isn't used (on a row boundary psql exits 0 and the disconnect rolls back), and a loader without exactly one `COPY occurrences (id, …)` with rows fails "loader layout changed" before any load. Then `pg-role-smoke` (its own BEGIN/ROLLBACK, last SELECT 0), the canary and the leak check.
- **Cleanup:** every exit, a failed check or SIGINT/SIGTERM included, cancels the running psql (SIGINT, so the server rolls back), releases the lock, ends the connections and removes the temp loader.
- L1 creates it with the loader stage; L2 adds the blocks, the cleanup lint and the in-transaction leak check (§0); L4 adds Python.

### 7.7 E2E

The repository's harness, unchanged in kind (002 §8): `pnpm build`, then Playwright headless Chromium against the local Caddy copy of the live block on 3100; expectations computed from `data/` and the manifests, never typed in; no request leaves 3100. New specs:
- **`learn-map`**: the map lists `curriculum.json`'s tracks and modules in order, with hours and prerequisites; planned modules aren't links; a done tick survives a reload, and "Clear progress" removes it.
- **`learn-browser`**: every browser block runs in its page without an error; every exercise accepts its answer and rejects a fixed wrong one; every "Already know this?" check marks its module done; Reset and Stop work; moving across three module pages starts the engine once.
- **`learn-labs`**: each PostGIS, Python and Power BI block's code on its page equals its download; each download that names a boot block's table holds that boot block right after `pg-session` or `py-connect`; each `untested` block is in its `.sql` or `.py` commented out under its reason (its code, the `-- `/`# ` taken off, equals the page's) and in its notebook as a Markdown cell, never a code cell; the result shown equals the recorded one; every `.ipynb` cell equals its block in the `.py`; the capstone's feed validates against its schema.
- **`learn-data`**: every file's sha256 and size against `manifest.json`, row counts, CSV headers, the star's key coverage, the 50 MB cap, every file's `sources`, and the `/learn/data/` index listing every dataset of the sample with title, publisher and license.
  - **L1** (`e2e/learn-data.spec.ts`): the manifest lists exactly the folder's files; each file's sha256 and size; Parquet and CSV rows and columns (types as the build's reader sees them: GeoParquet's `geom` as WKB) and CSV headers; the occurrences equal `data/raw/gbif-sample/sample.csv` and `datasets.csv` its `datasets.json` entries; the loader's `tables` equal counts from `data/`; the cap; sources and citations; both DOIs equal the sample's `registration.json`; `inputs` equal the served `/v1` files and the committed sample; the index lists every file, every dataset (title, publisher, DOI, license, records) and both DOIs; screenshots at 1280 and 375 px. Global setup's `assertBuilt` also refuses a `dist/learn/data/` whose `inputs` or copied `data/learn/` files are stale.
  - **L2**: the star's key coverage (the star files are L2's).
- **`schema`**: the three ERDs' drift against the databases they describe (§6), and the SVG pages.
- **`serving`**: `.wasm` content types and the fixed modification times of `/learn/assets/` (002 §8).

**Artifacts**, as today in `E2E_ARTIFACTS`: the Playwright HTML report, a trace per test, `results.json` and screenshots of the map, one module page per tool and the data index at 1280 and 375 px, reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

## 8. For the owner only: the vault overlap

**For the owner only.** Which critwire modules your private vault study guides already cover, so you can skip or skim them. Read-only: titles and topics only, confirmed on 2026-10-24 with `git -C /srv/critter-ai/vault ls-tree -r --name-only main -- research/sql-server-spatial wiki` and `git -C /srv/critter-ai/vault ls-tree -r --name-only agent/pro-python-arcpy -- research/arcgis-pro-study-guide`. Nothing from the vault is copied here. "Module NN" is `research/sql-server-spatial/module-NN-…` on `main`; "wiki" pages are `wiki/<name>.md` on `main`; "pro-python-arcpy" is `research/arcgis-pro-study-guide/` on branch `agent/pro-python-arcpy` only.

| critwire | Vault guide | Verdict |
|---|---|---|
| f1–f3 | module 04 (SELECT, JOIN and GROUP BY) | covered: take the "Already know this?" checks and move on |
| f4 | no title covers CTEs or window functions | take its skip check; do the module if it fails |
| d1 | modules 01, 02, 05; wiki relational-model-and-keys, database-constraints, database-views | covered; generated columns and what an FK doesn't check are new |
| d2 | module 03; wiki normalization | mostly covered; nested JSON → 3NF and the license-placement finding are new |
| d3 | module 07; wiki indexes-and-execution-plans | concepts covered; PostgreSQL's `EXPLAIN`, GiST, BRIN and planner statistics are new |
| d4 | module 06; wiki transactions-and-acid | covered; MVCC (`xmin`), savepoints and `ON CONFLICT` are new |
| d5 | modules 16, 17; wiki logins-users-and-roles, database-schemas-and-ownership | SQL Server's model covered; PostgreSQL's roles, default privileges and RLS are new |
| g1 | module 08; wiki spatial-reference-identifiers, sql-server-geometry-vs-geography | covered; skim the PostGIS spellings |
| g2 | modules 09, 10; wiki well-known-text-and-binary, ogc-simple-features | covered; the psql-only loader is new |
| g3, g4 | modules 11, 12 | covered; skim (g3's coast disagreement is new) |
| g5 | module 13; wiki sql-server-spatial-indexes | SQL Server's grid indexes covered; GiST and KNN `<->` are new: take it |
| d6, g6, g7, s1–s6, p1–p4, c1 | none | new: the core gap |
| e1–e5 | pro-python-arcpy: Part 1 (Python basics), Projects 1–2 | Python covered; APIs, downloads with DOIs, PostGIS loads and scheduling are new |
| §3.4 arcpy notes | pro-python-arcpy: Parts 2, 3 and 3 continued | covered |
| vault only | modules 00, 14, 15, 18, 19; wiki backup-and-recovery-models, enterprise-geodatabase, query-layers, arcgis-database-connections, arcgis-pro-license-levels | critwire doesn't teach these |

**A fast path for you**, from the table: the f-module skip checks (minutes), then d6, g5–g7, s1–s6, e1–e5 (the parts marked new), p1–p4 and c1 in full; d1–d5 and g1–g4 skimmed for their PostgreSQL differences. That is about 45 of the 68 hours, plus the skims.

## 9. Build missions

Five missions build the course, one after another, each from a ready-to-start brief in `plans/briefs/` (the ops brief format). Each takes this document as its design: it builds what 004 says, and "where code proves 004 wrong, fix it and update 004 in the same commit". Each merges its own pull request and deploys critwire at its end, so the next one starts from a live site; each reads the previous one's Summary first. Every estimate is the six pipeline stages, the steps, the code review, the verification and the release, well within 60 sessions.

| # | Brief | Mission | Builds | Needs from the one before | Sessions |
|---|---|---|---|---|---|
| L1 | `plans/briefs/critwire-learn-l1-data.md` | `critwire-learn-l1-data` | `/v1/countries.*` (002 §6); `/learn/data/`: the GBIF sample (`ingest gbif-sample`, its derived-dataset DOI with `gbif:register --target learn-sample`), the Natural Earth and RESOLVE shapes, A2's habitat stand-ins, the loader, the manifest and credits, the index page, the 50 MB cap (§4); `pnpm learn:check`'s loader stage (§7.6); `AGENTS.md`'s copy line (§10); E2E `learn-data` | 004 merged; the owner's §10 answers | 32–38 |
| L2 | `plans/briefs/critwire-learn-l2-site.md` | `critwire-learn-l2-site` | The engine and app core (002 §1, §8) on schema v2; the map, track and module pages, progress, `/learn/setup/`, the playground (§2, §7); f1–f4 and d1–d6 in full (§5.1–5.2); the three ERD pages (§6); `writeStar` with the records fact; SQL downloads; `learn:check` for every PostGIS block, with its lints and `checked.json`; E2E. The design spike is frozen from here | L1's data, loader, credits and `learn:check` | 34–40 |
| L3 | `plans/briefs/critwire-learn-l3-gis.md` | `critwire-learn-l3-gis` | `ingest habitat` (003 §5, v004): summaries for every country, `occurrence_habitats`, the Costa Rica and Tasmania clips; the loader and the lab ERD grow; g1–g7 in full (§5.3) | L2's pages, templates and `learn:check` | 28–34 |
| L4 | `plans/briefs/critwire-learn-l4-stats-etl.md` | `critwire-learn-l4-stats-etl` | `requirements.txt` and `uv` (§3.3, unless L1 brought them); `learn:check`'s Python stage; `.py` and `.ipynb` downloads; s1–s6 and e1–e5 in full (§5.4–5.5), Gi\* and LISA tested against esda | L3's habitat data; the hexagon cells (g6, s4) | 30–36 |
| L5 | `plans/briefs/critwire-learn-l5-powerbi-capstone.md` | `critwire-learn-l5-powerbi-capstone` | The habitat fact in `writeStar`; p1–p4 and c1 in full (§5.6–5.7), the game feed and its JSON Schema; a curriculum pass (all 33 modules built); a handoff item for the owner's Power BI check | L4's s5 (Gi\*), s4's cells and e4's credits | 22–28 |
| | | | | **Total** | **146–176** |

**Why this order.** Every lab reads L1's files, and L1 holds the course's only network write (the derived-dataset registration), so data comes first. L2 builds the site on it with the ten modules this document already writes in full. The habitat ingest is the largest data job and spatial statistics and Power BI both read it, so L3 comes before them. Python (L4) arrives with the modules that need it. Power BI and the capstone (L5) use every earlier track.

**The same data throughout.** L1 republishes the spike's sample (§4.2: the same download and the same rules give the same 40,395 records), so every result recorded here holds on the published files, and a build mission that gets a different result has found a bug, not a new number. The one planned change is L3's: its habitat summaries replace A2's two-country stand-ins, so the blocks that read them (`pg-smoke`, `d4-xmin-load`, d6's habitat blocks and `d6-drill-across`, `p1-load`'s inputs, `p3-check`, `p3-measures`) are re-run and updated, with the reason, in the same commit.

**How they're queued.** After the owner has reviewed this document and answered §10 (or accepted its recommendations), the control room copies the five briefs to `/srv/critter-ai/agent-state/missions/briefs/<date>-critwire-learn-l<n>-<slug>.md` (the file name minus the date is the mission's name, branch and worktree) and starts them as `queue-learn.sh` started A1 and A2: `mission start critwire` for L1; wait until its plan says `status: done` and its `## Release` has `Result: done`; start the next; and push one alert, then keep waiting, if a mission stops before finishing. Each brief's start comment repeats its precondition, so a mission started by hand checks the same thing. §10 item 7 gives the alternative of stopping after L2.

**Between missions** the owner checks what this server can't (§10 item 8): after L2, Docker PostGIS on Windows with the loader and one d-module download; after L5, Power BI Desktop against the live star. Each is a handoff item from the mission before it; neither blocks the chain.

**Superseded briefs.** `plans/briefs/critwire-learn-b1.md` (by L1 and L2), `critwire-learn-b2.md` (by L2; the cookbook and game are dropped), `critwire-learn-c.md` (no successor: traits and names are deferred) and `critwire-learn-d.md` (by L1 and L3) each carry a dated "Superseded" line at the top and are otherwise unchanged.

## 10. For the owner: choices

Choices that change cost, licensing, what goes public, or how much gets built. Each has a recommendation and its cost; the numbers are the spikes' (§A). Answer in the PR or to the lead before L1 starts. Without an answer, the build missions build the recommendation: each brief says so (§9), and an answer overrides its brief.

| # | Choice | Recommendation | Mission |
|---|---|---|---|
| 1 | Where lab data lives, and who can read it | `/learn/data/`, no CORS | L1 |
| 2 | The GBIF sample | download API, ≤ 2,000 per species, its own derived-dataset DOI | L1 |
| 3 | DuckDB's `spatial` extension in the browser | no | L2 |
| 4 | 002's open items | as 002 recommended | L2 |
| 5 | The habitat raster | v004 summaries plus the Costa Rica and Tasmania clips | L3 |
| 6 | `AGENTS.md`'s copy line | the replacement below | L1 |
| 7 | The chain | all five missions | all |
| 8 | Two Windows checks | yes, after L2 and after L5 | L2, L5 |
| 9 | Deferred data | traits, names and CHELSA later; WDPA, WorldClim and IUCN never hosted | none |
| 10 | The effective-license rule | keep it | L1 |

1. **Lab data at `/learn/data/`, without CORS (§4, §4.6).**
   **Recommendation:** publish the lab files under `/learn/data/`, outside `/v1`'s "only additions" promise, and add no CORS rule. Every reader the course has is same-origin (the course's own pages) or not a browser (psql, Python, Power BI).
   **Cost:** a page on another website can't read the lab files in its visitors' browsers; downloading them, or reading them from Python or Power BI, still works. Alternatives: `/v1/learn/` (CORS today, but every lab file then has to keep its columns and meaning for good), or one Caddy rule adding CORS on `/learn/data/` (a control-room change, nothing else).

2. **The GBIF sample: the occurrence download API, at most 2,000 records per species, registered as its own derived dataset (§4.2, §A.1).**
   **Recommendation:** as the spike did. L1 reuses the spike's download (`10.15468/dl.fbpk9w`) and registers the sample before GBIF's deletion date for an uncited download, 2027-04-23, so the published sample is the 40,395 records every result here was recorded on. Only the capped sample and its provenance are committed; the 34.7 MB zip and the 394,532-record download stay at GBIF under its DOI.
   **Cost:** one more GBIF registration (`gbif:register --target learn-sample`, tags `gbif-learn-*`), with its own refresh, the same steps as `AGENTS.md`'s DOI refresh; about 5.3 MB of public files (`occurrences.parquet` 0.62 MB, `occurrences.csv` 4.59 MB, `datasets.csv` 0.07 MB) plus the same rows in the loader and the star; about 4.9 MB in git per refresh (`data/raw/gbif-sample/`). A different cap reuses the archived download (no new request) as long as it exists; the registration keeps it for good. Uncapped, the open records would be 44.6 MB as CSV: over the 50 MB cap with the rest, so they are never published.

3. **No `spatial` extension in the browser (§3.1, §B).**
   **Recommendation:** none. The browser does light spatial work in plain SQL (bounding boxes, 10° bins, haversine distance); GIS is taught in PostGIS, where practitioners use it.
   **Cost:** no `ST_` functions in the browser, so every GIS module needs the learner's own PostGIS (§3.2). Committing `spatial` would cost 23.6 MB in git history per DuckDB version (003 §8 item 5).

4. **002's open items, carried over (002 §10).**
   **Recommendation:** as 002 recommended. Items 1, 2, 4, 6 and 9 stand as written there (the start time, the engine pin `1.33.1-dev65.0`, `/v1/countries.*`, light and dark themes, no DuckDB shell). Three still need your yes:
   - **Commit the `parquet` extension** (002 §10 item 3): 3.22 MB in the public repo's history, and as much again at each DuckDB upgrade; the build stays offline. L2 commits it.
   - **Caddy headers** (002 §10 item 7): precompression, `immutable` on `/learn/assets/*`, `no-cache` on `/v1/*`. They cut the first engine load from 9.02 to 6.25 MB. One control-room change to the live Caddy block; Learn works without it, and L2 builds without it unless you approve.
   - **Photos stay linked from Wikimedia** (002 §10 item 8): a network that blocks `wikimedia.org` shows cards without photos; hosting copies would cost 5.7 MB and CC BY-SA redistribution.

5. **The habitat raster, as 003 §8 items 2–4 and 7 (§4.1, §5.3 g7).**
   **Recommendation:** Jung et al. 2020 v004 by URL: country summaries, the habitat class at each sample record, and two clips (Costa Rica, Tasmania); no reading from your S3 bucket; `ingest habitat` runs on the VPS as `critter-ai` over the socket, with no `GRANT SET ON PARAMETER`. The COG's provenance (003 §8 item 3) is still unanswered; nothing waits on it.
   **Cost:** about 37 min and 695 MB from Zenodo per `ingest habitat`, plus a one-off 2.45 GB download to cut the clips; about 3 MB of clips (estimated; A2's Costa Rica clip was 1.42 MB) in git per refresh. It brings `/learn/data/` to an estimated 44–48 MB of the 50 MB cap (§4.4 gives the cuts if L3 measures more). Summaries are estimates; 003 §5 gives each method's measured error.

6. **`AGENTS.md`'s copy line, replaced by L1.**
   **Recommendation:** replace "No Wikipedia prose (share-alike); write copy fresh for grades 6–12." with: "No Wikipedia prose (share-alike). Write all copy fresh, in our own words, for adults new to the topic: plain, precise English a working professional reads fast; define each term once; link to open references instead of rewriting them."
   **Cost:** none: the line governs copy written from now on.

7. **The chain: five missions, about 146–176 sessions (§9).**
   **Recommendation:** queue all five, L1 to L5.
   **Cost:** five design reviews, five code reviews and five releases, each needing nothing from you unless a mission adds a handoff item. Alternative: stop after L2 (about 66–78 sessions): foundations and database architecture are then live, with the lab data, and you decide on L3–L5 after using them.

8. **Two Windows checks, about 30 minutes each (§3.2, §3.5).**
   **Recommendation:** do both. After L2: install Docker PostGIS (or native) on your PC as §3.2 says, run the loader and one d-module download. After L5: open Power BI Desktop, run p1's query against the live star and p2–p4's DAX queries, and compare each table with its PostGIS twin (`p2-check`, `p3-check`, `p4-check`). Each is a handoff item from that mission; neither blocks the chain.
   **Cost:** your time. They are the only tests of what this server can't run: Windows, Docker, Power Query M, DAX and the visuals. Every byte Power BI reads is tested here already (§A.3).

9. **Deferred data (003 §8 items 1, 8 and 9).**
   **Recommendation:** no traits, names or tree-of-life tables (003's mission C: no module needs them); CHELSA climate (CC0) after L3, if a module asks for it; WDPA and WorldClim never hosted (their terms forbid it); the IUCN request not sent (g3's appendix reads the learner's own download, untested).
   **Cost:** none now. Each later dataset is its own ingest and a later mission.

10. **The effective-license rule (§4.2, §B).**
    **Recommendation:** keep it. A record's license is the more restrictive of its own and its dataset's, and only effective CC0 1.0 and CC BY 4.0 are published. "If unclear, don't publish": 11 datasets declare CC BY-NC 4.0 while GBIF labels their records CC0 or CC BY.
    **Cost:** 13,467 of the download's 394,532 records are left out before the cap (12,733 of them iNaturalist's research-grade observations), and the Yangtze giant softshell turtle has no record in the sample. Alternative: trust each record's license, as GBIF's filter does; the sample then gains those records up to the cap, and critwire republishes records whose dataset says non-commercial.

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

**Natural Earth's `release` in `attribution.json` is an object** (002 §6 Credit; L1 S5). 002 gave the entry `"release": "v5.1.2"`, a bare string, while Catalogue of Life's `release` in the same array is an object (`key`, `alias`, `version`, `issued`). One key with two types breaks typed readers (a Parquet or pandas column, a TypeScript type). L1 publishes `"release": {"version": "v5.1.2", "issued": "2022-05-13"}`, a subset of COL's keys, so the key keeps one shape. The rest of 002 §6's entry is as designed: `fields` `countries.{name,continent,region,subregion}`, `records` 250, `license` "Public domain" with a null `licenseUrl`, the long citation, and `notes`.
