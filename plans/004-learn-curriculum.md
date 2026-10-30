# critwire Learn: a practitioner curriculum (design)

Design for critwire Learn as a practitioner course in database architecture, GIS in SQL, spatial statistics, ETL and Power BI, taught on critwire's open species data and other open data. It starts from a little SQL and everyday GIS, covers the foundations fast, then goes deep. It replaces the course in `plans/002-learn.md` and `plans/003-learn-data-spatial.md` and reuses their engine, schema, data and licensing findings (§1). Every SQL and Python block here is tested (§0). Nothing public changes until the build missions in §9 run.

Written by mission `critwire-learn-curriculum` (plan `plans/2026-10-23-critwire-learn-curriculum.md`); a section marked "(S<n>)" is written by that plan's step S<n>.

## 0. Conventions

Every example in this document is tested. A block is a fenced code block whose first lines are headers. The test runners read the headers, run the block on the engine they name, and compare what they get with the result block printed under it: `pnpm learn:check` for PostGIS and Python (§7.6), E2E for the browser (§7.7). A block that can't run here says why.

### Blocks, engines and statuses

- **Every block has an id and a status.** SQL: `-- q: <id>`, then `-- status: ran` or `-- status: untested: <reason>`. Python writes `#` for `--`; Power BI's M and DAX write `//`. Module blocks are named `<module>-<word>` (`d3-plan`); engine and setup blocks have plain ids (`setup`, `pg-session`). Ids are unique in the document.
- **`ran`** means the block ran on the data named in the log header (below) and gave the result printed under it; Verification runs it again and fails on any difference. **`untested: <reason>`** blocks never run: they need something this server doesn't have (Windows, ArcGIS Pro, a learner's own download). Nor do they run from a download: there they are commented out (§7.3). A failing block is fixed, never relabelled `untested`.
- **Engines:**
  - SQL with no `-- engine:` line (or `-- engine: duckdb`) runs in DuckDB-WASM in headless Chromium, on the browser database the `setup` block builds (below), as a page runs it.
  - `-- engine: postgis` runs in PostgreSQL 16 with PostGIS 3.4.2, in schema `learn_curriculum`, after the loader and `pg-session` (below).
  - ```` ```python ```` blocks run in the pinned `uv` environment (§3), each in its own process, isolated (`python -I`), from an empty folder, connected through libpq's `PG*` variables. Their search path starts as `pg_catalog`, so a block that skips the `py-connect` helper fails on its first table name instead of quietly reading another schema.
  - ```` ```m ```` and ```` ```dax ```` blocks (Power BI) never run; their status is always `untested: Power BI is Windows-only`. Each names its inputs (`// input: star/<file>.csv, …`, or c1's feed, `labs/c1-feed.json`) and the runner checks those files instead: for a star file, the file exists, its header equals the star manifest's columns, primary keys are unique and filled, every foreign key finds its dimension row, and rows and sha256 equal the manifest's; for the feed, its rows are its cells and its sha256 is the served file's. A DAX block also names its twin (`// twin: <id>`), a ran PostGIS block on the same page that computes the table the DAX query should return from the same files; an M block has none. The twin checks the arithmetic only, not M parsing, relationship direction, filter context or DAX execution.
- **More headers:**
  - `-- after: <id>, …`: those earlier blocks of the same engine run first, in the same transaction, in the order named; the result is still this block's last statement. An exercise runs after its lesson this way. A PostGIS block may also name a ran PostGIS block on a page in its scope: its module's prerequisites, transitively (§2), so p3's twin can run d6's star blocks and c1's feed `s5-gistar`. Scope is transitive, execution isn't: the block runs exactly the blocks it lists, in that order, each with only its own statements, never their own `-- after:` blocks, so it lists every block it needs (the download does the same, 7.3). A browser block names only earlier blocks of its page, since the browser runs them from the page. Python's `# after:` puts the named blocks' code first, in document order, in one process; it names earlier Python blocks of its page, or `py-connect`, the course-wide helper (below) any page may name.
  - `-- expect: error <text>`: the last statement must fail with an error containing `<text>` (d1's constraint violations); the block fails if it doesn't.
  - `-- plan: <text>`, `-- plan: no <text>`, `-- plan: rows <n>` (PostGIS, on a block whose last statement is `EXPLAIN (ANALYZE …)`): what the plan must show, by meaning: some plan line contains `<text>` (a node, an index, an `Index Cond`); no line contains it; the top node's `actual rows=<n>`. Every such block has one `rows` line and at least one about its nodes (d3).
  - `-- params: [<value>, …]` (DuckDB only): JSON values for the last statement's `?` placeholders, as a page binds a learner's input.
  - `-- needs: raster` (PostGIS): the block uses PostGIS raster, so the run checks once, before the first such block, that the raster library answers and its two settings are a learner's defaults (`postgis.enable_outdb_rasters` off, `postgis.gdal_enabled_drivers` `DISABLE_ALL`): a block that passes needs no setting (g7, s6). Raster functions anywhere else are refused.
  - `-- boot` (PostGIS): runs once when the runner connects, before every other block, and is committed. It builds fixtures later blocks read (s4's hexagon grids); its tables are listed `lab-made` on the lab ERD (§6.2).
  - `-- tx: own` (PostGIS): the runner doesn't wrap the block. It runs its own `BEGIN` … `COMMIT` or `ROLLBACK`, as typed in psql (d4). Afterwards the runner checks that the block ended its transaction, left the session as it found it, committed no `learn_` role or schema, and left `learn_curriculum` (and the canary) unchanged; it puts back what it can (rolls back, restores the session, drops the lab role's committed objects) and fails the block either way. Inside one, a statement whose comment line says `-- fails: <text>` must fail with an error containing `<text>`, and the block goes on, as psql does when you type without `ON_ERROR_STOP`; any other error fails the block. Its result is the last statement that returned rows, so a block can show what it built and then roll it back or drop it.
  - `-- sessions: A, B` (PostGIS): the block is typed in two psql windows (d4). A `-- window A` comment line sends the statements after it to that window's session; the runner opens one session per window, after `pg-session`, and runs the statements in the order written, unwrapped, as `tx: own` does. A statement after a `-- waits: <why>` comment line must wait for another window's lock: the runner must see it blocked within 5 seconds, leaves it waiting, and collects its result when its window comes up again. Any other statement that waits fails the block at once and is cancelled. `-- fails:` works as in `tx: own`. Afterwards each window must have ended its transaction, with `tx: own`'s checks on `learn_` objects and on `learn_curriculum`; both sessions end. Its result is every statement that returned rows, as `window | statement | <columns>` (`statement` is its number in the block), so those statements must have the same columns. It can't take `after`, `boot`, `expect` or `tx`. In a download it is commented out, since one psql file is one session (§7.3).
  - `# timeout: <seconds>` (Python): when the block is stopped; 60 by default.
  - `-- show: cards` is not a test header: it stays in the SQL learners see, and the page shows the result as animal cards (002 §8).
- **Every other SQL block runs in a transaction the runner rolls back,** so each starts from the same database and the order of modules doesn't matter. Results must be deterministic: rows ordered by a unique key, `random()` only after `setseed()`, no clock; Python prints with explicit formats, never a DataFrame's repr.
- **Result blocks.** The ```` ```text ```` block under a `ran` block starts `-- result: <id> · <n> rows · sha256 <12 hex>`, then the column names, the first 5 rows (cells cut at 60 characters) and how many more. The hash covers the column names and every row, uncut, so the 5 rows shown don't limit what is checked. A Python result starts `-- result: <id> · python · sha256 <12 hex>`, then the block's whole output. Only a run writes results (`pnpm learn:check --update` for PostGIS and Python); a changed result is a bug to explain, and lands here and in its recorded file together. An `EXPLAIN` block is the exception: its result block is an example of the plan, from the PostgreSQL, PostGIS and GEOS versions the page names, and the run checks its `-- plan:` lines instead of its hash, because plan text moves with versions and statistics. Data results keep their hashes.
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

The tests are the repository's. From a checkout whose `.env` has `LEARN_PG_URL` (§7.6): `pnpm build --draft && pnpm learn:check && pnpm build`, then `pnpm e2e`.
- `pnpm learn:check` runs the loader, every PostGIS block and then every Python block of the built pages in page order against its recorded result (`site/learn/labs/checked/<id>.txt`), the agreement gates between SQL and PySAL, the lab ERD against `learn_curriculum`, and every `.sql` and `.py` download on a fresh load (§7.6). `--update` rewrites the recorded results; `--module <page>` runs one page and writes nothing. E2E runs every browser block against its recorded result (`e2e/__snapshots__/<id>.txt`) and checks the Power BI inputs and schema v2's ERD (§7.7).
- `pnpm learn:port --check all` proves that every block file and recorded result in the repository equals its fence and result block here, so a change lands in this document and on its page in the same commit.
- **Results** are in this document, under each block, and in those recorded files; `checked.json` records the PostgreSQL, PostGIS, GEOS, GDAL and Python versions they ran on, and the sha256 of the labs' `requirements.txt` (§7.5). The design spike, `SP=/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike` (not committed), is frozen as the design's evidence and never extended: its run log (`/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/queries.log`: engine versions, the canary, every lab file's sha256), `$SP/out/<spike>/summary.md` (§A) and the first ERD renders in `$SP/erd/`. Its log is still the only run of the blocks of modules not yet built (p, c), until the mission that builds each module ports and checks them.

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
UNION ALL SELECT 'occurrence_habitats', count(*) FROM occurrence_habitats
UNION ALL SELECT 'habitat_clips', count(*) FROM habitat_clips
ORDER BY table_name;
```

```text
-- result: pg-smoke · 16 rows · sha256 958789792d50
table_name | n_rows
admin1_shapes | 294
biomes | 14
countries | 250
country_habitats | 5578
country_shapes | 247
… 11 more rows
```

Labs that create roles or schemas (d5) clean up in the same block, so running a block twice, or stopping halfway through a module, leaves nothing behind. Their names start with `learn_`, and creating roles needs the CREATEROLE privilege (a superuser has it; on your own install, see §3.2). This check creates a read-only role, reads a table as that role, and removes it again: `DROP OWNED BY` takes away what the role was granted, and only then can `DROP ROLE` remove it. `pnpm learn:check` runs it from `site/learn/sql/pg-role-smoke.sql` as it runs every block: inside the runner's transaction, which it rolls back, so a failed line leaves nothing.

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

Seven tracks, 33 modules, about 68 hours. Foundations come first and go fast; then the five areas; then a capstone that uses all of them. Each module answers real questions with the lab data (§4) on one or two tools (the capstone on three): **B** the browser (DuckDB-WASM, nothing to install), **PG** your own PostgreSQL with PostGIS, **Py** Python in the `uv` environment, **PBI** Power BI Desktop (§3). Hours include the lab and the exercise. A module's id names its blocks (`d3-plan`) and its page (§7).

The table is in prerequisite order: every module's prerequisites come above it, so working down the table never meets a module that needs a later one. After f3 the tracks branch: GIS in SQL needs only f3 (and d3 for g5), ETL starts from f2, and Power BI waits for d6. **Depth** is what this document holds: every module is `full`, written out in §5 (concept, worked example, lab, result, exercise, answer, check, dialects). Until its build mission (§9) wrote it, a module was an `outline`: the goal, data, key code and expected result.

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
| g1 | GIS in SQL | crs | SRIDs, `ST_Transform`, geometry vs geography, Web Mercator's area error | How big is Tasmania in EPSG:3857, in EPSG:3577 and as geography? Why does Web Mercator overstate it? | PG | 1.5 | f3 | full |
| g2 | GIS in SQL | load-validate | The loader, WKT and WKB, `ST_IsValid`, `ST_MakeValid` | Which shapes are invalid, and why? What does `ST_MakeValid` change? | PG | 1.5 | g1 | full |
| g3 | GIS in SQL | spatial-join | `ST_Contains`, `ST_Covers`, `ST_Intersects`; point in polygon; records on boundaries | Do GBIF's country codes agree with the country outlines? Which records fall on a coast or in no country? | PG | 2.0 | g2 | full |
| g4 | GIS in SQL | measure-overlay | Distances on the ellipsoid, `ST_DWithin`, buffers, `ST_Intersection` | How much of each country does each ecoregion cover? Which records lie within 10 km of a border? | PG | 2.0 | g3 | full |
| g5 | GIS in SQL | spatial-index | GiST, the `&&` operator, nearest neighbours with `<->`, reading spatial plans | Which record is nearest to a point, found fast? When doesn't a spatial index help? | PG | 1.5 | g3, d3 | full |
| g6 | GIS in SQL | grids | `ST_HexagonGrid` in an equal-area SRID; the modifiable areal unit problem (MAUP) | How many Tasmanian devil records fall in each 5 km hexagon, and in each 10 km one? How does the picture change with the grid? | PG | 1.5 | g4 | full |
| g7 | GIS in SQL | raster | Value at a point; `ST_Clip`, `ST_ValueCount`; estimated areas and their error | Which habitat classes hold Costa Rica's records? How much of each class does a clip hold, and how good is that estimate? | PG | 2.5 | g6 | full |
| s1 | Spatial statistics | bias | Datasets, basis of record, telemetry, recording effort; framing results honestly | How much of the jaguar sample is GPS-collar data? Which datasets and years dominate a species' records? What can records say about where an animal lives, and what can't they? | PG + B | 1.5 | g3 | full |
| s2 | Spatial statistics | point-patterns | Quadrats, the nearest-neighbour index, kernel density, DBSCAN | Are devil records more clustered than chance? Where is record density highest? | PG + Py | 2.5 | s1, g6 | full |
| s3 | Spatial statistics | weights | Distance-band, k-nearest and contiguity weights; row standardization; islands; ties | Who are a cell's neighbours? What does row standardization do, and what happens to a cell with none? | PG + Py | 2.0 | s2 | full |
| s4 | Spatial statistics | moran | Global Moran's I, its expectation, variance and z-score in SQL, matched by PySAL; permutation tests | Does record density cluster across Tasmania? Do SQL and PySAL agree? How does the answer change at 10 km? | PG + Py | 2.0 | s3 | full |
| s5 | Spatial statistics | local | Local Moran's I (LISA) and Getis-Ord Gi*; false discovery rate | Where are the hot and cold spots of recording effort? Which survive a false discovery rate correction? | PG + Py | 2.5 | s4 | full |
| s6 | Spatial statistics | zonal | Zonal statistics on polygons and rasters; ratios normalized for effort | Do records over-represent some habitats or ecoregions, once effort is accounted for? | PG + Py | 2.0 | s5, g7 | full |
| e1 | ETL | extract | Search API vs download API (asynchronous, with a DOI); paging, rate limits, retries; files with checksums | How do I get every open Tasmanian devil record, with a DOI to cite? | Py | 2.0 | f2 | full |
| e2 | ETL | transform-load | Staging tables, types, `COPY`, upserts, geometry; GeoPandas to and from PostGIS | How do I load the download in one transaction, typed and checked, with each record matched to its species? | Py + PG | 2.5 | e1, d4 | full |
| e3 | ETL | idempotent | Run ids, deterministic outputs, checksums; critwire's own ingest → derive → build as the case study | Can I re-run the pipeline without doubling rows or changing its output? | Py + PG | 2.0 | e2 | full |
| e4 | ETL | quality-provenance | Data quality checks written as SQL; license filters; provenance tables; citations; derived datasets | Which datasets must I credit, and under which license? Which checks stop a bad load? | Py + PG | 2.0 | e3 | full |
| e5 | ETL | schedule | cron, systemd timers, Windows Task Scheduler; logs, alerts, incremental loads | How do I refresh weekly, and know when a run broke? | Py | 1.5 | e4 | full |
| p1 | Power BI | power-query | Power Query: `Web.Contents` on critwire's CSV files; types with an explicit culture; refresh | How do I load the star from critwire.com so that it refreshes, on any locale? | PBI | 1.5 | d6 | full |
| p2 | Power BI | model | Relationships, cardinality, filter direction, conformed dimensions, factless facts | How do I filter records and habitat areas by the same country? | PBI + PG | 2.0 | p1 | full |
| p3 | Power BI | dax | Measures: `COUNTROWS`, `DISTINCTCOUNT`, `CALCULATE`, ratios | How many sample records per 1,000 km² of forest, by country? | PBI + PG | 2.0 | p2 | full |
| p4 | Power BI | maps-report | Map visuals, honest labels, publishing and scheduled refresh | How do I build a report that maps records and never calls them a range? | PBI + PG | 1.5 | p3 | full |
| c1 | Capstone | game-feed | ETL into PostGIS → Gi* on hexagons → a Power BI report → a static JSON feed a game reads (encounter weights per hexagon, labelled as records) | What could a player meet here, honestly? | PG + Py + PBI | 8.0 | s5, e4, p4 | full |

| Track | Modules | Hours | Depth |
|---|---|---|---|
| Foundations | f1–f4 | 6.0 | full |
| Database architecture | d1–d6 | 12.0 | full |
| GIS in SQL | g1–g7 | 12.5 | full |
| Spatial statistics | s1–s6 | 12.5 | full |
| ETL | e1–e5 | 10.0 | full |
| Power BI | p1–p4 | 7.0 | full |
| Capstone | c1 | 8.0 | full |
| **Total** | **33** | **68.0** | 33 full |

**Going fast.** Each foundations module opens with an "Already know this?" exercise; solving it marks the module done, so someone who already writes joins and window functions spends minutes, not six hours, on the first track. The dialect notes in each full module (PostgreSQL, DuckDB, SQL Server) let a SQL Server user map what they know. After foundations, the order within the prerequisites is yours: a GIS specialist might take d1, d3 and d4, then GIS in SQL and spatial statistics, and come back for d5 and d6 before ETL and Power BI.

## 3. Lab environments and setup

Four tools, each set up once. Every lab names the tool it runs on (§2). The file URLs below are where the build missions publish them (§7, §9); each exists from the mission that builds it.

| Tool | Modules | Runs on | Tested here | Not tested here |
|---|---|---|---|---|
| **B** browser | f1–f4, d1, d2, s1 | The course page: DuckDB-WASM in your browser | Every block, in headless Chromium, as the page runs it | — |
| **PG** PostGIS | d1, d3–d6, g1–g7, s1–s6, e2–e4, p2–p4, c1 | Your PostgreSQL 16 with PostGIS 3.4 | The loader (twice, with the command below) and every block, in PostgreSQL 16.x with PostGIS 3.4.2 on critwire's server | The Docker and installer commands (Windows) |
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
# The lab file: every lab table, in one transaction (about 72 MB).
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

**Loading, and loading again.** The lab file builds schema `learn_curriculum` in one transaction: it drops the schema, recreates it, loads every table, adds the keys and indexes, and checks every table's row count before `COMMIT`. A failed load changes nothing; a second load replaces the schema, including any table you made there, so keep your own work in another schema. Another schema keeps your tables, not your dependencies: a view, a foreign key, a trigger or a policy of yours that reads `learn_curriculum` would go with it (`DROP SCHEMA … CASCADE`). The lab file refuses that reload instead, naming each such object, and changes nothing; move or drop them and load again. Then connect with your SQL client (psql, pgAdmin, DBeaver, VS Code) to database `learn` and run §0's `pg-session` and `pg-smoke` blocks: the 16 row counts there mean your lab matches the tested one. The setup page shows §0's four PostGIS checks (`pg-session`, `pg-smoke`, `pg-role-smoke`, `pg-tx-smoke`) with their recorded results, and they download as one file, `/learn/labs/pg-checks.sql` (§7.3), run with `psql -X -d learn -f pg-checks.sql`.

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

A lab is a `.py` file with `# %%` cells: run it whole (`.venv\Scripts\python s4.py`), or cell by cell in VS Code or Jupyter, which ask to add `ipykernel` to the environment the first time; the site also offers each lab as a notebook (`.ipynb`, the same cells; §7).

**The environment.** `requirements.in` names what the labs import, with the lowest versions they need (`geopandas>=1.0`, `shapely>=2.0`, `libpysal>=4.10`, `esda>=2.6`); `requirements.txt` pins every package to one version, compiled for every platform at once with `uv pip compile --universal --python-version 3.12 -o requirements.txt requirements.in`. The 44 pins have prebuilt wheels for Windows x86-64, Linux x86-64 and aarch64, and macOS 14 or later on Apple silicon: resolved with `--no-build` for each platform (`uv pip compile --no-build --python-version 3.12 --python-platform <platform> requirements.txt`, macOS with `MACOSX_DEPLOYMENT_TARGET=14.0`). Intel Macs aren't covered (no `pyproj` 3.8.0 wheel). `ipykernel` isn't pinned: the editor installs it when a notebook first runs, and the next `uv pip sync` removes it again; nothing here depends on it. This is the file, verbatim:

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

critwire's own data ingests (`ingest shapes`, `ingest habitat`) also need `rasterio`, which the labs never import and which has no macOS 14 wheel. So they have their own file, never published: `scripts/ingest/requirements.in` is the labs' `requirements.txt` as a constraint (`-c`) plus `rasterio`, compiled the same way, so every shared pin stays identical. `pnpm learn:venv` syncs both files into one venv, `.venv-learn`. Each command checks only the file it needs before it starts: `learn:check` the labs' pins, the two ingests theirs (each pin installed at its version, markers evaluated, other packages ignored), so a labs-only environment like a learner's passes `learn:check`.

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

p1 (§5.6) turns this into one function for all eight tables. **Tested here:** every file a Power BI block names, against the star's manifest (header, unique and filled keys, foreign keys, row count, sha256), in each run (§0). **Not tested:** whether Power BI evaluates the M, the DAX results, the visuals and the refresh: Power BI has no Linux version. Each DAX block's PostGIS twin (§0) checks the arithmetic of the table it should return, not M parsing, relationship direction, filter context or DAX execution. §10 asks the owner for one check on Windows.

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
| Jung et al. 2020 habitat map, v004: classes, country summaries and each record's class | CC BY 4.0 (003 D4, §5) | `habitat_classes.parquet`, `country_habitats.parquet`, `occurrence_habitats.parquet` | 75; 5,578 (246 countries); 40,395 | 2,488; 22,407; 81,731 | g7, s6, p2–p3 | L3 (A2's 35-row stand-ins before it) |
| Jung v004 clips at 100 m: all of Costa Rica (`cr`) and Tasmania (`tas`) | CC BY 4.0 (003 D4) | `clips/{cr,tas}.tif` (cloud-optimized GeoTIFF); `habitat_clips.parquet` (the same cells as PostGIS raster WKB in 256-cell tiles, for the loader) | 2 rasters of 3,730 × 3,474 and 4,131 × 3,318 cells; 290 tiles (117 and 173) | 1,380,611 and 1,828,711; 1,826,789 | g7, s6 | L3 (two 0.75° windows until H5) |
| The PostGIS loader | inherits the above | `postgis/learn_curriculum.sql` | 16 tables | 72,088,315 (L3's build, whole-country clips; with the windows, 25,757,224; L1's, 14 tables: 21,338,761) | every PostGIS module | build (L1; grown in L3) |
| The star export | inherits the above; credits in its own manifest | `star/*.csv` (8 files), `star/manifest.json` | §A.3 | 4,653,920; 12,139 (L5's build; on the habitat stand-ins, 4,576,053; 10,995) | d6, p1–p4 | build (L2: the records fact; L5: the habitat fact) |
| The manifest and the index page | | `manifest.json` (4.5), `index.html` | | 26,178; 118,959 (L3's build; L1's: 14,257; 114,820) | every module | build (L1) |

Notes on the shapes (`SP/out/lab-data/summary.md`; sizes re-measured by L1's `pnpm ingest shapes`, `data/learn/shapes.json`):
- **GeoParquet 1.0.0**: WKB geometry in a `geom` column, its bounding box, longitude-latitude (CRS84), zstd compression, rows sorted by key. The same inputs write byte-identical files. The ingest rebuilds all three (and `biomes.csv`): admin-1, ecoregions and `biomes.csv` are byte-identical to the spike's; `country_shapes` has the spike's WKB for all 247 codes, but the spike wrote it with DuckDB's snappy (1,206,307 bytes), so zstd makes it 1,304,205.
- **Admin-1 covers 9 countries only** (AU 9, BR 27, CA 13, CN 31, ID 33, IN 36, RU 85, US 51, ZA 9 rows), as Natural Earth's 1:50m layer does. Tasmania is one row, `AUS-2660`. The key is `adm1_code`; Natural Earth's `iso_3166_2` is dropped, because one value (Jervis Bay's `AU-X02~`) isn't a real code.
- **RESOLVE is simplified feature by feature**, keeping topology, at 0.05° (about 5 km, close to the detail of the 1:50m outlines beside it). The source has 15,164,376 vertices; 0.05° keeps 545,976. The finest tolerance that fits 8 MB was 0.05°: 0.02° gives 9,880,579 bytes. Because each ecoregion is simplified on its own, neighbours no longer share an exact border, and small gaps and overlaps appear between them (g2 and g4 use this).
- **"Rock and Ice"** (`ECO_ID` 0) has no biome or realm in RESOLVE (`N/A`), so its `biome_id` and `realm` are NULL, a nullable foreign key like `occurrences.country_code`. Any other `N/A` fails the build.
- **Invalid shapes are kept on purpose**, for g2: one ring self-intersection in admin-1; 3 nested shells and 7 ring self-intersections in the simplified ecoregions (the source shapefile has 69 self-intersections). The admin-0 shapes are all valid. Every country code in the shapes has a `countries` row.

Notes on the habitat files (`data/learn/habitat.json`, written by L3's `pnpm ingest habitat`; every area is an estimate from a map, never a measurement):
- **Source.** Jung et al. 2020, v004, fetched by its Zenodo URL (doi 10.5281/zenodo.4058819) and pinned by bytes, md5 and sha256: the 1 km level-2 fractions (79 layers, one per class, per mille of each cell) for the summaries and the records, and the 100 m level-2 composite (one class per cell) for the clips. Both grids are longitude–latitude (EPSG:4326), not Web Mercator: 0.009915667822884942° cells for the fractions, 0.0008983152841195215° for the composite. 11 layers are zero everywhere (200, 504, 509, 512, 516, 517, 518, 800, 1000, 1100, 1400); five of them (509, 512, 516, 517, 518) have no row in the 75 classes, and a non-zero layer without one would stop the ingest.
- **`country_habitats`** is 003 §5's method 3: for each country, every 1 km cell whose centre falls inside its Natural Earth 1:50m outline, each class's fraction ÷ 1000 × the cell's geodesic area on WGS 84, summed, rounded to 0.01 km², rows under 0.01 km² left out. Only the partition classes count; the open-water overlays (901, 1000–1004) are left out, so no area is counted twice within a country. Where outlines overlap (FR holds GF, RE and MQ), a shared cell counts for both. Over all 247 outlines the summed estimate is 0.99907 of the summed outline area (−0.09 %; the ingest refuses beyond ±2 %). Vatican City is the one outline with no cell centre inside it, so 246 countries have rows.
- **`occurrence_habitats`**: one row per sample record, the class with the largest fraction in the record's 1 km cell (ties to the lowest code), NULL when the cell holds no partition class. It is the map's class at that place, not the species' habitat. All 40,395 records have a class.
- **The clips** are all of Costa Rica and Tasmania (owner, L3), each its country's box snapped outward to the composite's grid, cells unchanged, cut into tiles of 256 × 256 cells (a COG block; raster2pgsql's `-t 256x256`), numbered row-major from the upper left. A tile whose box doesn't touch the country's Natural Earth 1:50m outline is all set to nodata in the `.tif` and left out of `habitat_clips`: the rest of each box is sea, Nicaragua and Panama, and with it the loader would be about 71 MB larger (4.4). The `.tif` covers the whole box.
  - `cr`: the 1:50m outline's box, longitude −85.91…−82.56, latitude 8.07…11.19 (Isla del Coco isn't in the 1:50m outline); 3,730 × 3,474 cells, 117 of its 210 tiles kept, 7,555,072 cells in them, 635 of those nodata in the map itself. 625 sample records are on a kept tile, 618 of them with CR's code; the 619th CR record, 14.6 km out at sea, is on a dropped one. 38 classes; the largest are arable land 24.2 % of the class cells, subtropical/tropical moist montane forest 19.1 %, marine neritic 13.1 % and moist lowland forest 12.3 %.
  - `tas`: Tasmania's main island with Bruny and Maria Islands, longitude 144.64…148.35, latitude −43.62…−40.64 (the north edge takes in nine devil records on the north-west tidal flats); King Island, the Furneaux Group and Macquarie Island are outside. 4,131 × 3,318 cells, 173 of 221 tiles kept, 11,206,656 cells, no nodata of the map's own. 1,991 sample records are on a kept tile, all with AU's code. 22 classes; the largest are temperate forest 36.2 %, pastureland 20.1 %, marine neritic 19.2 % and temperate shrubland 10.0 %.
  - g7 studies two 0.75° windows cut from them by a query (`win`, `w`): `cr` −84.20…−83.45, 9.85…10.60, from San José to the Caribbean lowlands, and `tas` 147.25…148.00, −43.10…−42.35, south-east Tasmania with Hobart, each the 0.75° square on a 0.05° lattice holding the most of the sample's records with that country's code, 836 × 836 cells, no nodata. They were the published clips until H5, and the cells cut from the whole clips are the same, cell for cell. `cr` holds 202 records, all inside CR's outline, and 20 classes; `tas` 601 records, 491 of them inside AU's 1:50m outline (the rest are on coasts it simplifies), and 16 classes.
  - The `.tif` files are cloud-optimized GeoTIFFs (DEFLATE level 9, no predictor: class codes aren't a continuous surface, so differences don't help; 256-pixel blocks, nearest-neighbour overviews) for desktop GIS; `habitat_clips.parquet` (zstd level 19) holds the same cells as PostGIS raster WKB (16-bit unsigned, nodata 0), one row per kept tile, which the loader turns into in-database rasters.
- **Measured in g7** (L3, on the published files): per country, method 3's sum against the outline's geodesic area is within 1 % for 215 of 247 countries, every outline over 431 km² among them; 21 more are within 5 %, 8 within 20 % (all under 135 km²), and 3 beyond: VA (no cell), TV +28.9 %, TK −28.6 % (`g7-countries`). In the `cr` window 693,893 cells have their centre inside CR's outline, an estimated 6,785.90 km² (map area 2.3 % more); a cell covers 9,768–9,790 m² there and 7,298–7,386 m² in `tas` (`g7-latitude`, `g7-estimate`). Over the whole clips (`g7-tiles`: 117 + 173 tiles, aligned), a record's 100 m class equals its 1 km class for 340 of 625 (`cr`) and 1,204 of 1,991 (`tas`) records; the 1 km class is the 100 m majority of its cell for 617 and 1,921, the other 78 nearly all ties or near ties (`g7-scale`). Method 3 against method 1 over all of CR: 51,199.23 against 51,297.88 km² (−0.2 %), within 1 % for every class over 100 km² but marine neritic (+1.3 %) and seagrass (+1.6 %) (`g7-country`). Method 3 against method 1 in the `tas` window inside AU's outline: −0.2 % in total, −1.1 to −2.8 % for coastal classes (`g7-ex`).
- **Freshness.** `habitat.json` records `country_shapes.parquet`'s sha256 and the sha256 of the records the ingest read (`id,longitude,latitude`); the build refuses the habitat files when either differs from what it publishes ("run pnpm ingest habitat"). A species change therefore re-runs this ingest too (about 12 minutes, 3.2 GB of downloads, deleted after).

**How each is built.** One command per step, in the order critwire's ingests already use (ingest → derive → build; `AGENTS.md`):
- **GBIF sample** (L1): `pnpm ingest gbif-sample` submits the download (or reuses the one in `download.json`), waits, fetches the zip to a temporary folder, applies the species rule, the effective license, the country-key contract and the cap (4.2), reads each dataset's and publisher's metadata, and commits `data/raw/gbif-sample/`. `pnpm derive` writes the sample's per-dataset counts. `pnpm gbif:register --target learn-sample` mints its derived-dataset DOI. `pnpm build` writes the three files, the loader's two tables and the manifest.
- **Natural Earth and RESOLVE** (L1): an ingest downloads the pinned sources (Natural Earth's commit `f1890d9f…`; RESOLVE's `Ecoregions2017.zip`, read in place, never extracted), writes the GeoParquet files above, `biomes.csv` and `shapes.json` (inputs, tolerance, tool versions, per-file rows, bytes, sha256) and commits them under `data/learn/`. The build copies them and puts the same shapes in the loader.
- **Habitat summaries and clips** (L3): `pnpm ingest habitat` (003 §5; Python with rasterio in `.venv-learn`) downloads v004's two zips to a temporary folder, computes the summaries and the class at each sample record, cuts the two whole-country clips and masks the tiles that don't touch each country, and commits the files and `habitat.json` under `data/learn/`; the build publishes them and adds their tables to the loader. L3's run with the whole-country clips: 24 min 33 s, 12 min of them Zenodo's downloads, 3.17 GB peak memory (with the windows: 11 min 54 s); a second run with the same downloads gave the same bytes in 12 min 18 s.
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

The ingest applies the cap, so `data/` is the whole snapshot and `pnpm derive` never needs the zip. `download.json` also records `sampleRules`, the text of the species, license and cap rules. `pnpm derive` refuses the sample as stale (and writes nothing) unless GBIF's stored request equals today's request over the species' `ids.gbif`, each species keeps the `ids.gbif` it was sampled under (`download.json`'s `species` pairs: the request is a key set, blind to two species swapping keys), `sampleRules` equals the code's, and `datasets.json` names the same download; it then writes `data/gbif-learn-sample/contributions.json` (the download key and DOI, the records, the per-dataset counts and `sample.csv`'s sha256), the counts the sample's DOI registers. A species or `ids.gbif` change therefore needs a new download (`--new`) and a new sample DOI before a plain build passes; `--draft` lifts only the DOI checks. The full download and the zip are never committed: GBIF archives the download under its DOI, which is how anyone reproduces the sample.

### 4.3 The loader

`postgis/learn_curriculum.sql` builds the PostGIS lab with nothing but `psql`, PostGIS and PostGIS raster (§0, §3.2): `psql -X -v ON_ERROR_STOP=1 -d <your database> -f learn_curriculum.sql`. It is one transaction, so a failed load leaves the previous schema as it was:
- `\set ON_ERROR_STOP on`, `BEGIN`, then a `DO` block that stops the load, changing nothing, unless PostGIS raster is installed (`CREATE EXTENSION postgis_raster`, §3.2: the lab holds rasters), then `SET client_encoding = 'UTF8'` (psql on Windows talks in the console's code page and would garble names) and `SET LOCAL lock_timeout = '60s'` (a session still reading the old schema makes the load wait a minute at most, then fail, changing nothing).
- The guard and the drop, one `DO` block. Schema separation isn't dependency isolation (§3.2): `DROP SCHEMA learn_curriculum CASCADE` also drops whatever outside depends on it. So the block lists every object outside the schema that has a `pg_depend` entry (rules, triggers, defaults and policies take their table's schema; `pg_toast` belongs to its table), drops the schema, and raises, naming each listed object that is gone. Postgres computes the cascade; the guard only reads what it removed. It catches views and materialized views, foreign keys, columns of an inside type, defaults and functions over inside objects, triggers and policies; inside views, identity columns, indexes and TOAST reload cleanly (LD13–LD16). The one gap: an object another session creates in the second between the listing and the drop isn't listed. A lab database has one user, and `learn:check` holds its lock, so this is accepted.
- `CREATE SCHEMA learn_curriculum` and `SET LOCAL search_path = learn_curriculum, public`.
- The tables, with CHECKs for what a value may be: `coordinate_uncertainty_m` at least 0 and below `'Infinity'` (NaN sorts above it, so it fails too), `year` above 0, `est_area_km2` at least 0 and finite, `month` 1 to 12. NULL means unknown and passes. Then each table's rows as `COPY … FROM stdin (FORMAT csv)`. csv format reads a backslash as plain text; the text format would silently change rows (F10, e2).
- Shapes arrive as base64 text and become geometry afterwards: `ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326))`, one type per column (MultiPolygon, SRID 4326). Base64 takes a third less room than `bytea`'s hex form: the spike's loader is 21,330,577 bytes instead of 29,598,105, with identical geometries (L1's build, with the guard and the checks, 21,338,761; L3's, with the habitat tables and the whole-country clips, 72,088,315).
- The clips arrive the same way, as base64 raster WKB, and become in-database rasters: `ST_RastFromWKB(decode(rast, 'base64'))`, with a CHECK that each is SRID 4326, one band, `16BUI`. They are stored in the database, not read from files, so no raster setting is needed (`postgis.enable_outdb_rasters` and `postgis.gdal_enabled_drivers` stay at their defaults).
- Then primary, unique and foreign keys, GiST indexes and `ANALYZE` on every table. The habitat tables' keys: `country_habitats` (`country_code`, `habitat_code`), each a foreign key, to `countries` and `habitat_classes`; `occurrence_habitats` (`occurrence_id`), a foreign key to `occurrences`, and its `habitat_code` (NULL when the cell holds no class) to `habitat_classes`; `habitat_clips` (`clip`, `tile`), one row per 256-cell tile, with a GiST index on each tile's footprint, `ST_ConvexHull(rast)`, as raster2pgsql's `-I` makes it, so `ST_Intersects` reads only the tiles a shape touches.
- Then a check that raises on failure: each table's row count equals the build's, every geometry and raster has SRID 4326, and every `LAB_CHECKS` rule holds. Those are the rules keys and CHECKs can't state (`range_status` is `ok` exactly when a species has countries, each taxon's parent is one rank up, the country-key contract, the lab-only tables' codes, every record with exactly one `occurrence_habitats` row); each is one portable query counting the rows that break it, and the build runs the same queries in DuckDB over the published files, so a file that wouldn't load is never published. Shapes may be invalid (g2), so validity isn't checked.
- `COMMIT`. The file references no table outside `learn_curriculum`; only PostGIS's functions come from `public`. Loading it again replaces the schema, tables you made there included, and its first lines say so.

In the spike it loaded in 1.6 s with 14 tables. L3's build loads in 3.9 s on critwire's server (2.2 s before the whole-country clips), as `critwire_lab`, twice in a row, with the same rows each time: `admin1_shapes` 294, `biomes` 14, `countries` 250, `country_habitats` 5,578, `country_shapes` 247, `datasets` 400, `ecoregions` 847, `habitat_classes` 75, `habitat_clips` 290, `occurrence_habitats` 40,395, `occurrences` 40,395, `sources` 5, `species` 76, `species_countries` 472, `species_sources` 591, `taxa` 143 (`pg-smoke`, §0). The browser holds the same rows in its eight tables:

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

### 4.4 The cap: 120 MB

The build refuses when `dist/learn/data/` exceeds 120,000,000 bytes (50,000,000 until L3, when the owner raised it for the whole-country habitat clips), or when the committed lab data does: `data/raw/gbif-sample/`, `data/learn/` and `data/gbif-learn-sample/` together (L1's build: 35,452,055 and 13,673,945 bytes; L3's: 95,936,992 and 18,822,906). Both refusals name the total and the largest files (`scripts/build/learn/cap.ts`). The browser engine's `parquet` extension (3.22 MB) is counted apart, under 002 §10 item 3.

| `/learn/data/` | Bytes |
|---|---|
| now (the spike, after L1's files): 10 files and the manifest | 35,397,671 (L1's build, with its index page: 35,452,055) |
| + L2's star (8 CSV files and its manifest) | 39,984,719 |
| + L3, measured from L2's live build (40,041,618): the habitat files, 763,118 bytes in place of the stand-ins' 850 (the summaries, the records' classes, `habitat_clips.parquet` and the two `.tif` clips); the loader's growth, 4,418,463 (3,727,616 of them the two clips' raster WKB as base64, 609,402 the `occurrence_habitats` rows); the manifest and index page, 6,207 | 45,228,556 (the windows) |
| + L3's whole-country clips (owner, H5), measured from L2's live build (40,041,618): the habitat files, 5,140,249 bytes in place of the stand-ins' 850 (`habitat_clips.parquet` 1,826,789, `cr.tif` 1,380,611, `tas.tif` 1,828,711, the summaries and the records' classes 104,138); the loader's growth, 50,749,554 (50,056,048 of them the 290 tiles' raster WKB as base64); the manifest and index page, 6,421: 55,895,374 in all | 95,936,992 |

The committed lab data in the spike (`SP/data/learn/`: the shapes, the stand-in habitat summaries and the sample files) is 14,055,088 bytes; L1's `data/raw/gbif-sample/` adds about 4.9 MB in place of the sample files. L1's `country_shapes.parquet` (zstd, 4.1) is 97,898 bytes larger than the spike's, which adds that much to each total above.

L3 first published two 0.75° windows, about 0.7 million cells each: whole-country 100 m clips in the loader would have added about 70 MB (in-database rasters are stored uncompressed in the file, 2 bytes per cell as base64), over the 50 MB cap. The owner chose whole countries and raised the cap to 120 MB (H5). Stored whole, the two boxes would make the loader about 71 MB larger again and the folder about 121–125 MB, so only the tiles touching each country are kept (4.1): 18.8 million cells, 290 tiles. That leaves about 24.1 MB under the cap for L4, L5's habitat fact and margin.

With hex geometry the loader was 29,598,105 bytes, and the same projection came to about 52–58 MB, over the cap once L3 landed. Base64 brought it back under, with no change to any table. If a later measured total is over, the cuts go in this order, and each keeps the browser and PostGIS on the same data: RESOLVE is simplified further, in the file and the loader alike, using the same tolerance probe; then the CSV copy of the sample goes, since every reader also takes Parquet; then the Tasmania clip leaves the loader, and g7 keeps Costa Rica's. The clips stay whole countries (the owner's choice, H5): going over the cap with them goes to the owner before any cut to them. The loader and the sample's Parquet are cut last: every PostGIS module needs the one, and every browser module the other.

### 4.5 Credits

`/v1/attribution.json` stays about the species files, plus 002 §6's Natural Earth entry. The lab files are credited in **`/learn/data/manifest.json`**, keys in this order and no clock, so the same files give the same bytes (L1, `scripts/build/learn/data.ts`):
- `cap` (120,000,000) and `bytes`, the files' total;
- `inputs`: `v1`, the bytes and sha256 of `/v1/species.parquet` and `/v1/countries.parquet`, the two `/v1` files the lab tables are built from (a lab that finds other hashes is reading newer `/v1` files than these were tested with); `sample`, `sample.csv`'s path, sha256 and rows, the file the sample's derived-dataset deposit holds (= `contributions.json`);
- `dois`: `download` (the GBIF download's) and `sample` (the sample's derived dataset; null in a draft build);
- `files`: per file (all but `manifest.json` and `index.html`), its `columns` and `rows` (Parquet and CSV), `tables` for the loader (each lab table's rows, the counts its final check enforces), `bytes`, `sha256` and `sources[]` (`name`, `license`, `licenseUrl` from `scripts/build/sources.ts` `licenseUrl()`, `citation`, `url`, `doi` where there is one; the sample's source adds `datasets` and `derivedDataset` {`doi`, `citation`, `url`}).

In the spike's manifest:
- the sample's three files: GBIF's citation of the download, "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w", plus `"datasets": "datasets.csv"` for each dataset's credit; from L1 also the sample's derived dataset, `10.15468/dd.5sthtk`, with GBIF's citation of it;
- the Natural Earth shapes: public domain, credited anyway ("Made with Natural Earth");
- RESOLVE: CC BY 4.0, Dinerstein et al. 2017, BioScience 67(6), doi 10.1093/biosci/bix014;
- the habitat files: CC BY 4.0, Jung et al. 2020 and the map's version, v004 (003 §5), doi 10.5281/zenodo.4058819: `country_habitats` with Natural Earth (its outlines), `occurrence_habitats` with the GBIF sample (its records), the clips (`habitat_clips.parquet`, `clips/*.tif`) alone;
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
- A table can have several **candidate keys**: columns, or sets of columns, that are never `NULL` and never repeated, so each one picks out every row. `species` has three: `id`, `slug` and `scientific_name`. The one picked as the main key is the **primary key**. The others are **alternate keys**, declared `NOT NULL` and `UNIQUE`. `species` also has six ids from other websites, declared `UNIQUE` too. Some animals have none of a given kind, so these are **optional unique ids**, not candidate keys: an id that is missing can't pick out its row.
- A **natural key** is one the world already uses: a scientific name, a country's ISO code, GBIF's dataset key. A **surrogate key** is a number the database makes up and that means nothing else: critwire's `species.id`. Natural keys change (a species moves to another genus, a name turns out to be a synonym), and every row that points at one has to change with it; a surrogate never has to. critwire uses both: `id` (an integer, never reused) is the primary key, and the natural keys are `UNIQUE`. A natural key makes a good primary key when an authority keeps it stable and it is never missing: `countries.code` (ISO 3166-1) and `datasets.dataset_key` (GBIF's identifier) are primary keys here.
- `UNIQUE` allows any number of `NULL`s, because one unknown value isn't equal to another: animals with no NCBI id don't collide. That is why an outside id can be an optional unique id, but not a candidate key, let alone the primary key.
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

A new id doesn't get a row past the other unique columns either. A Bengal tiger with its own id but given the tiger's GBIF id is refused by `UNIQUE (gbif_id)`. That one GBIF id names one animal is true of critwire's animals, and critwire's build checks it (two animals sharing an outside id fail it); it isn't a rule of GBIF's. A project that lists subspecies could have two animals under one GBIF taxon, and then the column couldn't be `UNIQUE`.

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

4. What does a foreign key refuse? An animal in a genus critwire doesn't have (002's lesson 7 exercise): `species.genus` must be a `name` in `taxa`. Only a name: the foreign key would take a family's name as well (step 7).

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

7. Nor does `species.genus REFERENCES taxa (name)` check that the name is a genus: `Felidae`, a family, would pass. A `CHECK` can't help, because it sees only its own row. A foreign key over two columns can. Give `taxa` a `UNIQUE (name, taxon_rank)` to point at, give `species` a rank column that can only say `genus`, and point the pair at the pair. Both columns are `NOT NULL`, so the key checks every row (`MATCH SIMPLE` skips a pair with a `NULL` in it). Adding the key checks the rows already there, and all 76 animals pass:

```sql
-- q: d1-rank-fk
-- status: ran
-- engine: postgis
ALTER TABLE taxa ADD CONSTRAINT taxa_name_rank_key UNIQUE (name, taxon_rank);
ALTER TABLE species
  ADD COLUMN genus_rank text NOT NULL DEFAULT 'genus' CHECK (genus_rank = 'genus'),
  ADD CONSTRAINT species_genus_rank_fkey FOREIGN KEY (genus, genus_rank) REFERENCES taxa (name, taxon_rank);
SELECT genus_rank, count(*) AS species
FROM species
GROUP BY genus_rank;
```

```text
-- result: d1-rank-fk · 1 row · sha256 d6883c437319
genus_rank | species
genus | 76
```

   Then moving the tiger into the family Felidae is refused:

```sql
-- q: d1-rank-wrong
-- status: ran
-- engine: postgis
-- after: d1-rank-fk
-- expect: error violates foreign key constraint "species_genus_rank_fkey"
UPDATE species SET genus = 'Felidae' WHERE id = 25;
```

```text
-- result: d1-rank-wrong · error: statement 1 of 1: insert or update on table "species" violates foreign key constraint "species_genus_rank_fkey"
```

   `taxa`'s own `parent_name` can be held to the rank one up the same way: a `parent_rank` column whose `CHECK` ties it to the row's rank, and a foreign key from `(parent_name, parent_rank)`. No trigger is needed. The lab tables don't carry these keys; the lab's load checks every rank and parent instead (§4.3).
8. PostgreSQL builds an index for every primary key and `UNIQUE` constraint, because it needs one to check them. It doesn't for a foreign key: checking a new record needs only the parent's key, which is indexed already. But deleting a parent, or joining from it, has to find the children, and with no index on `occurrences.species_id` that means reading the whole table (d3). Which of `occurrences`' keys have an index that starts with their column?

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

9. The generated column, as the catalog describes it; then an attempt to write it, refused:

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

10. A surrogate key made by the database. `GENERATED ALWAYS AS IDENTITY` numbers the rows as they go in. A surrogate key alone would accept the same note twice under two numbers, so the natural key, (animal, observer, day), is declared `UNIQUE` beside it:

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

**Result:** Every key refused what it should: a second animal with id 25 or with the tiger's GBIF id, a month of 13, a genus with no parent, an animal in a genus that doesn't exist, a genus that is a family once a two-column foreign key checked the rank, the deletion of a dataset its records still point at, a write to a generated column and the same field note twice. What got through is as instructive: a record with no month and no country (a `CHECK` and a foreign key both pass `NULL`), and a record that says Australia while its point is in Brazil (a foreign key checks that a value exists, not that it is true). `occurrences`' primary key is indexed and its three foreign keys aren't. critwire's design follows from this: a surrogate primary key, the natural keys `NOT NULL` and `UNIQUE`, the outside ids `UNIQUE` but optional (some are missing, and four names already changed in GBIF's eyes), and natural primary keys only where an authority keeps them stable (`countries`, `datasets`).

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

**Second exercise, on your own computer (the page doesn't check it):** read the lab's ERD back out of the database. Reverse engineering a design means recovering it from what was built: [tbls](https://github.com/k1LoW/tbls) (MIT license, a single program file) reads PostgreSQL's catalog (every table, column and foreign key) and writes a Mermaid ERD. Get version 1.96.1 from [its release page](https://github.com/k1LoW/tbls/releases/tag/v1.96.1), check the file's SHA-256 against the one printed here (the release lists the other systems'), and point it at your lab database. It finds the password in the `pgpass.conf` the setup made. In PowerShell:

```powershell
curl.exe -fLO https://github.com/k1LoW/tbls/releases/download/v1.96.1/tbls_v1.96.1_windows_amd64.zip
(Get-FileHash tbls_v1.96.1_windows_amd64.zip -Algorithm SHA256).Hash -eq "ecd641e0d1ffde95350b1336cb03603c7f7fd8c7fc20a996323ea80d8594a5c6"   # must print True
Expand-Archive tbls_v1.96.1_windows_amd64.zip -DestinationPath tbls
.\tbls\tbls.exe out -t mermaid --include "learn_curriculum.*" -o lab-tbls.mmd "postgres://postgres@localhost:5432/learn?sslmode=disable"
```

On Linux (x86-64), with the password in `~/.pgpass`:

```sh
curl -fLO https://github.com/k1LoW/tbls/releases/download/v1.96.1/tbls_v1.96.1_linux_amd64.tar.gz
echo "18285eef0ba7d917214e8bd7dd6a22afe5fea021eed52e7149100a3d10a2af95  tbls_v1.96.1_linux_amd64.tar.gz" | sha256sum -c   # must print OK
tar xzf tbls_v1.96.1_linux_amd64.tar.gz tbls
./tbls out -t mermaid --include 'learn_curriculum.*' -o lab-tbls.mmd "postgres://postgres@localhost:5432/learn?sslmode=disable"
```

Open `lab-tbls.mmd` beside [the lab schema's diagram](/learn/schema/lab/). What do the two agree on, and what does each have that the other doesn't?

**What you should find:** the 16 tables, their 74 columns and types, and the 17 lines agree, cardinality included. tbls reads "zero or one" from a foreign key that may be `NULL` (`occurrences.country_code`) and "at most one per country" from a foreign key that is also its table's primary key (`country_shapes`), as the course's diagram draws them. It spells a type's punctuation as underscores (`double_precision`, `geometry_Point_4326_`). It draws the view `species_taxonomy` as a box like a table, without lines, because a view has no keys. It leaves out what the database doesn't hold: every column's note (they live in the diagram's source, not in the database), and, in Mermaid, the primary and unique keys. A diagram read back from the catalog shows exactly what the database enforces, so it is a good check on a drawn one; critwire's tests compare the lab diagram with a freshly loaded lab the same way. What a column means and what is planned still has to be written down by a person.

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
  - **First normal form (1NF):** one value per cell, no lists or repeated groups of columns. A list in a cell can still be queried: `unnest` turns it into rows, which can then be joined and counted (the worked example does). What the list loses is the database's checks on each item: no foreign key can say every country code in it is a `countries` row, no `UNIQUE` can stop a code appearing twice, and every query has to unnest it first.
  - **Second (2NF):** in a table whose key has several columns, no other column depends on only part of it.
  - **Third (3NF):** no column outside the keys depends on another column outside them. The short version of all three, "every column depends on the key, the whole key, and nothing but the key", is a first approximation. The exact rule: for every dependency `X → Y` in the table (with `Y` not part of `X`), either `X` contains a key, or `Y` is part of some candidate key. (**Boyce–Codd normal form** drops the second escape: `X` must always contain a key. It differs from 3NF only in tables with several overlapping keys; critwire's tables don't have that case.)
- Normalizing splits a table along its dependencies. The split is **lossless** when joining the parts gives back exactly the rows you started with. A split into two parts is lossless when the columns they share determine all of one part, that is, they are a key of it: `records_flat` split on `dataset_key` (the key of the datasets part) is lossless. Split on `title` instead, two datasets that share a title (lab step 3) would each join to the other's records, and the join would add rows that were never there.
- A nested file (JSON, or Parquet with structs and lists) groups facts by how they are read: one animal with everything about it. Tables group them by what they depend on. critwire keeps both: its build writes `/v1/species.{json,parquet}` nested, from the derived records in `data/species.json`, because a reader wants one record per animal, and loads the same records into a table whose keys and `CHECK`s refuse a record that breaks them, a check before anything is published.
- **Denormalizing** is repeating facts on purpose, for reading: the published files, d6's star, a summary table. It is safe when every copy is rebuilt from one source every time and never edited by hand; a value that is only a count of other rows (records per dataset) stays a query.

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

So `source → license` goes into its own table, `sources`, one row per source, and the setup's `SELECT DISTINCT` gives exactly one row each. Its primary key now holds the rule: had two animals' entries named two licenses for one source, the load would have failed instead of storing both. The file repeats each license 69 to 76 times, and that is fine, because critwire's build writes the file from one source, `data/species.json`, every time, and `pnpm derive` gives every animal's entry for a source that source's one license (`scripts/derive/record.ts`). Which source gave which field is a fact about the animal and the field together, so it goes in `species_sources`, keyed (`species_id`, `field`). Joined back, they tell where each of the jaguar's facts came from (002's lesson 15):

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
- How the rows are fetched shows in the plan. An **Index Scan** walks the index and fetches each row as it goes, in index order. A **Bitmap Index Scan** first collects every matching row's location, then the **Bitmap Heap Scan** reads each page that holds one, once, in page order (`Heap Blocks: exact=6` is six pages). Which the planner picks depends on how many rows match and how scattered they are: rows stored in roughly the index's order (a high correlation, below) favour the Index Scan. An **Index Only Scan** answers from the index alone, when every column the query needs is in the index and `VACUUM` has marked the pages all-visible. Because that depends on when autovacuum last ran, the labs below always ask for a column outside the index. That removes one source of variation, not all: a plan can still change with the PostgreSQL version or the statistics, so the tests check what each plan must show (its `-- plan:` lines), not its text.
- **Statistics** live in `pg_statistic`, readable through the view `pg_stats`: per column, the share of `NULL`s, the number of distinct values, the most common values with their frequencies, a histogram of the rest, and the **correlation** between the values' order and the rows' physical order (1: stored in value order; 0: scattered). `ANALYZE` reads a sample of 300 × `default_statistics_target` rows (100, so 30,000), and autovacuum runs it again after enough of a table changes. After a bulk load, run it yourself: critwire's loader ends with `ANALYZE` on every table (§4.3). The planner treats columns as **independent**, which goes wrong when one column predicts another; `CREATE STATISTICS` teaches it how they go together.
- A **GiST** index on a geometry column stores each shape's bounding box in a tree of boxes. A spatial test like `ST_Intersects`, `ST_Covers` or `ST_DWithin` adds a box comparison the index can answer (`&&`, boxes overlap; `@`, box inside box), then runs the exact test only on the rows whose boxes passed. A test the index can't turn into a box, such as `ST_Distance(…) < d`, computes on every row. The loader builds one on every geometry column (`occurrences_geom_idx`). g5 goes further: nearest neighbours with `<->` and geography.
- A **BRIN** index keeps one summary, the smallest and largest value, per range of pages (128 by default). It is tiny, and it can only rule out ranges, so it helps as far as the values follow the physical order: most when they do (an id that grows as rows are appended, the time of a log line), partly when they roughly do (lab step 16 skips three ranges of seven), not at all when they are scattered. The column's correlation, from 1 or −1 down to 0, tells you how far.
- **`EXPLAIN`** prints the chosen plan; **`EXPLAIN ANALYZE`** also runs the query and adds what really happened at each step (`actual rows`, `Rows Removed by Filter`). Read a plan from the innermost, most indented line outwards. On your own, use `EXPLAIN (ANALYZE, BUFFERS)`, which adds the planner's estimated cost and rows, the time and the pages read. The labs print `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)`, the plan's shape and its row counts only, because costs and times vary from machine to machine. Each lab block says what its plan must show in `-- plan:` lines: a text some line contains (`-- plan: Index Cond: (species_id = 63)`), a text no line contains (`-- plan: no Seq Scan`), and the top node's `actual rows` (`-- plan: rows 9`). The plan printed under it is an example, from the versions the page names; yours may differ in its details and still pass. `EXPLAIN ANALYZE` on an `INSERT`, `UPDATE` or `DELETE` really changes the rows, so wrap it in `BEGIN` … `ROLLBACK`.
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
-- plan: rows 9
-- plan: Seq Scan on occurrences
-- plan: Rows Removed by Filter: 40386
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
-- plan: rows 9
-- plan: Bitmap Index Scan on occurrences_species_id_idx
-- plan: Index Cond: (species_id = 63)
-- plan: Heap Blocks: exact=6
-- plan: no Seq Scan
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
-- plan: rows 29261
-- plan: Seq Scan on occurrences
-- plan: no occurrences_year_idx
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
-- plan: rows 74
-- plan: occurrences_year_idx
-- plan: Index Cond: (year >= 2026)
-- plan: no Seq Scan
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
-- plan: rows 26
-- plan: Seq Scan on occurrences
-- plan: Filter: ((year / 10) = 185)
-- plan: no occurrences_year_idx
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
-- plan: rows 26
-- plan: occurrences_year_idx
-- plan: Index Cond: ((year >= 1850) AND (year <= 1859))
-- plan: no Seq Scan
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
-- plan: rows 9
-- plan: Hash Join
-- plan: Seq Scan on occurrences o (actual rows=40395
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
-- plan: rows 9
-- plan: Nested Loop
-- plan: Index Cond: (species_id = s.id)
-- plan: no Seq Scan on occurrences
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
-- plan: rows 182
-- plan: occurrences_species_year_idx
-- plan: Index Cond: ((species_id = 48) AND (year = 2010))
-- plan: no Seq Scan
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
-- plan: rows 107
-- plan: occurrences_species_year_idx
-- plan: Index Cond: ((year >= 1850) AND (year <= 1899))
-- plan: no Seq Scan
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
-- plan: rows 184
-- plan: Index Scan using country_shapes_pkey
-- plan: Index Cond: (geom @ cs.geom)
-- plan: Filter: st_covers(cs.geom, geom)
-- plan: no Seq Scan on occurrences
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
-- plan: rows 186
-- plan: Bitmap Index Scan on occurrences_geom_idx
-- plan: Index Cond: (geom && st_expand(
-- plan: no Seq Scan on occurrences
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
-- plan: rows 186
-- plan: Join Filter: (st_distance(
-- plan: Seq Scan on occurrences o
-- plan: no occurrences_geom_idx
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
-- plan: rows 26
-- plan: Bitmap Index Scan on occurrences_year_brin
-- plan: Heap Blocks: lossy=512
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
-- plan: rows 26
-- plan: Bitmap Index Scan on occurrences_by_year_brin
-- plan: Heap Blocks: lossy=128
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

**Result:** A filter on an unindexed column reads the whole table (40,386 of the pangolin's 40,395 rows thrown away); a B-tree turns it into six pages, and turns the slug join from a hash join over every record into a nested loop over nine. The planner skips an index when the filter keeps most of the table (72 % of records are from 2000 on), and can't use it when the column is inside an expression (`year / 10`); rewriting the filter as a range fixes that. A two-column index jumps on its first column; on its second alone, PostgreSQL 16 reads all of it. The planner's beliefs are in `pg_stats`: exact for one column after a full `ANALYZE`, but its independence assumption put the devil's Australian records at 230 when there are 1,998, until extended statistics recorded the pair. GiST answers `ST_Covers` and `ST_DWithin` through bounding boxes and leaves `ST_Distance` to a full scan. BRIN is three pages and helps as far as the rows are stored in the column's order: 512 pages read for the 1850s as loaded (partly ordered), 128 on the sorted copy.

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
-- plan: rows 20
-- plan: Sort Key: year DESC, id DESC
-- plan: Seq Scan on occurrences (actual rows=1390
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
-- plan: rows 20
-- plan: occurrences_species_year_id_idx
-- plan: Index Cond: ((species_id = 48) AND (year >= 2000) AND (year <= 2009))
-- plan: no Sort
-- plan: no Seq Scan
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
- **MVCC** (multi-version concurrency control) is how PostgreSQL isolates transactions without making readers wait. A row is stored as **versions**; each records the transaction that created it (the hidden column `xmin`) and the one that deleted it (`xmax`). An `UPDATE` writes a new version and marks the old one deleted; it doesn't overwrite. Each statement reads through a **snapshot**, a list of which transactions had committed when it started, and sees only the versions those made. So a reader sees the old version while a writer works on the new one, and neither waits. That holds for plain reads against row writes: a **locking read** (`SELECT … FOR UPDATE` or `FOR SHARE`) locks the rows it reads and waits for their writer, and a change to a table's structure locks out even plain reads (Locks, below). Old versions no one can see any more are removed later by `VACUUM` (autovacuum runs it for you). `xmin` is for looking, not for keeping: transaction ids wrap around and `VACUUM` freezes old ones, so a table that must record which load wrote a row needs a column of its own (a load id, a timestamp).
- **Isolation levels.** **Read committed**, PostgreSQL's default, takes a new snapshot for every statement: two `SELECT`s in one transaction can see different data if someone committed in between. **Repeatable read** takes one snapshot for the whole transaction, and refuses to update a row that someone else changed since (`could not serialize access`, SQLSTATE `40001`): the application retries the transaction. **Serializable** goes further and refuses any outcome that no one-after-the-other order of the transactions could give; retry the same way.
- **Locks.** MVCC doesn't make writers wait for readers, but a writer waits for another writer of the same row, until that one commits or rolls back. Statements also lock whole tables, in modes that mostly don't conflict: a `SELECT` takes `AccessShareLock`, an `UPDATE` `RowExclusiveLock`. `ALTER TABLE`, `DROP` and `TRUNCATE` take `AccessExclusiveLock`, which conflicts with everything, even a `SELECT`, until the transaction ends. Two transactions that each wait for a lock the other holds are a **deadlock**: PostgreSQL notices within a second (`deadlock_timeout`) and aborts one of them. `SET LOCAL lock_timeout = '5s'` makes a statement give up instead of waiting.
- **A load you can re-run** (idempotent): running it twice leaves the same result as running it once, so after a failure you fix the cause and simply run it again. Three common ways:
  - **Replace in one transaction:** `BEGIN`, drop or empty the target, load it all, `COMMIT`. A failure changes nothing; readers see the old data until the commit, then the new. critwire's lab file does exactly this with the whole `learn_curriculum` schema (§4.3); its `DROP SCHEMA` takes `AccessExclusiveLock` on every table, so the labs wait for the few seconds it runs instead of reading half a load.
  - **Upsert by key:** `INSERT … ON CONFLICT (key) DO NOTHING` skips rows that are already there; `DO UPDATE SET col = EXCLUDED.col` updates them from the incoming row (`EXCLUDED`). It needs a primary key or unique constraint on exactly those columns, and it's safe when two loads run at once. Good for adding to a large table a batch at a time. It only adds and updates: a row the source has since deleted stays in the target, and so does the old row of one whose key changed upstream (the new key arrives as a new row). Keeping up with deletions takes a second step, such as deleting the target's rows that are missing from a complete batch, or the replace above.
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

2. Row versions. Every row the lab file loaded carries the id of the transaction that wrote it, in `xmin`. Across the sixteen tables there is one:

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
  UNION ALL SELECT xmin FROM occurrence_habitats
  UNION ALL SELECT xmin FROM habitat_clips
) AS loaded;
```

```text
-- result: d4-xmin-load · 1 row · sha256 aa19f0eaf2f6
transactions | row_versions
1 | 90072
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

5. Plain readers don't wait; writers of the same row do. This needs two psql windows, A and B, each after `pg-session`; type the lines in the order shown. `-- waits:` marks the statement that waits, and `-- fails:` (lab 6) the one that fails on purpose. The comments give each statement's outcome; the result below lists what each `SELECT` returned, by window and statement number. The tests run it the same way, in two sessions, and check that the marked statement waits and no other does.

```sql
-- q: d4-wait
-- status: ran
-- engine: postgis
-- sessions: A, B
-- window A
BEGIN;
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
-- window B
BEGIN;
SELECT month FROM occurrences WHERE id = 6004132305;     -- NULL, at once: B reads the old version
-- waits: A holds the row's lock
UPDATE occurrences SET month = 8 WHERE id = 6004132305;
-- window A
ROLLBACK;                                                -- now B's UPDATE finishes: UPDATE 1
-- window B
SELECT month FROM occurrences WHERE id = 6004132305;     -- 8
ROLLBACK;
```

```text
-- result: d4-wait · 2 rows · sha256 ddbfcdb9a1de
window | statement | month
B | 4 | NULL
B | 7 | 8
```

6. Isolation levels, with the same two windows. B changes the row and commits (autocommit) while A's transaction is open:

```sql
-- q: d4-isolation
-- status: ran
-- engine: postgis
-- sessions: A, B
-- window A
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT month FROM occurrences WHERE id = 6004132305;     -- NULL
-- window B
UPDATE occurrences SET month = 1 WHERE id = 6004132305;  -- committed at once
-- window A
SELECT month FROM occurrences WHERE id = 6004132305;     -- still NULL: one snapshot for the whole transaction
-- fails: could not serialize access due to concurrent update
UPDATE occurrences SET month = 2 WHERE id = 6004132305;
ROLLBACK;
-- window B: undo the change
UPDATE occurrences SET month = NULL WHERE id = 6004132305;
```

```text
-- result: d4-isolation · 2 rows · sha256 ba58c317969a
window | statement | month
A | 2 | NULL
A | 4 | NULL
```

Had B read with `SELECT month … FOR UPDATE` in lab 5, it would have waited for A just as its `UPDATE` did; had A run lab 4's `ALTER TABLE species …`, even B's plain `SELECT` on `species` would have waited. Begin A with plain `BEGIN;` (read committed) instead and A's second `SELECT` shows B's 1, and its `UPDATE` succeeds. Which is right depends on the job: a report that reads several tables wants one snapshot (repeatable read, read only); a job that decides from what it read and then writes wants to hear that the data changed under it (repeatable read or serializable, with a retry).

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

The other 496 rows of version 1 have no month in version 2 either, so they were left alone. The feed's upsert brings month and country up to date and nothing else: a record whose animal or year changed upstream keeps its old values here, and one GBIF removed stays in `sightings`. A full refresh would update those columns too and delete the rows missing from a complete batch.

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

**Result:** In autocommit, a load that fails on its second batch keeps the first (1,858 rows), and running it again fails on them; in one transaction the error aborts everything, even a `SELECT`, and `ROLLBACK` leaves nothing behind, so the fixed file can simply be run again, once or twice, for the same 1,959 rows. A savepoint keeps the first batch and lets the transaction go on. MVCC is visible in `xmin`: the whole lab was written by one transaction, and an `UPDATE` writes a new version under your own transaction's id. An `UPDATE` holds `RowExclusiveLock`, an `ALTER TABLE` `AccessExclusiveLock`; in two sessions, a plain reader didn't wait for a writer, a second writer did, and repeatable read refused to update a row changed since its snapshot. `ON CONFLICT` made the feed re-runnable: `DO NOTHING` added the 42 missing records, and `DO UPDATE … WHERE … IS DISTINCT FROM` inserted those 42 and updated the 1,320 that gained a month, leaving 496 alone.

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
- **Membership.** `GRANT learn_reporting TO learn_powerbi` makes one role a member of another. A member uses the group's privileges directly (`INHERIT`) and may switch to it with `SET ROLE` (`SET`). Both are on by default, and since PostgreSQL 16 both are options of each grant: `GRANT learn_reporting TO learn_powerbi WITH INHERIT FALSE` makes a member that has the group's privileges only after `SET ROLE`, and `WITH SET FALSE` one that uses them but can never act as the group. So privileges go to a group, and each person or program gets a login that is a member: adding a dashboard is one `GRANT`, and removing it touches nothing else.
- **Owners.** Every table, schema and function has an owner, the role that made it (or that `ALTER … OWNER TO` names). The owner can do anything to it, including drop it and grant on it; everyone else gets only what is granted. You own the lab: you loaded `learn_curriculum`.
- **Privileges** are granted per object, and a reader needs one at every level: `CONNECT` on the database, `USAGE` on the schema (to look up names in it), then `SELECT` on each table. Writing is `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE`; making tables is `CREATE` on the schema. `GRANT SELECT (id, slug) ON species` grants columns only. `REVOKE` takes a privilege back.
- **PUBLIC** is every role, present and future. By default PUBLIC may connect to a database and make temporary tables in it, use (but since PostgreSQL 15 not create in) schema `public`, and run every function. So a new role can already connect and call PostGIS; to keep it out of a database, revoke `CONNECT` from PUBLIC on that database and grant it to the roles that need it. These are the defaults of a new database, not facts about yours: a database upgraded from PostgreSQL 14 or older keeps PUBLIC's `CREATE` on `public`, and an administrator may have changed any of them. Read the actual privileges (`\dn+`, `\l`, or `has_schema_privilege('public', 'public', 'CREATE')`) instead of inferring them from the version.
- **Schemas** are folders of tables, views and functions inside one database. They group objects by purpose and by who may touch them: the lab in `learn_curriculum`, your own work in a schema of yours (a reload replaces `learn_curriculum`, §3.2), reports in a third. The `search_path` (§0) is the list of schemas a plain table name is looked up in. Anyone who can create objects in a schema on your `search_path` can put a table or function there that shadows one you meant; that is why PostgreSQL 15 stopped letting PUBLIC create in `public`.
- **Default privileges.** `GRANT SELECT ON ALL TABLES IN SCHEMA s` grants on the tables that exist now; a table made tomorrow is covered by nothing. `ALTER DEFAULT PRIVILEGES FOR ROLE maker IN SCHEMA s GRANT SELECT ON TABLES TO reader` records a grant that PostgreSQL adds to every table `maker` creates in `s` from then on. Only tables made by that role: the defaults belong to the creator, not to the schema.
- **Least privilege:** each role gets exactly what its job needs. A reporting tool reads; it doesn't write, make tables, or see schemas outside its job. If its password leaks, that is all the leak gives away.
- **Removing a role.** `DROP ROLE` refuses while anything depends on the role: objects it owns, privileges granted to it, default privileges, policies. `DROP OWNED BY r` drops what `r` owns in the current database and revokes everything granted to it there; `REASSIGN OWNED BY r TO other` hands its objects over instead. Both work on one database at a time, so on a server where the role has privileges in several, run it in each.
- **Row-level security** (RLS) filters rows per role. `ALTER TABLE t ENABLE ROW LEVEL SECURITY`, then a **policy**, `CREATE POLICY name ON t FOR SELECT TO role USING (condition)`, adds the condition to every query that role runs on `t`, so it sees only matching rows, with no view or application code to forget. Once RLS is on, a role with no policy for a command sees no rows at all (default deny). `USING` filters the rows a command reads or changes; `WITH CHECK` tests new rows (`INSERT`, `UPDATE`). Policies for the same command are combined with `OR`, unless created `AS RESTRICTIVE` (`AND`). The table's owner, superusers and `BYPASSRLS` roles skip the policies; `FORCE ROW LEVEL SECURITY` applies them to the owner too.

How to look: in psql, `\du` lists roles and their attributes, `\drg` (psql 16+) memberships with their options, `\dn+` schemas with their privileges, `\dp` tables' privileges and policies, `\ddp` default privileges. In SQL, `has_table_privilege(role, table, privilege)` and its siblings (`has_schema_privilege`, `has_database_privilege`, `has_function_privilege`) answer for any role, and `information_schema.role_table_grants` lists table grants.

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
-- result: d5-privileges · 13 rows · sha256 18b775de531d
object | privilege | allowed
this database | CONNECT | false
this database | CREATE | false
this database | TEMPORARY | false
schema learn_curriculum | CREATE | false
schema learn_curriculum | USAGE | true
… 8 more rows
```

The two grants show as `SELECT` on the table and `USAGE` on `learn_curriculum`. The other `true`s come from PUBLIC: `USAGE` on `public` and every function. The database rows are this server's answer, read from its ACLs: critwire's test database grants `CONNECT` and `TEMPORARY` only to named roles, so the role has neither. In a new database of yours PUBLIC has both, and the same block shows `true` for them; likewise the `false` for `CREATE` on `public` holds only where PUBLIC's `CREATE` is gone (a new database since PostgreSQL 15, or revoked by hand). So run the block on the server that matters instead of reasoning from the defaults. PUBLIC's privileges are harmless for reading, but "nothing else" also means other databases on the server: there, revoke `CONNECT` from PUBLIC, as critwire's test database does. As the database's owner, on a server you run (the tests never change a database's privileges, so this block isn't run here; `learn` is your lab database):

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

**Result:** A group role with `USAGE` on one schema and `SELECT` on its tables, and a login that is its member, reads the 40,395 records and is refused writing and making tables. Its other abilities come from PUBLIC (`public` and functions, plus connecting and temporary tables where the database hasn't revoked them, as critwire's test database has), so read the actual ACLs; a server you run can revoke them per database. `GRANT … ON ALL TABLES` covers only tables that exist; default privileges cover the tables a named role makes later. `DROP ROLE` fails while the role holds privileges, and `DROP OWNED BY` clears them. With row-level security, the Australian partner saw 4,636 records, the Brazilian 5,033, a role without a policy none, and the owner all of them.

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
- **Dimensions are wide and flat**: everything you'd filter or group by, as readable text, with a hierarchy's levels as columns side by side (class, order, family, genus). That repeats values on purpose, the denormalizing d2 named: safe here because every critwire build rebuilds the star from the lab's normalized tables and nobody edits it.
- **Star or snowflake.** A **snowflake** normalizes the dimensions back into chains (species → genus → family → order → class, as `taxa` does). It stores each name once, but every report walks the chain and every reporting tool has to be taught it. A star needs one join per dimension. Snowflake a dimension only when it is huge or one level is shared by several dimensions.
- **Keys.** A dimension has a primary key; the fact's foreign keys point at it; the fact's own primary key is its grain (`record_id`; `species_id, country_code`). Warehouses usually give dimensions **surrogate keys**, integers the load makes up (d1), so that one species can have several versions (type 2, below) and a source system's codes can change underneath. This star uses critwire's ids, already surrogates, and natural keys an authority keeps stable (ISO country codes, GBIF dataset keys).
- **Unknown members.** A fact's foreign key is never NULL: an inner join drops the row, and a report tool shows a blank that no filter catches. Instead the dimension gets one row that means "unknown" (`ZZ`, year `-1`), and the load maps a missing value to it in exactly one place. Then the totals agree whichever dimension you slice by. When "unknown" and "doesn't apply" both occur, give each its own member.
- **Degenerate dimensions** are codes that stay on the fact as plain columns (basis of record, license) because there is nothing more to say about them. A **factless fact** has no measure at all; its rows are the facts (a species has open records in a country).
- **Conformed dimensions** are one dimension table shared by several facts, with the same keys and values. They let a report **drill across**: summarize each fact to the shared dimension's level, then join the summaries. Joining two facts row to row instead pairs every row of one with every matching row of the other (f3's fan-out), and every total is wrong.
- **Slowly changing dimensions.** A dimension's attributes change: a common name is corrected, a species moves to another genus. **Type 1** overwrites the value: history is restated, every past fact now reports under the new value; right for corrections. **Type 2** keeps history: the change adds a new row, a version with its own surrogate key, the years it is valid and a current flag, and each fact points at the version in force at its date. A report can then group "as it was" (by the fact's version) or "as it is" (by the current version). Type 0 never changes a value; type 3 keeps one "previous value" column. The choice is made per attribute.
- **Export.** A star travels well as files: one CSV per table plus a manifest (columns, keys, rows, sha256, credits), rows in primary-key order so the same data always gives the same bytes. That is what critwire publishes for Power BI (§4, p1), checked file by file (§A.3).

**Worked example:** What is one record fact's grain? The reports to support are records by species, place, source and time, so the grain is **one sample record**, one row of `occurrences`, and the dimensions are what a record can be sliced by: its species, country, dataset and year. The habitat estimates add a second fact at another grain, one country and one habitat class, that shares `dim_country`.

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

The habitat classes have two levels; `dim_habitat_class` flattens them, and a level-1 class is its own parent, so a report can group by `level1_name` with no gaps. The habitat areas are estimates from a map (§4.1), not measured.

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

`fact_country_habitat`: the grain is **one country and one habitat class**, with a measure that adds up across classes, `est_area_km2`. It shares only `dim_country` with the other facts; it has no species. The `CHECK` keeps an area at least 0 and at most the largest value `DECIMAL(12, 2)` holds. The same text runs in PostgreSQL and in DuckDB, which writes the published star: DuckDB can't compare a decimal with `'Infinity'`, and in PostgreSQL a decimal can't be infinite while `NaN` fails the upper bound.

```sql
-- q: d6-star-fact-country-habitat
-- status: ran
-- engine: postgis
-- after: d6-star-dim-country, d6-star-dim-habitat-class
CREATE TABLE fact_country_habitat (
  country_code VARCHAR NOT NULL REFERENCES dim_country (country_code),
  habitat_code INTEGER NOT NULL REFERENCES dim_habitat_class (habitat_code),
  est_area_km2 DECIMAL(12, 2) NOT NULL CHECK (est_area_km2 >= 0 AND est_area_km2 <= 9999999999.99),
  PRIMARY KEY (country_code, habitat_code)
);
INSERT INTO fact_country_habitat
SELECT country_code, habitat_code, est_area_km2 FROM country_habitats;
SELECT count(*) AS country_classes, count(DISTINCT country_code) AS countries, sum(est_area_km2) AS total_km2
FROM fact_country_habitat;
```

```text
-- result: d6-star-fact-country-habitat · 1 row · sha256 80b11c41e5b3
country_classes | countries | total_km2
5578 | 246 | 146579613.97
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

2. Conformed dimensions. Which dimensions does the record fact share with habitat area per country? Only `dim_country`: `fact_country_habitat` has a country and a habitat class, `fact_records` a species, country, dataset and year. So a report that shows both goes through the country. Take two countries: Åland (`AX`), with no records in the sample, and Trinidad and Tobago (`TT`), with two. First the wrong way, joining the facts to each other, then the right one:

```sql
-- q: d6-drill-across
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT 'facts joined to each other' AS way, f.country_code, count(*) AS records, sum(h.est_area_km2) AS habitat_km2
FROM fact_records AS f
JOIN fact_country_habitat AS h ON h.country_code = f.country_code
WHERE f.country_code IN ('AX', 'TT')
GROUP BY f.country_code
UNION ALL
SELECT 'each fact summed, then joined', c.country_code, coalesce(r.records, 0), h.habitat_km2
FROM dim_country AS c
JOIN (SELECT country_code, sum(est_area_km2) AS habitat_km2
      FROM fact_country_habitat GROUP BY country_code) AS h ON h.country_code = c.country_code
LEFT JOIN (SELECT country_code, count(*) AS records
           FROM fact_records GROUP BY country_code) AS r ON r.country_code = c.country_code
WHERE c.country_code IN ('AX', 'TT')
ORDER BY way, country_code;
```

```text
-- result: d6-drill-across · 3 rows · sha256 ad182fd5050b
way | country_code | records | habitat_km2
each fact summed, then joined | AX | 0 | 761.16
each fact summed, then joined | TT | 2 | 5067.71
facts joined to each other | TT | 44 | 10135.42
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

5. Type 2: keep history. Older lists, such as Mammal Species of the World (2005), put all eight pangolins in genus *Manis*; the African ground pangolins have been *Smutsia* in general use since a 2018 study of the pangolins' family tree (Gaubert et al., Journal of Heredity), and critwire uses *Smutsia*. To report records under the name in use when each was made, the dimension keeps both versions, each valid for a range of years, both ends included (`0` and `9999` stand for "always" and "until further notice"). In this lab, version 1 is valid to 2017 and version 2 from 2018 (by year, since a record's date here is its year); a record with no year gets the current version. The 2018 boundary is a teaching convention, not the day the name changed: a study is published, then each checklist, museum and portal adopts it when it chooses, so a real dimension takes its dates from the list it follows. First the versions, and a check before anything is loaded:

```sql
-- q: d6-scd2-versions
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
CREATE UNIQUE INDEX ON dim_species_history (species_id) WHERE is_current;
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
SELECT species_id, scientific_name, genus, 0, 9999, true FROM dim_species;
UPDATE dim_species_history SET valid_from = 2018 WHERE species_id IN (55, 63);
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
VALUES (55, 'Manis gigantea', 'Manis', 0, 2017, false),
       (63, 'Manis temminckii', 'Manis', 0, 2017, false);
SELECT
  (SELECT count(*)
   FROM (SELECT f.record_id
         FROM fact_records AS f
         LEFT JOIN dim_species_history AS h
           ON h.species_id = f.species_id
          AND CASE WHEN f.year = -1 THEN h.is_current ELSE f.year BETWEEN h.valid_from AND h.valid_to END
         GROUP BY f.record_id
         HAVING count(h.species_key) <> 1) AS wrong) AS records_without_one_version,
  (SELECT count(*)
   FROM (SELECT species_id
         FROM dim_species_history
         GROUP BY species_id
         HAVING count(*) FILTER (WHERE is_current) <> 1) AS wrong) AS species_without_one_current;
```

```text
-- result: d6-scd2-versions · 1 row · sha256 acb944054e01
records_without_one_version | species_without_one_current
0 | 0
```

Both counts must be 0 before the load. The first applies the load's own rule (the `CASE` below) to every record and counts those that match no version, a gap between one version's `valid_to` and the next one's `valid_from`, or more than one, an overlap: a gap drops the record from a report by version, an overlap counts it twice. `UNIQUE (species_id, valid_from)` stops two versions starting in the same year, not an overlap. The partial unique index allows **at most one** current row per species; it can't require one, since a species whose versions were all closed has none. The second count catches that, so together they prove **exactly one**.

Then the load: each record gets the key of the version in force in its year, and once every record has one, `species_key` becomes `NOT NULL`, so no record can later be left without a version:

```sql
-- q: d6-scd2
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-scd2-versions
ALTER TABLE fact_records ADD COLUMN species_key INTEGER REFERENCES dim_species_history (species_key);
UPDATE fact_records AS f SET species_key = h.species_key
FROM dim_species_history AS h
WHERE h.species_id = f.species_id
  AND CASE WHEN f.year = -1 THEN h.is_current ELSE f.year BETWEEN h.valid_from AND h.valid_to END;
ALTER TABLE fact_records ALTER COLUMN species_key SET NOT NULL;
SELECT f.species_id, version.scientific_name AS name_then, current_version.scientific_name AS name_now,
       count(*) AS records
FROM fact_records AS f
JOIN dim_species_history AS version ON version.species_key = f.species_key
JOIN dim_species_history AS current_version
  ON current_version.species_id = f.species_id AND current_version.is_current
WHERE f.species_id IN (55, 63)
GROUP BY f.species_id, version.scientific_name, current_version.scientific_name
ORDER BY f.species_id, name_then;
```

```text
-- result: d6-scd2 · 4 rows · sha256 68ebdb65533e
species_id | name_then | name_now | records
55 | Manis gigantea | Smutsia gigantea | 6
55 | Smutsia gigantea | Smutsia gigantea | 4
63 | Manis temminckii | Smutsia temminckii | 7
63 | Smutsia temminckii | Smutsia temminckii | 2
```

Grouped by the fact's `species_key`, 13 of the 19 pangolin records report as *Manis*, "as it was"; grouped through the current version, all 19 are *Smutsia*, "as it is". The fact holds the version key, set once when the record is loaded, so the lookup by date runs at load time, never in a report. Every version of a species keeps its `species_id`, so a report can still ask about the animal across versions. `ALTER TABLE … ADD COLUMN` and the `UPDATE` stand in for that load here; a real build sets `species_key` in the `INSERT` and declares it `NOT NULL` from the start.

Which date picks the version? Here, the year the animal was seen, so "as it was" means the name in use when it was seen. That is not the name the record was filed under: an animal seen in 2010 and identified, or re-identified, in 2020 is *Smutsia* in its source. Occurrence data keep the two times apart (Darwin Core's `eventDate` and `dateIdentified`); the sample has only the first, so this lab keys versions by observation year. Decide which question a report answers, the name when the animal was seen or the name the record was given, and key the versions by that date.

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

**Result:** The record fact's grain is one sample record: 40,395 rows, one per row of `occurrences`, sliced by species, country, dataset and year, each one join away. The star and the snowflake give the same counts by class (Amphibia 4,776, Mammalia 31,905, Reptilia 3,714); only the joins differ. The two facts share `dim_country`, so habitat area and records meet by country: joined to each other, Trinidad and Tobago's 2 records became 44. A record with no country goes to `ZZ` and one with no year to `-1`, so every total still adds up. Type 1 restated all 9 of Temminck's pangolin's records under the corrected name; type 2, after checking that every record matched exactly one version and every species had exactly one current row, kept 13 of the 19 pangolin records under *Manis* "as it was", while "as it is" shows all 19 under *Smutsia*.

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
- **PostgreSQL:** nothing star-specific: plain tables, foreign keys (which some warehouses drop on facts for load speed and check in the load instead), identity columns for surrogate keys, `MERGE` (15+) for type 2 loads, a partial unique index for "at most one current version", an exclusion constraint for "no overlapping versions" (`EXCLUDE USING gist (species_id WITH =, int4range(valid_from, valid_to, '[]') WITH &&)`, with the `btree_gist` extension), `\copy` for files on your computer.
- **DuckDB:** foreign keys only in `CREATE TABLE`, no identity columns (a `SEQUENCE` with `DEFAULT nextval(…)` instead), and `COPY … TO` writes CSV or Parquet directly; column storage makes wide dimensions and large facts quick to scan, which is why critwire's build runs the star there.
- **SQL Server:** `IDENTITY` surrogate keys, clustered columnstore indexes for large facts, `MERGE` for type 2 loads, and temporal tables (2016+) that keep a row's history automatically, by when it was changed rather than when it was true.

### 5.3 GIS in SQL

Seven modules, twelve and a half hours, all in your own PostGIS (§3.2), on the lab tables of §4. Build mission L3 (§9) wrote them in full from their outlines, in §5.2's form, and added g7's habitat clips. Every block runs in `learn_curriculum` after `pg-session` (§0), in a transaction the tests roll back. Shapes are stored in longitude and latitude (SRID 4326); the modules measure in metres, which is g1's subject. The skills are the ones ArcGIS Pro's geoprocessing tools hide behind a dialog (Project, Repair Geometry, Spatial Join, Near, Generate Tessellation, Extract by Mask); here they are SQL, so they run inside a pipeline (§5.5) and their steps can be read.

#### g1 · crs

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** f3

**Concept:** A shape is a list of coordinates, and coordinates mean nothing until you know the system they are in:
- **A coordinate reference system** (CRS) says what the numbers measure: the model of the Earth's shape (an ellipsoid, and a datum that fixes it to the planet), the units, and, for a flat map, the projection that turns positions on the ellipsoid into x and y. An **SRID** is the number a database uses to name one. PostGIS's numbers are EPSG codes, from a public registry, and its table `spatial_ref_sys` holds each system's definition.
- **Geographic** systems give longitude and latitude in degrees. SRID 4326 is WGS 84, the system of GPS and of every lab shape (§4: GBIF records, Natural Earth outlines, ecoregions). A degree isn't a length: a degree of latitude is about 111 km everywhere, but a degree of longitude is 111 km × cos(latitude), 82 km at Hobart and nothing at the poles. So `ST_Area` and `ST_Distance` on SRID 4326 geometries return square degrees and degrees, numbers with no use.
- **Projected** systems give x and y in metres on a plane. No flat map keeps everything, so a projection chooses what to keep. SRID 3577 (Australian Albers) is **equal-area** for Australia: areas are right, while shapes and distances bend a little, more so away from its two standard parallels, 18° S and 36° S. SRID 3857 (Web Mercator, the flat map most web maps draw) is **conformal**: it keeps angles and the shapes of small areas, and stretches every length at a point by 1 ÷ cos(latitude), so every area by 1 ÷ cos²(latitude): twice at 45°, four times at 60°. It is for drawing map tiles, never for measuring. ("Pseudo-Mercator": it treats WGS 84's ellipsoid as a sphere.)
- **`ST_Transform(geom, srid)`** moves a geometry into another system: new coordinates, same place. **`ST_SetSRID(geom, srid)`** only relabels it: same numbers, said to be in another system. Use `ST_SetSRID` (or `ST_Point(x, y, srid)`) once, on raw numbers whose system you know, and `ST_Transform` after that. PostGIS refuses to combine geometries of different SRIDs (`Operation on mixed SRID geometries`).
- **`geography`** is PostGIS's second spatial type: longitude and latitude on the ellipsoid (SRID 4326 unless you say otherwise), measured in metres and square metres along the curved surface, with no projection to choose. `geom::geography` casts. It is right everywhere on the globe, a little slower, and has fewer functions than `geometry`. A local projected system (an Albers or UTM zone) is the other good choice, when all your data sit in its area.
- **Axis order.** PostGIS always stores longitude first (x, then y), for every SRID, although EPSG's own definition of 4326 lists latitude first. Some tools follow EPSG (DuckDB and SQL Server, below): swapped axes are the commonest reason a point lands in the wrong ocean.

How to look: `ST_SRID(geom)` gives a value's SRID; `geometry_columns` lists each table's geometry columns with their type and SRID; `spatial_ref_sys` says what an SRID means (`srtext` in WKT, `proj4text` in PROJ's short form).

**Worked example:** How big is Tasmania? Each Australian state's area three ways (on the ellipsoid, in Albers, in Web Mercator), beside the stretch Web Mercator gives it and 1 ÷ cos² of its centroid's latitude:

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

The ellipsoid and Albers agree to within 0.1 % for every state: Tasmania is 67,697 km² as geography and 67,696 km² in Albers. Web Mercator draws it 1.81 times too large, 122,485 km². The stretch grows southward, from 1.13 for the Northern Territory to Tasmania's 1.81, and matches 1 ÷ cos² of the centroid's latitude to within 0.01. (`ST_Centroid` on SRID 4326 works in degrees, close enough to pick a latitude.)

**Lab:**
1. What the three SRIDs say. `spatial_ref_sys` holds about 8,500 systems; these are the course's:

```sql
-- q: g1-srid
-- status: ran
-- engine: postgis
SELECT srid, split_part(srtext, '"', 2) AS name,
       substring(proj4text FROM 'proj=(\w+)') AS projection,
       substring(proj4text FROM '(?:datum|ellps)=(\w+)') AS ellipsoid,
       substring(proj4text FROM '\+a=(\d+)') AS sphere_radius_m,
       substring(proj4text FROM 'units=(\w+)') AS units
FROM spatial_ref_sys
WHERE srid IN (4326, 3857, 3577)
ORDER BY srid DESC;
```

```text
-- result: g1-srid · 3 rows · sha256 e978d01274b0
srid | name | projection | ellipsoid | sphere_radius_m | units
4326 | WGS 84 | longlat | WGS84 | NULL | NULL
3857 | WGS 84 / Pseudo-Mercator | merc | NULL | 6378137 | m
3577 | GDA94 / Australian Albers | aea | GRS80 | NULL | m
```

The columns are read out of `proj4text`, PROJ's short form of each definition. 4326 is `longlat` on the WGS 84 datum, with no `units` because they are degrees. 3577 is `aea`, Albers equal-area, on GRS80 (GDA94's ellipsoid, within a millimetre of WGS 84's), in metres. 3857 is `merc`, Mercator, on no ellipsoid but a sphere of radius 6,378,137 m, WGS 84's equatorial radius, in metres. The whole definition, `SELECT proj4text FROM spatial_ref_sys WHERE srid = 3577`, also gives Albers' standard parallels (`+lat_1=-18 +lat_2=-36`) and its centre meridian (`+lon_0=132`), and `+towgs84=0,0,0,0,0,0,0`, which treats GDA94 and WGS 84 as one datum: they are about 1.8 m apart today, as Australia's plate moves, nothing at these scales.

2. Which system each lab shape is in:

```sql
-- q: g1-columns
-- status: ran
-- engine: postgis
SELECT f_table_name AS table_name, f_geometry_column AS column_name, type, srid
FROM geometry_columns
WHERE f_table_schema = current_schema()
  AND f_table_name <> 's4_cells'
ORDER BY table_name, column_name;
```

```text
-- result: g1-columns · 4 rows · sha256 92869bd94553
table_name | column_name | type | srid
admin1_shapes | geom | MULTIPOLYGON | 4326
country_shapes | geom | MULTIPOLYGON | 4326
ecoregions | geom | MULTIPOLYGON | 4326
occurrences | geom | POINT | 4326
```

All four are in 4326, and each column is typed with its SRID (`geometry(MultiPolygon, 4326)`), so a value in another system can't be stored there. The filter leaves out `s4_cells`, the hexagon grid a later module (s4) builds in the same schema, so the answer is the same whether you have run it or not. Every measurement in these modules therefore casts to `geography` or transforms first.

3. Moving versus relabelling. Hobart typed as longitude and latitude, then put into Albers both ways, and read back in degrees:

```sql
-- q: g1-setsrid
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom),
albers AS (
  SELECT 'ST_Transform' AS how, ST_Transform(geom, 3577) AS geom FROM hobart
  UNION ALL
  SELECT 'ST_SetSRID', ST_SetSRID(geom, 3577) FROM hobart
)
SELECT a.how,
       round(ST_X(a.geom)::numeric, 2) AS x, round(ST_Y(a.geom)::numeric, 2) AS y,
       ST_AsText(ST_Transform(a.geom, 4326), 4) AS back_in_4326,
       round((ST_Distance(ST_Transform(a.geom, 4326)::geography, h.geom::geography) / 1000)::numeric) AS km_from_hobart
FROM albers AS a, hobart AS h
ORDER BY km_from_hobart;
```

```text
-- result: g1-setsrid · 2 rows · sha256 fdf4839cdfa2
how | x | y | back_in_4326 | km_from_hobart
ST_Transform | 1288694.34 | -4764150.08 | POINT(147.33 -42.88) | 0
ST_SetSRID | 147.33 | -42.88 | POINT(132.0012 -0.0004) | 4990
```

`ST_Transform` gave new numbers, x 1.29 million and y −4.76 million metres from the projection's origin, and they lead back to Hobart. `ST_SetSRID` kept 147.33 and −42.88 and called them metres: a point 147 m east and 43 m south of the origin (0°, 132° E), in the sea just north of New Guinea, 4,990 km from Hobart. No error is raised; a wrong `ST_SetSRID` is silent.

4. A distance in each system: Hobart to Launceston. In SRID 4326, `ST_Distance` returns degrees, which are not a length:

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

The ellipsoid gives 160.72 km. Albers is 2.6 % short: an equal-area projection keeps areas, not distances. Outside its standard parallels it stretches east–west and squeezes north–south by the same factor, and this line runs nearly north–south. Web Mercator is 35 % long, its 1 ÷ cos(42°) stretch. The "1.4525" is the straight line between two pairs of degrees, a length in no unit.

**Result:** Every lab shape is stored in SRID 4326, longitude and latitude in degrees, so measuring means casting to `geography` or transforming to a projected system first. The ellipsoid and Australian Albers agree on every state's area to within 0.1 % (Tasmania 67,697 and 67,696 km²); Web Mercator overstates them by 1.13 (Northern Territory) to 1.81 times (Tasmania), as 1 ÷ cos² of each state's latitude predicts. For distance, Albers is 2.6 % short and Web Mercator 35 % long between Hobart and Launceston, 160.72 km on the ellipsoid. `ST_Transform` moves a shape; `ST_SetSRID` relabels it, and a wrong label put Hobart 4,990 km away without an error.

**Exercise:** On a web map, Greenland looks far larger than the Democratic Republic of the Congo. From `country_shapes` (`GL` and `CD`), show for each its southern and northern latitudes, its area on the ellipsoid, its Web Mercator area, the stretch and 1 ÷ cos² of its centroid's latitude. Is 1 ÷ cos² of the centroid a good guess at Greenland's stretch, as it was for Tasmania?

**Answer:** The worked example's columns, for two countries, plus `ST_YMin` and `ST_YMax`.

```sql
-- q: g1-ex
-- status: ran
-- engine: postgis
SELECT country_code,
       round(ST_YMin(geom)::numeric, 1) AS south,
       round(ST_YMax(geom)::numeric, 1) AS north,
       round((ST_Area(geom::geography) / 1e6)::numeric) AS geography_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / 1e6)::numeric) AS mercator_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / ST_Area(geom::geography))::numeric, 2) AS stretch,
       round((1 / cos(radians(ST_Y(ST_Centroid(geom)))) ^ 2)::numeric, 2) AS one_over_cos2
FROM country_shapes
WHERE country_code IN ('CD', 'GL')
ORDER BY country_code;
```

```text
-- result: g1-ex · 2 rows · sha256 c4011417a114
country_code | south | north | geography_km2 | mercator_km2 | stretch | one_over_cos2
CD | -13.5 | 5.3 | 2324450 | 2359632 | 1.02 | 1.00
GL | 59.8 | 83.6 | 2171354 | 35395741 | 16.30 | 14.38
```

**Check:** The two cover about the same ground, 2,324,450 km² (CD) and 2,171,354 km² (GL), yet Web Mercator draws Greenland 15 times larger (35,395,741 against 2,359,632 km²). The centroid's 1 ÷ cos², 14.38, falls short of Greenland's stretch, 16.30. Each point's stretch is 1 ÷ cos² of its own latitude, 3.95 at Greenland's southern tip (59.8° N) and about 81 at its northern coast (83.6° N), and it grows faster the further north, so the average over the whole shape is larger than the value at its middle. The centroid rule works for shapes short in latitude, such as Australia's states; for tall ones, measure. If your areas came out as 190 and 664, you measured `geom` in square degrees, which also rank Greenland first: cast to `geography`.

**Dialects:**
- **PostgreSQL:** PostGIS's `geometry` carries an SRID on every value and `geography` measures on the ellipsoid; `ST_Transform` uses the PROJ library and the definitions in `spatial_ref_sys` (about 8,500, and you can insert more); `ST_DistanceSphere`, or `ST_Distance(a, b, false)` on geography, measures on a sphere, faster and within about 0.5 %; on a projected geometry, `ST_Area` and `ST_Length` are in that system's units.
- **DuckDB:** the `spatial` extension (not in this course's browser) has `GEOMETRY` and no geography type. `ST_Transform(geom, 'EPSG:4326', 'EPSG:3577', always_xy := true)` names the source and target systems in the call; without `always_xy` it follows EPSG's axis order, latitude first for 4326. `ST_Area_Spheroid` and `ST_Distance_Spheroid` measure on WGS 84's ellipsoid and also read latitude first.
- **SQL Server:** `geometry` (flat) and `geography` (on the ellipsoid that the SRID names in `sys.spatial_reference_systems`); `geography::Point(latitude, longitude, 4326)` takes latitude first; `STArea()` and `STDistance()` on geography are in square metres and metres. There is no `ST_Transform`: reproject before loading (ArcGIS Pro's Project tool, `ogr2ogr -t_srs`). An operation between values of different SRIDs returns NULL. For `geography` polygons, ring order matters: the interior is on the left as you walk the ring, and the wrong order means the rest of the globe (`ReorientObject()` flips it).

#### g2 · load-validate

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** g1

**Concept:** How shapes travel between files and databases, and how to tell when one is broken:
- **WKT** (well-known text) is the readable form, from the OGC's Simple Features standard: `POINT(147.33 -42.88)`, or `POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))`. A polygon is a list of rings, each closed (its last point repeats its first): the first ring is the outer **shell**, any others are **holes**. A MultiPolygon is a list of polygons, its **parts**.
- **WKB** (well-known binary) is the same shape as bytes: a byte-order flag, a type number, counts, then each coordinate as an 8-byte floating-point number. It keeps every digit, and a point costs 16 bytes whatever its precision. GeoParquet and GeoPackage files store WKB, and databases exchange it. PostGIS's own forms add the SRID in front: **EWKT** (`SRID=4326;POINT(…)`) and EWKB.
- **The loader** (`learn_curriculum.sql`, the setup page) carries each shape as WKB written out in base64 text, and turns the text into geometry once the rows are in: `ALTER TABLE country_shapes ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326))`. `ST_GeomFromWKB` reads the bytes; its second argument sets the SRID, which plain WKB doesn't carry; `ST_Multi` makes a single polygon a one-part MultiPolygon, so the column holds one type. From then on the column refuses any other type or SRID.
- **Valid** means the shape follows the standard's rules, which PostGIS checks with the GEOS library: no ring crosses itself; the rings of one polygon don't cross each other (they may touch at a point); every hole lies inside its shell; and the parts of a MultiPolygon don't overlap, so one shell inside another (**nested shells**) is invalid.
- **An invalid shape still loads, and most functions still answer**, but the answer can be wrong: a bow-tie's two halves cancel, so its area is 0. Overlay functions (`ST_Intersection`, `ST_Union`, `ST_Difference`) build new shapes from the edges, and an invalid input can stop them with a GEOS `TopologyException`, the error GIS work meets most often.
- **Finding and repairing.** `ST_IsValid(geom)` answers true or false and prints the reason as a NOTICE; `ST_IsValidReason` returns the reason as text; `ST_IsValidDetail` returns a row of three: `valid`, `reason`, and `location`, a point at or near the problem. `ST_MakeValid` returns a valid shape built from the same lines, sometimes of another type (a polygon becomes a MultiPolygon). Its default, `method=linework`, keeps every edge and rebuilds polygons from them; `method=structure` (GEOS 3.10 or later) unions the shells and then subtracts the holes. Neither knows what the shape was meant to be, so check what it returns.
- **Valid isn't the same as non-overlapping.** Validity belongs to one shape. A layer of valid shapes can still overlap, or leave gaps between neighbours, and nothing in the column type or `ST_IsValid` looks across rows. A layer whose shapes don't overlap is a **coverage** (with no gaps either, a partition of its area); to test one, compare pairs:
  - `ST_Relate(a, b)` returns the pair's **DE-9IM** matrix: nine characters saying where a's interior, boundary and exterior meet b's, in the order interior–interior, interior–boundary, interior–exterior, then boundary–…, then exterior–…. Each is `2` (they share an area), `1` (a line), `0` (points) or `F` (nothing).
  - `ST_Relate(a, b, '2********')` tests a pattern instead, `*` matching anything: true when the two interiors share an area, that is, when they overlap. Shapes that only touch along a border share a line, not an area, and don't match.

**Worked example:** A bow-tie, one ring that crosses itself, typed in. What does PostGIS say about it, and what does `ST_MakeValid` make of it?

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

The ring runs (0 0) to (2 2), down to (2 0), across to (0 2) and back, so it crosses itself at (1 1), where `ST_IsValidDetail` points. Walking the ring, one triangle is circled clockwise and the other anticlockwise, so their signed areas cancel and `ST_Area` returns 0, with no warning. `ST_MakeValid` cuts the ring at the crossing and returns the two triangles as a MultiPolygon, area 2. Asked to intersect it with the square's left half, an overlay function refuses:

```sql
-- q: g2-overlay
-- status: ran
-- engine: postgis
-- expect: error TopologyException
SELECT ST_Area(ST_Intersection(
         ST_GeomFromText('POLYGON((0 0, 2 2, 2 0, 0 2, 0 0))'),
         ST_GeomFromText('POLYGON((0 0, 1 0, 1 2, 0 2, 0 0))'))) AS area;
```

```text
-- result: g2-overlay · error: statement 1 of 1: lwgeom_intersection_prec: GEOS Error: TopologyException: side location conflict at 1 1. This can occur if the input geometry is invalid.
```

GEOS stops at the crossing, (1 1), and says the input may be invalid. The same call on `ST_MakeValid` of the bow-tie returns the left triangle. So repair before overlaying, and measure before trusting an area.

**Lab:**
1. One point in WKT, in WKB written as hex, and in EWKT, then read back from its WKB:

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

The WKB is 21 bytes, 42 hex digits: `01`, little-endian byte order (least significant byte first, as on most computers); `01000000`, type 1, a point; then two 8-byte numbers, 147.33 and −42.88. EWKT adds `SRID=4326;`, and the round trip gives back an equal point.

2. The lab's shapes in each form. PostgreSQL's `encode(…, 'base64')` breaks its output into lines of 76 characters; `translate` takes the breaks out, as the loader's text has none:

```sql
-- q: g2-sizes
-- status: ran
-- engine: postgis
WITH shapes AS (
  SELECT 'country_shapes' AS table_name, geom FROM country_shapes
  UNION ALL SELECT 'admin1_shapes', geom FROM admin1_shapes
  UNION ALL SELECT 'ecoregions', geom FROM ecoregions
)
SELECT table_name, count(*) AS shapes, sum(ST_NPoints(geom)) AS points,
       sum(length(ST_AsBinary(geom))) AS wkb_bytes,
       sum(length(translate(encode(ST_AsBinary(geom), 'base64'), E'\n', ''))) AS base64_chars,
       sum(length(encode(ST_AsBinary(geom), 'hex'))) AS hex_chars,
       sum(length(ST_AsText(geom))) AS wkt_chars
FROM shapes
GROUP BY table_name
ORDER BY wkb_bytes DESC;
```

```text
-- result: g2-sizes · 3 rows · sha256 a8e2ce07cae9
table_name | shapes | points | wkb_bytes | base64_chars | hex_chars | wkt_chars
ecoregions | 847 | 545976 | 9668372 | 12892348 | 19336744 | 20815887
country_shapes | 247 | 100299 | 1628336 | 2171440 | 3256672 | 2062369
admin1_shapes | 294 | 68408 | 1108310 | 1478096 | 2216620 | 1424373
```

WKB costs 16 bytes a point, plus a short header for each part and ring: 9,668,372 bytes for the ecoregions' 545,976 points. Base64 writes 3 bytes as 4 characters, a third more, and hex writes each byte as 2, twice as many: that is why the loader uses base64. WKT's size depends on how many digits each coordinate has. The country and admin-1 outlines have few, and their WKT is only a little larger than their WKB (2,062,369 characters against 1,628,336 bytes for the countries); the simplified ecoregions have long decimals, and their WKT is more than twice their WKB. WKT is also decimal text, read back by parsing: `ST_AsText` keeps at most 15 decimal places, while WKB copies each number's bits exactly.

3. Which of the lab's shapes are invalid, why, and what `ST_MakeValid` changes. The loader keeps invalid shapes on purpose, for this step (§4.1):

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

All 247 country outlines are valid; 11 shapes aren't. One is an admin-1 area, Goiás (`BRA-1294`), whose ring touches itself at a point: a "ring self-intersection" in GEOS's words, as against the bow-tie's "self-intersection", where two edges cross. Ten are RESOLVE ecoregions, 7 with a ring self-intersection and 3 with nested shells: the source has its own self-intersections, and simplifying each ecoregion to 0.05° (§4.1) moved some edges onto others. The three with nested shells are mangrove ecoregions made of many small parts (East African mangroves, 1,846 parts; Madagascar's; Indus River Delta–Arabian Sea's, 2,968), where one part ended up inside another. `ST_MakeValid` keeps every one a MultiPolygon, merges a few parts (the Arabian–Persian Gulf coastal plain desert, 811, goes from 481 to 477), and changes no area by more than 0.4 km². The eleven are pinned: this block's recorded result is checked every time the course is rebuilt, so a shape that turns invalid, or one that stops being so, shows up as a changed result.

4. Valid, yet overlapping. Every pair of country outlines whose interiors share an area, the larger outline first, with the pair's DE-9IM matrix:

```sql
-- q: g2-coverage
-- status: ran
-- engine: postgis
SELECT a.country_code AS outline, b.country_code AS inside_it,
       ST_Relate(a.geom, b.geom) AS de9im,
       round((ST_Area(ST_Intersection(a.geom, b.geom)::geography) / 1e6)::numeric) AS overlap_km2,
       round((100 * ST_Area(ST_Intersection(a.geom, b.geom)::geography) / ST_Area(b.geom::geography))::numeric, 1) AS pct_of_inside_it
FROM country_shapes AS a
JOIN country_shapes AS b ON a.geom && b.geom AND a.country_code <> b.country_code
WHERE ST_Relate(a.geom, b.geom, '2********')
  AND ST_Area(a.geom::geography) > ST_Area(b.geom::geography)
ORDER BY overlap_km2 DESC, outline, inside_it;
```

```text
-- result: g2-coverage · 8 rows · sha256 5e15c2896a74
outline | inside_it | de9im | overlap_km2 | pct_of_inside_it
FR | GF | 2F2F11FF2 | 83375 | 100.0
NO | SJ | 2F2F11FF2 | 62100 | 100.0
FR | RE | 2F2F11FF2 | 2542 | 100.0
FR | GP | 2F2F11FF2 | 1540 | 100.0
FR | MQ | 2F2F11FF2 | 1063 | 100.0
… 3 more rows
```

`a.geom && b.geom` keeps only the pairs whose bounding boxes overlap, a test the spatial index answers (d3), before `ST_Relate` compares the shapes themselves. Eight pairs overlap, and in each the smaller outline lies wholly inside the larger: Natural Earth draws France with its overseas regions (French Guiana, Réunion, Guadeloupe, Martinique, Mayotte), Norway with Svalbard and Jan Mayen, the Netherlands with the Caribbean Netherlands and New Zealand with Tokelau, and the lab also has each of those places' own outline. Read `2F2F11FF2` in order: the interiors share an area (`2`); the larger's interior reaches beyond the smaller (`2` in third place); their boundaries share lines (`1`), the coast; and the seventh character, `F`, says no part of the smaller's interior lies outside the larger. Every outline is valid, but the layer isn't a coverage, and a point in French Guiana is in two outlines (Spatial joins, g3, counts the records this puts in two countries).

**Result:** Shapes travel as WKB, exact and 16 bytes a point; the loader writes it in base64 (a third larger, against hex's double) and turns it into typed `geometry(MultiPolygon, 4326)` columns with `ST_Multi(ST_GeomFromWKB(…, 4326))`. A bow-tie is invalid, has area 0, and stops an overlay with a `TopologyException`; `ST_MakeValid` turns it into two triangles of area 2. In the lab, all 247 country outlines are valid and 11 shapes aren't: Goiás and 10 simplified ecoregions, whose repair changes no area by more than 0.4 km². Validity is checked one shape at a time: eight pairs of valid country outlines overlap, each a territory that Natural Earth also draws inside its country (French Guiana's 83,375 km² inside France, Svalbard and Jan Mayen's 62,100 km² inside Norway). ArcGIS Pro's Check Geometry and Repair Geometry are the same steps behind a dialog; here they are a query you can rerun and compare.

**Exercise:** Three shapes typed in: a square with a hole outside it, a square with a smaller square as a second part inside it, and a square with a hole inside it. For each, is it valid and why not, what is its area as it stands, and what is its area after `ST_MakeValid` with each method? Which repair, if either, gives what each shape was probably meant to be?

**Answer:** One `VALUES` list of names and shapes, then `ST_IsValidDetail`, `ST_Area` and `ST_MakeValid` with and without `'method=structure'`.

```sql
-- q: g2-ex
-- status: ran
-- engine: postgis
WITH shapes (name, geom) AS (VALUES
  ('hole outside its shell', ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0), (5 1, 6 1, 6 2, 5 2, 5 1))')),
  ('shell inside a shell', ST_GeomFromText('MULTIPOLYGON(((0 0, 4 0, 4 4, 0 4, 0 0)), ((1 1, 2 1, 2 2, 1 2, 1 1)))')),
  ('shell with a hole', ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1))'))
)
SELECT name, (ST_IsValidDetail(geom)).valid, (ST_IsValidDetail(geom)).reason,
       ST_Area(geom) AS area,
       ST_Area(ST_MakeValid(geom)) AS linework_area,
       ST_Area(ST_MakeValid(geom, 'method=structure')) AS structure_area
FROM shapes
ORDER BY name;
```

```text
-- result: g2-ex · 3 rows · sha256 0aa66131e1ef
name | valid | reason | area | linework_area | structure_area
hole outside its shell | false | Hole lies outside shell | 15 | 17 | 17
shell inside a shell | false | Nested shells | 17 | 15 | 16
shell with a hole | true | NULL | 15 | 15 | 15
```

**Check:** The square with a hole inside it is valid: 16 less the hole's 1, area 15. The other two are invalid, and their areas as they stand are wrong. The hole outside its shell still subtracts its 1, so `ST_Area` says 15 for a shape that has nowhere to put a hole; both repairs turn the stray ring into a second part, an island of 1 beside the square, area 17. The square inside a square counts the small one twice, 17. The default repair rebuilds polygons from the lines and makes the inner square a hole, 15; `method=structure` unions the two parts into the large square, 16. Which is right depends on what the shape was meant to be, which no function knows: a lake drawn as a part should be a hole, and a duplicated island should merge. So repair, then compare areas and part counts before and after, as `g2-invalid` does. (`ST_IsValid` would answer the same, with each reason as a NOTICE beside the result; `ST_IsValidDetail` puts it in a column.)

**Dialects:**
- **PostgreSQL:** `ST_GeomFromText`, `ST_GeomFromWKB` and `ST_GeomFromEWKB` read shapes, and `ST_AsText`, `ST_AsBinary` and `ST_AsEWKB` write them; a `geometry` value cast to text prints as hex EWKB. `ST_IsValid`, `ST_IsValidReason` and `ST_IsValidDetail` check, and `ST_MakeValid` repairs, with `method=structure` from GEOS 3.10. `ST_IsValid(geom, 1)` accepts a ring that touches itself to enclose a hole, which Esri's rules allow.
- **DuckDB:** the `spatial` extension (not in this course's browser) reads WKB with `ST_GeomFromWKB` and writes it with `ST_AsWKB`, has `ST_IsValid` and `ST_MakeValid`, and reads a GeoParquet file's geometry column as `GEOMETRY`. In the browser without it, the shape files' `geom` column is plain WKB bytes (`BLOB`).
- **SQL Server:** `geometry::STGeomFromText(wkt, srid)` and `STGeomFromWKB` read shapes, and `STAsText()` and `STAsBinary()` write them (casting to `varbinary` gives SQL Server's own format, not WKB). `STIsValid()` checks, `IsValidDetailed()` gives the reason, and `MakeValid()` repairs. It stores invalid shapes too, but most methods refuse them with an error until `MakeValid()` has run: the opposite of PostGIS, which answers.

#### g3 · spatial-join

**Tool:** PG · **Time:** 2.0 h · **Prereqs:** g2

**Concept:** How to join tables by where things are, and how to check one source against another:
- **A spatial predicate** answers true or false about two shapes. Three cover most work:
  - `ST_Contains(a, b)`: b lies inside a, and some of b is in a's interior. A point on a's edge doesn't count.
  - `ST_Covers(a, b)`: no point of b lies outside a. A point on the edge counts.
  - `ST_Intersects(a, b)`: the two share at least one point, edges included. For a point and a polygon it answers the same as `ST_Covers`.
  - `ST_Within(b, a)` is `ST_Contains(a, b)` the other way round, and `ST_CoveredBy(b, a)` is `ST_Covers(a, b)`. Each predicate is a pattern on g2's DE-9IM matrix: `ST_Contains` is `T*****FF*`, the interiors meet (`T`: a point, a line or an area) and nothing of b meets a's exterior.
- **A spatial join** is a join whose `ON` is a predicate, ArcGIS Pro's Spatial Join tool written as a query: `country_shapes AS c JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)` pairs each record with every outline that covers it. A record in no outline drops out of an inner join, and a record in two outlines comes back twice.
- **Which table the join starts from changes its speed.** While consecutive tests use the same polygon, PostGIS keeps a prepared copy of it, with an index of its edges, so each further point costs little. Started from the outlines, each outline is prepared once and tested against the records its spatial index (d3) finds inside its bounding box. Started from the records (`occurrences LEFT JOIN country_shapes`), each test meets another outline, and the join is about 25 times slower on this sample (7 s against 0.3 s on the test server; compare the two with `EXPLAIN ANALYZE`, as in d3). So join from the polygons, summarise per record, and `LEFT JOIN` the records to that summary to keep the ones that matched nothing.
- **A point on an edge** belongs to both neighbours under `ST_Covers` and `ST_Intersects`, and to neither under `ST_Contains`. No predicate gives it to exactly one; when each record must count once, the query needs a rule of its own, such as the smallest outline (the Exercise).
- **Two sources, neither the truth.** Every GBIF record carries a country code (`country_code_gbif`), given by its publisher or worked out by GBIF from the coordinates. The outlines are Natural Earth's, simplified to 1:50m. Joining one to the other (003 §4, spatial lesson 4, here on the whole sample) shows where they agree, where they disagree and which records fall in no outline. A disagreement is a question about the record or the map, not an answer.
- **Overlapping outlines count twice.** g2 found eight pairs of outlines where one lies inside the other (France holds French Guiana, Réunion, Guadeloupe, Martinique and Mayotte). A record inside both matches both, so a count per country adds up to more than the records.

**Worked example:** The three predicates on three points: inside a square, on its edge and outside it.

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

Only the point on the edge tells the predicates apart: `ST_Contains` leaves it out, `ST_Covers` and `ST_Intersects` keep it. Had a second square shared that edge, `ST_Covers` would put the point in both squares and `ST_Contains` in neither.

**Lab:**
1. Does the choice matter for the sample? Every record–outline pair that shares a point, counted under each predicate:

```sql
-- q: g3-edges
-- status: ran
-- engine: postgis
SELECT count(*) FILTER (WHERE ST_Contains(c.geom, o.geom)) AS contains,
       count(*) FILTER (WHERE ST_Covers(c.geom, o.geom)) AS covers,
       count(*) AS intersects
FROM country_shapes AS c
JOIN occurrences AS o ON ST_Intersects(c.geom, o.geom);
```

```text
-- result: g3-edges · 1 row · sha256 72a27c571dbc
contains | covers | intersects
40329 | 40329 | 40329
```

The three counts are equal: no record lies exactly on an outline's edge, so here the predicates give the same join. They part where points and lines share a grid, such as records rounded to 0.1° against outlines drawn along whole degrees. `ST_Covers` is the usual choice for points in polygons: it loses no point, and a point on a shared edge shows up twice, where a count can catch it. The rest of this module uses it. The 40,329 pairs are more than the 39,396 records that fall in some outline; step 4 finds the extra 933.

2. Each record against GBIF's code: an outline it falls in is GBIF's country (agree), none of them is (disagree), or it falls in no outline. The join starts from the outlines, as the Concept says, and the `LEFT JOIN` comes after, on the per-record summary:

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

Of the sample's 40,395 records, 39,190 agree, 206 disagree and 999 lie in no outline; every record has a GBIF code. `bool_or` makes a record agree when any outline it falls in is its code, so the 932 records in two outlines that agree are counted once, as agreeing.

3. Where they disagree, GBIF's code against the outline's:

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

The disagreements are pairs of neighbours: 78 records coded US inside Mexico's outline, 28 coded Benin inside Burkina Faso's, 18 coded French Guiana inside Brazil's, 15 coded Ecuador inside Peru's, 12 coded French Guiana inside Suriname's. Each is a record a few kilometres over a border, a border the 1:50m outline draws a few kilometres off, or a publisher's country that isn't where the point is; the query can't say which. Distance and overlay (g4) measures how close to a border such records lie.

4. The records inside two outlines at once:

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

933 records sit in two outlines (932 that agree, 1 that doesn't), every one inside France's and an overseas region's: French Guiana 924, Réunion 6, Martinique 3. Natural Earth's France includes its overseas regions, which also have outlines of their own (g2's `g2-coverage`), so a spatial join counts these records twice unless the outlines are a partition. The one coded Suriname sits inside French Guiana's outline, and is also one of the 206 disagreements.

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

**Result:** On the square, only `ST_Covers` and `ST_Intersects` count the point on the edge. On the sample the three predicates give the same 40,329 pairs, as no record lies on an edge. Of the 40,395 records, 39,190 agree with an outline, 206 disagree and 999 lie in no outline. The disagreements are border pairs (78 records coded US inside Mexico's outline, 28 coded Benin inside Burkina Faso's): a record a few kilometres over a border, a generalized border, or a publisher's country that isn't where the point is. 933 records sit in two outlines at once, every one inside France's and an overseas region's (French Guiana 924, Réunion 6, Martinique 3), so a per-country count adds up to 933 more than the records in outlines. Spatial indexes (g5) finds where the 999 in no outline are.

**Exercise:** Count the records in each country's outline, the usual spatial-join report. Which countries' counts are too high because outlines overlap, and by how much does the total exceed the records the outlines hold? Then give each record one country, the smallest outline that covers it, and count again.

**Answer:** One join from the outlines; `row_number()` ranks each record's outlines by area, smallest first, and `ROLLUP` adds a total row. Only the rows whose two counts differ are kept. The outline areas are worked out once, in a `MATERIALIZED` CTE:

```sql
-- q: g3-ex
-- status: ran
-- engine: postgis
WITH outlines AS MATERIALIZED (
  SELECT country_code, geom, ST_Area(geom::geography) AS m2 FROM country_shapes
), hits AS (
  SELECT c.country_code, row_number() OVER (PARTITION BY o.id ORDER BY c.m2) AS rank
  FROM outlines AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
)
SELECT CASE WHEN GROUPING(country_code) = 1 THEN 'all' ELSE country_code END AS country,
       count(*) AS every_outline, count(*) FILTER (WHERE rank = 1) AS smallest_outline
FROM hits
GROUP BY ROLLUP (country_code)
HAVING count(*) <> count(*) FILTER (WHERE rank = 1)
ORDER BY GROUPING(country_code), country_code;
```

```text
-- result: g3-ex · 2 rows · sha256 3d08155603d3
country | every_outline | smallest_outline
FR | 944 | 11
all | 40329 | 39396
```

**Check:** Only France's count changes. Its outline holds 944 records, but 933 of them are also inside an overseas region's outline (step 4), so given one country each, France keeps 11: the 11 records GBIF codes `FR`. French Guiana, Réunion and Martinique keep their counts, since their outlines are the smaller ones. The total falls from 40,329 pairs to 39,396 records, 39,190 that agree and 206 that don't (step 2). The smallest outline is the right rule here because each overlap is a territory drawn inside its country (g2); for outlines that overlap along a border, no rule of area says which country a record is in. Without `MATERIALIZED`, PostgreSQL may inline the CTE and work out `ST_Area(geom::geography)` for every joined row, 40,329 times instead of 247: the same answer, two orders of magnitude slower (about 82 s against 0.45 s on the test server).

**Dialects:**
- **PostgreSQL:** `ST_Contains`, `ST_Covers`, `ST_Intersects`, `ST_Within`, `ST_CoveredBy` and `ST_Relate` with a pattern; each uses a GiST index on either argument by itself, through its bounding box. `ST_ContainsProperly(a, b)` also refuses a b that touches a's boundary at all, and can be answered faster.
- **DuckDB:** the `spatial` extension (not in this course's browser) has the same predicates by the same names, and plans a join on one of them as a spatial join of its own, with no index to create. Without it, the browser's lab can join records to a box of degrees, as in Joins (f3), but not to an outline.
- **SQL Server:** methods on the shape: `a.STContains(b)`, `a.STIntersects(b)`, `b.STWithin(a)`, and `a.STRelate(b, 'T*****FF*')`; there is no `STCovers`, so `STIntersects` serves for points in polygons. A spatial index is used only when the method's result is compared with `= 1` in `WHERE` or `ON`, as in `ON c.geom.STContains(o.geom) = 1`.

#### g4 · measure-overlay

**Tool:** PG · **Time:** 2.0 h · **Prereqs:** g3

**Concept:** How to measure lengths, areas and distances in metres, and how to cut one layer by another:
- **Measure on `geography`** (g1). Cast first, and `ST_Length` of a line, `ST_Perimeter` and `ST_Area` of a polygon, and `ST_Distance` between two shapes answer in metres and square metres, on the ellipsoid. On SRID 4326 geometry they answer in degrees.
- **"Within d?"** is `ST_DWithin(a, b, d)`; on `geography`, d is in metres. It gives the same answer as `ST_Distance(a, b) <= d`, but it starts with a bounding-box test that a spatial index (d3) can answer, and measures only the shapes that pass. `ST_Distance(a, b) < d` measures every pair. The index must be on the expression the query compares: casting a geometry column to `geography` in the query leaves the column's geometry index unused (Spatial indexes, g5, shows the plans).
- **A buffer** is the area within a distance of a shape, as a polygon: `ST_Buffer(g, d)`, ArcGIS Pro's Buffer. On `geography`, PostGIS picks a flat system that suits the shape (a UTM zone, or a polar Lambert azimuthal one), buffers there in metres and turns the result back into longitude and latitude. Curves are drawn as straight segments, 8 to a quarter circle by default, so the polygon falls a little inside the true distance. To ask whether something lies within d, use `ST_DWithin`, which is exact and faster; draw a buffer when you need the area itself, to measure it, map it or cut another layer with it.
- **Overlay** builds new shapes from two inputs' edges. `ST_Intersection(a, b)` keeps what both cover (ArcGIS Pro's Intersect, or Clip when b is one shape); `ST_Difference(a, b)` keeps the part of a outside b (Erase); `ST_Union` merges shapes into one, and as an aggregate it merges a column's rows (Dissolve). Overlays are much slower than predicates, so let a predicate the index answers pick the pairs (`JOIN … ON ST_Intersects(…)`) and overlay only those. An overlay can return lines and points where shapes only touch: `ST_CollectionExtract(g, 2)` keeps the lines, `3` the polygons. An invalid input can stop it with a `TopologyException` (g2).
- **Two maps never fit exactly.** Layers drawn, or simplified, apart disagree along every line they share. The lab's ecoregions were simplified one at a time to 0.05°, about 5 km (§4.1), and the country outlines on their own, so neighbouring ecoregions overlap in places and pull apart in others, and the ecoregions stop short of the outline's coast. Cut by an outline, the pieces add up to a little more or less than the whole: an overlay should report by how much, since that is the error any area it gives carries.
- **Valid isn't a coverage** (g2). Each ecoregion here is a valid shape; `ST_IsValid` checks one row at a time and can't see that two rows overlap. Only a test across pairs finds it, the one g2 ran on the country outlines.

**Worked example:** How much of Costa Rica does each ecoregion cover? Cut each ecoregion that touches the outline by it, measure the piece on the ellipsoid, and divide by the outline's area:

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

Seven ecoregions reach into Costa Rica, led by the Isthmian-Atlantic moist forests (17,288 km², 33.7 %). Five are moist or dry broadleaf forest; the other two are mangroves along the coasts, Southern Mesoamerican Pacific (637 km²) and Mesoamerican Gulf-Caribbean (198 km²). `ST_Intersects` in the `ON` clause picks the ecoregions, with the index; `ST_Intersection` in the `SELECT` cuts only those seven. The shares add up to 97.3 %, not 100: the Lab asks why.

**Lab:**
1. Do the pieces add up to the country? The outline's area, the pieces' sum, and the part of the outline that no ecoregion covers (the outline less the union of the ecoregions):

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

The pieces add up to 49,908 km² of the outline's 51,303, and 2,070 km² lie in no ecoregion. Had the pieces been a partition, the two would add up to the outline exactly; they add up to 51,978, about 675 km² too many. So the pieces both leave gaps and overlap. About half of the gap lies within 5 km of the sea, where the ecoregions stop short of the outline's coast; the rest is slivers inland, where two neighbouring ecoregions both pulled back from their shared border.

2. Where do the pieces overlap? Each pair of pieces whose interiors share an area (g2's `'2********'` test), with its DE-9IM matrix, and a total row first:

```sql
-- q: g4-overlaps
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR'),
pieces AS (
  SELECT e.eco_id, ST_Intersection(e.geom, cr.geom) AS geom
  FROM ecoregions AS e
  JOIN cr ON ST_Intersects(e.geom, cr.geom)
),
shared AS (
  SELECT a.eco_id || '+' || b.eco_id AS pair, ST_Relate(a.geom, b.geom) AS de9im,
         ST_Area(ST_Intersection(a.geom, b.geom)::geography) AS m2
  FROM pieces AS a
  JOIN pieces AS b ON a.eco_id < b.eco_id AND ST_Relate(a.geom, b.geom, '2********')
)
SELECT CASE WHEN GROUPING(pair) = 1 THEN 'all' ELSE pair END AS pair, de9im,
       round((sum(m2) / 1e6)::numeric, 1) AS overlap_km2
FROM shared
GROUP BY ROLLUP ((pair, de9im))
ORDER BY GROUPING(pair) DESC, overlap_km2 DESC, pair;
```

```text
-- result: g4-overlaps · 11 rows · sha256 b0c2c01abe86
pair | de9im | overlap_km2
all | NULL | 678.2
470+506 | 212111212 | 181.7
458+527 | 212111212 | 143.8
458+506 | 212111212 | 76.3
458+471 | 212101212 | 62.0
… 6 more rows
```

Ten pairs overlap, 678.2 km² in all: the 675 km² that step 1's pieces counted twice (a few square kilometres lie in three ecoregions at once, and come into three pairs). The largest are between neighbours along long borders: the Isthmian-Atlantic moist forests and the Talamancan montane forests (181.7 km²), the seasonal moist and the dry forests (143.8). Each is a thin strip along a border that each ecoregion, simplified on its own, drew in a slightly different place. Compare the matrices with g2's `2F2F11FF2`, a territory wholly inside its country: here the third and seventh characters are `2` too, so each piece also reaches outside the other. These are partial overlaps between shapes that are each valid: the layer isn't a coverage, and nothing about one row says so. Pieces that overlap are counted twice by any sum over them, as step 1's was; a partition (each overlap given to one ecoregion, each gap to the nearest) would need rules of its own, and the honest report is the overlay's error: here about 1.3 % of the country in overlaps and 4.0 % in gaps.

3. Costa Rica's land borders, their length, and the records within 10 km of each, by the code GBIF gave them:

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

`ST_Touches` finds the outlines that share a border with Costa Rica's but no interior: Nicaragua and Panama. The border is where their two boundaries meet: `ST_Intersection` of the boundaries returns the shared lines (and any lone points where they only touch), `ST_CollectionExtract(…, 2)` keeps the lines and `ST_LineMerge` joins them into one. The land borders are 267 km (Nicaragua) and 250 km (Panama). Within 10 km of them, on either side, lie 5 and 9 records coded for Costa Rica or the neighbour; 7 of the 14 are coded for the neighbour. So close to a line, the code and the outline can each be right or wrong: a 1:50m border is generalized and can be kilometres off, and g3's disagreements are mostly records like these. The `ON` clause casts every record's `geom` to `geography`, so the index on `occurrences.geom` can't help, and the join reads all 40,395 records for each border (about 0.7 s); g5 shows the plan and an index that does help.

**Result:** Overlaying the ecoregions on Costa Rica gives seven pieces, led by the Isthmian-Atlantic moist forests (17,288 km², 33.7 %). The pieces add up to 49,908 km² of the outline's 51,303, with 2,070 km² in no ecoregion and about 675 km² counted twice: ten pairs of valid pieces overlap, 678.2 km² in all, along borders each ecoregion drew in its own place. A valid layer isn't a coverage, and an area from this overlay carries an error of a few per cent of the country. Costa Rica's land borders are 267 km (Nicaragua) and 250 km (Panama); 14 records lie within 10 km of them, half of them coded for the neighbour.

**Exercise:** How much of Costa Rica lies within 10 km of each land border, and which records are in that strip? Draw the strip with `ST_Buffer` on `geography`, cut it by Costa Rica's outline, and give its area, its records, how many of them GBIF codes for the neighbour, and, as a check on the buffer, how many of them `ST_DWithin` finds within 10 km of the border.

**Answer:** g4-border's border lines, buffered by 10,000 m on `geography`, cast back to geometry and cut by the outline (`ST_Intersection`); then a spatial join of the records to each strip, as in g3.

```sql
-- q: g4-ex
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR'),
border AS (
  SELECT n.country_code AS neighbour,
         ST_LineMerge(ST_CollectionExtract(ST_Intersection(ST_Boundary(cr.geom), ST_Boundary(n.geom)), 2)) AS geom
  FROM cr
  JOIN country_shapes AS n ON n.country_code <> 'CR' AND ST_Touches(n.geom, cr.geom)
),
strip AS (
  SELECT b.neighbour, b.geom AS line,
         ST_Intersection(ST_Buffer(b.geom::geography, 10000)::geometry, cr.geom) AS geom
  FROM border AS b, cr
)
SELECT s.neighbour,
       round((ST_Area(s.geom::geography) / 1e6)::numeric) AS strip_km2,
       count(o.id) AS records,
       count(o.id) FILTER (WHERE o.country_code_gbif = s.neighbour) AS coded_neighbour,
       count(o.id) FILTER (WHERE ST_DWithin(o.geom::geography, s.line::geography, 10000)) AS within_10km
FROM strip AS s
LEFT JOIN occurrences AS o ON ST_Covers(s.geom, o.geom)
GROUP BY s.neighbour, s.geom
ORDER BY s.neighbour;
```

```text
-- result: g4-ex · 2 rows · sha256 e63983707c3d
neighbour | strip_km2 | records | coded_neighbour | within_10km
NI | 2673 | 2 | 1 | 2
PA | 2289 | 7 | 1 | 7
```

**Check:** The strips are 2,673 km² along Nicaragua and 2,289 km² along Panama, 5.2 % and 4.5 % of Costa Rica. A strip is close to its border's length times 10 km (2,670 and 2,500 km²), and smaller where the sea cuts it off at the border's ends or the border winds, so the buffer on its inner bends overlaps itself. The strips hold 2 and 7 records, against g4-border's 5 and 9 on both sides of the line: the other 3 and 2 lie outside Costa Rica's outline. One record in each strip is coded for the neighbour although it lies inside Costa Rica's outline, two of g3's 206 disagreements. `within_10km` equals `records`: the buffer's straight segments lost no record here. Had the cut been left out, the strip would reach 10 km into each neighbour as well, and a record there would count for Costa Rica.

**Dialects:**
- **PostgreSQL:** `ST_Area`, `ST_Length`, `ST_Perimeter`, `ST_Distance`, `ST_DWithin` and `ST_Buffer` take `geography` and answer in metres; `ST_Buffer` also takes `'quad_segs=…'` and, on geometry, `'endcap=flat'` or `'side=left'` for a one-sided strip. `ST_Intersection`, `ST_Difference`, `ST_SymDifference` and `ST_Union` overlay, through GEOS; `ST_Union` and `ST_Collect` are aggregates too (`ST_Collect` only gathers, with no merge).
- **DuckDB:** the `spatial` extension (not in this course's browser) has `ST_Intersection`, `ST_Difference`, `ST_Union`, `ST_Buffer` and `ST_DWithin` on `GEOMETRY`, in the units of its coordinates; for metres, `ST_Transform` to a projected system first, or use `ST_Distance_Spheroid` (latitude first, g1). Without it, the browser's lab has no shapes to overlay.
- **SQL Server:** methods on the shape: `a.STIntersection(b)`, `a.STDifference(b)`, `a.STUnion(b)`, `g.STBuffer(d)` and `a.STDistance(b)`, in metres on `geography`; `geography::UnionAggregate(geom)` dissolves rows. There is no `STDWithin`: write `a.STDistance(b) <= d`, which a spatial index can serve when it stands alone in `WHERE` or `ON`. `BufferWithTolerance(d, tolerance, relative)` sets how closely the curves are drawn.

#### g5 · spatial-index

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** g3, d3

**Concept:** When a GiST index does the work in a spatial query, and when it can't:
- **What the index holds** (d3). A GiST index on a geometry column keeps each shape's bounding box in a tree of boxes. It answers questions about boxes: `&&` (two boxes overlap), `@` and `~` (one box inside the other), and `<->` (how far apart). `ST_Intersects`, `ST_Covers` and `ST_DWithin` add the box test for you, so the plan shows an `Index Cond` on boxes and a `Filter` (or a recheck) with the exact test on the rows the boxes let through.
- **Nearest neighbours.** `ORDER BY geom <-> point LIMIT k` asks for the k shapes nearest a point. With the index, PostgreSQL walks the tree outward from the point, nearest boxes first, and stops after k rows: the plan is an `Index Scan … Order By` under a `Limit`, with no `Sort` and no search radius to guess (ArcGIS Pro's Near without one). The point must be a constant or come from an outer row (`CROSS JOIN LATERAL`), and `<->` must compare the indexed column itself.
- **Degrees aren't metres.** On SRID 4326, `<->` measures in degrees, as if a degree of longitude were as long as a degree of latitude. It is only at the equator: at latitude φ a degree of longitude is cos φ as long on the ground, so `<->` counts east–west distances 1 / cos φ too long (1.36 times at Hobart, 2 at 60°). The order it gives can differ from the order in metres. Either take more candidates by `<->` and sort those by their distance in metres, or order by distance on `geography`, whose `<->` measures on a sphere in metres.
- **A cast hides the column.** An index serves the expression it was built on. `ST_DWithin(geom::geography, …)` compares `geom::geography`, not `geom`, so the index on `geom` can't help and every row is read (g4's border query). Build the index on the same expression, `CREATE INDEX … USING gist ((geom::geography))`, and the condition can use it. The other fix is a column of type `geography` with its own index.
- **When an index can't help:** a test it can't turn into a box (`ST_Distance(a, b) < d`, d3); a cast or function around the column; a filter that keeps most of the table, which reads every page anyway; and statistics that mislead the planner (run `ANALYZE` after a load, d3).

**Data:** `occurrences`, `country_shapes`; a point in Hobart, Tasmania (147.33° E, 42.88° S).

**Worked example:** The five records nearest Hobart, with their distance in kilometres on the ellipsoid:

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

The nearest records are Tasmanian devils, 2.44 to 7.08 km away. The last two lie at the same spot, with nine more records there, so `o.id` breaks the tie and the same five come back every time. `<->` orders; `ST_Distance` on `geography` gives the distance in metres, worked out for the five rows only.

**Lab:** Each block runs in a transaction that is rolled back, as in d3: in `psql`, type `BEGIN;` before a block and `ROLLBACK;` after it. Each plan lab lists what its plan must show; the plan printed under it is an example, from the versions named above the first block.

1. Statistics first, as in d3: `ANALYZE` reading every row, so the planner's estimates, and the plans below, are the same on your server:

```sql
-- q: g5-analyze
-- status: ran
-- engine: postgis
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences;
SELECT c.reltuples::bigint AS planner_rows, (SELECT count(*) FROM occurrences) AS table_rows
FROM pg_class AS c
WHERE c.oid = 'occurrences'::regclass;
```

```text
-- result: g5-analyze · 1 row · sha256 2415e801456a
planner_rows | table_rows
40395 | 40395
```

2. The worked example's plan, without the names and distances. The plan must show the top node returning 5 rows, an index scan on `occurrences_geom_idx`, and its `Order By`:

```sql
-- q: g5-knn-plan
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 5
-- plan: Index Scan using occurrences_geom_idx
-- plan: Order By
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

The index scan reads the records in order of distance and stops when `Limit` has five: 5 rows read of 40,395, and no `Sort`.

3. Does the order in degrees match the order in metres? Rank every record both ways, and keep the rows where the ranks differ in either top 20:

```sql
-- q: g5-degrees
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom),
ranked AS (
  SELECT o.id,
         ST_Distance(o.geom::geography, h.geom::geography) / 1000 AS km,
         o.geom <-> h.geom AS degrees,
         ST_X(o.geom) - ST_X(h.geom) AS east_deg,
         ST_Y(o.geom) - ST_Y(h.geom) AS north_deg,
         row_number() OVER (ORDER BY o.geom <-> h.geom, o.id) AS by_degrees,
         row_number() OVER (ORDER BY ST_Distance(o.geom::geography, h.geom::geography), o.id) AS by_metres
  FROM occurrences AS o
  CROSS JOIN hobart AS h
)
SELECT id, round(km::numeric, 3) AS km, round(degrees::numeric, 4) AS degrees,
       round(east_deg::numeric, 3) AS east_deg, round(north_deg::numeric, 3) AS north_deg,
       by_degrees, by_metres
FROM ranked
WHERE (by_degrees <= 20 OR by_metres <= 20) AND by_degrees <> by_metres
ORDER BY by_metres;
```

```text
-- result: g5-degrees · 6 rows · sha256 f2b1681a3b45
id | km | degrees | east_deg | north_deg | by_degrees | by_metres
6004135264 | 7.997 | 0.0844 | -0.065 | -0.054 | 30 | 16
6004133344 | 8.003 | 0.0738 | 0.023 | -0.070 | 16 | 17
6004133858 | 8.003 | 0.0738 | 0.023 | -0.070 | 17 | 18
6004134874 | 8.003 | 0.0738 | 0.023 | -0.070 | 18 | 19
6004136872 | 8.003 | 0.0738 | 0.023 | -0.070 | 19 | 20
… 1 more row
```

Record 6004135264 is 7.997 km from the point, the 16th nearest in metres, but 30th by `<->`. It lies to the south-west, 0.065° west and 0.054° south: 0.0844° by `<->`. Thirteen records 8.003 km away, nearly due south (0.023° east, 0.070° south), are only 0.0738° away by `<->`, so they take ranks 16 to 28 ahead of it, and so does one 8.185 km away. At 42.88° south a degree of longitude is about 81.7 km on the ground and a degree of latitude about 111.1 km, so `<->` counts the west part 1.36 times too long. The 20 nearest by degrees miss the 16th nearest in metres and take the 21st instead. The difference here is metres, but it grows towards the poles and with the distances involved; a list ranked by `<->` on SRID 4326 is a list of candidates, not an answer in metres.

4. The records within 20 km of Hobart, measured on the ellipsoid. The cast hides `geom` from its index, so every row is read. The plan must show 55 rows, a `Seq Scan`, and no index:

```sql
-- q: g5-cast-plan
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 55
-- plan: Seq Scan on occurrences
-- plan: no Index
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

PostgreSQL measured the distance from all 40,395 records to keep 55.

5. An index on the expression itself fixes it. The plan must show the same 55 rows and a `Bitmap Index Scan` on the new index:

```sql
-- q: g5-geography-index
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 55
-- plan: Bitmap Index Scan on occurrences_geography_idx
CREATE INDEX occurrences_geography_idx ON occurrences USING gist ((geom::geography));
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
WHERE ST_DWithin(o.geom::geography, ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography, 20000);
```

```text
-- result: g5-geography-index · 6 rows · sha256 00b2f96fdafb
QUERY PLAN
Bitmap Heap Scan on occurrences o (actual rows=55 loops=1)
  Filter: st_dwithin((geom)::geography, '0101000020E6100000C…
  Rows Removed by Filter: 11
  Heap Blocks: exact=19
  ->  Bitmap Index Scan on occurrences_geography_idx (actual…
… 1 more row
```

The index finds 66 records whose boxes come within 20 km of the point, the exact test keeps the same 55, and only the pages holding the 66 are read (`Heap Blocks`), not the whole table. The query didn't change: only the index did.

6. g3's 999 records in no outline: how far is each from the nearest outline? Nearest-neighbour search works on polygons too, once per record through `CROSS JOIN LATERAL`:

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

For a polygon, `<->` is the distance to its nearest edge, not to its box, so `LIMIT 1` gets the nearest outline, by degrees. Step 3's caution applies: here the nearest outline by degrees is also the nearest in metres for all 999 records (checked against each record's next two). 436 records lie within 5 km of an outline: beaches, mangroves and coasts the 1:50m outlines simplify. In nearly all of them the nearest outline is GBIF's country. 529 lie 5 to 25 km out, mostly on islands too small for 1:50m: 346 bilby records on one island off South Australia, 133 pig-nosed turtle records on the Gulf of Papua's delta. 34 are 25 km or more from any outline, up to 343.9 km, and are worth reading one by one.

**Result:** The nearest records to Hobart are Tasmanian devils, 2.44 to 7.08 km away, found by an `Index Scan … Order By` that reads 5 rows. `<->` on SRID 4326 ranks in degrees: at 43° south it put the 16th nearest record in metres 30th. With the cast to `geography`, a 20 km search reads all 40,395 rows to keep 55; an index on `geom::geography` finds 66 candidates and keeps the same 55. Of g3's 999 records in no outline, 436 lie within 5 km of one, 529 within 25 km, mostly on small islands, and 34 farther.

**Exercise:** Find the 20 records nearest Hobart in metres, with an index doing the work: no `Sort` and no `Seq Scan`. Show the plan; then run the query and find g5-degrees' record 6004135264 in it.

**Answer:** An index on `geom::geography`, and `ORDER BY` the same expression `<->` the point as `geography`. `<->` on `geography` measures on a sphere, in metres, and the index walks outward from the point as in step 2:

```sql
-- q: g5-ex
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 20
-- plan: Index Scan using occurrences_geography_idx
-- plan: Order By: ((geom)::geography <->
-- plan: no Sort
-- plan: no Seq Scan
CREATE INDEX occurrences_geography_idx ON occurrences USING gist ((geom::geography));
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
ORDER BY o.geom::geography <-> ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography
LIMIT 20;
```

```text
-- result: g5-ex · 3 rows · sha256 ce122751eb76
QUERY PLAN
Limit (actual rows=20 loops=1)
  ->  Index Scan using occurrences_geography_idx on occurren…
        Order By: ((geom)::geography <-> '0101000020E6100000…
```

**Check:** Compare your plan with the answer's: a `Limit` over an `Index Scan` on your index with `actual rows=20`, its `Order By` on `(geom)::geography <->`, and no `Sort` or `Seq Scan` anywhere. Run the query itself: record 6004135264 is 16th, as in g5-degrees' `by_metres`. On a sphere the distances differ from `ST_Distance`'s on the ellipsoid by a few metres in 7 km (7,088 m against 7,081 m for the eleven records at one spot), which can swap two records whose distances are that close; sort the 20 by `ST_Distance` if that matters. Ordering by `ST_Distance(geom::geography, …)` instead gives the right rows too, but measures all 40,395 and sorts them. Taking 40 candidates by `<->` on `geom` and sorting them by metres also finds the 16th here, through the existing index, but nothing in the query says 40 is enough.

**Dialects:**
- **PostgreSQL:** GiST on `geometry` and `geography` (and SP-GiST and BRIN on `geometry`); `<->` orders nearest first through GiST, in the column's units on `geometry` and in metres on a sphere on `geography`; `<#>` orders by the distance between boxes. An expression index serves only the same expression; `ST_DWithin`, `ST_Intersects` and the other predicates use either argument's index by themselves.
- **DuckDB:** the `spatial` extension (not in this course's browser) builds an R-tree with `CREATE INDEX … USING RTREE (geom)`, used to filter a table by a constant shape (`ST_Intersects`, `ST_Within` and the like). For the nearest rows, `ORDER BY ST_Distance(geom, point) LIMIT k` measures every row, in the coordinates' units; `ST_Distance_Spheroid` measures in metres (latitude first, g1).
- **SQL Server:** spatial indexes are grids, not trees; one on `geometry` needs a `BOUNDING_BOX`. A nearest-neighbour query uses one when it is `SELECT TOP (k) … WHERE geom.STDistance(@p) IS NOT NULL ORDER BY geom.STDistance(@p)`; in metres on `geography`.

#### g6 · grids

**Tool:** PG · **Time:** 1.5 h · **Prereqs:** g4

**Concept:** How to count points into areal units, and how much the units decide:
- **Why a grid.** Points become comparable numbers once they are counted into areas. Countries and states are areas too, but they differ in size by orders of magnitude, so a count per country says as much about the country's size as about the records. A grid gives every unit the same size and shape, so counts compare directly; the spatial statistics track (s2–s5) builds on such counts.
- **`ST_HexagonGrid(edge, bounds)`** returns the hexagons of edge length `edge` that touch the box around `bounds`, each with its column and row, `i` and `j` (`ST_SquareGrid(size, bounds)` does the same for squares; ArcGIS Pro's Generate Tessellation). The grid is anchored at the SRID's origin, so the same edge always gives the same cells, and `i`, `j` name one cell in every query. The cells cover the box, not the shape: keep the ones that touch it with `ST_Intersects`.
- **Equal area needs an equal-area SRID.** The edge is in the bounds' units: on SRID 4326, degrees, and a degree of longitude is shorter on the ground the farther it lies from the equator (cos φ, g1): cells shrink towards the poles and are squashed east–west. In an equal-area projection the edge is in metres and every cell has the same ground area. For Tasmania that is EPSG:3577, Australian Albers. A hexagon of edge e has area (3√3/2)·e²: 64.95 km² at 5 km, 259.81 km² at 10 km.
- **Hexagons or squares.** In a hexagon grid every neighbour shares an edge, and every neighbour's centre is √3·e away. A square has four neighbours across an edge and four that touch only at a corner, √2 times farther, so "neighbour" needs a rule; s4's neighbour rule relies on it.
- **Cells at the coast** hold part land, part sea. A count there compares less land than an inland cell's, and records just off the outline (a simplified coast, g5) still fall in the cell. Count with `ST_Contains`: a record on the edge between two cells is then in neither, with `ST_Intersects` in both (g3).
- **The modifiable areal unit problem** (MAUP): counts, and every statistic built on them, change with the cells' size (the scale effect) and with where the grid starts (the zoning effect). Neither size nor start is given by the data, so a result from one grid should be checked on another.

**Data:** `occurrences` (the Tasmanian devil, *Sarcophilus harrisii*), `admin1_shapes` (Tasmania's main island, the largest of the state's nine parts at 1:50m).

**Worked example:** Hexagons with a 10 km edge drawn in EPSG:3577, and hexagons with a 0.1° edge drawn on SRID 4326, each set kept where it touches the main island, and each cell's area measured on the ellipsoid:

```sql
-- q: g6-equal-area
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(geom) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom::geography) DESC
  LIMIT 1
), cells AS (
  SELECT 'EPSG:3577, edge 10 km' AS grid, ST_Transform(h.geom, 4326) AS geom
  FROM island, ST_HexagonGrid(10000, ST_Transform(island.geom, 3577)) AS h
  WHERE ST_Intersects(h.geom, ST_Transform(island.geom, 3577))
  UNION ALL
  SELECT 'EPSG:4326, edge 0.1°', h.geom
  FROM island, ST_HexagonGrid(0.1, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
)
SELECT grid, count(*) AS cells,
       round((min(ST_Area(geom::geography)) / 1e6)::numeric, 3) AS min_km2,
       round((max(ST_Area(geom::geography)) / 1e6)::numeric, 3) AS max_km2,
       round((max(ST_Area(geom::geography)) / min(ST_Area(geom::geography)))::numeric, 4) AS max_over_min
FROM cells
GROUP BY grid
ORDER BY grid;
```

```text
-- result: g6-equal-area · 2 rows · sha256 6c9d4a8a5f33
grid | cells | min_km2 | max_km2 | max_over_min
EPSG:3577, edge 10 km | 296 | 259.808 | 259.808 | 1.0000
EPSG:4326, edge 0.1° | 317 | 232.889 | 244.137 | 1.0483
```

The 296 cells drawn in Albers each cover 259.808 km² on the ellipsoid, as the formula says: the projection keeps areas, so the planar area is the ground area. The 317 cells drawn in degrees range from 232.889 to 244.137 km², 4.8 % apart: their centres span 3° of latitude, from 40.6° S to 43.7° S, and cos φ falls by that much over them. On the ground each is also squashed: about 8.2 km across per 0.1° of longitude against 11.1 km per 0.1° of latitude. Counts in such cells compare unequal areas, and the difference grows with the area a grid covers.

**Lab:**

1. Which records can the cells hold? Place each devil record on the main island, on one of the state's smaller islands, on another outline or on none, and count those in a 5 km and in a 10 km cell:

```sql
-- q: g6-records
-- status: ran
-- engine: postgis
WITH parts AS (
  SELECT (part).geom, rank() OVER (ORDER BY ST_Area((part).geom) DESC) AS size_rank
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
), island AS (
  SELECT geom FROM parts WHERE size_rank = 1
), cells AS (
  SELECT e.edge_m, h.geom
  FROM island, (VALUES (5000), (10000)) AS e (edge_m), ST_HexagonGrid(e.edge_m, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
), devils AS (
  SELECT o.geom AS geom_4326, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), placed AS (
  SELECT d.geom,
         CASE WHEN ST_Covers(i.geom, d.geom) THEN 'main island'
              WHEN EXISTS (SELECT 1 FROM parts AS p WHERE ST_Covers(p.geom, d.geom)) THEN 'smaller island'
              WHEN EXISTS (SELECT 1 FROM admin1_shapes AS a WHERE ST_Covers(a.geom, d.geom_4326)) THEN 'another state'
              ELSE 'no outline' END AS place
  FROM devils AS d CROSS JOIN island AS i
)
SELECT p.place, count(*) AS records,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM cells AS c WHERE c.edge_m = 5000 AND ST_Contains(c.geom, p.geom))) AS in_5km_cell,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM cells AS c WHERE c.edge_m = 10000 AND ST_Contains(c.geom, p.geom))) AS in_10km_cell
FROM placed AS p
GROUP BY p.place
ORDER BY array_position(ARRAY['main island', 'smaller island', 'no outline', 'another state'], p.place);
```

```text
-- result: g6-records · 4 rows · sha256 79d3e0a38cd8
place | records | in_5km_cell | in_10km_cell
main island | 1784 | 1784 | 1784
smaller island | 12 | 0 | 12
no outline | 198 | 188 | 194
another state | 6 | 0 | 0
```

Every record on the main island is in a cell at both sizes, so none lies on an edge between two. The 12 records on Maria Island, 12 to 14 km off the east coast, fall in a 10 km cell that touches the main island and in no 5 km one. Of the 198 records in no outline, 188 sit in coastal 5 km cells and 194 in 10 km ones: the cells reach past the 1:50m coast and catch them. The rest lie farther out. The 6 records on other states (four on the Australian mainland, two in New Mexico, USA) are in neither grid. So the 5 km cells hold 1,972 of the 2,000 records and the 10 km cells 1,990.

2. How much of each cell is land? A cell is all land when the island covers it; its share is the area of its piece of the island over its own:

```sql
-- q: g6-land
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), cells AS (
  SELECT e.edge_m, h.geom, ST_Covers(island.geom, h.geom) AS all_land,
         ST_Area(ST_Intersection(h.geom, island.geom)) / ST_Area(h.geom) AS land_share
  FROM island, (VALUES (5000), (10000)) AS e (edge_m), ST_HexagonGrid(e.edge_m, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
)
SELECT c.edge_m, round((min(ST_Area(c.geom)) / 1e6)::numeric, 2) AS cell_km2, count(*) AS cells,
       count(*) FILTER (WHERE c.all_land) AS all_land,
       count(*) FILTER (WHERE c.land_share < 0.5) AS under_half_land,
       round((sum(ST_Area(c.geom)) / 1e6)::numeric) AS cells_km2,
       round((ST_Area(i.geom) / 1e6)::numeric) AS island_km2
FROM cells AS c CROSS JOIN island AS i
GROUP BY c.edge_m, i.geom
ORDER BY c.edge_m;
```

```text
-- result: g6-land · 2 rows · sha256 258e45aa5cd2
edge_m | cell_km2 | cells | all_land | under_half_land | cells_km2 | island_km2
5000 | 64.95 | 1094 | 884 | 107 | 71057 | 64246
10000 | 259.81 | 296 | 199 | 47 | 76903 | 64246
```

The 1,094 cells of 5 km cover 71,057 km² for an island of 64,246 km²: 884 are all land, and 107 hold less than half. The 296 cells of 10 km cover 76,903 km², with 199 all land and 47 under half. The larger the cells, the more sea the grid takes in along the same coast.

3. The scale and the zoning effects, counted: the devil's records in 5 km and 10 km hexagons, and in the 10 km grid moved half an edge east and north. `ST_HexagonGrid` always starts its grid at the projection's origin, so the moved grid is drawn over the island moved back, then moved forward:

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

The same records give three pictures. At 5 km, 307 of 1,094 cells (28.1 %) hold a record, and the fullest holds 256 (13.0 % of the records in cells); at 10 km, 178 of 296 (60.1 %), and the fullest 475 (23.9 %). That is the scale effect: larger cells merge clusters, so more cells hold something and the fullest holds more. Moving the 10 km grid by half an edge keeps the occupancy (182 of 300, 60.7 %) but the fullest cell drops to 310 (15.7 %): one cluster of records that sat in one cell is now split across several. That is the zoning effect: same size, different start, different hot spot. The record totals differ (1,972, 1,990, 1,976) because each grid reaches out to sea differently (step 1). The 5 km and 10 km rows are the cells s4 builds (`s4-cells`), so its Moran's I runs on exactly these counts.

**Result:** In EPSG:3577 every hexagon of 10 km covers 259.808 km²; drawn in degrees, the cells differ by 4.8 % across Tasmania. The cells hold 1,972 (5 km) and 1,990 (10 km) of the devil's 2,000 records: every main-island record, most records just off the 1:50m coast, Maria Island's 12 only in 10 km cells. Coastal cells are part sea: 107 of 1,094 cells of 5 km hold less than half land. The fullest cell holds 13.0 % of the records at 5 km, 23.9 % at 10 km and 15.7 % in the moved 10 km grid: size and start both change the picture.

**Exercise:** Coastal cells hold less land, so divide: rank the 10 km cells by records per km² of the main island's land in the cell, and compare with the ranking by count. Which cell comes first, and should you believe it?

**Answer:** Intersect each cell with the island, measure the piece in EPSG:3577 (equal-area, so in km²), and order by count over land:

```sql
-- q: g6-ex
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
), cells AS (
  SELECT h.i, h.j, h.geom, ST_Area(ST_Intersection(h.geom, island.geom)) / 1e6 AS land_km2
  FROM island, ST_HexagonGrid(10000, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
), counts AS (
  SELECT c.i, c.j, c.land_km2, count(d.geom) AS n
  FROM cells AS c LEFT JOIN devils AS d ON ST_Contains(c.geom, d.geom)
  GROUP BY c.i, c.j, c.land_km2
)
SELECT i, j, n, round(land_km2::numeric, 2) AS land_km2,
       round((n / land_km2)::numeric, 3) AS per_land_km2,
       rank() OVER (ORDER BY n DESC) AS rank_by_n
FROM counts
WHERE n > 0
ORDER BY n / land_km2 DESC, i, j
LIMIT 5;
```

```text
-- result: g6-ex · 5 rows · sha256 38f8ef12aedc
i | j | n | land_km2 | per_land_km2 | rank_by_n
90 | -274 | 12 | 0.51 | 23.355 | 34
73 | -260 | 18 | 1.38 | 13.086 | 23
83 | -264 | 86 | 36.32 | 2.368 | 3
89 | -276 | 475 | 203.05 | 2.339 | 1
83 | -274 | 153 | 259.81 | 0.589 | 2
```

**Check:** The first cell, (90, −274), holds 12 records on 0.51 km² of the main island: 23.355 records per km², 34th by count. Its 12 records are the ones on Maria Island (step 1), outside the land the query divides by. The second, (73, −260), holds 18 records on 1.38 km² of land, but 17 of them lie 0.3 to 3 km off the 1:50m coast. The fullest cell by count, (89, −276), with 475 records, comes fourth: 384 of its records are on its 203 km² of land and 91 just off the coast. Dividing by a small, uncertain area makes small counts look large, and here the denominator misses the very land the records stand on. Densities are worth computing only where the cells hold enough land (say half), or with every island and the coast's error counted in; counts per equal cell, as s4 uses, avoid the division.

**Dialects:**
- **PostgreSQL:** `ST_HexagonGrid`, `ST_SquareGrid` (PostGIS 3.1 and later), and `ST_Hexagon(edge, i, j)` and `ST_Square(size, i, j)` for one cell by its column and row. The `h3` extension (h3-pg) indexes the globe in hexagons of near-equal, not equal, area.
- **DuckDB:** the `spatial` extension (not in this course's browser) has no hexagon grid function. Square cells come from arithmetic, `floor(x / size)` and `floor(y / size)`, on coordinates projected with `ST_Transform`; the community `h3` extension gives H3's cells.
- **SQL Server:** no grid function either: build square cells from `floor` of the coordinates, or a table of hexagons with `geometry::STGeomFromText`. Its spatial indexes' grids are internal and can't be used as units.

#### g7 · raster

**Tool:** PG · **Time:** 2.5 h · **Prereqs:** g6

**Concept:** How to read a raster in SQL, and how to turn its cells into an area you can defend:
- **A raster** is a grid of cells, each holding a number. Six numbers place it on the Earth, its georeference: the x and y of its upper-left corner, the cell's width and height (the height negative, since rows run south), and two skews (0 here). With the SRID they say where every cell is; `ST_MetaData` returns them. In PostGIS a raster is a value of type `raster` in a column. It can hold its cells in the database, as here, or point at a file outside it (out-db), which needs two settings and GDAL drivers a server doesn't enable by default. A large raster is stored as tiles, one row each (raster2pgsql's `-t 256x256`, or `ST_Tile`), with a GiST index on each tile's footprint (`-I`), so a query reads only the tiles it touches.
- **The habitat map** (Jung et al. 2020, v004, CC BY 4.0; 003 §5) gives each cell a class of the IUCN habitat classification scheme, written as a number: `106` is class 1.6, "Forest – Subtropical/tropical moist lowland", and `1401` is 14.1, "Arable land". The 100 m map's grid is longitude–latitude, SRID 4326, with cells 0.0008983152841195215° on a side: 100 m at the equator, narrower east–west by cos φ away from it (g1). It isn't Web Mercator, and no cell is 100 m by 100 m except on the equator.
- **The value under a point:** `ST_Value(rast, band, point)` returns the value of the cell holding the point, and `ST_Intersects(rast, point)` says whether the point is on the raster at all (ArcGIS Pro's Extract Values to Points).
- **The cells inside a polygon:** `ST_Clip(rast, polygon)` keeps the cells whose centre is inside the polygon and sets the rest to nodata (Extract by Mask). `ST_ValueCount` counts cells by value, leaving nodata out (Tabulate Area, in cells). `ST_PixelAsCentroids` returns each cell as a row: its value, column `x`, row `y` and centre point, so SQL can do the rest.
- **From cells to area.** A count of cells becomes an area once each cell has its ground area. On a longitude–latitude grid every cell in a row has the same area, so one geodesic area per row, `ST_Area(ST_PixelAsPolygon(rast, 1, row)::geography)`, times the row's count is exact for the grid. Cells × (100 m)² overstates by the cos φ shrink. Even exact for the grid, the result is an **estimate**: the map is a model's classification, and the outline picks cells by their centres.
- **Two ways to summarise a country** (003 §5). **Method 1** counts the 100 m cells whose centre is inside the outline, each at its row's area. **Method 3**, which critwire publishes as `country_habitats`, reads the 1 km fractions instead (for each class, the per mille of each 1 km cell it covers) and sums fraction × cell area over the 1 km cells whose centre is inside. The two differ in the **border cells**: a 1 km cell the outline crosses counts whole or not at all, by its centre, so classes along a coast carry the largest errors.

**Diagram:** `g7-cells`, after the Concept: a cell of 0.000898° is 98.4 × 99.4 m at 10.2° N (`cr`) and 73.6 × 99.8 m at 42.7° S (`tas`), the middle rows of `g7-latitude`; an outline counts a cell whole or not at all, by its centre; and a 1 km cell spans about 11 × 11 cells of 100 m, so on a coast method 3 counts all of it, sea included.

**Data:** `habitat_clips`, the 100 m map over all of Costa Rica (`cr`) and Tasmania (`tas`), stored as in-database rasters in tiles of 256 × 256 cells, one row per tile, keyed (`clip`, `tile`) (4.1, 4.3). Each clip is its country's box, Tasmania's with Bruny and Maria Islands, and only the tiles holding some of the country are stored. Each clip's box and tile grid, the tiles kept and left out, and their cells, from the tiles' georeferences:

```sql
-- q: g7-tiles
-- status: ran
-- engine: postgis
-- needs: raster
WITH box AS (
  SELECT clip, ST_Extent(ST_Envelope(rast)) AS ext, max(ST_ScaleX(rast)) AS d
  FROM habitat_clips
  GROUP BY clip
), grid AS (
  SELECT clip, round((ST_XMax(ext) - ST_XMin(ext)) / d)::integer AS width,
         round((ST_YMax(ext) - ST_YMin(ext)) / d)::integer AS height
  FROM box
)
SELECT g.clip, g.width || ' × ' || g.height AS box_cells,
       ceil(g.width / 256.0) || ' × ' || ceil(g.height / 256.0) AS box_tiles,
       count(*) AS tiles,
       ceil(g.width / 256.0) * ceil(g.height / 256.0) - count(*) AS left_out,
       sum(ST_Width(h.rast) * ST_Height(h.rast)) AS cells,
       sum(ST_Count(h.rast)) AS class_cells,
       ST_SameAlignment(h.rast) AS aligned
FROM habitat_clips AS h JOIN grid AS g USING (clip)
GROUP BY g.clip, g.width, g.height
ORDER BY g.clip;
```

```text
-- result: g7-tiles · 2 rows · sha256 1514a2c9d499
clip | box_cells | box_tiles | tiles | left_out | cells | class_cells | aligned
cr | 3730 × 3474 | 15 × 14 | 117 | 93 | 7555072 | 7554437 | true
tas | 4131 × 3318 | 17 × 13 | 173 | 48 | 11206656 | 11206656 | true
```

The country reaches every edge of its box, so the kept tiles do too, and their extent is the box: 3,730 × 3,474 cells in 15 × 14 tiles for `cr`, 4,131 × 3,318 in 17 × 13 for `tas`. Tiles on the east and south edges are narrower or shorter, not padded. The 93 tiles left out of `cr` and the 48 left out of `tas` hold none of the country, only sea and, for `cr`, Nicaragua and Panama. The kept tiles hold 7,555,072 and 11,206,656 cells; 635 of `cr`'s are nodata in the map itself, which `ST_Count` leaves out. `ST_SameAlignment`, used here as an aggregate, is true when every tile lies on one grid: the same cell size and skew, and corners whole cells apart. That is what lets `ST_Union` mosaic tiles without resampling a cell.

Most blocks below study two windows of 836 × 836 cells cut from them: `cr`, longitude −84.20…−83.45 and latitude 9.85…10.60, from San José to the Caribbean lowlands; `tas`, 147.25…148.00 and −43.10…−42.35, south-east Tasmania with Hobart. Each window is the 0.75° square holding the most of the sample's records for its country. Also `habitat_classes`, `country_habitats` (method 3, every country), `occurrence_habitats` (each record's 1 km class), `country_shapes` and `occurrences`. Each windowed block names its window in `win` and builds it as one raster in `w`: `ST_Clip` cuts each stored tile to the window and `ST_Union` mosaics the pieces (ArcGIS Pro's Clip Raster, then Mosaic), and `MATERIALIZED` makes PostgreSQL build it once per query. `ST_Clip`'s result covers every cell the polygon touches, so `win`'s edges sit a fifth of a cell inside the window's outer cell edges: an edge on a cell boundary, or just past it, would add a column or row of nodata. The rasters are in the database, so no raster setting is needed: every block runs on a server's defaults.

**Worked example:** each window's georeference from `ST_MetaData`, one cell per row built from it, and the cells' size and area on the ground against the map's 100 m:

```sql
-- q: g7-latitude
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2007, 9.8493, -83.4501, 10.5999, 4326)),
         ('tas', ST_MakeEnvelope(147.2493, -43.1001, 147.9999, -42.3495, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
), meta AS (
  SELECT w.clip, m.*
  FROM w CROSS JOIN LATERAL ST_MetaData(w.rast) AS m
), cell_rows AS (
  SELECT clip, width, r.row = height / 2 AS is_mid,
         ST_MakeEnvelope(upperleftx, upperlefty + r.row * scaley,
                         upperleftx + scalex, upperlefty + (r.row - 1) * scaley, srid) AS cell
  FROM meta CROSS JOIN generate_series(1, height) AS r (row)
), mid AS (
  SELECT clip, ST_XMin(cell) AS x0, ST_XMax(cell) AS x1, ST_YMin(cell) AS y0, ST_YMax(cell) AS y1
  FROM cell_rows WHERE is_mid
)
SELECT c.clip,
       round(min(ST_YMin(c.cell))::numeric, 2) AS lat_south, round(max(ST_YMax(c.cell))::numeric, 2) AS lat_north,
       round(ST_Distance(ST_Point(m.x0, m.y0, 4326)::geography, ST_Point(m.x1, m.y0, 4326)::geography)::numeric, 1) AS mid_width_m,
       round(ST_Distance(ST_Point(m.x0, m.y0, 4326)::geography, ST_Point(m.x0, m.y1, 4326)::geography)::numeric, 1) AS mid_height_m,
       round(count(*) * max(c.width) * 0.01, 1) AS map_km2,
       round((sum(ST_Area(c.cell::geography)) * max(c.width) / 1e6)::numeric, 1) AS ground_km2,
       round((sum(ST_Area(c.cell::geography)) / (count(*) * 1e4))::numeric, 4) AS ground_over_map,
       round(cos(radians((m.y0 + m.y1) / 2))::numeric, 4) AS cos_mid_lat
FROM cell_rows AS c JOIN mid AS m USING (clip)
GROUP BY c.clip, m.x0, m.x1, m.y0, m.y1
ORDER BY c.clip;
```

```text
-- result: g7-latitude · 2 rows · sha256 e063bd6e1c5b
clip | lat_south | lat_north | mid_width_m | mid_height_m | map_km2 | ground_km2 | ground_over_map | cos_mid_lat
cr | 9.85 | 10.60 | 98.4 | 99.4 | 6989.0 | 6834.8 | 0.9779 | 0.9841
tas | -43.10 | -42.35 | 73.6 | 99.8 | 6989.0 | 5131.4 | 0.7342 | 0.7346
```

Both windows hold 698,896 cells: 6,989.0 km² if every cell were 100 m by 100 m. On the ground the Costa Rica window covers 6,834.8 km² and the Tasmania window 5,131.4 km², a quarter less. A cell in the middle row is 98.4 m wide and 99.4 m tall at 10.2° N, and 73.6 m by 99.8 m at 42.7° S: the width follows cos φ (0.9841 and 0.7346). The height changes a little too, because the Earth is flattened: a degree of latitude is about 110.6 km near the equator and 111.1 km at 43°. So Costa Rica's ratio, 0.9779, sits a little below its cos φ. Within a window a cell's area changes from the north edge to the south by 0.2 % (9,768 to 9,790 m²) in Costa Rica and 1.2 % (7,298 to 7,386 m²) in Tasmania.

**Lab:**

1. The class under each record in the Costa Rica window: `win` and `w` build the window, as in every windowed block here, `ST_Intersects` keeps the records on it, and `ST_Value` reads the cell under each:

```sql
-- q: g7-records
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2007, 9.8493, -83.4501, 10.5999, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
)
SELECT v.habitat_code, c.name, count(*) AS records
FROM w
JOIN occurrences AS o ON ST_Intersects(w.rast, o.geom)
CROSS JOIN LATERAL (SELECT ST_Value(w.rast, 1, o.geom)::integer AS habitat_code) AS v
LEFT JOIN habitat_classes AS c ON c.code = v.habitat_code
GROUP BY v.habitat_code, c.name
ORDER BY records DESC, v.habitat_code NULLS LAST;
```

```text
-- result: g7-records · 12 rows · sha256 e9484b7cc942
habitat_code | name | records
109 | Forest – Subtropical/tropical moist montane | 87
106 | Forest – Subtropical/tropical moist lowland | 30
307 | Shrubland – Subtropical/tropical high altitude | 23
507 | Wetlands (inland) – Permanent freshwater marshes/pools (unde… | 21
1401 | Arable Land | 13
… 7 more rows
```

All 202 records in the window have a class: the window has no nodata cells. 87 are on moist montane forest, 30 on moist lowland forest, 23 on high-altitude shrubland, and 21 on small freshwater marshes, a class with 0.1 % of the window's land (step 3). Arable land, over a third of the cells, holds 13. Records gather where people go to look, so these counts describe the recording as much as the animals; s6 compares records with the classes' areas.

2. The cells inside Costa Rica's outline, by class, as `ST_ValueCount` gives them:

```sql
-- q: g7-valuecount
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2007, 9.8493, -83.4501, 10.5999, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
)
SELECT vc.value::integer AS habitat_code, vc.count AS cells
FROM w
JOIN country_shapes AS cs ON cs.country_code = 'CR'
CROSS JOIN LATERAL ST_ValueCount(ST_Clip(w.rast, cs.geom), 1) AS vc
ORDER BY cells DESC, habitat_code;
```

```text
-- result: g7-valuecount · 20 rows · sha256 f1cb0c12721a
habitat_code | cells
1401 | 253016
109 | 178008
106 | 102946
306 | 36961
1405 | 33473
… 15 more rows
```

693,893 of the window's 698,896 cells have their centre inside the outline. The other 5,003 are the sea in its north-east corner, all of them marine neritic (900). Another 6,329 marine neritic cells lie inside the outline, along the coast: a 1:50m outline and a 100 m map don't draw the same coastline (g3, g5). The 20 classes run from arable land, 253,016 cells, to tidepools, 13.

3. The same cells as estimated areas. Every cell in a row has the same ground area, so count the cells by row, measure one cell per row on the ellipsoid, and multiply. `MATERIALIZED` makes the planner measure each row once, not once per class and row (g3's exercise):

```sql
-- q: g7-estimate
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2007, 9.8493, -83.4501, 10.5999, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
), cells AS (
  SELECT p.val::integer AS habitat_code, p.y AS row
  FROM w
  JOIN country_shapes AS cs ON cs.country_code = 'CR'
  CROSS JOIN LATERAL ST_PixelAsCentroids(ST_Clip(w.rast, cs.geom), 1) AS p
), by_row AS (
  SELECT habitat_code, row, count(*) AS cells
  FROM cells
  GROUP BY habitat_code, row
), row_area AS MATERIALIZED (
  SELECT r.row, ST_Area(ST_PixelAsPolygon(w.rast, 1, r.row)::geography) / 1e6 AS cell_km2
  FROM w, (SELECT DISTINCT row FROM by_row) AS r
), est AS (
  SELECT b.habitat_code, sum(b.cells) AS cells, sum(b.cells * ra.cell_km2) AS est_km2
  FROM by_row AS b JOIN row_area AS ra USING (row)
  GROUP BY b.habitat_code
)
SELECT e.habitat_code, c.name, e.cells,
       round(e.cells * 0.01, 2) AS map_km2,
       round(e.est_km2::numeric, 2) AS est_km2,
       round((100 * e.est_km2 / sum(e.est_km2) OVER ())::numeric, 1) AS pct
FROM est AS e
LEFT JOIN habitat_classes AS c ON c.code = e.habitat_code
ORDER BY e.cells DESC, e.habitat_code;
```

```text
-- result: g7-estimate · 20 rows · sha256 9941c849a9ba
habitat_code | name | cells | map_km2 | est_km2 | pct
1401 | Arable Land | 253016 | 2530.16 | 2474.07 | 36.5
109 | Forest – Subtropical/tropical moist montane | 178008 | 1780.08 | 1741.50 | 25.7
106 | Forest – Subtropical/tropical moist lowland | 102946 | 1029.46 | 1006.14 | 14.8
306 | Shrubland – Subtropical/tropical moist | 36961 | 369.61 | 361.29 | 5.3
1405 | Urban Areas | 33473 | 334.73 | 327.59 | 4.8
… 15 more rows
```

The window's land inside the outline is an estimated 6,785.90 km², from 836 area calls instead of 693,893. Each class's map area, cells × 0.01 km², is 2.3 % above its estimate: at 10° N a cell covers 0.978 of an equator cell (the worked example). Arable land is 36.5 % of the area, moist montane forest 25.7 % and moist lowland forest 14.8 %; the marsh class with 21 records, 0.1 %.

4. A record's 100 m class against its 1 km class, for every record on both clips. `occurrence_habitats` gives each record the class with the largest fraction in its 1 km cell. Build that cell from the 1 km grid's numbers (upper-left corner −180.0099155291168, 90.00297126602864; cells 0.009915667822884942° on a side; 4.1), and find the most common 100 m class inside it. A 1 km cell can straddle up to four tiles, so `ST_Clip` cuts each tile it touches and `ST_Union` mosaics the pieces, as `w` does for a window. A point on the edge between two tiles meets both, and its cell is the first of the tile to the east or south (a cell holds its west and north edges), so `DISTINCT ON` keeps each record once, on its highest-numbered tile:

```sql
-- q: g7-scale
-- status: ran
-- engine: postgis
-- needs: raster
WITH grid (x0, y0, d) AS (
  VALUES (-180.0099155291168, 90.00297126602864, 0.009915667822884942)
), recs AS (
  SELECT DISTINCT ON (o.id) h.clip, ST_Value(h.rast, 1, o.geom)::integer AS class_100m, oh.habitat_code AS class_1km,
         ST_MakeEnvelope(g.x0 + k.col * g.d, g.y0 - (k.row + 1) * g.d, g.x0 + (k.col + 1) * g.d, g.y0 - k.row * g.d, 4326) AS cell_1km
  FROM occurrences AS o
  JOIN habitat_clips AS h ON ST_Intersects(h.rast, o.geom)
  JOIN occurrence_habitats AS oh ON oh.occurrence_id = o.id
  CROSS JOIN grid AS g
  CROSS JOIN LATERAL (SELECT floor((ST_X(o.geom) - g.x0) / g.d) AS col, floor((g.y0 - ST_Y(o.geom)) / g.d) AS row) AS k
  ORDER BY o.id, h.tile DESC
), majority AS (
  SELECT r.clip, r.class_100m, r.class_1km,
         (SELECT vc.value::integer FROM ST_ValueCount(cell.rast, 1) AS vc
          ORDER BY vc.count DESC, vc.value LIMIT 1) AS most_100m
  FROM recs AS r
  CROSS JOIN LATERAL (SELECT ST_Union(ST_Clip(h.rast, r.cell_1km)) AS rast
                      FROM habitat_clips AS h
                      WHERE h.clip = r.clip AND ST_Intersects(h.rast, r.cell_1km)) AS cell
)
SELECT clip, count(*) AS records,
       count(*) FILTER (WHERE class_100m = class_1km) AS same_at_record,
       count(*) FILTER (WHERE most_100m = class_1km) AS same_as_majority,
       count(*) FILTER (WHERE class_100m = most_100m) AS record_in_majority
FROM majority
GROUP BY clip
ORDER BY clip;
```

```text
-- result: g7-scale · 2 rows · sha256 dda12e4d18e0
clip | records | same_at_record | same_as_majority | record_in_majority
cr | 625 | 340 | 617 | 344
tas | 1991 | 1204 | 1921 | 1225
```

The `cr` clip holds 625 records: 618 in Costa Rica, and 4 in Nicaragua and 3 in Panama on tiles that also hold some of Costa Rica. The record's own 100 m cell has its 1 km class for 340 of them (54 %) and 1,204 of the 1,991 in Tasmania (60 %). Yet the 1 km class is the most common 100 m class in its cell for 617 and 1,921: the two maps agree; most records just aren't on the majority. Only 344 of the Costa Rican records are; 78 sit on montane forest in 1 km cells that are mostly arable land. Of the 78 records whose 1 km class isn't the 100 m majority, 46 are in cells where two classes tie, which the block breaks toward the lower code (20 Tasmanian records share one cell with 48 cells each of temperate forest and pastureland), and 31 in cells where the majority leads by 9 cells or fewer of 121 to 132. The last is on the Tasmania clip's north edge, in a 1 km cell 14 % on the clip. A 1 km class describes the landscape around a record, a 100 m class the patch it is on; neither is the species' habitat.

5. How good are the published summaries? Method 3 summed over each country, against the outline's area on the ellipsoid, in bands of error:

```sql
-- q: g7-countries
-- status: ran
-- engine: postgis
-- needs: raster
WITH est AS (
  SELECT country_code, sum(est_area_km2) AS est_km2 FROM country_habitats GROUP BY country_code
), cmp AS (
  SELECT cs.country_code, ST_Area(cs.geom::geography) / 1e6 AS outline_km2, coalesce(e.est_km2, 0) AS est_km2
  FROM country_shapes AS cs LEFT JOIN est AS e USING (country_code)
), banded AS (
  SELECT *, abs(est_km2 - outline_km2) / outline_km2 AS err,
         CASE WHEN abs(est_km2 - outline_km2) / outline_km2 < 0.01 THEN 'under 1 %'
              WHEN abs(est_km2 - outline_km2) / outline_km2 < 0.05 THEN '1 to 5 %'
              WHEN abs(est_km2 - outline_km2) / outline_km2 < 0.2 THEN '5 to 20 %'
              ELSE '20 % or more' END AS error
  FROM cmp
)
SELECT coalesce(error, 'all') AS error, count(*) AS countries,
       round(max(outline_km2)::numeric, 2) AS largest_km2,
       round(sum(outline_km2)::numeric) AS outline_km2, round(sum(est_km2)) AS est_km2,
       round(sum(est_km2) / sum(outline_km2)::numeric, 6) AS est_over_outline,
       CASE WHEN GROUPING(error) = 0 THEN
         string_agg(country_code || ' ' || to_char(100 * (est_km2 - outline_km2) / outline_km2, 'FMSG990.0'), ', ' ORDER BY err DESC)
           FILTER (WHERE err >= 0.05) END AS worst_pct
FROM banded
GROUP BY ROLLUP (error)
ORDER BY error IS NOT NULL, min(err);
```

```text
-- result: g7-countries · 5 rows · sha256 96b0c186ffd8
error | countries | largest_km2 | outline_km2 | est_km2 | est_over_outline | worst_pct
all | 247 | 16973548.42 | 146715521 | 146579614 | 0.999074 | NULL
under 1 % | 215 | 16973548.42 | 146711158 | 146575271 | 0.999074 | NULL
1 to 5 % | 21 | 430.33 | 3957 | 3951 | 0.998359 | NULL
5 to 20 % | 8 | 134.94 | 390 | 375 | 0.961755 | SX -17.3, MF +10.6, CC -9.8, MO -6.2, PN +5.9, BL -5.8, VG -…
20 % or more | 3 | 10.21 | 16 | 17 | 1.050974 | VA -100.0, TV +28.9, TK -28.6
```

Over all 247 outlines the estimate is 0.999074 of the outlines' area (−0.09 %), the figure `pnpm ingest habitat` records. 215 countries are within 1 %, every outline over 431 km² among them. The error grows as the outline shrinks, since a small island holds few 1 km cells and each counts whole or not at all: Vatican City (0.71 km²) holds no cell centre and has no rows; Tuvalu's atolls, 10.21 km², get 13.16 km² (+28.9 %); Tokelau −28.6 %, Sint Maarten −17.3 %. Read a small country's habitat areas as rough.

6. The published summary against the 100 m map, for a whole country. Method 1 over all of Costa Rica: clip each tile the outline touches to it, count the cells by class and row, and give each row one geodesic area, as in step 3. A cell's area depends only on its latitude, so the block builds one cell per row at longitude 0. `ST_Clip` crops a tile to the outline, which moves its upper-left corner, so each row's centre latitude comes from the clipped tile's own georeference (`ST_MetaData`). Then set it beside `country_habitats`, method 3, class by class, and against the outline's area:

```sql
-- q: g7-country
-- status: ran
-- engine: postgis
-- needs: raster
WITH cr AS (
  SELECT geom AS outline, ST_Area(geom::geography) / 1e6 AS outline_km2 FROM country_shapes WHERE country_code = 'CR'
), clipped AS (
  SELECT ST_Clip(h.rast, cr.outline) AS rast
  FROM habitat_clips AS h JOIN cr ON ST_Intersects(h.rast, cr.outline)
  WHERE h.clip = 'cr'
), by_row AS (
  SELECT p.val::integer AS habitat_code, m.upperlefty + (p.y - 0.5) * m.scaley AS lat, m.scalex AS d, count(*) AS cells
  FROM clipped AS c
  CROSS JOIN LATERAL ST_MetaData(c.rast) AS m
  CROSS JOIN LATERAL ST_PixelAsCentroids(c.rast, 1) AS p
  GROUP BY habitat_code, lat, d
), row_area AS MATERIALIZED (
  SELECT lat, ST_Area(ST_MakeEnvelope(0, lat - d / 2, d, lat + d / 2, 4326)::geography) / 1e6 AS cell_km2
  FROM (SELECT DISTINCT lat, d FROM by_row) AS r
), method1 AS (
  SELECT b.habitat_code, sum(b.cells * ra.cell_km2) AS km2
  FROM by_row AS b JOIN row_area AS ra USING (lat)
  GROUP BY b.habitat_code
), method3 AS (
  SELECT habitat_code, est_area_km2 AS km2 FROM country_habitats WHERE country_code = 'CR'
)
SELECT habitat_code, c.name,
       round(sum(m1.km2)::numeric, 2) AS method1_km2,
       round(sum(m3.km2), 2) AS method3_km2,
       round(100 * (sum(m3.km2) / sum(m1.km2)::numeric - 1), 1) AS diff_pct,
       round((100 * sum(m1.km2) / max(cr.outline_km2))::numeric, 2) AS pct_of_outline
FROM method1 AS m1
FULL JOIN method3 AS m3 USING (habitat_code)
LEFT JOIN habitat_classes AS c ON c.code = habitat_code
CROSS JOIN cr
GROUP BY ROLLUP ((habitat_code, c.name))
ORDER BY habitat_code IS NOT NULL, sum(m1.km2) DESC NULLS LAST, habitat_code;
```

```text
-- result: g7-country · 35 rows · sha256 8104db915c8f
habitat_code | name | method1_km2 | method3_km2 | diff_pct | pct_of_outline
NULL | NULL | 51297.88 | 51199.23 | -0.2 | 99.99
1401 | Arable Land | 16128.59 | 16108.04 | -0.1 | 31.44
109 | Forest – Subtropical/tropical moist montane | 13115.84 | 13095.13 | -0.2 | 25.57
106 | Forest – Subtropical/tropical moist lowland | 7127.03 | 7108.44 | -0.3 | 13.89
201 | Savanna - Dry | 3533.35 | 3528.48 | -0.1 | 6.89
… 30 more rows
```

Over all of Costa Rica the two methods differ by 0.2 %: 51,199.23 km² by method 3 against 51,297.88 km² by method 1, whose cells cover 99.99 % of the outline's area. Every class over 100 km² agrees within 1 % except two marine ones, and the eight largest, each over 1,900 km², within 0.7 %. The marine classes come out larger by method 3: coral reef (908) by 6.4 %, seagrass (909) 1.6 % and marine neritic (900) 1.3 %. A 1 km cell on the coast whose centre is inside the outline counts whole, sea included: the border cells of the Concept. Rivers and streams (501, 502) come out 3.9 and 4.8 % smaller. Classes this small, a median of 5 and 3 cells of 100 m in each 1 km cell they touch, carry the largest relative differences, since a few cells either way is a large share of them. For a country this size, the published summary stands for the 100 m map to within 1 % for its main classes; read the small and coastal ones as rough.

**Result:** A cell of v004's 100 m grid covers 9,768 to 9,790 m² in the Costa Rica window and 7,298 to 7,386 m² in Tasmania's; counting cells as 100 m squares overstates by 2.3 % and 36 %. Costa Rica's window holds 202 records and an estimated 6,785.90 km² of land inside the outline, 36.5 % of it arable; its records sit mostly on forest (87 montane, 30 lowland). The clips are 290 aligned tiles, the ones holding some of each country. Over both clips a record's 100 m class matches its 1 km class for 54 % (Costa Rica) and 60 % (Tasmania) of records, although the 1 km class is the 100 m majority around all but 78 of the 2,616, nearly all of them ties or near ties. The published summaries total 0.999074 of the outlines' area; 215 of 247 countries are within 1 %, the worst are islands under 135 km². For all of Costa Rica, method 3 is 0.2 % below method 1 at 100 m, within 1 % for every class over 100 km² but marine neritic and seagrass.

**Exercise:** Method 1 at 100 m is the reference for method 3 (003 §5). Compute both for the Tasmania window inside AU's outline, by class, from the 100 m cells alone. Give each 100 m cell its 1 km cell from the grid's numbers (step 4); take a class's fraction of a 1 km cell as its share of the 100 m centres in it; keep only the 1 km cells wholly inside the window; and count a 1 km cell when its centre is inside the outline. Which classes differ most, and why?

**Answer:** Assign the cells, count each 1 km cell's centres with a window function, and sum both ways side by side. The share of each class's method 1 area that lies in 1 km cells the outline cuts tells you why:

```sql
-- q: g7-ex
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('tas', ST_MakeEnvelope(147.2493, -43.1001, 147.9999, -42.3495, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
), grid (x0, y0, d) AS (
  VALUES (-180.0099155291168, 90.00297126602864, 0.009915667822884942)
), au AS (
  SELECT geom AS outline FROM country_shapes WHERE country_code = 'AU'
), px AS (
  SELECT p.val::integer AS habitat_code, p.y AS row_100m,
         floor((ST_X(p.geom) - g.x0) / g.d)::integer AS col_1km, floor((g.y0 - ST_Y(p.geom)) / g.d)::integer AS row_1km,
         ST_Intersects(au.outline, p.geom) AS inside
  FROM w, au, grid AS g, ST_PixelAsCentroids(w.rast, 1) AS p
), area_100m AS MATERIALIZED (
  SELECT r.row_100m, ST_Area(ST_PixelAsPolygon(w.rast, 1, r.row_100m)::geography) / 1e6 AS km2
  FROM w, (SELECT DISTINCT row_100m FROM px) AS r
), cells_1km AS MATERIALIZED (
  SELECT k.col_1km, k.row_1km, ST_Area(k.cell::geography) / 1e6 AS km2,
         ST_Intersects(au.outline, ST_Centroid(k.cell)) AS centre_inside,
         ST_Covers(ST_Envelope(w.rast), k.cell) AS whole
  FROM (SELECT DISTINCT col_1km, row_1km FROM px) AS c
  CROSS JOIN grid AS g
  CROSS JOIN LATERAL (SELECT c.col_1km, c.row_1km,
                             ST_MakeEnvelope(g.x0 + c.col_1km * g.d, g.y0 - (c.row_1km + 1) * g.d,
                                             g.x0 + (c.col_1km + 1) * g.d, g.y0 - c.row_1km * g.d, 4326) AS cell) AS k
  CROSS JOIN w
  CROSS JOIN au
), counted AS (
  SELECT px.*, count(*) OVER w AS n_1km, count(*) FILTER (WHERE px.inside) OVER w AS n_inside,
         k.km2 AS km2_1km, k.centre_inside, a.km2 AS km2_100m
  FROM px JOIN cells_1km AS k USING (col_1km, row_1km) JOIN area_100m AS a USING (row_100m)
  WHERE k.whole
  WINDOW w AS (PARTITION BY px.col_1km, px.row_1km)
)
SELECT habitat_code,
       round(sum(km2_100m) FILTER (WHERE inside)::numeric, 2) AS method1_km2,
       round(sum(km2_1km / n_1km) FILTER (WHERE centre_inside)::numeric, 2) AS method3_km2,
       round((100 * (sum(km2_1km / n_1km) FILTER (WHERE centre_inside) / sum(km2_100m) FILTER (WHERE inside) - 1))::numeric, 1) AS diff_pct,
       round((100 * coalesce(sum(km2_100m) FILTER (WHERE inside AND n_inside < n_1km), 0)
                  / sum(km2_100m) FILTER (WHERE inside))::numeric, 1) AS border_pct
FROM counted
GROUP BY ROLLUP (habitat_code)
HAVING sum(km2_100m) FILTER (WHERE inside) >= 1
ORDER BY habitat_code NULLS FIRST;
```

```text
-- result: g7-ex · 13 rows · sha256 53600dc8b50d
habitat_code | method1_km2 | method3_km2 | diff_pct | border_pct
NULL | 3953.67 | 3944.68 | -0.2 | 2.7
104 | 1536.61 | 1536.27 | 0.0 | 0.9
304 | 739.01 | 738.71 | 0.0 | 2.1
305 | 10.53 | 10.57 | 0.4 | 0.0
404 | 57.52 | 57.78 | 0.4 | 5.6
… 8 more rows
```

**Check:** Over the window's land the methods differ by 0.2 %: 3,944.68 km² by method 3 against 3,953.67 km² by method 1. The classes that differ most, by 1.1 to 2.8 %, are intertidal (1200), urban areas (1405), inland wetlands (500), marine neritic (900) and seagrass (909): 5 to 15 % of their area lies in 1 km cells the outline crosses, where method 3 takes the whole cell or none of it. Classes away from the coast agree within 0.4 %, and what's left there is the grids' misfit: a 1 km cell spans 11.04 cells of 100 m, so a whole one holds 121, 132 or 144 of their centres, and sharing its area among them is close, not exact. 003 §5 found the same pattern, larger, for Trinidad and Tobago and for Åland on 1:10m outlines: marine classes +12.5 % and +13.9 %, with three quarters of their area in border cells. The comparison judges the summary's method, not the map: both columns are estimates from the same classification.

**Dialects:**
- **PostgreSQL:** PostGIS's raster type comes in the `postgis_raster` extension. `raster2pgsql` loads a file in-db, or out-db with `-R`, which then needs `postgis.enable_outdb_rasters` and `postgis.gdal_enabled_drivers`. `ST_SummaryStats`, `ST_Reclass` and `ST_MapAlgebra` compute over cells; `ST_Tile` cuts a large raster into rows of a table.
- **DuckDB:** core DuckDB has no raster type. Read a raster's cells outside it (rasterio, as critwire's ingest does) into rows of value, column and row, then count them in SQL.
- **SQL Server:** no raster type either. Store cells as rows (column, row, value) or one blob decoded outside, and summarise with joins and `GROUP BY`; zonal counts then follow this module's SQL with the cell's polygon built from the grid's numbers.

### 5.4 Spatial statistics

Six modules, twelve and a half hours, in your own PostGIS (§3.2) and the Python environment (§3.3), on the lab tables of §4. Build mission L4 (§9) wrote them in full from their outlines, in §5.3's form. The track asks one question several ways: are the Tasmanian devil's records clustered, and where? The answer is always about **records**, not animals. A record is where someone looked, found the animal and published what they found, so every pattern below mixes where the animal is with where people recorded: roads, towns, research projects, GPS collars. s1 measures that mix first, and every later module says which part its numbers can speak to. The units for s2–s5 are the equal-area hexagons over Tasmania's main island that g6 drew; `s4-cells` builds them once when a PostGIS run starts (table `s4_cells`, view `s4_neighbours`), so every module reads the same cells. The weights, Moran's I, Gi\* and the zonal counts are computed twice, in SQL and in Python (PySAL, GeoPandas), and agree. Each method has an ArcGIS Pro tool (§3.4): Average Nearest Neighbor, Density-based Clustering, Kernel Density, Generate Spatial Weights Matrix, Spatial Autocorrelation, Hot Spot Analysis, Cluster and Outlier Analysis, Zonal Statistics as Table.

#### s1 · bias

**Tool:** PG + B · **Time:** 1.5 h · **Prereqs:** g3

**Concept:** Before any statistic, know what the records are:
- **A record is evidence**, not a census. It says that someone found the animal at a place on a date and published what they found. Many records at a place show that the animal was there and that people looked there; no record shows nothing at all. Every map, count and ratio of records mixes the two, so the rest of this track keeps asking which part a number can speak to.
- **Basis of record** (`basis_of_record`, a Darwin Core term) says what kind of evidence a record is:
  - `HUMAN_OBSERVATION`: a person saw or heard the animal (surveys, atlases, citizen-science apps).
  - `MACHINE_OBSERVATION`: a device recorded it (camera traps, GPS collars, sound recorders).
  - `PRESERVED_SPECIMEN`: an animal kept in a museum; `MATERIAL_SAMPLE`: a part kept from one, such as tissue for DNA; `MATERIAL_CITATION`: a specimen cited in a publication.
  - `OBSERVATION` and `OCCURRENCE`: generic values, used when the publisher didn't say which.
  Each kind has its own bias. Specimens follow old expeditions and collectors' interests, observations follow people, roads and towns, and devices follow where a team put them.
- **The dataset** (`dataset_key`, with its title and publisher in `datasets`) says who collected the records. One project can hold most of a species' records: a census flight, a single survey, one team's collars. The share of the largest dataset is a quick test: near 100 %, the species' records describe that project.
- **Telemetry** is a device that reports an animal's position by itself; a GPS collar logs one animal every few hours, wherever it walks. A thousand fixes from a few collared animals aren't a thousand sightings: they trace those animals' paths, at the rate the collar was set to.
- **Recording effort** is how much looking was done, where and when: the visits, traps, flights and hours behind the records. Records gather near roads, towns, research stations and reserves, and in the years a project ran. The records alone don't measure effort, so they can't say how common an animal is in one place against another; s6 compares records with what each zone could be expected to hold.
- **The sample** keeps at most 2,000 open records per species, picked by a hash of the GBIF id, which works like a fixed random draw (§4). Shares within a species estimate the shares among all its open records; counts across species don't compare, since every well-recorded species shows 2,000.
- **Honest wording** follows from all of this: "records of jaguars", "where devils were recorded", "countries with open records"; never "where jaguars live", "the devil's range" or "devils cluster". critwire's own country field is named that way (`range.countriesWithOpenRecords`).

**Worked example:** the sample by basis of record, in the browser:

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

`sum(count(*)) OVER ()` is a window over the grouped rows (f4): the total of all groups, beside each one, so each row can show its share. Human observations are 43.5 % of the 40,395 records and preserved specimens 26.2 %. Machine observations are 20.8 %, from only 22 of the sample's 71 species: a few species carry nearly all the devices. The two rows below the cut are `MATERIAL_CITATION` (441) and `OCCURRENCE` (192).

**Lab:**
1. How much of each species' records one dataset holds, for the species with at least 100 records, in the browser:

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

Of the 38 species with at least 100 records, 17 have more than half from one dataset and 6 have 90 % or more. Livingstone's flying fox's 109 come from a single dataset, the golden-rumped sengi's 98.1 % from one biodiversity survey, the jaguar's 97.4 % from one dataset. For these species, any pattern in the records is first a pattern in one project's work.

2. The jaguar's records: GPS collars against everything else, with the places and years each covers. The title test (`ILIKE '%GPS%'`) is a shortcut that works on this sample; on other data, read each dataset's description before sorting it:

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

The collar dataset holds 1,948 records at 1,948 different points in 5 countries, between 2001 and 2016; the other 24 datasets hold 52 records (8 countries, 1949 to 2025). `count(DISTINCT (o.longitude, o.latitude))` counts distinct pairs of coordinates, written as one row value. Every collar fix is a new point, so nothing in a list of locations shows that they come from a few animals; only the dataset does. Any map of the jaguar's records is mostly a map of a few collared animals' paths.

3. The devil's records, which s2–s5 analyse, by dataset and basis of record:

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

The devil's 2,000 records are 70.7 % the Tasmanian Natural Values Atlas (1,367 `OBSERVATION` and 46 `OCCURRENCE`) and 27.9 % material samples, such as tissue, at the Tasmanian Museum and Art Gallery (558 `MATERIAL_SAMPLE`, 2000 to 2023); the other 9 rows are museum specimens and one observation. The atlas's first year, 1599, comes before the first European sighting of Tasmania (1642): a date to check before trusting a time series (Quality and provenance, e4). 19 of the 28 museum specimens have no year at all.

**Result:** Human observations are 43.5 % of the sample's 40,395 records, preserved specimens 26.2 % and machine observations 20.8 %, from only 22 species. Of the 38 species with at least 100 records, 17 have more than half from one dataset and 6 have 90 % or more. The jaguar's 97.4 % is one GPS-collar dataset: 1,948 records at 1,948 points in 5 countries between 2001 and 2016, against 52 records from 24 other datasets. The devil's records are 70.7 % one atlas and 27.9 % one museum's material samples. So s2–s5 measure where the atlas and the museum's field teams recorded devils, and say so; the honest sentence is always about records.

**Exercise:** Datasets aren't the only thing that piles up: so do years. For each species with at least 100 records, find the year with the most records (the earliest one on a tie), how many records it holds, and its share of all the species' records. Records with no year count in the total but can't be a busiest year. Run it in the browser. Which species have half or more of their records in one year, and why?

**Answer:** One count over all records per species, and one count per species and year that ranks the years with `row_number()` over the grouped rows:

```sql
-- q: s1-ex
-- status: ran
WITH totals AS (
  SELECT species_id, count(*) AS records
  FROM occurrences
  GROUP BY species_id
  HAVING count(*) >= 100
), per_year AS (
  SELECT species_id, year, count(*) AS n,
         row_number() OVER (PARTITION BY species_id ORDER BY count(*) DESC, year) AS place
  FROM occurrences
  WHERE year IS NOT NULL
  GROUP BY species_id, year
)
SELECT s.common_name, t.records, p.year AS top_year, p.n AS top_year_records,
       round(100.0 * p.n / t.records, 1) AS top_pct
FROM totals AS t
JOIN per_year AS p ON p.species_id = t.species_id AND p.place = 1
JOIN species AS s ON s.id = t.species_id
ORDER BY top_pct DESC, t.records DESC, s.id;
```

```text
-- result: s1-ex · 38 rows · sha256 dfa578491a18
common_name | records | top_year | top_year_records | top_pct
Golden Poison Frog | 299 | 2017 | 251 | 83.9
Grévy's Zebra | 321 | 2008 | 257 | 80.1
Tiger | 2000 | 2021 | 1202 | 60.1
Livingstone's Flying Fox | 109 | 2016 | 61 | 56
Golden-rumped Sengi | 1613 | 2021 | 763 | 47.3
… 33 more rows
```

**Check:** Four species have half or more of their records in one year: the golden poison frog (251 of 299 in 2017, 83.9 %), Grévy's zebra (257 of 321 in 2008, 80.1 %), the tiger (1,202 of 2,000 in 2021, 60.1 %) and Livingstone's flying fox (61 of 109 in 2016, 56 %). Each peak is one project: the frog's year is one population survey in Colombia, the zebra's one aerial census in Kenya, and 1,198 of the tiger's are photographs of tigers posted on Facebook in India, gathered into one dataset. The cheetah's busiest year, 2007, is 919 fixes from one tracking study. A chart of records by year shows when projects ran, not when animals were common. Without `WHERE year IS NOT NULL`, the records with no year form a group of their own, and for 11 species it outnumbers every real year (the spiny softshell turtle's 362 against 87 in 1976), so the "busiest year" comes out empty.

**Dialects:**
- **PostgreSQL:** `count(DISTINCT (a, b))` counts distinct pairs through a row value; `ILIKE` matches without regard to case; `round(x, 1)` takes a `numeric`, which `100.0 * count(*)` already is.
- **DuckDB:** the same query runs: `ILIKE` exists, and `(a, b)` is an unnamed struct that `count(DISTINCT …)` accepts. It also has `arg_max(year, n)` for "the year with the most", which leaves ties to the engine; `row_number()` with a tie-break gives the same answer every run.
- **SQL Server:** no `ILIKE`; `LIKE` ignores case under the usual case-insensitive collations. `COUNT(DISTINCT …)` takes one expression, so count pairs in a subquery (`SELECT COUNT(*) FROM (SELECT DISTINCT longitude, latitude FROM …) AS p`). `SUM(COUNT(*)) OVER ()` and `ROUND(x, 1)` work as here.

#### s2 · point-patterns

**Tool:** PG + Py · **Time:** 2.5 h · **Prereqs:** s1, g6

**Concept:** Are points more bunched together than chance would put them, and what does each way of asking assume?
- **Complete spatial randomness** is the yardstick: every point falls anywhere in the study area with equal probability, independently of the others. A pattern is **clustered** when points sit closer together than that, and **dispersed** (spread out evenly, like trees in a plantation) when they sit farther apart.
- **Quadrats** are equal cells laid over the area. Under randomness, the number of points per cell follows a Poisson distribution, whose variance equals its mean, so the **variance-to-mean ratio** (VMR) is close to 1. Well above 1 means clustered: many empty cells and a few full ones. Below 1 means dispersed. The answer changes with the cell size (g6's scale effect).
- **The nearest-neighbour index** (Clark and Evans) takes each point's distance to its nearest other point and averages them. Under randomness with `n` points in an area `A`, that mean is `0.5 ÷ √(n ÷ A)`. The ratio R of observed to expected is below 1 when points are clustered and above 1 when dispersed; its z-score divides the difference by the standard error `0.26136 ÷ √(n² ÷ A)`.
- **The study area** is part of every test that compares with randomness: points scattered over an island look clustered if the area includes the sea around it, since no point can fall there. Here it is Tasmania's main island; the exercise shows what other choices do.
- **Kernel density** spreads each point over a smooth bump of a chosen width, the **bandwidth**, and adds the bumps into a surface of points per km². It doesn't test anything: it shows where the points are dense, and the bandwidth decides how smooth the picture is.
- **DBSCAN** (density-based spatial clustering of applications with noise) finds clusters as places where at least `minpoints` points lie within a distance `eps` of each other. A point with that many neighbours is a core point; core points within `eps` of each other join one cluster, with the points near them. Everything else is **noise**. It finds clusters of any shape and doesn't need their number in advance, but `eps` and `minpoints` decide what counts.
- **Duplicate coordinates** affect all four. Many records share one spot: a survey site visited many times, an atlas grid point, a museum's locality. Every method counts them as separate points, so one busy spot looks like a dense cluster.
- **What clusters?** As s1 showed, the devil's records are mostly one atlas and one museum's samples. Every test below measures how the records bunch, which mixes where devils are with where people looked.

**Worked example:** quadrats. The cells are the equal-area hexagons over Tasmania's main island that g6 drew, at edges of 5 and 10 km. s4 builds them as the table `s4_cells`, one row per cell with its edge (`edge_m`), its number of devil records (`n`) and its centroid (`cx`, `cy`); its first block, `s4-cells`, makes them. Every download of this module runs that block first, right after connecting, so `s2.sql` and `s2.py` work on their own; to run the blocks one at a time, run `s4-cells` once first. The variance-to-mean ratio of records per hexagon, at both sizes:

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

At 5 km the 1,094 cells hold 1.803 records on average, with a variance of 115.68: the variance is 64.2 times the mean, where randomness gives about 1. At 10 km the ratio is 139.0. `var_samp` is the sample variance (dividing by `n − 1`); the ratio grows with the cell size because larger cells gather more of each cluster into one count, as in g6.

**Lab:**
1. The nearest-neighbour index for the records inside the main island, counting every record and then each distinct location once. `<->` with `LIMIT 1` finds each point's nearest other point (g5); `DISTINCT ON` keeps one record per pair of coordinates:

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

Counting every record, 1,109 of the 1,784 records on the main island sit on exactly the same spot as another record, so their nearest-neighbour distance is 0. The mean distance is 985.8 m where randomness gives 3,000.5 m: R = 0.329, z −54.3. Counting the 913 distinct locations once, R = 0.548 (z −26.1). Both are far below 1, so the records are clustered either way; the duplicates make it look twice as strong. A z-score below −1.96 means a mean distance this small would happen by chance less than 5 % of the time.

2. DBSCAN with `eps` 2 km and `minpoints` 20 (ArcGIS Pro's Density-based Clustering, DBSCAN method). `ST_ClusterDBSCAN` is a window function: it gives each point its cluster's number, or `NULL` for noise:

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

DBSCAN finds 10 clusters holding 871 records and calls 913 noise; the largest cluster holds 357 records. One "cluster" is a single location repeated 20 times or more: by DBSCAN's rule, 20 records at one spot are 20 points within 2 km of each other. `count(DISTINCT (ST_X(geom), ST_Y(geom)))` counts a cluster's distinct locations. Change `eps` or `minpoints` and the clusters change; neither has a right value, so report them with the result.

3. Kernel density in Python (scikit-learn), a Gaussian kernel with a 5 km bandwidth, read at the 5 km hexagons' centroids. The coordinates are in metres, so the density comes out per m² and sums to 1 over the plane; multiplying by the number of records and by 10⁶ turns it into records per km². Summed over the cells it should give back roughly the records in them:

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

The surface peaks at 2.12 records per km² over cell 917, the cell with 256 records (s4's fullest). Cells 947 and 948 come next with far fewer records of their own (42 and 49): they border cell 917 and each other, so the bumps from its records spill into them. Cell 888, with 111 records, ranks only fourth: apart from cell 917, its neighbours hold 6 records between them. Summed over the 1,094 cells of 64.95 km², density times area gives back 1,895 of the 2,000 records; the rest spill into the sea or lie off the main island. `score_samples` returns the logarithm of the density, hence `np.exp`.

**Result:** every test says clustered, and duplicates inflate every one. The quadrats' variance is 64.2 times the mean at 5 km and 139.0 times at 10 km (1 for random). Inside the main island, 1,109 of the 1,784 records sit on exactly the same spot as another record, so their nearest-neighbour distance is 0: R = 0.329 (z −54.3) counting every record, R = 0.548 (z −26.1) counting the 913 distinct locations once; both far below 1. DBSCAN finds 10 clusters holding 871 records and calls 913 noise; the largest holds 357 records, and one "cluster" is a single location repeated 20 times or more. The kernel surface peaks at 2.12 records per km² over cell 917, the cell with 256 records (s4's `max_n`); summed over the 1,094 cells of 64.95 km² it gives back 1,895 of the 2,000 records (the rest spill into the sea or lie off the main island). Clustered means the records bunch together; s1 says why: they were recorded by a few teams, at places they returned to.

**Exercise:** The nearest-neighbour index needs an area, and `s2-nni` used the main island. For the 913 distinct locations, compute R and its z-score with four areas: the main island, the rectangle around the locations along the axes (`ST_Envelope`), the smallest rectangle around them at any angle (`ST_OrientedEnvelope`), and their convex hull (`ST_ConvexHull`, the smallest shape with no inward bends that holds them all). Show each area in km². How much does the area change R, and which area answers the question?

**Answer:** `s2-nni`'s distinct locations, one observed mean distance, and four areas. `ST_Collect` gathers the locations into one geometry so each shape can be built around them; since the locations are distinct, `NOT ST_Equals` leaves out only the point itself:

```sql
-- q: s2-ex
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), locations AS (
  SELECT DISTINCT ON (ST_X(g), ST_Y(g)) g AS geom
  FROM (SELECT ST_Transform(o.geom, 3577) AS g
        FROM occurrences AS o JOIN species AS s ON s.id = o.species_id, island
        WHERE s.scientific_name = 'Sarcophilus harrisii'
          AND ST_Contains(island.geom, ST_Transform(o.geom, 3577))) AS devils
  ORDER BY ST_X(g), ST_Y(g)
), observed AS (
  SELECT count(*) AS n,
         avg((SELECT ST_Distance(a.geom, b.geom) FROM locations AS b
              WHERE NOT ST_Equals(b.geom, a.geom)
              ORDER BY a.geom <-> b.geom LIMIT 1)) AS observed_m,
         ST_Collect(geom) AS points
  FROM locations AS a
), areas AS (
  SELECT 'main island' AS area, ST_Area(island.geom) AS area_m2 FROM island
  UNION ALL
  SELECT 'bounding rectangle', ST_Area(ST_Envelope(points)) FROM observed
  UNION ALL
  SELECT 'smallest rectangle', ST_Area(ST_OrientedEnvelope(points)) FROM observed
  UNION ALL
  SELECT 'convex hull', ST_Area(ST_ConvexHull(points)) FROM observed
)
SELECT a.area, round((a.area_m2 / 1e6)::numeric) AS km2, o.n,
       round(o.observed_m::numeric, 1) AS observed_m,
       round((0.5 / sqrt(o.n / a.area_m2))::numeric, 1) AS expected_m,
       round((o.observed_m / (0.5 / sqrt(o.n / a.area_m2)))::numeric, 3) AS r,
       round(((o.observed_m - 0.5 / sqrt(o.n / a.area_m2)) / (0.26136 / sqrt(o.n ^ 2 / a.area_m2)))::numeric, 1) AS z
FROM areas AS a, observed AS o
ORDER BY a.area_m2 DESC;
```

```text
-- result: s2-ex · 4 rows · sha256 ff1aa0fff429
area | km2 | n | observed_m | expected_m | r | z
bounding rectangle | 100881 | 913 | 2298.4 | 5255.8 | 0.437 | -32.5
smallest rectangle | 95274 | 913 | 2298.4 | 5107.7 | 0.450 | -31.8
convex hull | 70537 | 913 | 2298.4 | 4394.9 | 0.523 | -27.6
main island | 64246 | 913 | 2298.4 | 4194.3 | 0.548 | -26.1
```

**Check:** The observed mean is 2,298.4 m in every row, as in `s2-nni`; only the expected distance changes, with the square root of the area. The main island (64,246 km²) gives R 0.548 and z −26.1, the convex hull (70,537 km²) 0.523 and −27.6, the smallest rectangle (95,274 km²) 0.450 and −31.8, and the rectangle along the axes (100,881 km²) 0.437 and −32.5. Same points, four answers: every area says clustered, but the rectangles add 31,000 to 37,000 km² of sea, where no devil can be recorded, and that empty space alone makes the points look more bunched. The island is the area a record could fall in, so it answers the question best; even then it includes mountains and forest nobody visited, so R below 1 still mixes devils with recording effort. ArcGIS Pro's Average Nearest Neighbor uses a rectangle around all the points when it isn't given an area, so give it the island's.

**Dialects:**
- **PostgreSQL:** `var_samp` divides by `n − 1` and `var_pop` by `n`; `variance` is `var_samp`. `ORDER BY a.geom <-> b.geom LIMIT 1` uses a GiST index when the column has one (g5); `devils` here is a CTE with no index, so each subquery measures every other point, which 1,784 points still allow. `ST_ClusterDBSCAN(…) OVER (PARTITION BY species_id)` would cluster each species separately; `ST_ClusterKMeans` and `ST_ClusterWithin` are other window functions for grouping points.
- **DuckDB:** `var_samp`, `var_pop` and `variance` work as here. The `spatial` extension has `ST_Envelope`, `ST_ConvexHull` and `ST_Distance`, but no `<->`: find the nearest point with `ORDER BY ST_Distance(a.geom, b.geom) LIMIT 1`, which measures every pair (g5). It has no DBSCAN; use scikit-learn on the exported points.
- **SQL Server:** `VAR` is the sample variance and `VARP` the population one. The nearest point is `SELECT TOP (1) … WHERE b.geom.STDistance(a.geom) IS NOT NULL ORDER BY b.geom.STDistance(a.geom)`, which a spatial index can serve (g5). `STEnvelope()` and `STConvexHull()` build the areas; there is no DBSCAN or kernel density built in.
- **scikit-learn:** `KernelDensity(bandwidth=…, kernel=…)` also offers `tophat`, `epanechnikov` and others; the bandwidth is in the coordinates' units, so project to metres first. `sklearn.cluster.DBSCAN(eps=2000, min_samples=20)` on the same projected points gives the same 10 clusters, 871 clustered records and 913 noise as `ST_ClusterDBSCAN`: both count the point itself toward the minimum. A point within `eps` of two clusters can join either, depending on the order the points are read.
- **ArcGIS Pro:** Average Nearest Neighbor (`arcpy.stats.AverageNearestNeighbor`): Distance Method `Euclidean`, Area the island's in square metres (without it, a rectangle around all the points); it reports the observed and expected mean distances, the nearest neighbor ratio, z-score and p-value. Density-based Clustering (`arcpy.stats.DensityBasedClustering`): Clustering Method `Defined distance (DBSCAN)`, Minimum Features per Cluster `20`, Search Distance `2 Kilometers`. Kernel Density (`arcpy.sa.KernelDensity`, Spatial Analyst): Search Radius, Area Units `Square kilometers`, Output Cell Values `Densities`. Its kernel is a quartic one that reaches zero at the search radius, not a Gaussian, so its surface doesn't equal scikit-learn's even with the same width.

#### s3 · weights

**Tool:** PG + Py · **Time:** 2.0 h · **Prereqs:** s2

**Concept:** Who counts as a unit's neighbour? Every spatial statistic compares each unit with its neighbours, so the answer is part of the result.
- A **spatial weights matrix** W holds, for each pair of units i and j, a weight `w_ij` saying how much j counts as i's neighbour; `w_ii` is 0. Most weights are **binary**: 1 for a neighbour, 0 otherwise. The units here are s4's hexagons and the countries' outlines.
- A **distance band** makes j a neighbour of i when their centroids lie within a threshold. Every unit reaches equally far, so the number of neighbours varies: a cell on the coast has fewer. s4's `s4_neighbours` is a band of twice the hexagons' edge.
- **k-nearest** makes each unit's k closest units its neighbours. Every unit gets exactly k, so how far it reaches varies instead. The weights aren't **symmetric**: j can be among i's nearest without i being among j's.
- **Ties:** when several units sit at the same distance, the k-th neighbour is a choice, and each program breaks the tie its own way. Grids are full of ties, so two programs can give different k-nearest weights from the same data.
- **Contiguity** makes units neighbours when their shapes share a boundary: an edge for **rook** contiguity, an edge or a corner for **queen**. It needs the shapes, not just centroids. Hexagons that touch always share an edge, so on a hexagon grid rook, queen and s4's band give the same neighbours; on a square grid queen adds the four diagonal cells.
- **Row standardization** divides each row of W by its sum, so the weights of a unit's neighbours add to 1: `w_ij = 1/k_i`, where `k_i` is i's number of neighbours. The weighted sum `Σ_j w_ij y_j` is then the mean of the neighbours' values, the **spatial lag**. A unit with one neighbour gives it all the weight.
- An **island** is a unit with no neighbour. Its row is all zeros and can't be standardized (its sum is 0), and a statistic over it either drops the unit or is undefined. A distance band too short, or contiguity between real islands, makes them.

**Worked example:** the distance band from s4, read as weights. `s4_cells` holds the hexagons over Tasmania's main island at edges of 5 and 10 km and `s4_neighbours` their pairs, one row per ordered pair `(i, j)`; s4's first block, `s4-cells`, makes both. Every download of this module runs that block first, right after connecting, so `s3.sql` and `s3.py` work on their own; to run the blocks one at a time, run `s4-cells` once first. How many neighbours the band gives each cell:

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

On the 5 km grid, 939 of the 1,094 cells have all six neighbours; the coast leaves the rest with fewer, down to one cell with a single neighbour (cell 1051). On the 10 km grid, 221 of the 296 cells have six and the fewest is two (6 cells). No cell has none, so the band leaves no island. A cell with no neighbour wouldn't appear here at all: `count(*)` over its missing rows gives 0, and the result has no row with 0.

**Lab:**
1. k-nearest neighbours on the 5 km cells, ranked by distance rounded to the centimetre and then by id, so ties are broken the same way every run. For k = 4 and k = 6: the links, the links whose reverse is missing, and the cells whose k-th and (k + 1)-th neighbours are tied. `LIMIT 7` keeps one more neighbour than the largest k, to see the tie:

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

With k = 4, 1,025 of the 1,094 cells have their 4th and 5th neighbours at the same distance: an interior cell has six touching cells, all 8.66 km away, and must keep four of them. The rule here (lowest id first) gives the same answer every run, but it isn't neutral. `s4-cells` numbers the cells column by column from the west, so each cell keeps the cells directly above and below it and its two western neighbours; those western cells keep their own western neighbours, never it. 1,968 of the 4,376 links are one-way. With k = 6 an interior cell keeps all six touching cells, so only 129 cells, near the coast, are tied, and 254 links are one-way.

2. Contiguity between countries, where the units are real outlines. Two tests can call outlines neighbours: `ST_Touches` (the boundaries meet and the interiors don't) and `ST_Intersects` (they share any point). For each country, the outlines it intersects and the ones it touches; then the countries with none (islands), those with more intersecting than touching outlines (overlapping), and the most neighbours any country has:

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

76 of the 247 outlines intersect no other: as units, they are islands. `ST_Touches` finds 84. The 12 overlapping countries are g2's eight pairs of nested outlines: France's outline includes French Guiana, Réunion, Guadeloupe, Martinique and Mayotte, Norway's Svalbard and Jan Mayen, the Netherlands' the Caribbean Netherlands and New Zealand's Tokelau, and each of those places also has its own outline. A nested pair's interiors overlap, so `ST_Touches` says no, and eight of the twelve (New Zealand and seven of the places) have no other neighbour: 8 more islands. Neither test is right on its own: the layer isn't a coverage (shapes that tile the area without overlapping), so decide what a nested pair should be before building contiguity on it. The most neighbours any outline intersects is 16 (China).

3. The islands that hold records:

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

Ten islands hold records, among them Australia (4,636) and Madagascar (2,012). Contiguity weights over countries would give both no neighbour, so a statistic over countries would drop them or fail. The other five are Singapore (11), Japan (2), Trinidad and Tobago (2), Mauritius (1) and Niue (1); Singapore is here because its outline doesn't reach Malaysia's across the strait between them.

4. The same weights in PySAL: queen contiguity from the hexagons' shapes against the distance band from their centroids, row standardization, and k = 4 nearest neighbours. `Queen.from_dataframe` reads the shapes from a GeoDataFrame (GeoPandas' table with a geometry column); `DistanceBand` with `binary=True` gives weights of 1 within the threshold, here 10 km, twice the edge. `queen.s0` is the sum of all weights, so the number of links while they are binary; `histogram` counts the cells by number of neighbours. `cKDTree.query(xy, k=6)` returns each cell's six nearest centroids, itself first at distance 0, so columns 4 and 5 are its 4th and 5th neighbours:

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

Queen contiguity from the shapes gives exactly the band's 6,246 links, the same histogram as `s3-contiguity` and no island. After `queen.transform = "r"` every row sums to 1: cell 1051's one neighbour has weight 1.0, and an interior cell's six have 0.1667 each. PySAL's k = 4 has the same 4,376 links and the same 1,025 tied cells as the SQL, but leaves 600 links one-way, not 1,968: its k-d tree (a structure for finding nearest points fast) breaks the ties in its own order. Same data, same distances, different weights.

**Result:** on the 5 km grid, 939 of the 1,094 cells have all six neighbours and the coast leaves the rest with fewer, down to one cell with a single neighbour (cell 1051); on the 10 km grid 221 of 296 have six and the fewest is two. No cell has none. PySAL's queen contiguity from the hexagons' shapes gives exactly the distance band's 6,246 links, the same histogram and no island. After row standardization every row sums to 1: cell 1051's one neighbour has weight 1.0, an interior cell's six have 0.1667 each. k-nearest is lopsided: with k = 4, 1,025 cells have their 4th and 5th neighbours at the same distance, so the choice is a tie-break; SQL's rule (lowest id) leaves 1,968 of 4,376 links one-way, PySAL's leaves 600, with the same distances. With k = 6 only 129 cells are tied and 254 links one-way. Between countries, 76 of the 247 outlines intersect no other: they are islands, and 10 of them hold records (Australia 4,636, Madagascar 2,012, Comoros 109, …), so contiguity weights over countries would give Australia and Madagascar no neighbour at all. `ST_Touches` alone finds 84 islands, because 12 countries belong to g2's nested pairs (France and its overseas regions, among others), whose interiors overlap; the most neighbours any outline intersects is 16.

**Exercise:** k-nearest weights never leave a cell without neighbours: with k = 6, every 5 km cell gets six. How far does each cell have to reach for its 6th neighbour? Group the 5 km cells by their number of neighbours in s4's distance band (`s4_neighbours`), and show for each group the cells, their records, and the shortest and longest reach in km. What does k = 6 do to a coastal cell, and which of the two would you use for s4's Moran's I?

**Answer:** the band's neighbour count per cell, then each cell's 6th-nearest centroid with the same ordering as `s3-knn` (distance, then id); `OFFSET 5 LIMIT 1` skips the first five:

```sql
-- q: s3-ex
-- status: ran
-- engine: postgis
WITH band AS (
  SELECT i, count(*) AS k FROM s4_neighbours WHERE edge_m = 5000 GROUP BY i
), reach AS (
  SELECT band.k, a.n,
         (SELECT ST_Distance(ST_Point(a.cx, a.cy), ST_Point(c.cx, c.cy))
          FROM s4_cells AS c
          WHERE c.edge_m = a.edge_m AND c.id <> a.id
          ORDER BY 1, c.id
          OFFSET 5 LIMIT 1) AS d6_m
  FROM s4_cells AS a JOIN band ON band.i = a.id
  WHERE a.edge_m = 5000
)
SELECT k AS band_neighbours, count(*) AS cells, sum(n) AS records,
       round((min(d6_m) / 1000)::numeric, 2) AS shortest_km,
       round((max(d6_m) / 1000)::numeric, 2) AS longest_km
FROM reach
GROUP BY k
ORDER BY k;
```

```text
-- result: s3-ex · 6 rows · sha256 3f25bd602944
band_neighbours | cells | records | shortest_km | longest_km
1 | 1 | 0 | 22.91 | 22.91
2 | 7 | 57 | 17.32 | 17.32
3 | 36 | 16 | 15.00 | 17.32
4 | 66 | 243 | 15.00 | 15.00
5 | 45 | 133 | 15.00 | 15.00
… 1 more row
```

**Check:** the 939 cells with six neighbours in the band reach 8.66 km (√3 times the edge), the touching cells, so for them k = 6 and the band agree. Every cell on the coast reaches farther: 15.00 km (3 times the edge, the second ring) for the cells with four or five band neighbours, 15.00 to 17.32 km for those with three, 17.32 km for the cells with two, and 22.91 km for cell 1051, more than two and a half times an interior cell's reach. Those 155 coastal cells hold 449 of the 1,972 records in cells. k = 6 keeps the number of neighbours equal and lets the distance grow; the band keeps the distance equal and lets the number shrink. For s4 the band is the better choice: the cells are equal, they cover one island with no gap, and the band leaves no island, so a coastal cell is compared with the cells it touches, not with cells two rings inland. k-nearest earns its place where units differ in size and spacing, like countries, or where a band would leave islands; then state k and the tie rule with the result.

**Dialects:**
- **PostgreSQL:** `ST_DWithin(a, b, d)` builds a band and uses a GiST index on either column; k-nearest is a `CROSS JOIN LATERAL (… ORDER BY a.geom <-> b.geom LIMIT k)`, which an index serves when `geom` is a column with one (g5), not a point built on the fly as here. `ST_Touches` is queen contiguity; rook needs the shared boundary to be a line, `ST_Relate(a.geom, b.geom, 'F***1****')` (interiors apart, boundaries sharing a line; g2's DE-9IM). PostgreSQL has no matrix type: weights live as rows `(i, j, w)`, as in `s4_neighbours`.
- **DuckDB:** the `spatial` extension has `ST_DWithin`, `ST_Touches`, `ST_Intersects` and `ST_Distance`, but no `<->`. k-nearest ranks every pair: `QUALIFY row_number() OVER (PARTITION BY a.id ORDER BY ST_Distance(a.geom, b.geom), b.id) <= 4`, which 1,094 cells (1.2 million pairs) allow.
- **SQL Server:** `STDistance`, `STTouches`, `STIntersects` and `STRelate(other, 'F***1****')` for rook; k-nearest is `CROSS APPLY (SELECT TOP (4) … WHERE b.geom.STDistance(a.geom) IS NOT NULL ORDER BY b.geom.STDistance(a.geom), b.id)`, which a spatial index can serve (g5).
- **PySAL:** `libpysal.weights` has `DistanceBand`, `KNN`, `Queen` and `Rook` (`from_dataframe` for shapes); `w.transform = "r"` row-standardizes and `"b"` goes back to binary; `w.islands`, `w.cardinalities`, `w.histogram` and `w.s0` describe the weights, and building them warns about islands unless `silence_warnings=True`. `DistanceBand(…, binary=False, alpha=-1)` gives inverse-distance weights. The newer `libpysal.graph.Graph` (`build_distance_band`, `build_knn`, `build_contiguity`) builds the same rules. `KNN` has no tie rule to choose: its k-d tree decides.
- **ArcGIS Pro:** Generate Spatial Weights Matrix (`arcpy.stats.GenerateSpatialWeightsMatrix`) writes a `.swm` file the statistics tools read. Conceptualization of Spatial Relationships: `Fixed distance` (a band, with Threshold Distance), `K nearest neighbors` (Number of Neighbors), `Contiguity edges only` (rook) or `Contiguity edges corners` (queen); Row Standardization is on by default. With `Fixed distance`, Number of Neighbors is a minimum: a unit with fewer neighbours within the threshold gets its nearest ones added, so no unit is an island, and its reach grows like k-nearest's.

#### s4 · moran

**Tool:** PG + Py · **Time:** 2.0 h · **Prereqs:** s3

**Concept:** One number for "do similar values sit together?", and how to test it:
- **Spatial autocorrelation** is the tendency of values at nearby places to be alike (positive) or unlike (negative). A **global** statistic gives one number for the whole study area; a local one (s5) says where.
- **Cells, not points.** A record has no value to compare with its neighbours', and many records share one spot (s2). So the records are counted into equal-area hexagons over Tasmania's main island, at two sizes (edges of 5 and 10 km), and each cell's value is `y = ln(1 + n)`, where `n` is its number of records. The logarithm keeps the few cells with hundreds of records from outweighing everything else. Records outside every cell drop out: 28 of the devil's 2,000 at 5 km (12 on Maria Island, others off the coast, on the mainland, and 2 in New Mexico), 10 at 10 km.
- **Weights** say which cells are neighbours: `w_ij` is cell j's weight for cell i, 0 when they aren't neighbours. Here two cells are neighbours when their centroids are within a **distance band** of twice the edge. In a hexagon grid with edge `e`, the centroids of touching cells are √3·e ≈ 1.73·e apart and the next ring's 3·e, so a band of 2·e gives each cell exactly the cells it touches, and since no pair lies near 2·e, a rounding difference between two programs can't move a pair across.
- **Row standardization** divides each of cell i's weights by `k_i`, its number of neighbours, so each cell's weights sum to 1 and `Σ_j w_ij y_j` is the mean of its neighbours' values: its **spatial lag**.
- **Moran's I** compares each cell's deviation from the mean, `z_i = y_i − ȳ`, with its neighbours': `I = (n / S0) · Σ_i Σ_j w_ij z_i z_j / Σ_i z_i²`, where `n` is the number of cells and `S0` the sum of all weights (equal to `n` with row-standardized weights). With no pattern, I is close to its **expectation** `E[I] = −1/(n−1)`; above it, similar values cluster; below, they alternate.
- **Is I far from E[I]?** A **z-score** divides the difference by the standard deviation I would have with no pattern. That variance has a closed form under two assumptions: **normality** (the values are a sample from a normal distribution: `z_norm`) or **randomization** (these exact values, shuffled over the cells: `z_rand`, which ArcGIS Pro reports). A **permutation test** makes no formula: shuffle the values over the cells many times, recompute I each time, and count how often a shuffle beats the real I. With 999 shuffles, the smallest possible **pseudo p-value** is 1/1000.
- **Two engines, one statistic.** Plain SQL and PySAL (`esda`) compute the same I, E[I], variance and z from the same cells and agree to 10⁻⁷, as long as their neighbours are the same pairs. That is a real condition: two records at one spot are 0 m apart, `ST_DWithin` makes them neighbours and PySAL's `DistanceBand` doesn't. Cells with distinct centroids avoid it, and this module checks both the centroids and the pairs before it trusts a number.
- **What clusters?** The cells count records, so I measures how recording effort clusters as much as how devils do (s1).

**Diagram:** `s4-band`, after the Concept: in a hexagon grid with edge `e` (flat-topped, as `ST_HexagonGrid` makes it), the six touching cells' centroids are √3·e ≈ 1.73·e from the middle cell's and the next ring's 3·e and 2√3·e ≈ 3.46·e, so the 2·e band holds exactly the touching cells, 0.27·e beyond them and a whole edge short of the next ring.

**Worked example:** the cells, and a check of their geometry.

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

The island gives 1,094 cells of 5 km and 296 of 10 km. 1,972 of the 2,000 records fall in a 5 km cell and 1,990 in a 10 km one; the fullest cell holds 256 records at 5 km and 475 at 10 km. `ST_HexagonGrid` returns the hexagons covering the island's bounding box, with their column and row (`i`, `j`), so `WHERE ST_Intersects` keeps the ones touching land. `ST_Contains` puts a record in the one cell that contains it.

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

The grid passes at both sizes: the nearest centroids are 8,660.25 m and 17,320.51 m apart, the next class 15,000 and 30,000 m, with no duplicate centroid, no island and no pair within 1 m of the threshold. `dense_rank()` numbers the distinct distances in order, so class 1 is the smallest and class 2 the next; rounding to 0.01 m first keeps 8,660.254 and 8,660.2540001 in one class.

**Lab:**
1. Global Moran's I in plain SQL, with row-standardized weights (`w_ij = 1/k_i`, where `k_i` is cell i's number of neighbours) and its expected value, variance and z-score under the normality assumption. These are the formulas PySAL's `esda.Moran` uses (`EI`, `VI_norm`, `z_norm`):

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

Read it one CTE at a time. `z` takes each grid's mean from its values. `w` gives every pair its row-standardized weight: `count(*) OVER (PARTITION BY i)` is `k_i`. `pairs` puts `w_ij` and `w_ji` on one row, since they differ when two neighbours have different numbers of neighbours. `sums` makes the numerator and `S0`, and `S1` (half the sum of `(w_ij + w_ji)²`); `s2` makes `S2` (the sum over cells of each cell's row total plus column total, squared). `moran` combines them into I, E[I] and the variance under normality. At 5 km, I is 0.2733, far above E[I] (−0.0009): z is 15.18. At 10 km, I is 0.2036 and z 5.83.

2. The same statistic in PySAL, from the same cells. `DistanceBand` builds the binary weights; `transformation="r"` row-standardizes them. `z_rand` is the z-score under the randomization assumption, which ArcGIS reports:

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

Every printed digit equals the SQL's. `z_rand` is a little larger than `z_norm` (15.25 against 15.18 at 5 km): the randomization variance uses the values' own kurtosis (how heavy their tails are) where the normality one assumes a normal distribution's.

3. Equal printed digits could still hide different neighbours. This block checks the pairs themselves: per grid, it builds PySAL's distance band from the same centroids, compares its pairs with `s4_neighbours`' one by one, and stops with an error naming the grid and the first five differing pairs if one set has a pair the other lacks. Then it prints the statistics at full precision (`repr` gives every digit a float holds), which the course's own test compares with the SQL's, within 5 × 10⁻⁷, every time it runs:

```python
# q: s4-agree
# status: ran
# after: py-connect
import sys

import esda
import numpy as np
from libpysal.weights import DistanceBand

with connect() as conn:
    edges = [e for (e,) in conn.execute("SELECT DISTINCT edge_m FROM s4_cells ORDER BY edge_m")]
    grids = {}
    for edge_m in edges:
        rows = conn.execute(
            "SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = %s ORDER BY id", (edge_m,)
        ).fetchall()
        sql_pairs = set(conn.execute("SELECT i, j FROM s4_neighbours WHERE edge_m = %s", (edge_m,)).fetchall())
        grids[edge_m] = (rows, sql_pairs)

table = []
for edge_m, (rows, sql_pairs) in grids.items():
    w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=2 * edge_m, binary=True, ids=[r[0] for r in rows])
    pysal_pairs = {(i, j) for i, js in w.neighbors.items() for j in js}
    differ = sorted(sql_pairs ^ pysal_pairs)
    if differ:
        shown = ", ".join(f"{p} only in {'SQL' if p in sql_pairs else 'PySAL'}" for p in differ[:5])
        sys.exit(f"{edge_m} m grid: {len(differ)} neighbour pairs differ; first: {shown}")
    mi = esda.Moran(np.array([r[1] for r in rows]), w, transformation="r", permutations=0)
    table.append((edge_m, mi.n, len(pysal_pairs), mi.I, mi.EI, mi.VI_norm, mi.z_norm))

print("neighbour pairs equal s4_neighbours on every grid")
print("edge_m | n | pairs | I | E[I] | Var_norm | z_norm")
for edge_m, n, pairs, *stats in table:
    print(" | ".join([str(edge_m), str(n), str(pairs), *(repr(float(s)) for s in stats)]))
```

```text
-- result: s4-agree · python · sha256 44e33d16750b
neighbour pairs equal s4_neighbours on every grid
edge_m | n | pairs | I | E[I] | Var_norm | z_norm
5000 | 1094 | 6246 | 0.2732961251160256 | -0.0009149130832570906 | 0.00032639905787023167 | 15.177857980448268
10000 | 296 | 1620 | 0.2035877773186628 | -0.003389830508474576 | 0.0012597916525627275 | 5.831415676740648
```

Both grids pass: the 6,246 pairs at 5 km and the 1,620 at 10 km are the same pairs in both programs (each counted once from each side, so a pair of cells is two rows of `s4_neighbours`). The statistics differ from the SQL's only in their last digits, by 10⁻¹² at most.

4. The permutation test on the 5 km cells. esda's global `Moran` takes no seed, so NumPy's is set first; 999 shuffles:

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

In 999 shuffles no I came near the real one: the largest was 0.0650, against 0.2733. So the pseudo p-value is the smallest possible, 0.001, and the shuffles' spread (mean −0.0008, standard deviation 0.0182) gives a z of 15.07, close to the formulas'.

**Result:** the grid checks pass at both sizes (the nearest centroids 8,660.25 m and 17,320.51 m apart, the next class 15,000 and 30,000 m, no duplicate centroid, no island, no pair near the threshold). Moran's I is 0.2733 on the 1,094 cells of 5 km (E[I] −0.0009, z 15.18) and 0.2036 on the 296 cells of 10 km (z 5.83): SQL and PySAL agree to every printed digit, on the same neighbour pairs (§A.2 compares them to 5 × 10⁻⁷). ArcGIS Pro's z would be `z_rand`, 15.25. In 999 shuffles no I came near the real one (the largest 0.0650), so the pseudo p-value is the smallest possible, 0.001, and the shuffles' spread gives z 15.07, close to the formulas'. Larger cells give a smaller I and a much smaller z: the modifiable areal unit problem (g6) reaches the statistic. And since s1 showed the records are mostly one atlas and one museum's samples, the honest sentence is "devil records cluster strongly at both scales", not "devils cluster".

**Exercise:** `y = ln(1 + n)` still lets a cell with 256 records weigh more than one with 1. Ask a plainer question: do cells with any record at all sit together? Compute Moran's I, E[I] and the z-score under normality in SQL for `y = 1` when a cell has a record and `0` when it has none, on both grids, with the same row-standardized weights, and show how many cells have a record. Is the pattern weaker or stronger than for `ln(1 + n)`, and what does that say?

**Answer:** `s4-moran-sql` with one change, the value in the first CTE:

```sql
-- q: s4-ex
-- status: ran
-- engine: postgis
WITH v AS (
  SELECT id, edge_m, CASE WHEN n > 0 THEN 1.0 ELSE 0.0 END::float8 AS y FROM s4_cells
), z AS (
  SELECT id, edge_m, y - avg(y) OVER (PARTITION BY edge_m) AS z FROM v
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
  SELECT z.edge_m, count(*)::float8 AS n, sum(z.z * z.z) AS zz, sum(v.y)::integer AS with_records
  FROM z JOIN v USING (id)
  GROUP BY z.edge_m
), moran AS (
  SELECT c.edge_m, c.n, c.with_records,
         c.n / s.s0 * s.wzz / c.zz AS i,
         -1 / (c.n - 1) AS ei,
         (c.n ^ 2 * s.s1 - c.n * s2.s2 + 3 * s.s0 ^ 2) / ((c.n - 1) * (c.n + 1) * s.s0 ^ 2) - (1 / (c.n - 1)) ^ 2 AS var_norm
  FROM cells AS c JOIN sums AS s USING (edge_m) JOIN s2 USING (edge_m)
)
SELECT edge_m, n::integer AS n, with_records,
       round(i::numeric, 6) AS i,
       round(ei::numeric, 6) AS ei,
       round(((i - ei) / sqrt(var_norm))::numeric, 2) AS z
FROM moran
ORDER BY edge_m;
```

```text
-- result: s4-ex · 2 rows · sha256 1840f4611e5b
edge_m | n | with_records | i | ei | z
5000 | 1094 | 307 | 0.208633 | -0.000915 | 11.60
10000 | 296 | 178 | 0.229060 | -0.003390 | 6.55
```

**Check:** The answer has 307 of the 1,094 cells of 5 km with a record, and 178 of the 296 of 10 km. At 5 km, presence clusters less than the counts did (I 0.2086 against 0.2733, z 11.60 against 15.18): part of what `ln(1 + n)` measured was cells with many records next to each other, and with presence alone a cell of 256 records counts as much as a cell of 1. It still clusters strongly: cells with a record sit beside cells with a record. At 10 km it goes the other way (I 0.2291 against 0.2036, z 6.55 against 5.83): most cells there have a record, and what clusters is the contrast between areas where someone recorded a devil and areas where nobody did. Both versions answer a question about records: where people looked and published, not where devils are. The choice of value, like the choice of cell size, changes the number, so a Moran's I is reported with the value it measures, its cells and its weights.

**Dialects:**
- **PostgreSQL:** `^` raises to a power (as `power(a, b)`), and `1 / count(*) OVER (…)::float8` divides in floating point because the cast binds to the window's result; without it, `1 / 6` is integer division and gives 0. `ln`, `sqrt` and `avg(…) OVER (PARTITION BY …)` are standard.
- **DuckDB:** the same SQL runs once `s4_cells` exists (with the spatial extension, `ST_Point(x, y)` takes no SRID and `ST_DWithin` measures in the coordinates' units, metres here). `^` and `**` are both powers. `/` always divides in floating point in DuckDB (`//` is integer division), so the cast isn't needed there.
- **SQL Server:** `^` is bitwise exclusive or, not a power: `2 ^ 2` is 0. Write `POWER(x, 2)` or `x * x`. `/` between integers truncates, so cast: `1.0 / COUNT(*) OVER (PARTITION BY i)`. `LOG(x)` is the natural logarithm. The distance band is `a.geom.STDistance(b.geom) <= 2 * a.edge_m` on `geometry` points; a spatial index serves it only as `STDistance(…) <= …` in the `WHERE` or `ON` clause.
- **PySAL:** `esda.Moran(y, w, transformation="r", permutations=999)`; `I`, `EI`, `VI_norm`, `z_norm`, `VI_rand`, `z_rand`, `p_norm`, `p_rand` and, with permutations, `p_sim`, `EI_sim`, `seI_sim`, `z_sim`. Set `np.random.seed` first for repeatable shuffles. `libpysal.weights.KNN` or `Queen` give other neighbour rules (s3); the statistic only means something with the weights stated beside it.
- **ArcGIS Pro:** the Spatial Autocorrelation (Global Moran's I) tool (`arcpy.stats.SpatialAutocorrelation`), on a feature class of the cells: Input Field `y`; Conceptualization of Spatial Relationships `Fixed distance band`; Distance Method `Euclidean`; Standardization `Row`; Distance Band or Threshold Distance `10000` (metres, at 5 km). It reports Moran's Index, Expected Index, Variance, z-score and p-value; its variance and z-score are the randomization ones, so compare its z with `z_rand` (15.25), not `z_norm`. Ask for its HTML report to see where I falls among the values it would take by chance. §3.4's arcpy notes (the setup page) run it from Python, on the cells exported as a GeoPackage (§3.3).

#### s5 · local

**Tool:** PG + Py · **Time:** 2.5 h · **Prereqs:** s4

**Concept:** s4 gave one number for the whole island; this module asks **where** values cluster, and how many of those places survive a careful test.
- A **local** statistic gives each cell its own value, computed from the cell and its neighbours, so it can be mapped. The cells, values and weights are s4's: the 5 km hexagons over Tasmania's main island, `y = ln(1 + n)`, and the band of twice the edge.
- **Getis-Ord Gi\*** compares the sum of the values in a cell's neighbourhood, the cell included (the star), with the sum that neighbourhood would have if the values were spread at random: `Gi* = (Σ_j w_ij y_j − ȳ Σ_j w_ij) / (S √((n Σ_j w_ij² − (Σ_j w_ij)²) / (n − 1)))`, where `S` is the values' standard deviation, `n` the number of cells and the weights binary (1 for each neighbour and for the cell itself). The result is a z-score: high in a **hot spot**, a neighbourhood of high values, and low in a **cold spot**, a neighbourhood of low ones.
- **p-values from z.** Under the null hypothesis a z-score follows the standard normal distribution, so the **two-sided** p-value, the chance of a z at least this far from 0 in either direction, is `erfc(|z| / √2)` (`erfc` is the complementary error function). |z| ≥ 1.96 is p ≤ 0.05.
- **Local Moran's I** (LISA, a local indicator of spatial association) gives each cell its own share of global Moran's I: `I_i = z_i · Σ_j w_ij z_j / m2`, where `z_i = y_i − ȳ`, the weights are row-standardized and `m2 = Σ_k z_k² / n`. The sign of `z_i` (above or below the mean) and of the **spatial lag** `Σ_j w_ij z_j` (the neighbours' mean, s3) put each cell in a **quadrant**: high-high and low-low cells sit among values like their own (**clusters**); high-low and low-high cells differ from their neighbours (**outliers**).
- **Permutation p-values.** LISA has no trusted formula for its variance, so each cell's p-value comes from a **conditional permutation** test: keep the cell's own value, give its neighbours values drawn at random from the other cells, recompute `I_i`, and repeat 999 times. With 999 permutations the smallest possible pseudo p-value is 1/1000, as in s4. The draws are random, so a repeatable result needs a fixed seed.
- **Many tests at once.** A local statistic runs one test per cell, here 1,094. At p ≤ 0.05, about 55 cells would pass by chance alone even with no pattern at all. The **false discovery rate** (FDR, Benjamini and Hochberg) controls the expected share of false positives among the cells kept: sort the m p-values, find the largest rank k with `p_(k) ≤ k · 0.05 / m`, and keep the k smallest. It's less strict than the **Bonferroni** correction (`p ≤ 0.05 / m` for every cell), which controls the chance of even one false positive.
- **Hot spots of what?** The cells count records, and s1 showed the devil's records are mostly one atlas and one museum's samples. A hot spot here is a place where people recorded many devils, and it is reported as a hot spot of recording.

**Worked example:** Gi\* in plain SQL. Like s2 and s3, the blocks read s4's `s4_cells` and `s4_neighbours`: every download of this module runs `s4-cells` first, right after connecting, so `s5.sql` and `s5.py` work on their own; to run the blocks one at a time, run `s4-cells` once first.

The block keeps its result as a temporary view, `s5_gistar`, one row per 5 km cell: `id`, `z`, the two-sided `p`, and `fdr`, true where the cell survives the false discovery rate. The exercise below reads it, and so does the capstone (c1), instead of repeating the query. A temporary view lasts until the session ends:

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

Read it one CTE at a time. `stats` makes n, ȳ and `S`, the population standard deviation (`sqrt(avg(y²) − ȳ²)`, dividing by n, not n − 1, as the formula requires). `w` adds each cell to its own neighbours (the star) with `UNION ALL`, so `sums` gets `Σ_j w_ij y_j` and, with binary weights, `Σ_j w_ij = Σ_j w_ij²` = the number of cells in the neighbourhood. `z` is the Gi\* formula. `p` turns z into a two-sided p-value with `erfc` (new in PostgreSQL 16) and ranks the cells by it, `i` breaking ties. `cut` is the Benjamini-Hochberg step: the largest rank whose p-value is at most `rank · 0.05 / m` (0 when no cell passes). The last query counts the cells.

99 cells are hot at p ≤ 0.05 and 39 survive the false discovery rate; the highest z is 10.63. There is no cold spot at all, and the lowest z is only −1.29: 787 of the 1,094 cells hold no record (s4's exercise), so an empty neighbourhood is the typical one and can't stand out below the mean.

**Lab:**
1. The same Gi\* in PySAL: `G_Local` with `star=True` and binary weights (`transform="B"`), from the same cells and the same band. esda's own `p_norm` is one-sided, so the block computes the two-sided p-value from `Zs`; esda's `fdr` returns the p-value cut:

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

The line equals the SQL's, digit for digit: the course's test compares the two every time the labs run.

2. Local Moran's I with 999 permutations (seeded), by quadrant: all cells, significant at p ≤ 0.05, and after the false discovery rate. `transformation="r"` row-standardizes the weights, as in s4; `seed=2026` makes the permutations repeatable:

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

The false discovery rate's cut is p ≤ 0.0021, so only cells with a pseudo p-value of 0.001 or 0.002 survive: the floor 999 permutations allow, and the step above it. 68 high-high cells are significant at p ≤ 0.05 and 16 after the correction. 29 high-low outliers survive too: single cells of many records among empty ones, the shape of an atlas grid point or a sampling site. No low-low cell is significant.

3. The quadrants need no permutations: they come from the sign of each cell's deviation from the mean and of its spatial lag, both plain SQL. This block computes them from `s4_cells` and `s4_neighbours`, with the records each quadrant holds; the course's test checks that its cells per quadrant equal esda's `cells` column:

```sql
-- q: s5-lisa-sql
-- status: ran
-- engine: postgis
WITH c AS (
  SELECT id, n, y - avg(y) OVER () AS z FROM s4_cells WHERE edge_m = 5000
), lag AS (
  SELECT nb.i AS id, avg(c.z) AS lag
  FROM s4_neighbours AS nb JOIN c ON c.id = nb.j
  WHERE nb.edge_m = 5000
  GROUP BY nb.i
), q AS (
  SELECT c.id, c.n,
         CASE WHEN c.z > 0 AND l.lag > 0 THEN 1
              WHEN c.z <= 0 AND l.lag > 0 THEN 2
              WHEN c.z <= 0 AND l.lag <= 0 THEN 3
              ELSE 4 END AS q
  FROM c JOIN lag AS l USING (id)
)
SELECT (ARRAY['high-high', 'low-high', 'low-low', 'high-low'])[q] AS quadrant,
       count(*) AS cells,
       sum(n) AS records
FROM q
GROUP BY q
ORDER BY q;
```

```text
-- result: s5-lisa-sql · 4 rows · sha256 61ccb6a48dc8
quadrant | cells | records
high-high | 185 | 1613
low-high | 230 | 0
low-low | 557 | 0
high-low | 122 | 359
```

`avg(c.z)` over a cell's neighbours is the row-standardized lag: each of its `k_i` neighbours weighs `1/k_i`. The quadrants are numbered as esda's `q` (1 high-high, 2 low-high, 3 low-low, 4 high-low), with a value exactly at the mean counted as low, as esda does. The counts equal esda's: 185, 230, 557, 122. The records column shows what "low" means here: both low quadrants hold no record at all. The mean of `y` is below `ln 2`, the value of a cell with one record, so a single record lifts a cell above the mean, so "high" means "has a record" and "low" means "empty".

**Result:** Gi\* finds 99 hot cells at p ≤ 0.05 and 39 after the false discovery rate, with the highest z 10.63, and no cold spot: SQL and PySAL give the same line. Local Moran's I puts 185 cells in high-high, 230 in low-high, 557 in low-low and 122 in high-low, in SQL as in esda; 68 high-high cells are significant at p ≤ 0.05 and 16 after the correction, with 29 high-low outliers, and no low-low cell. The correction removes more than half of Gi\*'s hot spots and three in four of LISA's high-high cells. What is left are the places the atlas and the museum's teams recorded devils most: hot spots of recording effort, which a report or a map labels as such, never as where devils are most common.

**Exercise:** How much of the record do the 39 hot spots that survive the false discovery rate hold, and who recorded it? For each dataset with a devil record in a 5 km cell, count its records in those 39 cells and its records in any cell, each with its share of the column's total. Compare the shares: does one dataset weigh more in the hot spots than in the whole sample?

**Answer:** each record placed in its cell as in `s4-cells`, then joined to `s5_gistar`; the block runs after `s5-gistar`, so the view exists:

```sql
-- q: s5-ex
-- status: ran
-- engine: postgis
-- after: s5-gistar
WITH devils AS (
  SELECT o.dataset_key, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), placed AS (
  SELECT d.dataset_key, g.fdr AND g.z > 0 AS hot
  FROM devils AS d
  JOIN s4_cells AS c ON c.edge_m = 5000 AND ST_Contains(c.geom, d.geom)
  JOIN s5_gistar AS g ON g.id = c.id
)
SELECT ds.title,
       count(*) FILTER (WHERE p.hot) AS hot_records,
       round(100.0 * count(*) FILTER (WHERE p.hot) / sum(count(*) FILTER (WHERE p.hot)) OVER (), 1) AS hot_pct,
       count(*) AS records_in_cells,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM placed AS p JOIN datasets AS ds USING (dataset_key)
GROUP BY ds.title
ORDER BY hot_records DESC, records_in_cells DESC, ds.title;
```

```text
-- result: s5-ex · 8 rows · sha256 a2b623ef575f
title | hot_records | hot_pct | records_in_cells | pct
Tasmanian Natural Values Atlas | 870 | 78.5 | 1402 | 71.1
Tasmanian Museum and Art Gallery provider for OZCAM | 237 | 21.4 | 555 | 28.1
Northern Territory Museum and Art Gallery provider for OZCAM | 1 | 0.1 | 1 | 0.1
Museums Victoria provider for OZCAM | 0 | 0.0 | 5 | 0.3
MVZ Mammal Collection (Arctos) | 0 | 0.0 | 3 | 0.2
… 3 more rows
```

**Check:** The 39 hot spots, 3.6 % of the 1,094 cells, hold 1,108 of the 1,972 records in cells (870 + 237 + 1), 56 %. The atlas supplies 78.5 % of them against 71.1 % of all records in cells, and the museum's material samples 21.4 % against 28.1 %: the hot spots are, even more than the sample, the atlas's. Five of the eight datasets have no record in a hot spot. So the map of hot spots is largely a map of where the atlas's observers worked; before reading it as anything about devils, a report says which datasets made it, as s1 did for the whole sample. `FILTER (WHERE p.hot)` counts one kind of row inside a group, and `sum(…) OVER ()` over the grouped counts gives the column's total for the shares.

**Dialects:**
- **PostgreSQL:** `erf` and `erfc` are new in PostgreSQL 16; on an older server, compute p-values in Python, or compare |z| with fixed cut-offs (1.96 for p ≤ 0.05) and skip the false discovery rate, which needs p-values. The Benjamini-Hochberg cut is window functions: `row_number()` and `count(*) OVER ()` for rank and m, then `max(rank) FILTER (WHERE …)`.
- **DuckDB:** the same SQL runs once `s4_cells` and `s4_neighbours` exist, except the p-values: DuckDB 1.5 has no `erf` or `erfc` (`Scalar Function with name erfc does not exist`). `stddev_pop` gives `S` directly.
- **SQL Server:** no error function either; `STDEVP` is the population standard deviation (`STDEV` the sample one, which would change every z slightly). Arrays don't exist: name the quadrants with `CASE` or `CHOOSE(q, 'high-high', 'low-high', 'low-low', 'high-low')`.
- **PySAL:** `esda.G_Local(y, w, transform="B", star=True)` gives `Zs` and a one-sided `p_norm` (and `p_sim` with permutations); `esda.Moran_Local(y, w, transformation="r", permutations=999, seed=2026)` gives `Is`, `q` (1 high-high, 2 low-high, 3 low-low, 4 high-low) and `p_sim`; `esda.fdr(p, 0.05)` returns the p-value cut (and the Bonferroni bound 0.05/m if every test would pass). The `splot` package maps them; it isn't in the course's pins.
- **ArcGIS Pro:** Hot Spot Analysis (Getis-Ord Gi\*) (`arcpy.stats.HotSpots`) on a feature class of the cells: Input Field `y`; Conceptualization of Spatial Relationships `Fixed distance band`; Distance Method `Euclidean`; Standardization `None` (binary weights, as here); Distance Band or Threshold Distance `10000`; Apply False Discovery Rate (FDR) Correction checked. Pro always counts the cell as its own neighbour, so its z-score (`GiZScore`) is Gi\*'s; its `Gi_Bin` field sorts cells into bins of 90, 95 and 99 % confidence, hot (1 to 3) or cold (−1 to −3). Cluster and Outlier Analysis (Anselin Local Moran's I) (`arcpy.stats.ClusterOutlierAnalysis`) gives each cell `COType` (`HH`, `LL`, `HL`, `LH`, or blank when not significant): Standardization `Row`, Number of Permutations 999, the same FDR option. Its permutations come from another random generator, so its pseudo p-values, and which cells pass, can differ a little from esda's; the quadrants, which take no permutation, can't. Both tools label the output as hot and cold spots; a report on records adds "of recording". §3.4's arcpy notes (the setup page) show how to run a Spatial Statistics tool from Python, on the cells exported as a GeoPackage (§3.3).

#### s6 · zonal

**Tool:** PG + Py · **Time:** 2.0 h · **Prereqs:** s5, g7

**Concept:** s2 to s5 asked where records cluster; this module asks whether some zones hold more records than they should, and what "should" can mean.
- **Zonal statistics** summarise what falls inside each zone of a layer: a count, a sum, an area or a mean per zone. A zone is any polygon, or every raster cell with one value. Here the zones are Costa Rica's ecoregions, cut to the country's outline, and then the classes of a habitat map. For points in polygons the summary is a spatial join and a `GROUP BY` (g3); for a raster inside polygons it is g7's `ST_ValueCount`.
- **Like with like.** A count alone says little, because a big zone holds more records than a small one. **Density** divides by area: records per 1,000 km². The **record-to-area ratio** divides a zone's share of the records by its share of the area: 1 when records are spread by area alone, above 1 when the zone holds more than its size predicts. Both shares must cover the same place: the zones cut to the outline, and only the records inside that outline.
- **Normalizing for effort.** A ratio above 1 still mixes the animals with the people who looked for them (s1). The records of every species in a sample are a rough measure of where people recorded at all, the **target group** idea: records of related species, collected the same way, stand in for effort. A species' **effort-normalized ratio** in a zone is its share of the zone's records divided by its share of all the country's records: 1 when the species turns up in the zone as often as recording in general predicts. It assumes the other species were recorded the same way, which s1 showed this sample's weren't.
- **The chi-square goodness-of-fit test** asks whether counts follow an expectation, here records in proportion to area: `χ² = Σ (O − E)² / E` over the zones, with O the observed and E the expected count, on (zones − 1) degrees of freedom. With hundreds of records it rejects almost any simple expectation. A rejection says the records aren't spread by area; it doesn't say why, and nothing about which habitat an animal prefers.
- **Estimated areas.** The habitat classes' areas come from a map, not a survey (§4.1, g7): Jung et al.'s 1 km cells each carry the fraction of each class, and `country_habitats` sums fraction × cell area over the cells whose centre is inside the outline. `occurrence_habitats` gives each record the class with the largest fraction in its 1 km cell: the map's class at that place, not the habitat the animal used.

**Worked example:** Costa Rica's ecoregions as zones: area, records (those GBIF codes `CR` that lie inside the outline, g3), records per 1,000 km², the record-to-area ratio, and the jaguar's effort-normalized ratio:

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

Read it one CTE at a time. `zones` cuts each ecoregion that touches the outline to the outline (`ST_Intersection`, g4). `records` keeps the records coded `CR` that lie inside the outline. `per_zone` joins records to zones with `ST_Contains` and counts them, with `LEFT JOIN` and `count(r.id)` so a zone with no record gets 0, not no row; the jaguar's records are counted with `FILTER`. `ST_Area` on `geography` measures on the WGS 84 ellipsoid, in m². The last query divides each zone's share by the column totals, `sum(…) OVER ()`; `nullif` keeps a zone with no record from dividing by zero.

591 of Costa Rica's 619 records lie inside its outline (g3 found the rest). By area alone the records are uneven: the Talamancan montane forests, 8,311 km² of mountains, hold 13 records (ratio 0.15), the three lowland moist forests 1.05 to 1.26. The jaguar's column looks different again: 61 of the 62 records in the Central American dry forests and all 7 in the Southern Mesoamerican Pacific mangroves are jaguars, 7.29 and 7.41 times its share of the records in zones, and it has none in the other five.

**Lab:**
1. The same zones in GeoPandas: an overlay of the ecoregions with the outline, then a spatial join of the records to the pieces, with areas in an equal-area projection (EPSG:6933, the global EASE-Grid 2.0), and a chi-square test of records against area. `from_wkb` reads the shapes PostGIS sends as well-known binary (g2):

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

The course's test checks that every zone `s6-zones` shows has the same records here, and an area within 1 km²: geography's ellipsoid and EPSG:6933's projection differ by less than that (6,062 against 6,061 km² for the dry forests). "In a zone" is 504, but 3 records lie where two pieces overlap (g4) and are counted in both, so 501 records are in a zone and 90 in the gaps the simplified ecoregions leave inside the outline; both engines count a record once per piece that contains it. The chi-square test rejects "records follow area": 77.4 on 6 degrees of freedom, p 1.2 × 10⁻¹⁴.

2. Records by habitat class against the classes' estimated areas, for the whole country. Each record takes its class from `occurrence_habitats`; each class's area is `country_habitats`' estimate:

```sql
-- q: s6-habitat
-- status: ran
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

```text
-- result: s6-habitat · 34 rows · sha256 3494dd1c6e04
habitat_code | name | est_area_km2 | records | record_ratio
1401 | Arable Land | 16108.04 | 236 | 1.21
109 | Forest – Subtropical/tropical moist montane | 13095.13 | 31 | 0.20
106 | Forest – Subtropical/tropical moist lowland | 7108.44 | 128 | 1.49
201 | Savanna - Dry | 3528.48 | 35 | 0.82
105 | Forest – Subtropical/tropical dry | 2236.93 | 42 | 1.55
… 29 more rows
```

Arable land, 31 % of the estimated area, holds 236 of the 619 records (ratio 1.21); 216 of them are red-eyed tree frogs, recorded in 1 km cells that are mostly farmland: the cell's class, not the pond the frog sat in. Moist montane forest, a quarter of the area, holds 31 (0.20), and plantations 2 on 2,107 km² (0.08). The highest ratios belong to small classes at the coast: Marine Neritic, the sea over the continental shelf, has 59 records on 514 km² (9.50), and its coral reefs 7 on 29 km² (20.01). The 1:50m outline takes in some coastal water, and a 1 km cell that is mostly sea gets a marine class even when the record was made on the shore; 54 of the 59 lie inside the outline, up to 3.3 km from its edge, and 5 outside it. Such a ratio measures where the map's coastline, the outline and the records' coordinates disagree, not where frogs, sloths and jaguars live. The block also counts the 28 records outside the outline against areas inside it: the exercise fixes that.

**Result:** Costa Rica's 591 records inside the outline are spread unevenly over its ecoregions: the montane forests hold about a seventh of what their area predicts and the lowland forests a little more, and the chi-square test rejects records in proportion to area (77.4, 6 degrees of freedom, p 1.2 × 10⁻¹⁴). PostGIS and GeoPandas count the same records in every zone, with areas within 1 km². The jaguar's records sit almost only in the dry forests and the Pacific mangroves, 7.29 and 7.41 times its share. By habitat class, arable land holds 1.21 times its share of the records and the coastal marine classes 9.50 and 20.01. All of these are ratios of recording: they say where people recorded, and where one collar study worked, not which forest a jaguar prefers.

**Exercise:** `s6-habitat` counts every record coded `CR`, including the 28 outside the outline, against areas inside it. Compare like with like: keep only the records inside the outline, as `s6-zones` does, and normalize the jaguar for effort by habitat class, as `s6-zones` does by ecoregion. For each class with a record: its records, the jaguar's records, the number of datasets the jaguar's records come from, and the jaguar's effort-normalized ratio. In which classes is the jaguar recorded, and by how many studies?

**Answer:**

```sql
-- q: s6-ex
-- status: ran
-- engine: postgis
WITH country AS (
  SELECT geom FROM country_shapes WHERE country_code = 'CR'
), records AS (
  SELECT oh.habitat_code, o.dataset_key,
         o.species_id = (SELECT id FROM species WHERE scientific_name = 'Panthera onca') AS jaguar
  FROM occurrences AS o
  JOIN country ON ST_Contains(country.geom, o.geom)
  JOIN occurrence_habitats AS oh ON oh.occurrence_id = o.id
  WHERE o.country_code = 'CR'
), per_class AS (
  SELECT habitat_code, count(*) AS records,
         count(*) FILTER (WHERE jaguar) AS jaguar,
         count(DISTINCT dataset_key) FILTER (WHERE jaguar) AS jaguar_datasets
  FROM records
  GROUP BY habitat_code
)
SELECT p.habitat_code, hc.name, p.records, p.jaguar, p.jaguar_datasets,
       round((p.jaguar::numeric / p.records) / (sum(p.jaguar) OVER () / sum(p.records) OVER ()), 2) AS jaguar_ratio
FROM per_class AS p
JOIN habitat_classes AS hc ON hc.code = p.habitat_code
ORDER BY p.jaguar DESC, p.records DESC, p.habitat_code;
```

```text
-- result: s6-ex · 14 rows · sha256 fb2d0c58861d
habitat_code | name | records | jaguar | jaguar_datasets | jaguar_ratio
105 | Forest – Subtropical/tropical dry | 42 | 42 | 1 | 6.29
201 | Savanna - Dry | 35 | 35 | 1 | 6.29
900 | Marine Neritic | 54 | 12 | 1 | 1.40
1401 | Arable Land | 236 | 5 | 1 | 0.13
106 | Forest – Subtropical/tropical moist lowland | 108 | 0 | 0 | 0.00
… 9 more rows
```

**Check:** The outline drops 28 records: Marine Neritic goes from 59 to 54, its coral reefs from 7 to 4, and moist lowland forest from 128 to 108. The jaguar's 94 records are all inside the outline and fall in four classes. Every record in dry forest (42) and in dry savanna (35) is a jaguar, 6.29 times its share of 94 in 591; it has 12 of the 54 in Marine Neritic (1.40) and 5 of the 236 on arable land (0.13), and none anywhere else. `jaguar_datasets` is 1 in each: all 94 come from the Jaguar Movement Database, GPS collars worn by jaguars tracked in the dry north-west (s1). Normalizing for effort removes the other species' recording, not the collar study's: a ratio of one species from one study says where the collared animals walked, in a habitat map's classes at 1 km, not which habitat jaguars prefer. `count(DISTINCT dataset_key) FILTER (WHERE jaguar)` counts the datasets of one kind of row inside a group, as s5's exercise counted rows.

**Dialects:**
- **PostgreSQL:** `round(x, 2)` needs a `numeric` (there is no `round(double precision, integer)`), hence the casts. An integer divided by an integer is an integer, so `jaguar / records` would be 0 everywhere: `jaguar::numeric` makes it a fraction. `ST_Area(geom::geography)` measures on the ellipsoid; `ST_Area(geom)` on a 4326 geometry gives square degrees, which shrink towards the poles.
- **DuckDB:** the `spatial` extension (not in this course's browser) has `ST_Intersection`, `ST_Intersects` and `ST_Contains`, and `ST_Area_Spheroid` for the area on WGS 84's ellipsoid, latitude first (g1). `/` divides in floating point, so no cast is needed. It has no chi-square function; compute the statistic in SQL and the p-value in Python.
- **SQL Server:** the `geography` type has `STIntersection`, `STContains` and `STArea()` (in m²); a polygon must be valid and wound with its interior on the left (`MakeValid()` and `ReorientObject()` fix the two most common refusals). Integer division as in PostgreSQL: `CAST(jaguar AS decimal(10, 4)) / records`. No statistical distribution functions: the p-value comes from Python.
- **GeoPandas:** `gpd.overlay(…, how="intersection")` cuts one layer by another (`keep_geom_type=True` drops the lines and points an intersection can leave); `gpd.sjoin(points, polygons, predicate="within")` returns one row per point and polygon that match, so a point in two overlapping polygons appears twice, as in SQL. `to_crs(6933)` projects for areas; `scipy.stats.chisquare(observed, expected)` needs both to sum to the same total.
- **ArcGIS Pro:** Pairwise Intersect (`arcpy.analysis.PairwiseIntersect`) cuts the ecoregions to the outline. Summarize Within (`arcpy.analysis.SummarizeWithin`) is the zonal count of points: Input Polygons the pieces; Input Summary Features the records inside the outline; Keep all input polygons checked (the `LEFT JOIN`); Add shape summary attributes checked; Group Field the species, which writes a table of each species' count in each zone, the inputs of the effort-normalized ratio. Calculate Geometry Attributes with Area (geodesic) in square kilometres gives `ST_Area` on geography's answer. For a raster in zones, Spatial Analyst's Tabulate Area (`arcpy.sa.TabulateArea`) gives each class's area in each zone (g7's method 1), and Zonal Statistics as Table (`arcpy.sa.ZonalStatisticsAsTable`) the mean, sum or majority of a value raster. Pro has no goodness-of-fit tool; run `scipy.stats.chisquare` on the table in Pro's Python window (Pro's environment includes SciPy).

### 5.5 ETL

Five modules, ten hours, in Python (§3.3) and your own PostGIS (§3.2). Build mission L4 (§9) wrote them in full from their outlines, in §5.3's form. The track builds one pipeline, the one that made this course's sample (§4.2, §A.1): ask GBIF for a download (e1), load it typed and checked in one transaction (e2), make re-running it safe (e3), check it and credit its sources (e4), and run it on a schedule (e5). The code is the spike's (`SP/etl/`), cut down to what each lesson needs. Every block that can run without a GBIF account runs here, on the lab tables and the published lab files; the blocks write only TEMP tables or roll back, so `learn_curriculum` stays as the loader left it.

#### e1 · extract

**Tool:** Py · **Time:** 2.0 h · **Prereqs:** f2

**Concept:** get every open record of a species from GBIF as a file you can cite, with a client that survives the failures a long download meets.
- **Two ways in.** The **search API** (`/v1/occurrence/search`) answers at once, in pages of at most 300 records, and stops at an offset of 100,000. It suits a count or a quick look. A result assembled from pages has no DOI, and the data under it changes daily, so nobody can fetch exactly your records again. The **download API** is **asynchronous**: you POST a query (a *predicate*) with your GBIF account, GBIF runs it as a job, and you ask for its status until it is ready. The result is one zip of every matching record, with a **DOI** that cites exactly that file; GBIF keeps a download that has been cited and deletes an uncited one after six months.
- **Transient failures.** Some failures pass on their own: a **429** ("too many requests": you asked too fast), a **5xx** (the server's own error), a connection that drops. Others don't: a 404 (no such file) or a 403 (not allowed) gives the same answer on every try. A client paces its requests (critwire's rule: at most 2 a second) and retries only the transient ones, waiting longer each time (**exponential backoff**: 1, 2, 4, then 8 s here). A server can say how long to wait with a **`Retry-After`** header, a number of seconds or a date; a client honours it, up to a cap of its own, rather than its backoff. Many clients add a random part to each wait (*jitter*) so that clients that failed together don't retry together; this course's waits are fixed so that its tests repeat.
- **Retry the whole file.** A connection can drop halfway through a file, long after the response opened with a `200`. A retry wrapped around opening the response never sees that, and Python's `urllib` hands back a cut body without an error, so the client compares the bytes it got with the `Content-Length` the server announced. Each attempt starts a fresh `.part` file from its first byte, hashed as it arrives (**sha256**, a 64-hex-digit fingerprint that changes if one byte does), and a file gets its real name only once it is complete and its size and checksum match what the publisher says.
- **Never POST twice.** A POST that times out may still have made a download. The client saves its request (an **intent file**) before the POST and the download key GBIF returns after it. A run that finds an intent with a key resumes that download. One that finds an intent without a key doesn't POST again: it lists the account's downloads and adopts the one with the same request created since the intent was saved; if there is none yet, or several, it stops and leaves the choice to a person. Saving what you asked for and comparing it with what exists, before acting, is **reconciling**.
- **A polling deadline.** A job can stall. The client asks at most once a minute and gives up after a deadline; a later run resumes the same download from the intent file.
- **Pin the taxonomy.** A query names taxa by key, and a key means something only in one checklist. GBIF's download documentation says: "If no `checklistKey` is supplied the obsolete GBIF Backbone Taxonomy will be used." Today that default is the checklist critwire's `ids.gbif` come from, but GBIF calls it obsolete, and the search API's default has already moved to the Catalogue of Life. A pipeline that leans on a default its provider has said will change can start matching other taxa with no error, so the request names `checklistKey` at the top level and on `TAXON_KEY`, and the client checks that GBIF's stored request echoes both (§4.2).

**Worked example:** the request, built from `species.gbif_id` (73 keys) in the lab database. For the Tasmanian devil alone, `TAXON_KEY` would hold one key, `2435451`.

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

`build_request` is a pure function of the keys and the account: the same keys give the same request, byte for byte, which is what lets a later run compare its request with a saved one. The filters are §4.2's: open licences only (CC0 1.0 and CC BY 4.0), a coordinate with no geospatial issue, the record marked present, and every basis of record except living and fossil specimens. Apart from `creator` and `sendNotification`, it equals, as JSON, the request GBIF stored for the course's own download.

**Lab:**
1. The download function. `fetch_file` retries the whole file: each attempt writes a fresh `.part`, a transient failure deletes it and waits, a cut body counts as a dropped connection, and only a complete file that matches the publisher's size and sha256 is renamed. The block prints nothing; the blocks after it run it first.

```python
# q: e1-fetch
# status: ran
import hashlib
import http.client
import os
import time
import urllib.error
import urllib.request

WAITS = [1, 2, 4, 8]  # seconds before attempts 2 to 5
RETRY_AFTER_CAP = 60  # the longest wait a server's Retry-After can ask for here


def transient(error):
    """Worth another try: a rate limit (429), a server error (5xx), a dropped or cut connection. A 404 or 403 is not."""
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or error.code >= 500
    return isinstance(error, (urllib.error.URLError, ConnectionError, TimeoutError, http.client.HTTPException))


def wait_for(error, attempt):
    """Seconds to wait before the next attempt: the server's Retry-After, in seconds and up to the cap, else the backoff."""
    value = error.headers.get("Retry-After", "") if isinstance(error, urllib.error.HTTPError) else ""
    return min(int(value), RETRY_AFTER_CAP) if value.isdigit() else WAITS[attempt]


def describe(error):
    if isinstance(error, urllib.error.HTTPError):
        value = error.headers.get("Retry-After")
        return f"HTTP {error.code}" + (f", Retry-After {value}" if value else "")
    return str(error)


def fetch_file(url, path, size=None, sha256=None, log=lambda attempt, what: None):
    """Download url to path, whole. Each attempt writes a fresh path.part from its first byte, hashing as it arrives; a
    transient failure deletes the .part and starts the file again. Only a complete file whose size and sha256 equal
    what the publisher says (when given) gets its real name. Returns (bytes, sha256 hex)."""
    part = path + ".part"
    for attempt in range(len(WAITS) + 1):
        try:
            digest, got = hashlib.sha256(), 0
            with urllib.request.urlopen(url, timeout=60) as r, open(part, "wb") as f:
                declared = r.headers.get("Content-Length")
                for chunk in iter(lambda: r.read(1 << 20), b""):
                    digest.update(chunk)
                    got += len(chunk)
                    f.write(chunk)
            if declared is not None and got != int(declared):  # urllib returns a cut body without an error
                raise ConnectionError(f"body cut at {got} of {declared} bytes")
        except Exception as e:
            if os.path.exists(part):
                os.remove(part)
            if isinstance(e, urllib.error.HTTPError):
                e.close()
            if not transient(e) or attempt == len(WAITS):
                raise
            wait = wait_for(e, attempt)
            log(attempt + 1, f"{describe(e)}; again in {wait} s")
            time.sleep(wait)
            continue
        if (size is not None and got != size) or (sha256 is not None and digest.hexdigest() != sha256):
            os.remove(part)  # complete but not the publisher's file: retrying would fetch it again
            raise ValueError(f"{path}: {got} bytes, sha256 {digest.hexdigest()[:12]}; the publisher says "
                             f"{size}, {(sha256 or '?')[:12]}")
        os.replace(part, path)
        log(attempt + 1, f"{got} bytes")
        return got, digest.hexdigest()
```

```text
-- result: e1-fetch · python · sha256 e3b0c44298fc
```

2. A server that fails on purpose. A small web server on your own machine (`127.0.0.1`, a port the system picks) answers three requests from a script: the first is cut after 40,000 of its 102,400 bytes, the second is a 429 with `Retry-After: 1`, the third is the file.

```python
# q: e1-retry
# status: ran
# after: e1-fetch
import http.server
import threading

BODY = bytes(range(256)) * 400  # 102,400 bytes of made-up data
SCRIPT = ["cut", "429", "whole"]  # what the server does with each request, in order


class Flaky(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        step = SCRIPT.pop(0)
        if step == "429":
            self.send_response(429)
            self.send_header("Retry-After", "1")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Length", str(len(BODY)))
        self.end_headers()
        self.wfile.write(BODY if step == "whole" else BODY[:40_000])  # "cut": the connection closes 40,000 bytes in

    def log_message(self, *args):
        pass  # no request log on stderr


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Flaky)  # port 0: the system picks a free one
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    url = f"http://127.0.0.1:{server.server_port}/flaky.bin"
    got, digest = fetch_file(url, "flaky.bin", len(BODY), hashlib.sha256(BODY).hexdigest(),
                             log=lambda attempt, what: print(f"attempt {attempt}: {what}"))
finally:
    server.shutdown()
    server.server_close()
print(f"flaky.bin: {got} bytes, sha256 {digest[:12]}; .part left: {os.path.exists('flaky.bin.part')}")
```

```text
-- result: e1-retry · python · sha256 02500c87f7e2
attempt 1: body cut at 40000 of 102400 bytes; again in 1 s
attempt 2: HTTP 429, Retry-After 1; again in 1 s
attempt 3: 102400 bytes
flaky.bin: 102400 bytes, sha256 27783e87963a; .part left: False
```

The cut body is caught by its length and retried from byte 0 after the backoff's first wait; the 429 waits the second its `Retry-After` asks for, not the 2 s the backoff would; the third attempt gets the whole file, and no `.part` is left behind.

3. Files with checksums, on the published lab files: the manifest first (§4.5), then each file, kept only if its size and sha256 equal the manifest's. The block reads `LEARN_BASE` (default `https://critwire.com`); the course's tests point it at their own build.

```python
# q: e1-checksum
# status: ran
# after: e1-fetch
import json
import os

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")

fetch_file(f"{BASE}/learn/data/manifest.json", "manifest.json")
with open("manifest.json") as f:
    manifest = json.load(f)
for name in ["occurrences.parquet", "datasets.csv"]:
    expected = manifest["files"][name]
    got, digest = fetch_file(f"{BASE}/learn/data/{name}", name, expected["bytes"], expected["sha256"])
    print(f"{name}: {got} bytes, sha256 {digest[:12]} = manifest, {expected['rows']} rows")
```

```text
-- result: e1-checksum · python · sha256 cc6aa287e5bb
occurrences.parquet: 454202 bytes, sha256 35ca89f9bee3 = manifest, 40395 rows
datasets.csv: 72797 bytes, sha256 3bd8c1726239 = manifest, 400 rows
```

A file that doesn't match is deleted and the block stops, naming both checksums. A mismatch isn't retried: the server sent a whole file, just not the one the manifest describes, and it would send it again.

4. The reconcile rule, on six made-up situations. `decide` runs before any POST and returns what the run does: post, resume a saved key, list the account's downloads and decide again, adopt one, or refuse.

```python
# q: e1-decide
# status: ran
from datetime import datetime, timedelta

SKEW = timedelta(minutes=5)  # a download listed a little before the intent may still be its POST's: clocks differ


def same(a, b):
    """The same download request: what GBIF runs, not who asked."""
    return all(a.get(k) == b.get(k) for k in ("format", "checklistKey", "predicate"))


def decide(intent, request, listing=None):
    """Which download this run uses, before any POST. intent: what the last run saved just before its POST
    ({"request", "started", "key"}), or None. listing: the user's downloads, once asked for. Returns ("post",),
    ("resume", key), ("list",) (list the downloads, then decide again), ("adopt", key) or ("refuse", why)."""
    if intent is None:
        return ("post",)
    if not same(intent["request"], request):
        return ("refuse", "the intent is for another request: finish its download or delete the intent first")
    if intent["key"] is not None:
        return ("resume", intent["key"])
    if listing is None:
        return ("list",)
    since = datetime.fromisoformat(intent["started"]) - SKEW
    keys = [d["key"] for d in listing
            if datetime.fromisoformat(d["created"]) >= since and same(d["request"], intent["request"])]
    if len(keys) == 1:
        return ("adopt", keys[0])
    if keys:
        return ("refuse", f"{len(keys)} downloads match the POST: a person picks one")
    return ("refuse", "the POST may have made a download GBIF doesn't list yet: run again later")


# Six made-up situations; "devil" stands in for e1-request's request, "other" for a changed one.
devil = {"format": "SIMPLE_CSV", "checklistKey": "d7dddbf4", "predicate": {"type": "equals", "key": "TAXON_KEY", "value": "2435451"}}
other = {**devil, "predicate": {"type": "equals", "key": "TAXON_KEY", "value": "2440897"}}
unsaved = {"request": devil, "started": "2026-10-23T09:00:00+00:00", "key": None}  # POSTed; the key never saved
cases = {
    "first run": (None, None),
    "key saved": ({**unsaved, "key": "0041824-260928105237408"}, None),
    "key lost, GBIF lists one": (unsaved, [
        {"key": "0041819-260928105237408", "created": "2026-10-23T08:40:00+00:00", "request": devil},  # older: not ours
        {"key": "0041824-260928105237408", "created": "2026-10-23T09:00:02+00:00", "request": devil},
        {"key": "0041830-260928105237408", "created": "2026-10-23T09:03:00+00:00", "request": other},  # another request
    ]),
    "key lost, GBIF lists none": (unsaved, []),
    "key lost, GBIF lists two": (unsaved, [
        {"key": "0041824-260928105237408", "created": "2026-10-23T09:00:02+00:00", "request": devil},
        {"key": "0041825-260928105237408", "created": "2026-10-23T09:00:05+00:00", "request": devil},
    ]),
    "request changed": (unsaved, None),
}
for name, (intent, listing) in cases.items():
    request = other if name == "request changed" else devil
    step = decide(intent, request)
    steps = [step]
    if step == ("list",):
        steps.append(decide(intent, request, listing))
    print(f"{name}: " + ", then ".join(": ".join(s) for s in steps))
```

```text
-- result: e1-decide · python · sha256 35daf375ebbe
first run: post
key saved: resume: 0041824-260928105237408
key lost, GBIF lists one: list, then adopt: 0041824-260928105237408
key lost, GBIF lists none: list, then refuse: the POST may have made a download GBIF doesn't list yet: run again later
key lost, GBIF lists two: list, then refuse: 2 downloads match the POST: a person picks one
request changed: refuse: the intent is for another request: finish its download or delete the intent first
```

A run posts only when no intent exists. A download made 20 minutes before the intent isn't adopted (another run's), nor is one of another request. When two downloads match, both may be this run's or one may be another client's; picking one is a person's call, so the run stops.

5. The whole client: submit, wait, fetch. It needs your account in `GBIF_USERNAME` and `GBIF_PASSWORD` and makes a real download each time it posts, so the tests don't run it and `e1.py` carries it commented out. The intent file is saved before the POST and again with the key, or with the key it adopts, before any wait; a POST GBIF refuses (a 4xx) made nothing, so its intent is deleted; a 5xx or a dropped connection keeps it for the next run to reconcile. GETs retry as `fetch_file` does; the POST never retries.

```python
# q: e1-submit
# status: untested: makes a real GBIF download with your account; the course's sample was made with the same steps
# after: py-connect, e1-request, e1-fetch, e1-decide
import base64
from datetime import timezone

API = "https://api.gbif.org/v1"
USER, PASSWORD = os.environ["GBIF_USERNAME"], os.environ["GBIF_PASSWORD"]  # from the environment, never in the code
AUTH = "Basic " + base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
INTENT = "download-intent.json"  # what this run asked for, saved before its POST
DEADLINE_S = 6 * 3600  # stop asking after 6 hours; a run started later resumes the same download
_last = 0.0


def call(method, url, body=None, auth=False):
    """One request, at most 2 a second. A GET retries what is transient, as fetch_file does; a POST never retries,
    because a second POST is a second download."""
    global _last
    headers = {"Accept": "application/json, text/plain"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if auth:
        headers["Authorization"] = AUTH
    retries = len(WAITS) if method == "GET" else 0
    for attempt in range(retries + 1):
        time.sleep(max(0.0, _last + 0.5 - time.monotonic()))
        _last = time.monotonic()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data, headers, method=method), timeout=60) as r:
                return r.read()
        except Exception as e:
            if not transient(e) or attempt == retries:
                raise
            time.sleep(wait_for(e, attempt))


def save(intent):
    """Write the intent whole: a .part first, then the rename, so a killed run never leaves half a file."""
    with open(INTENT + ".part", "w") as f:
        json.dump(intent, f)
    os.replace(INTENT + ".part", INTENT)


request = build_request(keys, USER)
intent = None
if os.path.exists(INTENT):
    with open(INTENT) as f:
        intent = json.load(f)
step = decide(intent, request)
if step == ("list",):  # a run POSTed and stopped before saving the key: find its download, never POST again
    listed = json.loads(call("GET", f"{API}/occurrence/download/user/{USER}?limit=50", auth=True))["results"]
    step = decide(intent, request, [{"key": d["key"], "created": d["created"], "request": d["request"]} for d in listed])
if step[0] == "refuse":
    raise SystemExit(f"{INTENT}: {step[1]}")
if step == ("post",):
    intent = {"request": request, "started": datetime.now(timezone.utc).isoformat(), "key": None}
    save(intent)  # before the POST: a run killed during it leaves the trace the next run reconciles
    try:
        key = call("POST", f"{API}/occurrence/download/request", request, auth=True).decode()
    except urllib.error.HTTPError as e:
        if e.code < 500:  # GBIF answered no (a bad request, a wrong password, too many downloads): nothing was made
            os.remove(INTENT)
        raise  # a 5xx or a dropped connection may have made one: the intent stays, and the next run lists
    save({**intent, "key": key})
else:
    key = step[1]
    if step[0] == "adopt":  # saved before polling: a run stopped while waiting resumes this key, never lists again
        save({**intent, "key": key})
print("download key:", key)

deadline = time.monotonic() + DEADLINE_S
while True:  # a job, not a response: ask at most once a minute, and not forever
    meta = json.loads(call("GET", f"{API}/occurrence/download/{key}"))
    if meta["status"] == "SUCCEEDED":
        break
    if meta["status"] in ("KILLED", "FAILED", "CANCELLED"):
        raise SystemExit(f"download {key} ended {meta['status']}; delete {INTENT} to ask again")
    if time.monotonic() > deadline:
        raise SystemExit(f"download {key} is still {meta['status']} after {DEADLINE_S // 3600} h; "
                         f"run again later: {INTENT} resumes it")
    time.sleep(60)
stored = meta["request"]
if stored["checklistKey"] != BACKBONE or stored["predicate"]["predicates"][0]["checklistKey"] != BACKBONE:
    raise SystemExit("GBIF didn't keep the pinned taxonomy")  # the echo check: what ran is what was asked
print("DOI:", meta["doi"], "records:", meta["totalRecords"], "bytes:", meta["size"])

got, digest = fetch_file(meta["downloadLink"], f"{key}.zip", size=meta["size"])
print("zip sha256:", digest)  # keep it with the DOI: it is how a later run knows it has the same file
```

**Result:** the request holds critwire's 73 GBIF keys and the six filters of §4.2, with the legacy checklist pinned twice. Submitted, the course's download was ready after 16 min 41 s: a 34,725,756-byte zip of 394,532 records from 454 datasets, DOI `10.15468/dl.fbpk9w`, and GBIF's stored request echoed both checklist keys (§A.1). The client retries a whole file, honours `Retry-After`, keeps only files whose size and sha256 match the publisher's, and never posts while a download it may have made could exist. Both lab files match the manifest.

**Exercise:** `wait_for` reads `Retry-After` only as a number of seconds, but HTTP also lets a server send a date ([RFC 9110, section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3)), and a server can ask for a wait no client should accept. Write `retry_after(value, now)`: the seconds either form asks for, never below 0 or above `RETRY_AFTER_CAP`, and `None` for a value that is neither (the backoff applies then). Put it into `wait_for` and show what the client does, at 12:00:00 UTC on 29 October 2026, with a 429 and `Retry-After: 1`; a 503 with a date 30 s later; a 503 with a date an hour earlier; a 503 with `3600`; a 503 with `soon`; and a 404.

**Answer:**

```python
# q: e1-ex
# status: ran
# after: e1-fetch
import email.message
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def retry_after(value, now):
    """Seconds a Retry-After asks for, as a number of seconds or as an HTTP date, kept between 0 and the cap;
    None when it is neither."""
    if value.isdigit():
        seconds = int(value)
    else:
        try:
            when = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None
        seconds = (when - now).total_seconds()
    return int(min(max(seconds, 0), RETRY_AFTER_CAP))


def wait_for(error, attempt, now=None):
    """e1-fetch's rule with both forms: the server's wait when it gives one that can be read, else the backoff."""
    value = error.headers.get("Retry-After") if isinstance(error, urllib.error.HTTPError) else None
    seconds = retry_after(value, now or datetime.now(timezone.utc)) if value else None
    return WAITS[attempt] if seconds is None else seconds


NOW = datetime(2026, 10, 29, 12, 0, 0, tzinfo=timezone.utc)
for code, value in [(429, "1"), (503, "Thu, 29 Oct 2026 12:00:30 GMT"), (503, "Thu, 29 Oct 2026 11:00:00 GMT"),
                    (503, "3600"), (503, "soon"), (404, None)]:
    headers = email.message.Message()
    if value is not None:
        headers["Retry-After"] = value
    error = urllib.error.HTTPError("https://example.org/file", code, "", headers, None)
    shown = f"HTTP {code}" + (f", Retry-After {value!r}" if value else "")
    print(f"{shown}: " + (f"again in {wait_for(error, 0, NOW)} s" if transient(error) else "not retried"))
```

```text
-- result: e1-ex · python · sha256 b7f9b6d2f5dd
HTTP 429, Retry-After '1': again in 1 s
HTTP 503, Retry-After 'Thu, 29 Oct 2026 12:00:30 GMT': again in 30 s
HTTP 503, Retry-After 'Thu, 29 Oct 2026 11:00:00 GMT': again in 0 s
HTTP 503, Retry-After '3600': again in 60 s
HTTP 503, Retry-After 'soon': again in 1 s
HTTP 404: not retried
```

**Check:** The date 30 s ahead gives 30 s; the date in the past gives 0, not a negative wait; `3600` is cut to the 60 s cap; `soon` can't be read, so the backoff's first wait, 1 s, applies; the 404 isn't retried at all, whatever its headers say. `parsedate_to_datetime`, from the standard library's `email.utils`, reads HTTP's date form; redefining `wait_for` after `e1-fetch` is enough, because `fetch_file` looks the name up each time it calls it. Python compares its answer with `now` only because both carry a time zone: an HTTP date is always GMT, so the function returns it as UTC, and a naive `now` would raise a `TypeError`.

**Dialects:**
- **requests and urllib3:** `requests` with urllib3's `Retry` (`total`, `backoff_factor`, `status_forcelist=[429, 500, 502, 503, 504]`, `respect_retry_after_header=True`, mounted with an `HTTPAdapter`) retries the request and its opening; a body cut while you stream it with `iter_content` still raises in your own loop, so the whole-file retry and the length check stay yours. `allowed_methods` leaves POST out by default, for the reason above.
- **pygbif:** `occ.download(…)` posts a download, `occ.download_meta(key)` reads its status, `occ.download_get(key)` fetches the zip. It saves no intent: the key it returns is yours to keep before anything else can fail.
- **R:** rgbif's `occ_download(pred_in("taxonKey", keys), …)`, `occ_download_wait(key)` and `occ_download_get(key)`, then `occ_download_import()` to read it.
- **curl:** `curl --fail --retry 4 -o file.part URL` retries timeouts and the transient HTTP codes (408, 429, 500, 502, 503, 504), doubling a 1 s wait and honouring `Retry-After`; `curl -C - …` resumes a partial file instead of starting it again, which is safe only when you check the finished file's checksum.
- **ArcGIS Pro:** Pro has no tool for GBIF's download API. The download client uses only Python's standard library, so it runs as written in Pro's Python window or a Pro notebook. XY Table To Point (`arcpy.management.XYTableToPoint`, X Field `decimalLongitude`, Y Field `decimalLatitude`, Coordinate System WGS 1984) turns the download's table into points.

#### e2 · transform-load

**Tool:** Py + PG · **Time:** 2.5 h · **Prereqs:** e1, d4

**Concept:** load a delivered file into typed, checked tables, all or nothing, and when the load refuses, say which record broke it and why. The pattern has three parts:
- **Staging:** a table with one `text` column per column of the file, loaded exactly as delivered. No value can fail a type here, so the type errors come later, from SQL queries that can name their rows. The file itself can still fail: a record with a field too many, a NUL byte (the zero byte, which a PostgreSQL text value can't hold), or bytes that aren't valid UTF-8 stop `COPY`, and its error gives the line.
- **`COPY`**, not row-by-row `INSERT`: PostgreSQL reads the file as one stream. The spike staged GBIF's 394,532 rows in 6.7 s and finished the whole load, types and checks included, in 14.2 s. psycopg's `cursor.copy` streams from Python, so a zip member goes in without being extracted. A `COPY` keeps all its rows or none: one bad line refuses the lines before it too.
- **Typed tables, filled from staging with SQL:** casts, constraints, the geometry (a generated column, so it can't disagree with the coordinates), and the species rule. Then the checks. All of it runs in one transaction, so a failed check leaves the tables as they were before the run (d4).
- **Check before you cast.** A cast that fails stops the statement at its first bad value, and its message gives the value but neither the record nor the column. `pg_input_is_valid(value, type)` (PostgreSQL 16) answers whether a value would cast, without raising an error, so one query can list every bad value with its record's key and column before the typed insert runs; `pg_input_error_info` gives the message the cast would have raised.

**Diagram:** `e2-load`, after the Concept's list: the file → stage as text with `COPY` → check before you cast (`pg_input_is_valid`) → insert typed (casts, constraints, the geometry, the species rule) → the checks → one COMMIT. If `COPY` refuses the file, a value won't cast, a constraint fails or a check's count isn't 0, everything rolls back, and the error names the file's line, or the record, column and value, or the constraint or check.

**`COPY`'s default format is wrong for files you didn't write.** GBIF's `SIMPLE_CSV` is tab-separated and never quotes a field. Read with `FORMAT text`, `COPY`'s default, a backslash starts an escape: `\n` becomes a line break, other backslashes vanish, `\N` becomes NULL, and an empty field stays an empty string. Nothing raises an error. CSV mode with a tab delimiter and a quote character that never occurs (`\b`, backspace) reads every byte as data and an empty field as NULL. On the real download, text format silently changed 9 rows, while this form kept all 97 rows holding a `\` or a `"` byte for byte (§A.1). The same rule applies to the lab loader (§4.3): never use text format on data you didn't write.

**Synonyms.** Four of critwire's GBIF keys are synonyms in GBIF's checklist (Blanding's turtle, Baird's tapir, Temminck's and giant pangolins). GBIF files their records under the accepted species' `speciesKey` and keeps the key you asked for in `taxonKey`, so joining on `speciesKey` alone loses them: 2,385 records in the spike. The rule is the species whose key is the record's `speciesKey`, else its `taxonKey`; a record that matches no species, or two different ones, fails the load (§4.2).

**Licences.** The typed insert below renames the two licence codes this file uses, and nothing more. That is an illustration, not the lab sample's licence rule: the sample keeps a record only if its *effective* licence, the more restrictive of the record's own and its dataset's, is CC0 1.0 or CC BY 4.0 (§4.2), which needs each dataset's licence as well (e4).

**Data:** three made-up records in GBIF's format (a few of its 50 columns), which the first block holds; `species` (the GBIF keys); `occurrences` for the GeoPandas round trip.

**Worked example:** the file and the staging step. The `COPY` statement is the spike's, character for character (`SP/etl/gbif_load.py`). The block prints nothing; the blocks after it run it first.

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


def gbif_file(rows):
    """Records in GBIF's SIMPLE_CSV form: a header line, tab-separated, no quoting, an empty field for "no value"."""
    return ("\n".join("\t".join(row) for row in [HEADER, *rows]) + "\n").encode()


GBIF_FILE = gbif_file(ROWS)  # three made-up records

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

CSV mode keeps all three records as sent. Text format changes all three, and says nothing: the backslash in `Cradle Mountain\Dove Lake track` disappears, `Pafuri\north bank` gains a line break, the empty `recordedBy` becomes an empty string instead of NULL, and the recorder `\N` becomes NULL.

**Lab:**
1. Files that break `COPY`. Staging takes any value, but not any file: each of three copies of the file has one record damaged in a way a real delivery can be, and each `COPY` runs in a savepoint (a point inside the transaction that a failure rolls back to), so the next one can try.

```python
# q: e2-copy-fails
# status: ran
# after: py-connect, e2-file
import re

import psycopg

# Three ways a delivered file breaks COPY itself, before any type is involved: each damages one record of GBIF_FILE.
BROKEN = [
    ("a tab inside a field", GBIF_FILE.replace(b"Sirena station", b"Sirena\tstation")),
    ("a NUL byte", GBIF_FILE.replace(b"Pafuri", b"Paf\x00uri")),
    ("Latin-1, not UTF-8", GBIF_FILE.replace('A. "Sam" Lee'.encode(), 'A. "Sam" Lée'.encode("latin-1"))),
]

with connect() as conn, conn.cursor() as cur:
    cur.execute(CREATE_STAGING)
    print("file | SQLSTATE | line | error")
    for name, data in BROKEN:
        try:
            with conn.transaction():  # a savepoint: the failed COPY is undone, the table stays
                with cur.copy(COPY_STAGING) as copy:
                    copy.write(data)
        except psycopg.Error as error:
            line = re.search(r"\bline (\d+)", error.diag.context or "")  # COPY's context names the file's line
            print(f"{name} | {error.sqlstate} | {line[1] if line else '?'} | {error.diag.message_primary}")
        else:
            raise SystemExit(f"{name}: COPY accepted it")
    failed = cur.execute("SELECT count(*) FROM gbif_staging").fetchone()[0]
    with cur.copy(COPY_STAGING) as copy:
        copy.write(GBIF_FILE)
    delivered = cur.execute("SELECT count(*) FROM gbif_staging").fetchone()[0]
    conn.rollback()

print(f"rows staged: {failed} after the three failed COPYs, {delivered} from the file as delivered")
```

```text
-- result: e2-copy-fails · python · sha256 6e24b65c626e
file | SQLSTATE | line | error
a tab inside a field | 22P04 | 4 | extra data after last expected column
a NUL byte | 22021 | 3 | invalid byte sequence for encoding "UTF8": 0x00
Latin-1, not UTF-8 | 22021 | 2 | invalid byte sequence for encoding "UTF8": 0xe9 0x65 0x0a
rows staged: 0 after the three failed COPYs, 3 from the file as delivered
```

Each error names the problem and the line: the header is line 1, so line 4 is the tapir's record, whose locality now holds a tab and so one field too many. `22P04` is "bad copy file format"; `22021` is "character not in repertoire", a byte sequence that isn't a character in the connection's encoding (UTF-8 here). The line before each damaged one was fine, yet the staging table is empty after all three: a `COPY` is one statement, and a statement keeps all its rows or none. The fix belongs at the source, or in a step that repairs the bytes before `COPY` and records what it changed; `COPY` has no option that skips a malformed line.

2. Typed, matched to species and checked, in one transaction. A `TEMP` table can't have a foreign key to a lasting table, so here the species rule's `NOT NULL` does that job; in your own schema, declare the key.

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
# The license: this file's two codes renamed, for illustration only. The lab sample keeps a record only if its
# effective license, the more restrictive of its own and its dataset's, is open; that needs the dataset's too.
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

The three records map to the devil, Temminck's pangolin and Baird's tapir, but a join on `speciesKey` alone finds only the devil: the other two are synonyms. Missing values arrive as NULL, and each record has a point in SRID 4326. The license column shows the renaming worked on these three records; it says nothing about whether their datasets allow them to be published.

3. Casts that name their record. Two values a spreadsheet might write, a unit after a number and a decimal comma, staged without complaint; the typed insert's cast would stop at the first.

```python
# q: e2-casts
# status: ran
# after: py-connect, e2-file
import psycopg

# The type each staged column gets in e2-typed's INSERT_TYPED.
CASTS = {"gbifID": "bigint", "datasetKey": "uuid", "decimalLatitude": "float8", "decimalLongitude": "float8",
         "coordinateUncertaintyInMeters": "float8", "year": "integer", "month": "integer", "taxonKey": "bigint",
         "speciesKey": "bigint"}
# Every staged value its cast would refuse, with its record's key and its column: what a failed cast doesn't say.
BAD_VALUES = " UNION ALL ".join(
    f"""SELECT "gbifID", '{column}', "{column}", '{type_}' FROM gbif_staging
        WHERE NOT pg_input_is_valid("{column}", '{type_}')""" for column, type_ in CASTS.items()) + " ORDER BY 1, 2"

rows = [row.copy() for row in ROWS]
rows[0][HEADER.index("coordinateUncertaintyInMeters")] = "30 m"
rows[1][HEADER.index("decimalLatitude")] = "-22,4310"

with connect() as conn, conn.cursor() as cur:
    stage(cur, gbif_file(rows))  # staging takes both: every column is text
    try:
        with conn.transaction():
            cur.execute('SELECT "decimalLatitude"::float8, "coordinateUncertaintyInMeters"::float8 FROM gbif_staging')
    except psycopg.Error as error:
        print(f"the cast alone: {error.sqlstate} {error.diag.message_primary}")
    bad = cur.execute(BAD_VALUES).fetchall()  # run this before INSERT_TYPED; refuse the load if it returns a row
    conn.rollback()

print("gbifID | column | value | type")
for row in bad:
    print(" | ".join(row))
print(f"load refused before INSERT_TYPED: {len(bad)} values in {len({row[0] for row in bad})} of {len(rows)} records")
```

```text
-- result: e2-casts · python · sha256 f015257c3640
the cast alone: 22P02 invalid input syntax for type double precision: "30 m"
gbifID | column | value | type
1000000001 | coordinateUncertaintyInMeters | 30 m | float8
1000000002 | decimalLatitude | -22,4310 | float8
load refused before INSERT_TYPED: 2 values in 2 of 3 records
```

The cast alone reports `"30 m"` and stops: the decimal comma two records later stays hidden until the first is fixed and the load run again, and nothing in the message says which record held `30 m`. The check lists both, keyed by `gbifID`, in one pass. `pg_input_is_valid` returns NULL for a NULL value, so an empty field is never reported as bad; a column that must have a value says so with `NOT NULL`.

4. GeoPandas to and from PostGIS, for work that is easier in Python. `read_postgis` turns a query into a GeoDataFrame, `to_postgis` writes one back as a table (it needs SQLAlchemy and GeoAlchemy2, both in §3.3's environment). SQLAlchemy gets its connections from `connect()`, so it uses the same database, role and search path as every other block, and the write names its schema rather than trusting the search path to pick one. The write stays in the connection's transaction, which the block rolls back.

```python
# q: e2-geopandas
# status: ran
# after: py-connect
import geopandas as gpd
from sqlalchemy import create_engine, text

# SQLAlchemy on py-connect's connection: the same database, role and search path.
engine = create_engine("postgresql+psycopg://", creator=connect)

with engine.connect() as conn:
    devils = gpd.read_postgis(
        text("SELECT o.id, o.year, o.geom FROM learn_curriculum.occurrences AS o "
             "JOIN learn_curriculum.species AS s ON s.id = o.species_id "
             "WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id"),
        conn, geom_col="geom")
    print(f"read: {len(devils)} rows, CRS {devils.crs.to_string()}, geometry {devils.geom_type.iloc[0]}")

    metres = devils.to_crs(3577)  # GDA94 / Australian Albers, an equal-area projection in metres
    metres["geom"] = metres.buffer(1000)  # a 1 km circle around each record
    # The schema named, not left to the search path; the write stays in this connection's transaction.
    metres.to_postgis("devil_buffers", conn, schema="learn_curriculum", if_exists="fail", index=False)
    n, srid, kind, km2 = conn.execute(text(
        "SELECT count(*), min(ST_SRID(geom)), min(GeometryType(geom)), round(sum(ST_Area(geom))::numeric / 1e6, 1) "
        "FROM learn_curriculum.devil_buffers")).one()
    print(f"written: {n} rows, SRID {srid}, {kind}, {km2} km² in all")
    schema = conn.execute(text(
        "SELECT relnamespace::regnamespace::text FROM pg_class "
        "WHERE oid = to_regclass('learn_curriculum.devil_buffers')")).scalar_one()
    assert schema == "learn_curriculum", f"devil_buffers was written to {schema}"
    print(f"devil_buffers is in schema {schema}, until the rollback")
    conn.rollback()  # the lab leaves learn_curriculum as it found it
    left = conn.execute(text("SELECT to_regclass('learn_curriculum.devil_buffers')")).scalar_one()
    print(f"after the rollback: {left or 'no table'}")
```

```text
-- result: e2-geopandas · python · sha256 3d5433163e79
read: 2000 rows, CRS EPSG:4326, geometry Point
written: 2000 rows, SRID 3577, POLYGON, 6273.1 km² in all
devil_buffers is in schema learn_curriculum, until the rollback
after the rollback: no table
```

GeoPandas reads the devil's 2,000 records as points in EPSG:4326 and writes 2,000 one-kilometre buffers in EPSG:3577 (Australian Albers, in metres), 6,273.1 km² together, overlaps counted twice. The catalogue (`pg_class`, whose `relnamespace` is the table's schema) confirms where the table went while the transaction is still open; after the rollback it is gone. The lab role can create tables only in `learn_curriculum`, its own schema, not in `public`, so a write that fell back to the search path's next schema would fail rather than land somewhere unexpected.

**Result:** a delivered file goes into staging exactly as sent, in CSV mode, never text format. A file with a damaged line is refused whole, and the error gives the line and its SQLSTATE. Every value that wouldn't cast is listed with its record's key and its column before the typed insert runs. The typed load matches synonyms through `taxonKey`, and any failed check rolls it all back. GeoPandas writes into the schema it names, and the lab leaves `learn_curriculum` as it found it.

**Exercise:** a cast that succeeds can still break a `CHECK`: `13` is a valid integer but not a month. Write one query that reports every problem in the staging table at once: for `datasetKey` (uuid), `decimalLatitude` and `decimalLongitude` (float8, within −90 to 90 and −180 to 180), `year` and `month` (integer, month within 1 to 12), each value that won't cast, with the message the cast would raise, and each value that casts but falls outside its range. Run it on the three records with month `13` on the first, latitude `-122.4310` on the second, and on the third a `datasetKey` one digit short and year `c. 2015`.

**Answer:**

```python
# q: e2-ex
# status: ran
# after: py-connect, e2-file
# e2-typed's casts and CHECKs, per staged column: its type, and the range a typed value must fall in (None: any).
RULES = [
    ("datasetKey", "uuid", None),
    ("decimalLatitude", "float8", (-90, 90)),
    ("decimalLongitude", "float8", (-180, 180)),
    ("year", "integer", None),
    ("month", "integer", (1, 12)),
]


def problem(column, type_, bounds):
    """A value's problem, or NULL: the cast's own message, else the range it breaks. CASE tests in order,
    so a value is cast only once pg_input_is_valid has said it can be."""
    out_of_range = (f"""WHEN NOT ("{column}"::{type_} BETWEEN {bounds[0]} AND {bounds[1]})
                    THEN 'outside {bounds[0]} to {bounds[1]}'""" if bounds else "")
    return f"""SELECT "gbifID", '{column}' AS column_name, "{column}" AS value,
                      CASE WHEN NOT pg_input_is_valid("{column}", '{type_}')
                           THEN (pg_input_error_info("{column}", '{type_}')).message
                           {out_of_range} END AS problem
               FROM gbif_staging"""


PROBLEMS = ("SELECT * FROM (" + " UNION ALL ".join(problem(*rule) for rule in RULES) + ") AS p "
            "WHERE problem IS NOT NULL ORDER BY 1, 2")

rows = [row.copy() for row in ROWS]
rows[0][HEADER.index("month")] = "13"
rows[1][HEADER.index("decimalLatitude")] = "-122.4310"
rows[2][HEADER.index("datasetKey")] = "00000000-0000-0000-0000-00000000002"
rows[2][HEADER.index("year")] = "c. 2015"

with connect() as conn, conn.cursor() as cur:
    stage(cur, gbif_file(rows))
    problems = cur.execute(PROBLEMS).fetchall()
    conn.rollback()

print("gbifID | column | value | problem")
for row in problems:
    print(" | ".join(row))
print(f"load refused: {len(problems)} problems in {len({row[0] for row in problems})} of {len(rows)} records")
```

```text
-- result: e2-ex · python · sha256 9f02311e2683
gbifID | column | value | problem
1000000001 | month | 13 | outside 1 to 12
1000000002 | decimalLatitude | -122.4310 | outside -90 to 90
1000000003 | datasetKey | 00000000-0000-0000-0000-00000000002 | invalid input syntax for type uuid: "00000000-0000-0000-0000-00000000002"
1000000003 | year | c. 2015 | invalid input syntax for type integer: "c. 2015"
load refused: 4 problems in 3 of 3 records
```

**Check:** All four problems appear, though the third record has two: a cast error stops a statement at its first bad value, while this query only asks. The month and the latitude cast fine and fail their ranges; the short `datasetKey` and `c. 2015` fail their casts, with the message PostgreSQL would have raised. The order inside `CASE` matters: SQL may evaluate the parts of a `WHERE … OR …` in any order, so casting in an `OR` beside `pg_input_is_valid` could still raise; a `CASE` tests its branches in order, so the cast runs only on values that can take it.

**Dialects:**
- **PostgreSQL:** psql's `\copy gbif_staging FROM 'file.csv' (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '', HEADER true)` sends a file from your machine, where `COPY … FROM 'file'` reads one on the database server. `COPY` reads in the connection's client encoding: `ENCODING 'LATIN1'` reads a file you know is Latin-1, converted to UTF-8 as it loads. PostgreSQL 17 adds `ON_ERROR ignore`, which skips rows whose values don't fit the column types; a malformed line still stops the `COPY`, and into an all-text staging table no value can fail its type anyway.
- **DuckDB:** `read_csv('file.csv', delim = '\t', quote = '', all_varchar = true)` is the staging read; `store_rejects = true` records each line it can't read in the `reject_errors` table instead of stopping. `TRY_CAST(x AS DOUBLE)` returns NULL for a value that won't cast, so `WHERE x IS NOT NULL AND TRY_CAST(x AS DOUBLE) IS NULL` is the bad-value check.
- **SQL Server:** `BULK INSERT staging FROM 'file.csv' WITH (FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', CODEPAGE = '65001', FIRSTROW = 2)`, with `ERRORFILE` to keep the lines it rejects. `TRY_CAST` and `TRY_CONVERT` return NULL for a value that won't cast. There is no generated geometry column of this kind: compute `geography::Point(latitude, longitude, 4326)` in the insert.
- **GeoPandas:** `to_postgis(name, con, schema=…, if_exists="fail" | "replace" | "append")`; `"replace"` drops the table first, with its indexes and grants. `read_postgis(sql, con, geom_col=…)` needs the geometry column's name. Both take a SQLAlchemy connection, and `create_engine(…, creator=…)` builds one from any function that returns a DBAPI connection.
- **ArcGIS Pro:** Export Table (`arcpy.conversion.ExportTable`) reads a tab-separated text file into a geodatabase table, guessing each field's type from the file; a `schema.ini` beside the file, in the Microsoft text-driver format, fixes the delimiter and each field's type. XY Table To Point (`arcpy.management.XYTableToPoint`) builds points from the coordinates. Pro writes to PostgreSQL through a database connection file (`.sde`), and Export Features (`arcpy.conversion.ExportFeatures`) copies a layer into it.

#### e3 · idempotent

**Tool:** Py + PG · **Time:** 2.0 h · **Prereqs:** e2

**Concept:** a pipeline you can re-run without fear. An operation is **idempotent** when doing it twice leaves the same result as doing it once. Schedules retry, people re-run a failed job, and two runs overlap, so a load that appends rows doubles them. Three ideas sound alike here, and each answers a different question:
- **Deterministic output:** does the same input give the same rows? "Any 100 records" must be the same 100 every time: `LIMIT` without `ORDER BY`, or `random()` without a seed, is not. The lab sample orders each species' records by the `md5` of their id, then the id (§4.2), which every engine computes the same way. Outputs follow the same rule: rows in key order and stable formats, so the same input gives a byte-identical file and a sha256 proves that nothing changed. A rule like this repeats on the same input; it doesn't promise that a record stays in the sample when the input changes.
- **Idempotent batch application:** does a batch applied twice change the target once? Rows carry their source's key (GBIF's `gbifID`) and go in with `ON CONFLICT` (d4), and a ledger of applied batches, keyed by each batch's checksum, skips a batch it has seen. That is right for batches that never change and add up, like each day's new records.
- **The target holds snapshot X:** is what the target holds now what this run would produce? A snapshot is the whole dataset as of one moment, and a refresh replaces the target's rows with it. The answer is a **job key**: one checksum over everything that shapes the rows: the input's checksum, the transform's version, the config and the target's schema version. A state table keeps the key, and it changes in the same transaction as the rows, so the key never describes other rows. An equal key skips; any other key reloads, including a return to an earlier input.

**Versions and config.** Bump `TRANSFORM_VERSION` when the code's output changes, and `SCHEMA_VERSION` when the target's DDL does. The config is what shapes the rows (here the cap and the licenses), never a connection setting: the same rows loaded through another host are the same snapshot. A key without the config would skip a run whose only change is the config.

**Data:** `occurrences`; the browser's copy of the same sample. The Tasmanian devil's 2,000 records are the snapshot the refresh job loads.

**Worked example:** the sample's selection rule, 100 records per species by `md5`, then id, in the browser:

```sql
-- q: e3-pick
-- status: ran
WITH ranked AS (
  SELECT id, species_id,
         row_number() OVER (PARTITION BY species_id ORDER BY md5(CAST(id AS VARCHAR)), id) AS pick
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
         row_number() OVER (PARTITION BY species_id ORDER BY md5(CAST(id AS VARCHAR)), id) AS pick
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

Both engines pick 4,766 records of 71 species (100 each, or all of a species' records when it has fewer), with the same md5 over their ids. The `id` after the hash is a tie-break: two equal hashes are unlikely, but with it the order is total by construction, not by luck.

**Lab:**
1. The batch ledger. A plain append against an idempotent load, run twice each, then once more with a corrected input:

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

The append holds 2,000 rows after one run and 4,000 after two. The idempotent load holds 2,000 after both, with the same md5, because the second run's input has the same checksum and is skipped. The corrected input gets a new run id and loads: still 2,000 rows, one changed, and a new md5. For batches that add up, that is the right rule. For snapshots it is wrong: the ledger remembers every input it has ever seen, so a return to an earlier snapshot is skipped, and it keys on the input alone.

2. The snapshot rule. A refresh job (e5 builds the real one): input A is the devil's 2,000 records as a file of `id,year,license` lines; B is the same file a week later, with one record's year corrected. The transform keeps the config's licenses and the first `cap` records by md5; version 2 of the transform also drops records without a year, and version 2 of the schema adds a `CHECK` on the license, so the job rebuilds the table. Each run reads the state row under a row lock (`FOR UPDATE`) in the transaction that would replace the rows, and compares keys. Beside it, e3-rerun's ledger rule gets the first four inputs.

```python
# q: e3-snapshot
# status: ran
# after: py-connect
import hashlib
import json

from psycopg.types.json import Jsonb

# The target's DDL by SCHEMA_VERSION: version 2 adds a CHECK on the licence.
SCHEMAS = {
    1: "CREATE TEMP TABLE devil_target (id bigint PRIMARY KEY, year integer, license text NOT NULL)",
    2: "CREATE TEMP TABLE devil_target (id bigint PRIMARY KEY, year integer, "
       "license text NOT NULL CHECK (license IN ('CC0 1.0', 'CC BY 4.0')))",
}


def md5_order(row):
    return hashlib.md5(str(row[0]).encode()).hexdigest(), row[0]


def transform_v1(rows, config):
    """The rows the config keeps: records under its licences, the first `cap` by the md5 of their id."""
    return sorted((r for r in rows if r[2] in config["licenses"]), key=md5_order)[:config["cap"]]


def transform_v2(rows, config):
    """Version 2 also drops records without a year."""
    return transform_v1([r for r in rows if r[1] is not None], config)


TRANSFORMS = {1: transform_v1, 2: transform_v2}


def snapshot(rows):
    """A delivered file: one line per record, `id,year,license`, an empty year for none."""
    return "".join(f"{i},{'' if y is None else y},{lic}\n" for i, y, lic in rows).encode()


def parse(data):
    return [(int(i), int(y) if y else None, lic) for i, y, lic in (line.split(",") for line in data.decode().splitlines())]


def job_key(parts):
    """One sha256 over the four parts, as canonical JSON (sorted keys, no spaces), so equal parts give one key."""
    return hashlib.sha256(json.dumps(parts, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def refresh(conn, data, config, transform, schema):
    """Make the target hold `data` under this transform, config and schema, unless the state says it already does.
    One transaction: the target's rows and the state row change together, or neither does."""
    parts = {"input": hashlib.sha256(data).hexdigest(), "transform": transform, "config": config, "schema": schema}
    key = job_key(parts)
    with conn.transaction(), conn.cursor() as cur:
        state = cur.execute("SELECT job_key, parts FROM job_state WHERE job = 'devil' FOR UPDATE").fetchone()
        if state is not None and state[0] == key:
            return "nothing changed: skipped"
        if state is None or state[1]["schema"] != schema:
            cur.execute("DROP TABLE IF EXISTS devil_target")
            cur.execute(SCHEMAS[schema])
        else:
            cur.execute("TRUNCATE devil_target")
        rows = TRANSFORMS[transform](parse(data), config)
        cur.executemany("INSERT INTO devil_target VALUES (%s, %s, %s)", rows)
        cur.execute("INSERT INTO job_state VALUES ('devil', %s, %s) "
                    "ON CONFLICT (job) DO UPDATE SET job_key = EXCLUDED.job_key, parts = EXCLUDED.parts",
                    (key, Jsonb(parts)))
    changed = "first load" if state is None else " and ".join(p for p in sorted(parts) if parts[p] != state[1][p]) + " changed"
    return f"{changed}: loaded {len(rows)} rows"


def ledger(conn, data, config):
    """e3-rerun's rule: the run id is the input's checksum alone, and a seen run id is skipped."""
    with conn.transaction(), conn.cursor() as cur:
        run_id = hashlib.sha256(data).hexdigest()
        if cur.execute("INSERT INTO load_runs VALUES (%s) ON CONFLICT DO NOTHING RETURNING run_id",
                       (run_id,)).fetchone() is None:
            return "run id seen before: skipped"
        rows = transform_v1(parse(data), config)
        cur.executemany("INSERT INTO ledger_target VALUES (%s, %s, %s) ON CONFLICT (id) DO UPDATE "
                        "SET year = EXCLUDED.year, license = EXCLUDED.license", rows)
        return f"loaded {len(rows)} rows"


def holds(conn, table, inputs, config, transform):
    """The input whose rows, under these settings, are exactly the table's rows."""
    rows = set(conn.execute(f"SELECT id, year, license FROM {table}").fetchall())
    return next(name for name, data in inputs.items() if rows == set(TRANSFORMS[transform](parse(data), config)))


with connect() as conn:
    conn.autocommit = True  # each `with conn.transaction()` is then one transaction of its own
    conn.execute("CREATE TEMP TABLE job_state (job text PRIMARY KEY, job_key text NOT NULL, parts jsonb NOT NULL)")
    conn.execute("CREATE TEMP TABLE load_runs (run_id text PRIMARY KEY)")
    conn.execute(SCHEMAS[1].replace("devil_target", "ledger_target"))
    try:
        rows = conn.execute("""SELECT o.id, o.year, o.license FROM occurrences AS o
                               JOIN species AS s ON s.id = o.species_id
                               WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id""").fetchall()
        fixed = min((r for r in rows if r[1] is not None), key=md5_order)  # next week the publisher corrects one year
        inputs = {"A": snapshot(rows), "B": snapshot([(i, y - 1, lic) if i == fixed[0] else (i, y, lic) for i, y, lic in rows])}
        default = {"cap": 1000, "licenses": ["CC0 1.0", "CC BY 4.0"]}
        smaller = {**default, "cap": 500}
        runs = [("A", default, 1, 1), ("A", default, 1, 1), ("B", default, 1, 1), ("A", default, 1, 1),
                ("A", smaller, 1, 1), ("A", smaller, 2, 1), ("A", smaller, 2, 2), ("A", smaller, 2, 2)]
        for n, (name, config, transform, schema) in enumerate(runs, 1):
            what = refresh(conn, inputs[name], config, transform, schema)
            settings = f"cap {config['cap']}, transform {transform}, schema {schema}"
            print(f"run {n} · {name} ({settings}) · {what}; the target holds "
                  f"{holds(conn, 'devil_target', inputs, config, transform)}")
            if n <= 4:
                what = ledger(conn, inputs[name], default)
                print(f"  ledger rule · {name} · {what}; its target holds {holds(conn, 'ledger_target', inputs, default, 1)}")
    finally:
        conn.execute("DROP TABLE IF EXISTS job_state, load_runs, ledger_target, devil_target")
```

```text
-- result: e3-snapshot · python · sha256 979ea874abbc
run 1 · A (cap 1000, transform 1, schema 1) · first load: loaded 1000 rows; the target holds A
  ledger rule · A · loaded 1000 rows; its target holds A
run 2 · A (cap 1000, transform 1, schema 1) · nothing changed: skipped; the target holds A
  ledger rule · A · run id seen before: skipped; its target holds A
run 3 · B (cap 1000, transform 1, schema 1) · input changed: loaded 1000 rows; the target holds B
  ledger rule · B · loaded 1000 rows; its target holds B
run 4 · A (cap 1000, transform 1, schema 1) · input changed: loaded 1000 rows; the target holds A
  ledger rule · A · run id seen before: skipped; its target holds B
run 5 · A (cap 500, transform 1, schema 1) · config changed: loaded 500 rows; the target holds A
run 6 · A (cap 500, transform 2, schema 1) · transform changed: loaded 500 rows; the target holds A
run 7 · A (cap 500, transform 2, schema 2) · schema changed: loaded 500 rows; the target holds A
run 8 · A (cap 500, transform 2, schema 2) · nothing changed: skipped; the target holds A
```

Runs 1 to 4 load A, B, then A again. The snapshot rule ends holding A, the input of the last run; the ledger rule skips A's return, because it has seen A's checksum, and keeps B. Each later run changes one part of the key and reloads: the cap from 1,000 to 500 (the config), the transform, then the schema. Run 8 repeats run 7 and skips. "Holds" is checked, not assumed: the block compares the target's rows with what each input gives under the run's settings. A key without the config would have skipped run 5 and kept 1,000 rows where the config asks for 500.

3. Repeatable is not stable. The md5 cap on the devil's 2,000 records, read in reverse, then with one new record:

```sql
-- q: e3-membership
-- status: ran
-- engine: postgis
WITH ranked AS (
  SELECT id, species_id,
         row_number() OVER (PARTITION BY species_id ORDER BY md5(CAST(id AS VARCHAR)), id) AS pick
  FROM occurrences
), devil AS (
  SELECT r.id, r.pick
  FROM ranked AS r JOIN species AS s ON s.id = r.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), reversed AS (
  -- the same records, read in the opposite order
  SELECT id, row_number() OVER (ORDER BY md5(CAST(id AS VARCHAR)), id) AS pick
  FROM (SELECT id FROM devil ORDER BY id DESC) AS d
), newcomer AS (
  -- next week's first new devil record whose md5 sorts before the 100th pick's
  SELECT n AS id
  FROM generate_series((SELECT max(id) + 1 FROM occurrences), (SELECT max(id) + 1000 FROM occurrences)) AS n
  WHERE md5(CAST(n AS VARCHAR)) < (SELECT md5(CAST(id AS VARCHAR)) FROM devil WHERE pick = 100)
  ORDER BY n
  LIMIT 1
), refreshed AS (
  SELECT id, row_number() OVER (ORDER BY md5(CAST(id AS VARCHAR)), id) AS pick
  FROM (SELECT id FROM devil UNION ALL SELECT id FROM newcomer) AS d
), before_ids AS (SELECT id FROM devil WHERE pick <= 100),
   reversed_ids AS (SELECT id FROM reversed WHERE pick <= 100),
   refreshed_ids AS (SELECT id FROM refreshed WHERE pick <= 100)
SELECT 'same records, read in reverse' AS input,
       (SELECT count(*) FROM reversed_ids) AS picked,
       coalesce((SELECT string_agg(CAST(id AS VARCHAR), ', ') FROM (SELECT id FROM reversed_ids EXCEPT SELECT id FROM before_ids) AS x), 'none') AS entered,
       coalesce((SELECT string_agg(CAST(id AS VARCHAR), ', ') FROM (SELECT id FROM before_ids EXCEPT SELECT id FROM reversed_ids) AS x), 'none') AS dropped
UNION ALL
SELECT 'one new record',
       (SELECT count(*) FROM refreshed_ids),
       (SELECT string_agg(CAST(id AS VARCHAR) || ' (pick ' || pick || ')', ', ') FROM refreshed WHERE pick <= 100 AND id NOT IN (SELECT id FROM before_ids)),
       (SELECT string_agg(CAST(id AS VARCHAR) || ' (was pick ' || pick || ')', ', ') FROM devil WHERE pick <= 100 AND id NOT IN (SELECT id FROM refreshed_ids));
```

```text
-- result: e3-membership · 2 rows · sha256 545f3edf0ed3
input | picked | entered | dropped
same records, read in reverse | 100 | none | none
one new record | 100 | 6556492907 (pick 97) | 1647111730 (was pick 100)
```

Read in any order, the same records give the same 100 picks: the rule depends on the ids alone. A new record whose md5 sorts before the 100th pick's enters at pick 97, and the 100th, a record that didn't change, leaves. A capped sample repeats on the same input but isn't stable under a refresh, and the course's own sample is one (at most 2,000 records per species by the same rule, §4.2): compare two samples by their ids, not their counts. A species under the cap keeps every record, so there a new record only adds.

**The case study: critwire itself** (`AGENTS.md`). Each step has one writer and refuses to run on stale input:

```sh
pnpm ingest gbif   # the only step that uses the network: normalized responses, keys sorted, one `retrieved` time per file
pnpm derive        # pure: no network, no clock; refuses a raw snapshot whose request differs from the one it would send now
pnpm build         # rebuilds the database from data/ each time; refuses derived files that differ from a fresh derive
```

- Stale means the request changed, not the date: `derive` rebuilds each request from the registry and compares it with the one the snapshot recorded, so a new species or a changed filter demands a new ingest, and an old snapshot of the same request doesn't.
- Snapshots are committed to git, so any past build can be repeated from its commit.
- `derive` reads only files, so its outputs are a function of its inputs, and the build checks that by deriving again.
- The deploy swaps in the new `dist/` only if the whole build passed.
- A GBIF derived-dataset DOI is minted only for a pushed commit, tagged, so the deposit it points at never moves; an interrupted registration is re-run and reconciles with GBIF's listing before it posts again (`pnpm gbif:register`).

**Result:** both engines pick the same 4,766 records. A ledger keyed by the input's checksum applies each batch once, and that suits batches; a snapshot refresh keys on the input, the transform, the config and the schema together, commits the key with the rows, and so after A, B, A holds A. An md5 cap repeats on the same input, but a refresh can swap records in and out of it.

**Exercise:** a deterministic output names its order. Export the devil's records (`id`, `year`, `license`) from a `TEMP` copy to CSV with `COPY (…) TO STDOUT`, twice, with an `UPDATE` between the exports that changes no value (`SET year = year` on the lowest id). Do it once without `ORDER BY` and once with `ORDER BY id`, and compare each pair's sha256.

**Answer:**

```python
# q: e3-ex
# status: ran
# after: py-connect
import hashlib

EXPORTS = {
    "without ORDER BY": "SELECT id, year, license FROM devil",
    "ORDER BY id": "SELECT id, year, license FROM devil ORDER BY id",
}


def export(cur, query):
    """The query's rows as a CSV file's bytes, and their sha256."""
    with cur.copy(f"COPY ({query}) TO STDOUT (FORMAT csv, HEADER true)") as copy:
        return hashlib.sha256(b"".join(copy)).hexdigest()


with connect() as conn, conn.cursor() as cur:
    cur.execute("""CREATE TEMP TABLE devil AS
                   SELECT o.id, o.year, o.license FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
                   WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id""")
    before = {name: export(cur, query) for name, query in EXPORTS.items()}
    cur.execute("UPDATE devil SET year = year WHERE id = (SELECT min(id) FROM devil)")  # changes no value
    for name, query in EXPORTS.items():
        after = export(cur, query)
        print(f"{name}: sha256 {before[name][:12]} then {after[:12]}: {'same file' if after == before[name] else 'a different file'}")
    conn.rollback()
```

```text
-- result: e3-ex · python · sha256 ee0c539414d9
without ORDER BY: sha256 3580ece3b509 then 3c1e7511af43: a different file
ORDER BY id: sha256 3580ece3b509 then 3580ece3b509: same file
```

**Check:** Without `ORDER BY` the file changes though no value did. PostgreSQL writes an updated row as a new version wherever it finds room, here at the end of the table, and a scan without `ORDER BY` returns rows in storage order, so the lowest id moves from the first line to the last. With `ORDER BY id` both files are the same bytes. Any output compared by checksum names its order, and its format: the same rows written by another tool, or with another number format, are another file.

**Dialects:**
- **PostgreSQL:** `INSERT … ON CONFLICT (key) DO UPDATE` is the upsert. `MERGE` (PostgreSQL 15) inserts, updates and deletes from one source in one statement; PostgreSQL 17 adds `WHEN NOT MATCHED BY SOURCE THEN DELETE`, which syncs a target to a snapshot. `TRUNCATE` is transactional in PostgreSQL, so a replace rolls back with the rest. `pg_try_advisory_xact_lock` keeps two runs of one job from overlapping (e5).
- **DuckDB:** `INSERT OR REPLACE INTO` and `INSERT … ON CONFLICT DO UPDATE` need a primary key or a unique constraint. `md5(CAST(id AS VARCHAR))` gives the same hex text as PostgreSQL's, which is why `e3-pick` and `e3-pick-pg` agree. `BEGIN TRANSACTION; … COMMIT;` holds a replace and its state row together.
- **SQL Server:** `MERGE … WHEN NOT MATCHED BY SOURCE THEN DELETE` syncs a target to a snapshot in one statement. `HASHBYTES('MD5', CAST(id AS varchar(20)))` returns bytes, not hex text; they sort in the same order as the hex. `sp_getapplock` keeps two runs from overlapping.
- **Python:** `hashlib.sha256` over canonical JSON (`json.dumps(parts, sort_keys=True, separators=(",", ":"))`) gives one key for equal parts. The built-in `hash()` of a string changes from one process to the next, so it never picks a sample or makes a key.
- **ArcGIS Pro:** Append (`arcpy.management.Append`) adds rows, so running it twice doubles them; Delete Rows (`arcpy.management.DeleteRows`) then Append replaces them. Pro keeps no record of what it loaded: keep the job key in a table of your own, as here.

#### e4 · quality-provenance

**Tool:** Py + PG · **Time:** 2.0 h · **Prereqs:** e3

**Concept:** know what you loaded, and who to thank for it.
- **Checks written as SQL:** each check is a query that counts the rows breaking one rule, so 0 means it passed, and the same query finds the rows when it didn't. A **reject** check stops the load (e2 runs those inside its transaction); a **flag** check is reported, and the rows stay with a note, because a strange value isn't always a wrong one.
- **Rules belong to a dataset:** a check states what this data may hold, not a truth about every map. 0, 0 is a real place, in the Gulf of Guinea; this sample rejects it because none of its records lies within 5° of it, so there two zeros are far more likely a missing coordinate than a sighting. A seabird or fisheries dataset would keep it. One zero alone is legal: two tiger records sit on the equator in Sumatra.
- **A number can be wrong in ways `< 0` misses:** a float column holds `NaN` (not a number) and `Infinity` as well as numbers, and a delivered file's text `NaN` casts without error (e2). PostgreSQL sorts `NaN` above every number, `Infinity` included, so a check written `uncertainty < 0` passes both, and a flag written `uncertainty > 100000` counts them as merely coarse. Test the range a value must fall in, `>= 0 AND < 'Infinity'`, which every bad case fails.
- **Quarantine:** rows a reject check refuses go to a report with their source's key, the check and the value, so someone can fix the source or the rule; a count alone tells nobody which record to look at.
- **What the sample is:** a capped sample of open records, at most 2,000 per species by md5 (e3), so its counts are neither abundance nor an even measure of effort. The cap makes a species with 200,000 records and one with 2,000 look alike, and within a species it keeps every bias of the records: more where more people look, and many GPS fixes from each collared animal (`Bias in records`, s1).
- **License filters:** keep only what you may publish. critwire keeps CC0 1.0 and CC BY 4.0, using each record's *effective* license, the more restrictive of its own and its dataset's (§4.2).
- **Provenance:** every row can be traced to its source. Here that is the download's DOI, each record's `dataset_key` and the `datasets` table of titles, publishers and DOIs (§4.5).
- **Citations:** GBIF's terms ask you to cite the download's DOI. CC BY 4.0 records also require credit to their dataset. When you publish a subset, cite a **derived dataset**: you register the subset's per-dataset record counts with GBIF and receive a DOI that credits every dataset in it. critwire does this for its countries field (`pnpm gbif:register`) and, from L1, for the lab sample (§4.2).

**Data:** `occurrences`, `datasets`, `species`.

**Worked example:** the checks, run on the lab sample:

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

**Expected:** every reject check is 0: the sample was loaded with them (§A.1), and they guard each refresh. The flags are what a reviewer reads:
- 24,002 records (59.4 %) give no coordinate uncertainty, so their precision is unknown;
- 15,643 repeat another record's species, dataset, place, year and month. That can be several animals, several visits, or one record published twice: inspect them, don't delete them;
- 297 records are uncertain by more than 100 km, too coarse for the 5 km cells of s2–s5;
- 10 Tasmanian devil records are dated 1599, before Europeans first sighted Tasmania (1642). The year is a placeholder or an error, and s1 already met it.

The sample's table can't hold a negative, `NaN` or infinite uncertainty: its `CHECK` refuses them (`learn_curriculum.sql`, §4), so `e4-checks` has no row for them. A staging table, all text or without that `CHECK`, can.

**Lab:**
1. Quarantine a batch. Six made-up staged records, each check run on each record, one report row per failure:

```sql
-- q: e4-quarantine
-- status: ran
-- engine: postgis
WITH staged (gbif_id, longitude, latitude, coordinate_uncertainty_m, year) AS (
  VALUES (9000000001, 146.8, -41.4, CAST(30 AS double precision), 2019),
         (9000000002, 146.8, -41.4, CAST(-30 AS double precision), 2019),
         (9000000003, 146.8, -41.4, CAST('NaN' AS double precision), 2019),
         (9000000004, 146.8, -41.4, CAST('Infinity' AS double precision), 2019),
         (9000000005, 0.0, 0.0, CAST(10 AS double precision), 2019),
         (9000000006, 146.8, -41.4, CAST('-Infinity' AS double precision), 2031)
)
SELECT s.gbif_id, c.check_name, c.value
FROM staged AS s
CROSS JOIN LATERAL (VALUES
  -- NaN sorts above Infinity in PostgreSQL, so this range fails negative, NaN, Infinity and -Infinity; NULL is a flag, not a reject
  ('coordinate uncertainty negative, NaN or infinite',
   NOT (s.coordinate_uncertainty_m >= 0 AND s.coordinate_uncertainty_m < 'Infinity'),
   CAST(s.coordinate_uncertainty_m AS text)),
  -- this dataset's rule: none of its records lies near 0, 0, so there two zeros mean a missing coordinate
  ('coordinates exactly 0, 0', s.longitude = 0 AND s.latitude = 0, s.longitude || ', ' || s.latitude),
  ('year after the download (2026)', s.year > 2026, CAST(s.year AS text))
) AS c (check_name, failed, value)
WHERE c.failed
ORDER BY s.gbif_id, c.check_name;
```

```text
-- result: e4-quarantine · 6 rows · sha256 786d6242a0ea
gbif_id | check_name | value
9000000002 | coordinate uncertainty negative, NaN or infinite | -30
9000000003 | coordinate uncertainty negative, NaN or infinite | NaN
9000000004 | coordinate uncertainty negative, NaN or infinite | Infinity
9000000005 | coordinates exactly 0, 0 | 0.0, 0.0
9000000006 | coordinate uncertainty negative, NaN or infinite | -Infinity
… 1 more row
```

Each made-up record breaks one check except the last, which breaks two and gets two report rows; record 9000000001 passes them all and would load. A test written `coordinate_uncertainty_m < 0` catches 9000000002 and 9000000006's `-Infinity`, and passes 9000000003 and 9000000004: `NaN` and `Infinity` compare above 0. The report keeps the source's key and the value as delivered, so the fix can go back to the source.

2. Who to credit. Which datasets the Tasmanian devil's and the jaguar's records come from, and under which license:

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

3. The derived-dataset registration for that subset: the request body, built but never posted.

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

The devil and the jaguar have 4,000 records from 33 datasets. 29 datasets supply CC BY 4.0 records (3,992) and must be credited, led by the Jaguar Movement Database (1,948 GPS-collar records), the Tasmanian Natural Values Atlas (1,413) and the Tasmanian Museum and Art Gallery (569). The 4 CC0 datasets (8 records) ask for no credit, and are credited anyway. The registration body lists the same 33 datasets and 4,000 records, with `originalDownloadDOI` set to the download's DOI. These counts are records in a capped sample: the Jaguar Movement Database supplies 1,948 of the jaguar's 2,000 because a GPS collar records the same animal again and again, not because it saw most jaguars. They say whom to credit and for how much of the sample, and nothing about where either animal is common.

**Result:** every reject check passes on the sample, and four flags are left for a reviewer: unknown precision, repeats, coarse places, and dates before 1642. A quarantine report names each refused record by its key, with the check and the value, and an uncertainty check written as a range catches negative, `NaN` and infinite values that `< 0` lets through. The devil and the jaguar need credits to 29 datasets, and a derived dataset lists all 33 in one DOI.

**Exercise:** turn the row-level reject checks into a gate a load calls before its `COMMIT`. For each check, count the staged rows breaking it and keep the first key; the load goes ahead only if every count is 0. Use `e4-checks`' coordinate and year checks and `e4-quarantine`'s uncertainty check. Run the gate on a `TEMP` copy of the devil's 2,000 records, then again after inserting two made-up records: one at 0, 0, and one dated 2031 with `NaN` uncertainty.

**Answer:**

```python
# q: e4-ex
# status: ran
# after: py-connect
# The row-level reject checks: each one's name, and the condition a breaking row meets.
REJECTS = [
    ("coordinates out of range", "longitude NOT BETWEEN -180 AND 180 OR latitude NOT BETWEEN -90 AND 90"),
    ("coordinates exactly 0, 0", "longitude = 0 AND latitude = 0"),
    ("coordinate uncertainty negative, NaN or infinite",
     "NOT (coordinate_uncertainty_m >= 0 AND coordinate_uncertainty_m < 'Infinity')"),
    ("year after the download (2026)", "year > 2026"),
]


def failures(cur):
    """Each reject check the staged rows break: its name, how many rows, the lowest key."""
    found = []
    for name, condition in REJECTS:
        n, first = cur.execute(f"SELECT count(*), min(id) FROM staged WHERE {condition}").fetchone()
        if n:
            found.append((name, n, first))
    return found


def report(label, cur):
    rows = cur.execute("SELECT count(*) FROM staged").fetchone()[0]
    found = failures(cur)
    print(f"{label} ({rows:,} rows): {'refused' if found else 'every reject check 0: load'}")
    for name, n, first in found:
        print(f"  {name}: {n} (first {first})")


with connect() as conn, conn.cursor() as cur:
    # CREATE TABLE AS copies no CHECK, as a staging table wouldn't have the target's
    cur.execute("""CREATE TEMP TABLE staged AS
                   SELECT o.id, o.longitude, o.latitude, o.coordinate_uncertainty_m, o.year
                   FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
                   WHERE s.scientific_name = 'Sarcophilus harrisii'""")
    report("the devil's records", cur)
    cur.execute("""INSERT INTO staged VALUES (9000000001, 0, 0, NULL, 2019),
                                             (9000000002, 146.8, -41.4, 'NaN', 2031)""")
    report("with two made-up records", cur)
    conn.rollback()
```

```text
-- result: e4-ex · python · sha256 9fac0647c0e1
the devil's records (2,000 rows): every reject check 0: load
with two made-up records (2,002 rows): refused
  coordinates exactly 0, 0: 1 (first 9000000001)
  coordinate uncertainty negative, NaN or infinite: 1 (first 9000000002)
  year after the download (2026): 1 (first 9000000002)
```

**Check:** the devil's records pass every check, as the whole sample does in `e4-checks`. With the two made-up records the gate refuses, and names three checks, each with its count and first key: 9000000001 breaks the 0, 0 rule, and 9000000002 breaks both the uncertainty and the year checks. In a real load the refusal raises an error inside the transaction, so nothing commits (e2), and `e4-quarantine`'s report is what you send back to the source.

**Dialects:**
- **PostgreSQL:** `'NaN'::float8 = 'NaN'::float8` is true, and `NaN` sorts above every number, so `>= 0 AND < 'Infinity'` is the whole finite, non-negative test; PostgreSQL 16 has no `isnan` for floats. A `CHECK` holds the same rule in the table (`learn_curriculum.sql`). `pg_input_is_valid` (e2) tests text before a cast, and accepts `NaN` and `Infinity` as valid floats.
- **DuckDB:** `isfinite(x)`, `isnan(x)` and `isinf(x)` name the cases; like PostgreSQL, it treats `NaN` as equal to itself and greater than every other value. `CHECK` constraints work as in PostgreSQL.
- **SQL Server:** `float` can't hold `NaN` or infinity, so the cast is where they're caught: `TRY_CAST('NaN' AS float)` is `NULL`, and a staged text column is checked for that before the insert. `CHECK` constraints and `TRY_CAST` give the reject and the report.
- **Python:** `math.isfinite(x)` is false for `NaN` and both infinities; `x == x` is false only for `NaN`, which is why pandas' `isna` and NumPy's `isfinite` exist. `float("nan") < 0` and `float("nan") > 100000` are both false: in Python, unlike PostgreSQL, `NaN` slips through both a lower and an upper test.
- **ArcGIS Pro:** Select Layer By Attribute (`arcpy.management.SelectLayerByAttribute`) with a check's `WHERE` clause finds the rows that break it. A Constraint attribute rule (Add Attribute Rule, `arcpy.management.AddAttributeRule`) refuses an edit whose Arcade expression returns false, Pro's form of a `CHECK`.

#### e5 · schedule

**Tool:** Py · **Time:** 1.5 h · **Prereqs:** e4

**Concept:** a pipeline that runs without you, and tells you when it breaks.
- **A job is one command** with an exit code: 0 for success, anything else for failure. The scheduler sees only that code, so a job catches nothing silently: it writes the reason, puts the traceback in its error output and exits 1.
- **The scheduler's environment isn't yours.** cron, a systemd timer and Task Scheduler start the job without your shell's profile, so the `PG*` settings you typed in a terminal aren't there. Give them to the job where the scheduler reads them (the crontab, the unit's `EnvironmentFile=`, the account's variables), keep the password in the password file, and have the job check them by name before it connects. Its log names a missing setting and never prints a value: logs are read by more people than passwords should be.
- **Logs:** one line per step, with a timestamp, to a file or the journal.
- **Alerts:** a failure nobody hears about is a silent one. systemd's `OnFailure=` starts another unit when a job fails; that unit alerts a person only if its command sends mail or a push. cron mails a job's output to `MAILTO` only when the crontab line doesn't redirect it to a file, so a line ending `>> refresh.log 2>&1` mails nothing. Task Scheduler records the last result, and can restart a failed task.
- **A refresh you can restart** (e3's snapshot rule, run by a scheduler):
  - **the job key** is one checksum over the input's checksum, `TRANSFORM_VERSION`, the config and `SCHEMA_VERSION`. Bump `TRANSFORM_VERSION` when the code's output changes, and `SCHEMA_VERSION` when the target's DDL does;
  - **a persistent target and a state table** in their own schema, created once: the state row keeps the key the target was loaded with;
  - **one transaction** replaces the target's rows and updates the state row, so a failed run leaves both as they were, and a run killed half-way commits nothing;
  - **a lock** covers the comparison and the replacement, so two runs that overlap, a slow one and the next one or a manual re-run, can't both load. `pg_try_advisory_xact_lock` doesn't wait: a run that finds it held does nothing and exits 0, since the run holding it is doing the work. The lock is the transaction's, so it is freed when the job ends, however it ends.
- **Incremental loads** move only what changed. A file with a published checksum tells you whether anything changed at all. Records that changed or were deleted upstream are the hard part: an append-only increment never sees them. For a sample this size, the honest increment is a whole reload, in one transaction, when the job key changes. A weekly GBIF refresh is a new download with a new DOI, so it is a new run of e1–e4.

**Diagram:** `e5-refresh`, after the Concept: one run is one transaction: lock → compare the job key (input, transform, config, schema) → fetch → verify the sha256 → stage with `COPY` and count → replace the target and upsert the state → COMMIT. A held lock or an unchanged key skips with exit 0; a failed fetch, checksum or count rolls everything back with exit 1, so the target and its key change together or not at all.

**Data:** `/learn/data/manifest.json` and `datasets.csv`; the lab's `datasets` table, for the shape of the job's copy.

**Worked example:** a simulation of a weekly refresh, in one process on `TEMP` tables, so it leaves the lab as it was and can be checked in one go. It compares the published checksum with the one it loaded last, reloads in one transaction when they differ, checks the row count, and exits 1 with the traceback on any failure.

```python
# q: e5-job
# status: ran
# after: py-connect
# A simulation: both "weeks" run in this one process, on TEMP tables that vanish when it ends. A scheduler runs a job as
# a new process each time, against tables that persist; e5-refresh writes that job, and e5-runs runs it.
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
    """Exit 0 on success, 1 on any failure, with the traceback in the output. The scheduler sees only the exit code:
    systemd marks the unit failed; cron mails the output only if the crontab line doesn't redirect it to a file."""
    try:
        with connect() as conn:
            # TEMP tables: the simulation leaves learn_curriculum as it was; a real job's tables live in its own schema.
            conn.execute("CREATE TEMP TABLE my_datasets (LIKE datasets)")
            conn.execute("CREATE TEMP TABLE refresh_state (file text PRIMARY KEY, sha256 text NOT NULL)")
            for run in (1, 2):  # this week's run, then next week's with nothing new
                log.info("run %d", run)
                refresh(conn)
    except Exception:
        log.exception("refresh failed")
        return 1
    return 0


# A scheduled script ends with `raise SystemExit(main())`; here the lab goes on, so only a failure stops it.
exit_code = main()
if exit_code:
    raise SystemExit(exit_code)
```

```text
-- result: e5-job · python · sha256 886a4128154e
INFO refresh: run 1
INFO refresh: datasets.csv loaded: 400 rows, sha256 3bd8c1726239
INFO refresh: run 2
INFO refresh: datasets.csv unchanged (sha256 3bd8c1726239): nothing to do
```

**Expected:** the first run loads `datasets.csv`, 400 rows, and records its sha256 (`3bd8c1726239…`); the second finds the same checksum and does nothing. Both log one line per step, and the job exits 0. Point `LEARN_BASE` at a server that isn't running and it logs the traceback and exits 1. What the simulation can't show is what a scheduler does: start a new process each week, against tables that outlived the last one, maybe while the last one is still running.

**Lab:**
1. The real job. This block writes `refresh.py` to the current folder and prints nothing; the job is the string. It reads the `PG*` settings, `LEARN_BASE`, `REFRESH_SCHEMA` (the schema holding its target and state tables, `etl` by default) and `REFRESH_LICENSES` (the licenses it keeps, `CC0 1.0,CC BY 4.0` by default: its config). Each run is one transaction: the lock, the key compared with the state row's, the file fetched and checked against the manifest, staged with `COPY` and counted, then the target's rows replaced and the state row updated, together. A held lock or an equal key exits 0 having changed nothing; any error rolls the whole run back and exits 1.

```python
# q: e5-refresh
# status: ran
from pathlib import Path

JOB = r'''"""refresh.py: makes <REFRESH_SCHEMA>.datasets hold the published datasets.csv, under this code and config.
Exit 0: loaded, or nothing to do. Exit 1: failed, and nothing changed. The reason goes to stdout, the traceback to stderr."""
import hashlib
import json
import logging
import os
import sys
import traceback
import urllib.request
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

FILE = "datasets.csv"
TRANSFORM_VERSION = 1  # bump when this code's output changes
SCHEMA_VERSION = 1  # bump when the target's DDL changes
SETTINGS = ("PGHOST", "PGPORT", "PGUSER", "PGDATABASE")

# A scheduled job writes a timestamp on every line (add %(asctime)s); this lab leaves it out so its output can be checked.
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("refresh")


def missing_settings():
    """The connection settings this environment lacks, by name: no value, the password least of all, reaches the log."""
    missing = [name for name in SETTINGS if not os.environ.get(name)]
    default = (Path(os.environ.get("APPDATA", "")) / "postgresql" / "pgpass.conf" if os.name == "nt"
               else Path.home() / ".pgpass")
    if not os.environ.get("PGPASSWORD") and not Path(os.environ.get("PGPASSFILE", default)).is_file():
        missing.append("PGPASSWORD or a password file")
    return missing


def read(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def job_key(parts):
    """One sha256 over the four parts, as canonical JSON (sorted keys, no spaces), so equal parts give one key (e3)."""
    return hashlib.sha256(json.dumps(parts, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def refresh(conn, base, schema, licenses):
    """One run in one transaction: the lock, the comparison, the replacement and the new state commit together, or
    nothing does. Returns the log line."""
    entry = json.loads(read(f"{base}/learn/data/manifest.json"))["files"][FILE]
    parts = {"input": entry["sha256"], "transform": TRANSFORM_VERSION,
             "config": {"file": FILE, "licenses": licenses}, "schema": SCHEMA_VERSION}
    key = job_key(parts)
    target, state = sql.Identifier(schema, "datasets"), sql.Identifier(schema, "refresh_state")
    with conn.transaction():
        # The transaction's own lock: COMMIT or ROLLBACK frees it, however the job ends. Held means another run is at work.
        if not conn.execute("SELECT pg_try_advisory_xact_lock(hashtext(%s))", (f"refresh:{schema}",)).fetchone()[0]:
            return "another refresh holds the lock: skipped"
        last = conn.execute(sql.SQL("SELECT job_key, parts FROM {} WHERE job = %s").format(state), (FILE,)).fetchone()
        if last is not None and last[0] == key:
            return "nothing changed: skipped"
        data = read(f"{base}/learn/data/{FILE}")
        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise RuntimeError(f"{FILE} doesn't match its manifest's sha256")
        conn.execute(sql.SQL("CREATE TEMP TABLE stage (LIKE {}) ON COMMIT DROP").format(target))
        with conn.cursor().copy("COPY pg_temp.stage FROM STDIN (FORMAT csv, HEADER true)") as copy:
            copy.write(data)
        staged = conn.execute("SELECT count(*) FROM pg_temp.stage").fetchone()[0]
        if staged != entry["rows"]:
            raise RuntimeError(f"staged {staged} rows; the manifest says {entry['rows']}")
        conn.execute(sql.SQL("TRUNCATE {}").format(target))
        loaded = conn.execute(sql.SQL("INSERT INTO {} SELECT * FROM pg_temp.stage WHERE license = ANY(%s)").format(target),
                              (licenses,)).rowcount
        conn.execute(sql.SQL("INSERT INTO {} VALUES (%s, %s, %s) ON CONFLICT (job) DO UPDATE "
                             "SET job_key = EXCLUDED.job_key, parts = EXCLUDED.parts").format(state),
                     (FILE, key, Jsonb(parts)))
    if last is None:
        return f"first load: loaded {loaded} rows"
    changed = " and ".join(p for p in sorted(parts) if parts[p] != last[1].get(p))
    return f"{changed} changed: loaded {loaded} rows"


def main():
    missing = missing_settings()
    if missing:
        log.error("failed: not set in this environment: %s", ", ".join(missing))
        return 1
    base = os.environ.get("LEARN_BASE", "https://critwire.com")
    schema = os.environ.get("REFRESH_SCHEMA", "etl")
    licenses = sorted(name.strip() for name in os.environ.get("REFRESH_LICENSES", "CC0 1.0,CC BY 4.0").split(","))
    try:
        with psycopg.connect(autocommit=True) as conn:  # autocommit: conn.transaction() is then the one transaction
            log.info(refresh(conn, base, schema, licenses))
    except Exception as e:
        log.error("failed: %s", e)
        traceback.print_exc()
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''

Path("refresh.py").write_text(JOB, encoding="utf-8")
```

```text
-- result: e5-refresh · python · sha256 e3b0c44298fc
```

2. Run it as a scheduler does: a new process each time, here eight times. The block creates a schema `learn_e5` with the target and state tables, as you would create `etl`'s once, and drops it at the end. A is the published `datasets.csv`; B is a local copy with one title corrected; C is B with one made-up dataset added, under a manifest that still says 400 rows, as if the publisher's count went wrong. Each run gets this block's environment; run 8 without `PGDATABASE`. Run 6 holds the job's lock from this block's own session, as a run still going would; run 7 starts two runs at once.

```python
# q: e5-runs
# status: ran
# after: py-connect, e5-refresh
import csv
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")
SCHEMA = "learn_e5"
LICENSES = {"CC0 1.0", "CC BY 4.0"}  # refresh.py's default config


def rows_of(data):
    return [tuple(r) for r in csv.reader(io.StringIO(data.decode("utf-8"), newline=""))][1:]


def csv_file(header, rows):
    out = io.StringIO()
    csv.writer(out, lineterminator="\n").writerows([header, *rows])
    return out.getvalue().encode("utf-8")


def publish(folder, data, rows):
    """A copy of /learn/data/ on this machine holding `data`, its manifest saying `rows` rows; returns its LEARN_BASE."""
    d = Path(folder) / "learn" / "data"
    d.mkdir(parents=True)
    (d / "datasets.csv").write_bytes(data)
    entry = {"sha256": hashlib.sha256(data).hexdigest(), "rows": rows}
    (d / "manifest.json").write_text(json.dumps({"files": {"datasets.csv": entry}}), encoding="utf-8")
    return Path(folder).as_uri()


def start(base=None, licenses=None, without=None):
    """refresh.py as a new process, with this block's environment and these changes."""
    env = {k: v for k, v in os.environ.items() if k != without}
    env["REFRESH_SCHEMA"] = SCHEMA
    if base:
        env["LEARN_BASE"] = base
    if licenses:
        env["REFRESH_LICENSES"] = licenses
    return subprocess.Popen([sys.executable, "-I", "refresh.py"], env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def finish(proc):
    out, err = proc.communicate(timeout=120)
    return proc.returncode, out.strip(), " · traceback on stderr" if "Traceback" in err else ""


def show(n, label, proc):
    code, out, err = finish(proc)
    print(f"run {n} · {label} · exit {code} · {out}{err}")


def holds(conn, inputs):
    """Which input the target's rows and the state's key come from: read, not assumed."""
    rows = set(conn.execute(f"SELECT CAST(dataset_key AS text), title, publisher, coalesce(doi, ''), license "
                            f"FROM {SCHEMA}.datasets").fetchall())
    target = next((n for n, data in inputs.items() if rows == {r for r in rows_of(data) if r[4] in LICENSES}), "no input")
    sha = conn.execute(f"SELECT parts->>'input' FROM {SCHEMA}.refresh_state WHERE job = 'datasets.csv'").fetchone()[0]
    state = next((n for n, data in inputs.items() if hashlib.sha256(data).hexdigest() == sha), "no input")
    print(f"  the target holds {target}; the state's input is {state}")


with connect() as conn, tempfile.TemporaryDirectory() as tmp:
    conn.autocommit = True  # each statement commits, so the job's own sessions see the tables
    conn.execute(f"CREATE SCHEMA {SCHEMA}")
    try:
        conn.execute(f"CREATE TABLE {SCHEMA}.datasets (dataset_key uuid PRIMARY KEY, title text NOT NULL, "
                     "publisher text NOT NULL, doi text, license text NOT NULL)")
        conn.execute(f"CREATE TABLE {SCHEMA}.refresh_state (job text PRIMARY KEY, job_key text NOT NULL, parts jsonb NOT NULL)")
        with urllib.request.urlopen(f"{BASE}/learn/data/datasets.csv", timeout=60) as r:
            a = r.read()
        header, *rows = csv.reader(io.StringIO(a.decode("utf-8"), newline=""))
        b_rows = [[*rows[0][:1], rows[0][1] + " (corrected)", *rows[0][2:]], *rows[1:]]
        made_up = ["00000000-0000-4000-8000-000000000001", "A made-up dataset", "Nobody", "", "CC0 1.0"]
        inputs = {"A": a, "B": csv_file(header, b_rows), "C": csv_file(header, [*b_rows, made_up])}
        b_base = publish(Path(tmp) / "b", inputs["B"], len(b_rows))
        c_base = publish(Path(tmp) / "c", inputs["C"], len(b_rows))  # one row more than its manifest says

        show(1, "A", start())
        show(2, "A again", start())
        show(3, "A, REFRESH_LICENSES=CC0 1.0", start(licenses="CC0 1.0"))
        show(4, "B, one title corrected", start(base=b_base))
        show(5, "C, one row added, its manifest still says 400 rows", start(base=c_base))
        holds(conn, inputs)
        lock = f"refresh:{SCHEMA}"
        conn.execute("SELECT pg_advisory_lock(hashtext(%s))", (lock,))  # as a run that is still going holds it
        try:
            show(6, "A, the lock held by another session", start())
        finally:
            conn.execute("SELECT pg_advisory_unlock(hashtext(%s))", (lock,))
        holds(conn, inputs)
        both = [finish(p) for p in [start(), start()]]
        # Which one wins, and whether the other meets the lock or the new state, varies from run to run.
        outcomes = sorted("loaded" if ": loaded " in out else "not loaded" for _, out, _ in both)
        print(f"run 7 · A, two runs started together · exit {' and '.join(str(c) for c, _, _ in both)} · {', '.join(outcomes)}")
        holds(conn, inputs)
        show(8, "A, without PGDATABASE", start(without="PGDATABASE"))
    finally:
        conn.execute(f"DROP SCHEMA {SCHEMA} CASCADE")
```

```text
-- result: e5-runs · python · sha256 bda9eaea67a6
run 1 · A · exit 0 · INFO refresh: first load: loaded 400 rows
run 2 · A again · exit 0 · INFO refresh: nothing changed: skipped
run 3 · A, REFRESH_LICENSES=CC0 1.0 · exit 0 · INFO refresh: config changed: loaded 124 rows
run 4 · B, one title corrected · exit 0 · INFO refresh: config and input changed: loaded 400 rows
run 5 · C, one row added, its manifest still says 400 rows · exit 1 · ERROR refresh: failed: staged 401 rows; the manifest says 400 · traceback on stderr
  the target holds B; the state's input is B
run 6 · A, the lock held by another session · exit 0 · INFO refresh: another refresh holds the lock: skipped
  the target holds B; the state's input is B
run 7 · A, two runs started together · exit 0 and 0 · loaded, not loaded
  the target holds A; the state's input is A
run 8 · A, without PGDATABASE · exit 1 · ERROR refresh: failed: not set in this environment: PGDATABASE
```

Each line is one process: its exit code and the one line it logged. Run 2 skips because the state row outlived run 1's process. Run 3 changes only the config, so it reloads, keeping the 124 CC0 1.0 datasets; run 4 changes the input and puts the default config back. Run 5 stages 401 rows against a manifest of 400 and fails: it exits 1, and the target and the state still hold B, because the replacement and the state row would have committed together. Run 6 finds the lock held and changes nothing. In run 7 one process loads A; the other either finds the lock held or, starting a moment later, finds the new state, and both are right to exit 0. After A, B and A again the target holds A. Run 8 names the missing setting and prints no value.

**Scheduling it.** Put `refresh.py` in a folder of its own, `~/etl` here, with a `.venv` built from the lab's `requirements.txt` (§3.3), and create the schema `etl` with its two tables once, as `e5-runs` creates `learn_e5`'s.

On Linux with cron, every Monday at 04:17. cron reads `VAR=value` lines at the top of the crontab; the password stays in `~/.pgpass`:

```sh
crontab -e
# then add these lines:
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGDATABASE=learn
17 4 * * 1 cd "$HOME/etl" && .venv/bin/python -I refresh.py >> refresh.log 2>&1
```

With `>> refresh.log 2>&1`, everything the job prints goes to `refresh.log`, so cron has nothing to mail and a failure is only a line in that file. Leave the redirect off and set `MAILTO=you@example.org` to have cron mail each run's output, if the machine can send mail.

Or a systemd user timer, which catches up on a run missed while the machine was off (`Persistent=true`) and logs to the journal:

```sh
mkdir -p ~/.config/systemd/user
printf 'PGHOST=localhost\nPGPORT=5432\nPGUSER=postgres\nPGDATABASE=learn\n' > ~/etl/refresh.env
cat > ~/.config/systemd/user/refresh.service <<'EOF'
[Unit]
Description=Weekly lab data refresh
OnFailure=refresh-failed.service

[Service]
Type=oneshot
WorkingDirectory=%h/etl
EnvironmentFile=%h/etl/refresh.env
ExecStart=%h/etl/.venv/bin/python -I refresh.py
EOF
cat > ~/.config/systemd/user/refresh-failed.service <<'EOF'
[Unit]
Description=Record that the refresh failed

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

`refresh-failed.service` only writes a line to the system log, which alerts nobody: someone has to read it. To be told, replace its `ExecStart` with a command that sends mail or a push to your phone.

On Windows, with Task Scheduler, from PowerShell. The task runs as you, so it sees your user environment variables (`setx PGHOST localhost`, and so on, once) and your password file, `%APPDATA%\postgresql\pgpass.conf`:

```powershell
$action = New-ScheduledTaskAction -Execute "$HOME\etl\.venv\Scripts\python.exe" -Argument "-I refresh.py" -WorkingDirectory "$HOME\etl"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 4:17am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "Lab data refresh" -Action $action -Trigger $trigger -Settings $settings
Get-ScheduledTaskInfo -TaskName "Lab data refresh"   # LastTaskResult 0 means success
```

Task Scheduler keeps the last result, and the task's history, and tells nobody: check `LastTaskResult`, or add a second task triggered by the failure event that sends a message.

**Result:** a refresh job that a scheduler can run as often as it likes. Each run is one process and one transaction: an unchanged job key skips, a changed input or config reloads, a failed check leaves the target and state as they were, and of two runs at once exactly one loads. After A, B and A again, the target holds A. The job checks its connection settings by name and logs no value, and the scheduling recipes say plainly where a failure ends up: a log file, the journal, or a task's last result, until you add the mail or push that tells a person.

**Exercise:** a job key covers only what you put in it. Change `refresh.py`'s transform so each DOI is stored as a link that resolves, `https://doi.org/` followed by the DOI. Write the change as a copy of `refresh.py`, and a second copy that also sets `TRANSFORM_VERSION = 2`. Into a schema `learn_e5ex` of your own, created as `e5-runs` creates `learn_e5`, run the old job once, then the new code without the bump, then with it, twice, each as a new process. After each run, count the target's DOIs that are links.

**Answer:**

```python
# q: e5-ex
# status: ran
# after: py-connect, e5-refresh
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SCHEMA = "learn_e5ex"
JOB = Path("refresh.py").read_text(encoding="utf-8")


def edit(text, old, new):
    """`text` with its one `old` replaced by `new`: an edit that finds nothing to change fails, it doesn't pass silently."""
    if text.count(old) != 1:
        raise ValueError(f"expected one {old!r} in refresh.py")
    return text.replace(old, new)


# The new transform: each DOI stored as a link, https://doi.org/<doi>. Same input, same config, a different output.
LINKS = edit(JOB, "SELECT * FROM pg_temp.stage WHERE",
             "SELECT dataset_key, title, publisher, 'https://doi.org/' || doi, license FROM pg_temp.stage WHERE")


def run(conn, n, label, script):
    """`script` as a new process, with this block's environment, then the target's DOIs that are links."""
    done = subprocess.run([sys.executable, "-I", str(script)], env={**os.environ, "REFRESH_SCHEMA": SCHEMA},
                          text=True, capture_output=True, timeout=120)
    links = conn.execute(f"SELECT count(*) FROM {SCHEMA}.datasets WHERE starts_with(doi, 'https://doi.org/')").fetchone()[0]
    print(f"run {n} · {label} · exit {done.returncode} · {done.stdout.strip()} · {links} DOIs as links")


with connect() as conn, tempfile.TemporaryDirectory() as tmp:
    conn.autocommit = True  # each statement commits, so the job's own sessions see the tables
    unbumped, bumped = Path(tmp) / "refresh_links.py", Path(tmp) / "refresh_v2.py"
    unbumped.write_text(LINKS, encoding="utf-8")
    bumped.write_text(edit(LINKS, "TRANSFORM_VERSION = 1", "TRANSFORM_VERSION = 2"), encoding="utf-8")
    conn.execute(f"CREATE SCHEMA {SCHEMA}")
    try:
        conn.execute(f"CREATE TABLE {SCHEMA}.datasets (dataset_key uuid PRIMARY KEY, title text NOT NULL, "
                     "publisher text NOT NULL, doi text, license text NOT NULL)")
        conn.execute(f"CREATE TABLE {SCHEMA}.refresh_state (job text PRIMARY KEY, job_key text NOT NULL, parts jsonb NOT NULL)")
        run(conn, 1, "the old job", "refresh.py")
        run(conn, 2, "links, TRANSFORM_VERSION still 1", unbumped)
        run(conn, 3, "links, TRANSFORM_VERSION = 2", bumped)
        run(conn, 4, "links, TRANSFORM_VERSION = 2 again", bumped)
    finally:
        conn.execute(f"DROP SCHEMA {SCHEMA} CASCADE")
```

```text
-- result: e5-ex · python · sha256 b706ba3740bb
run 1 · the old job · exit 0 · INFO refresh: first load: loaded 400 rows · 0 DOIs as links
run 2 · links, TRANSFORM_VERSION still 1 · exit 0 · INFO refresh: nothing changed: skipped · 0 DOIs as links
run 3 · links, TRANSFORM_VERSION = 2 · exit 0 · INFO refresh: transform changed: loaded 400 rows · 400 DOIs as links
run 4 · links, TRANSFORM_VERSION = 2 again · exit 0 · INFO refresh: nothing changed: skipped · 400 DOIs as links
```

**Check:** run 2 is the failure the version number exists for. The code changed, but the input, the config and both versions didn't, so the key is the same: the job skips, exits 0, and the target keeps 400 bare DOIs under a state row that says it is up to date. Nothing tells a job that its own code changed except what you put in its key. With the bump, run 3 reloads and logs `transform changed`, and run 4 skips, every DOI now a link. Every one of the 400 datasets has a DOI, so the count goes from 0 to 400 in one run.

**Dialects:**
- **PostgreSQL:** the `pg_cron` extension schedules SQL inside the database, `SELECT cron.schedule('refresh', '17 4 * * 1', 'CALL refresh()')`, in cron's syntax, and keeps each run's outcome in `cron.job_run_details`. It runs SQL only, so fetching a file stays with an outside job like `refresh.py`. `pg_try_advisory_xact_lock` takes a `bigint` or two `integer`s: `hashtext` turns a name into one, and a fixed number written into the job does as well.
- **DuckDB:** no server and no scheduler: the job is a script that cron, a systemd timer or Task Scheduler starts, as here. A database file opens for writing in one process at a time, and a second process that tries gets a lock error, so the file's lock does the advisory lock's work, except that the second run gets an error where `refresh.py` skips: catch that error if runs are expected to overlap. `BEGIN TRANSACTION; … COMMIT;` holds the replacement and the state row together.
- **SQL Server:** SQL Server Agent runs jobs on schedules, records each run's outcome in its history, and notifies an operator by Database Mail on failure; Express edition has no Agent, so it uses Task Scheduler. `sp_getapplock` with `@LockMode = 'Exclusive'`, `@LockOwner = 'Transaction'` and `@LockTimeout = 0` is `pg_try_advisory_xact_lock`: it returns a negative number instead of waiting when another session holds the lock.
- **Python:** `raise SystemExit(main())` turns the job's result into its exit code; an uncaught exception also exits 1, with the traceback but without the job's own log line. A scheduler inside Python (APScheduler, or the `schedule` package) runs jobs while its own process lives, so a crash or a restart stops every schedule; orchestrators such as Airflow, Dagster and Prefect add retries, history and alerts, and still run each task as here, so it must be safe to run again.
- **ArcGIS Pro:** a geoprocessing tool or a model can be scheduled from the Geoprocessing pane (the Run button's menu → Schedule), which creates a Windows Task Scheduler task. A Python script runs on a schedule with Pro's own Python, `"C:\Program Files\ArcGIS\Pro\bin\Python\Scripts\propy.bat" refresh.py`, in a task like the one above; `arcpy` then needs a Pro license the task's account can use.

### 5.6 Power BI

Four modules, seven hours, in Power BI Desktop (§3.5), with PostGIS twins (§3.2) from p2 on, on the star d6 builds: eight CSV files under `https://critwire.com/learn/data/star/` (§A.3). Build mission L5 (§9) wrote them in full from their outlines, in §5.3's form. Power BI runs only on Windows, so its blocks are `untested` here, and the tests check what they can instead (§0): every file a block names, against the star's manifest. Each DAX block is a query for Power BI's DAX query view (Home → DAX query view): its `DEFINE MEASURE` lines can be added to the model from there, and its `EVALUATE` returns a small table. A PostGIS block beside it, its twin (`// twin:`, §0), computes the same table from the same star with `star.sql` (d6), so its result is the table Power BI should show. The twin checks the arithmetic only, not M parsing, relationship direction, filter context or DAX execution: those need Power BI itself. §10 asks the owner for one check on Windows.

#### p1 · power-query

**Tool:** PBI · **Time:** 1.5 h · **Prereqs:** d6

**Concept:** get the star into Power BI with Power Query, so it loads the same way on any computer and refreshes in the Power BI Service. **Power Query** is the tool inside Power BI Desktop (and Excel) that fetches and shapes data before it reaches the model. It records each step as a line of **M**, its formula language, so a load is code you can read, copy and review. Four rules make a load that works anywhere:
- **A fixed base URL.** `Web.Contents` fetches the file. Give it a fixed base URL and put the file name in `RelativePath`: the Power BI Service can then refresh the published report on a schedule with anonymous access. A whole URL built by joining text is a **dynamic data source**, which the Service won't refresh.
- **Say how the file is written.** `Csv.Document` parses it with UTF-8 (`Encoding = 65001`) and CSV quoting stated, so accents and commas inside quotes are read as written; `Table.PromoteHeaders` takes the first row as column names.
- **Types with an explicit culture.** `Table.TransformColumnTypes` sets each column's type. A **culture** (a locale, such as `"en-US"`) says how text becomes a number or a date. Without one, Power Query uses the computer's own: on a computer set to German, the dot is a thousands separator, so `179.18` becomes 17,918. critwire's files write numbers with a dot, so every load states `"en-US"`.
- **Codes are text.** `country_code` holds `NA` (Namibia), which other tools read as "not available", and keys like `dataset_key` are identifiers, never numbers to add. An empty cell in a numeric column becomes `null`, Power Query's missing value; an empty cell in a text column stays an empty text, `""`.

One function serves all eight tables, so the rules are written once. A **custom function** in M is a query whose body is `(parameters) => expression`; other queries call it by name.

**Data:** the eight star files under `https://critwire.com/learn/data/star/` and `star/manifest.json`, whose columns and types the queries follow (§6.3).

**Worked example:** the function, then the largest table. Power BI reads the star d6 builds, as CSV files critwire publishes under `/learn/data/star/`. Create `LoadStar` as a blank query (Home → Get data → Blank query → Advanced editor), paste the block, and rename the query `LoadStar`. The first time it runs, Power BI asks how to connect to critwire.com: choose **Anonymous**, privacy level **Public** (§3.5). The base URL is fixed and the file name goes in `RelativePath`, so the Service sees one data source, `https://critwire.com`, for all eight tables.

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

`types` is a list of pairs, a column's name and its type, in the form `Table.TransformColumnTypes` takes. Each table is then one call. Create a blank query, name it `fact_records`, and paste this; whole numbers are `Int64.Type`, decimals `type number`:

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

A record with no month, or no stated uncertainty, has an empty cell, which becomes `null`. Power Query shows each step on the right (Applied steps); the function's steps run inside the call, so `fact_records` shows one.

**Lab:**
1. The other six tables. Each is a blank query named after its file, calling `LoadStar` with the file's columns. The manifest gives each column's type, and each has one M type:

   | Manifest type | M type | Power BI calls it |
   |---|---|---|
   | `INTEGER`, `BIGINT` | `Int64.Type` | Whole number |
   | `DOUBLE` | `type number` | Decimal number |
   | `DECIMAL(12,2)` | `Currency.Type` | Fixed decimal number |
   | `VARCHAR` | `type text` | Text |

   So `dim_country = LoadStar("dim_country", {{"country_code", type text}, {"name", type text}, {"continent", type text}, {"region", type text}, {"subregion", type text}})`, and `dim_year = LoadStar("dim_year", {{"year", Int64.Type}, {"decade", Int64.Type}, {"label", type text}})`. In `dim_species`, `dim_dataset`, `fact_species_country` and `dim_habitat_class`, the ids and codes that the manifest calls `INTEGER` are `Int64.Type` and the rest is text. `fact_country_habitat`'s `est_area_km2` is `Currency.Type`: a fixed decimal number keeps four decimal places exactly, so 5,578 areas with two decimals add up to the cent, where a decimal number (a binary double) can leave a trailing digit.
2. Close & Apply (Home). Power BI loads the eight tables into the model; `LoadStar` is a function, so it isn't loaded. In Table view, the status bar shows each table's rows: compare them with the manifest's `rows`.
3. Look at the edges. In `dim_country`, filter `country_code` to `NA`: Namibia, a text code, not a missing value. In `dim_year`, the row `-1` is the unknown member (d6), with `decade` null and label `Unknown`. In `fact_records`, filter `year` to `-1`, then `month` to null.
4. Refresh. Home → Refresh repeats every query from critwire.com: the same tables until the files change. To share the report, Home → Publish to a workspace; then, in the Service, the semantic model's Settings → Data source credentials → Edit credentials: **Anonymous**, privacy level **Public**, and set a scheduled refresh (a Pro licence allows eight a day). A dynamic data source is where this stops: the settings page says the model can't be refreshed.
5. Your own database instead. Power BI also reads PostgreSQL directly (Get data → PostgreSQL database): server `localhost`, database `learn`, with d5's `learn_powerbi` login, and the navigator lists `learn_curriculum`'s tables. Power BI tries an encrypted connection first; a server on your own computer without TLS makes it ask whether to connect unencrypted, which is fine for `localhost`. That suits a database only you use. A report in the Service that refreshes from a database on your computer needs an on-premises data gateway, a Windows service on that computer, running whenever the refresh is due; files on a public URL need none, which is why the course reads the star from critwire.com.

**Result:** eight tables, with the manifest's rows: `dim_species` 76, `dim_country` 251, `dim_dataset` 400, `dim_year` 177, `fact_records` 40,395, `fact_species_country` 472, `dim_habitat_class` 75 and `fact_country_habitat` 5,578 (246 countries). In `fact_records`, 2,289 records have year `-1` (unknown) and none has country `ZZ`; 6,545 have no month and 24,002 no stated uncertainty, all null; 176 are from Namibia, `NA`. Refresh repeats the load from critwire.com and gives the same tables until the files change.

**Exercise:** a load check in M. Load `dim_habitat_class` and `fact_country_habitat` with `LoadStar`, and return one small table to compare with the manifest: each table's rows, the area rows with an empty key, the area rows whose class isn't in `dim_habitat_class`, the total estimated area, and Namibia's. Which type keeps the area's sums exact?

**Answer:** `Currency.Type` (fixed decimal number) for `est_area_km2`. `Table.NestedJoin` with `JoinKind.LeftAnti` keeps the rows of the first table that have no match in the second, so its row count is the number of orphans. A text key is checked for both `null` and `""`.

```m
// q: p1-ex
// status: untested: Power BI is Windows-only
// input: star/dim_habitat_class.csv, star/fact_country_habitat.csv
let
    Classes = LoadStar("dim_habitat_class", {{"habitat_code", Int64.Type}, {"name", type text}, {"level1_code", Int64.Type}, {"level1_name", type text}}),
    Areas = LoadStar("fact_country_habitat", {{"country_code", type text}, {"habitat_code", Int64.Type}, {"est_area_km2", Currency.Type}}),
    Check = #table({"check", "value"}, {
        {"dim_habitat_class rows", Table.RowCount(Classes)},
        {"fact_country_habitat rows", Table.RowCount(Areas)},
        {"area rows with an empty key", Table.RowCount(Table.SelectRows(Areas, each [country_code] = null or [country_code] = "" or [habitat_code] = null))},
        {"area rows with no class", Table.RowCount(Table.NestedJoin(Areas, {"habitat_code"}, Classes, {"habitat_code"}, "class", JoinKind.LeftAnti))},
        {"total km2", List.Sum(Areas[est_area_km2])},
        {"Namibia (NA) km2", List.Sum(Table.SelectRows(Areas, each [country_code] = "NA")[est_area_km2])}
    })
in
    Check
```

**Check:** 75 and 5,578 rows, as the manifest says; no empty key and no area without its class; 146,579,613.97 km² in all, and 822,099.38 km² for Namibia, whose 33 rows kept their code. Change `LoadStar`'s culture to `"de-DE"` and run it again: every area is read with the dot as a thousands separator, and the totals no longer match. The areas are estimates from a habitat map (§4.1), not measurements.

**Dialects:**
- **Excel (Windows):** the same Power Query and the same M. Data → Get Data → From Other Sources → Blank Query, then the same `LoadStar` and calls; Data → Refresh All repeats them. A table loaded to a sheet stops at 1,048,576 rows, so `fact_records` fits; load to the Data Model for more.
- **Tableau:** Tableau Desktop's Text file connector reads files on your computer, so download the star first. Set each code's type to String on the Data Source page, and relate the tables there by their keys.
- **pandas:** `pd.read_csv(url, dtype={"country_code": str}, keep_default_na=False, na_values=[""])`. pandas reads `NA` as missing by default; `keep_default_na=False` stops that, and `na_values=[""]` keeps empty cells missing. Python's `float` already reads `12.5` the same way in every locale.
- **SQL:** DuckDB's `read_csv('https://critwire.com/learn/data/star/dim_country.csv', types = {'country_code': 'VARCHAR'})` (the `httpfs` extension fetches the URL); PostgreSQL's `\copy dim_country FROM 'dim_country.csv' WITH (FORMAT csv, HEADER)` into a table d6's block made, which reads an empty unquoted cell as NULL and `NA` as text. PostgreSQL reads only the dot as a decimal point; DuckDB does too unless told otherwise (`decimal_separator = ','`).

#### p2 · model

**Tool:** PBI + PG · **Time:** 2.0 h · **Prereqs:** p1

**Concept:** turn eight tables into one model that filters correctly. A **relationship** tells Power BI which column of one table matches which column of another, so that a choice made in one table (a country in a slicer) reaches the rows of another (that country's records). In Model view, each fact gets a relationship to each of its dimensions, set four ways:
- **Cardinality many-to-one** (`*:1`): many fact rows point at one dimension row, by the key d6 declared. The "one" side must hold each key once, which d6's primary keys guarantee.
- **Filter direction single:** a filter flows from the dimension to the fact. Choosing a country in a slicer filters `fact_records` and `fact_country_habitat`, never the other way round. Both directions invite ambiguous paths and slow, surprising totals; keep them for the rare case that needs them.
- **Conformed dimensions:** `dim_country` is shared by all three facts and `dim_species` by the two species facts (`fact_records`, `fact_species_country`), so a country slicer filters all three at once and a species slicer the two that have a species (d6). The habitat fact has no species.
- **Facts are never related to each other.** Joining two facts directly multiplies their rows (d6's drill across). Each fact is summed under the shared dimension instead, which is what a model with only fact-to-dimension relationships does.

The **factless fact**, `fact_species_country`, has no measure column; its measure is a count of its rows (species listed in a country). It answers "where does critwire list the species?", while `fact_records` answers "what was recorded where?", and the two need not agree. A **measure** is a calculation Power BI evaluates for each cell of a table or chart, under that cell's filters; p3 builds them, and this module uses three simple ones.

**Data:** the eight tables from p1.

**Worked example:** the relationships, then a query that slices two facts by one column. Power BI may create relationships on its own when it loads tables, from matching column names. Open Model view (the left bar) and check each line against this table; delete any other, and set the missing ones.

| From (many) | To (one) | Key |
|---|---|---|
| `fact_records` | `dim_species`, `dim_country`, `dim_dataset`, `dim_year` | `species_id`, `country_code`, `dataset_key`, `year` |
| `fact_species_country` | `dim_species`, `dim_country` | `species_id`, `country_code` |
| `fact_country_habitat` | `dim_country`, `dim_habitat_class` | `country_code`, `habitat_code` |

Nine relationships, every one many-to-one, single direction. Then three measures, and a query that slices both species facts by continent through `dim_country`. Run it in DAX query view (Home → DAX query view, paste, Run): `DEFINE MEASURE` declares each measure for the query, and `EVALUATE` returns the table. `SUMMARIZECOLUMNS` groups by the columns it names and computes each measure for each group, leaving out a group whose measures are all blank.

```dax
// q: p2-measures
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/fact_species_country.csv, star/dim_country.csv
// twin: p2-check
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

The table it should return, from the same star in PostGIS. Each fact is grouped by continent on its own, then the two are joined on the continent: d6's drill across, which is what the model does with the shared `dim_country`.

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

**Lab:**
1. Set the relationships. Turn off the guessing first (File → Options and settings → Options → Current file → Data Load → clear "Autodetect new relationships after data is loaded"), so a refresh adds none. Then, in Model view, Manage relationships → New for each line of the table: the fact and its key column first, the dimension and its key second, Cardinality "Many to one (*:1)", Cross filter direction "Single". Model view draws each as a line from the fact to the dimension, with `*` at the fact's end, `1` at the dimension's and an arrow pointing at the fact: the way the filter flows.
2. Look for a blank row. When a fact holds a key its dimension lacks, Power BI adds a blank member to the dimension, and slicers show "(Blank)". d6's unknown members, `ZZ` and `-1`, are real rows, so every fact row finds its dimension row and no blank appears. Add a slicer with `dim_country[name]` and scroll it: "Unknown or outside any country" is there, "(Blank)" isn't.
3. Run `p2-measures` in DAX query view and compare it with `p2-check` above, row by row.
4. One country, two facts. In Report view, add a slicer with `dim_country[name]`, a table with `dim_year[decade]` and `Records`, and a card with `Species listed`. Choose Namibia: the table shows Namibia's 176 records by decade, and the card the species critwire lists there. The slicer filters both facts because both reach `dim_country`.
5. A table with no path. Add a table with `dim_habitat_class[level1_name]` and `Records`. Every row shows 40,395, the whole fact: no relationship joins habitat classes to records, so the class has nothing to filter. A total repeated on every row is how a missing or wrong relationship shows itself.

**Result:** nine relationships, all many-to-one and single direction, and no blank member. The query returns seven continents, the same rows as `p2-check`: South America 11,308 records, Africa 10,791, North America 9,688, Oceania 5,147, Asia 2,985, Europe 469, and 7 at sea ("Seven seas"). Antarctica and the unknown member `Unknown` (`ZZ`) have neither records nor listings, so the query leaves them out. The two facts disagree, and should: Europe has records of 19 species but critwire lists only 11 there, because critwire's countries rule withholds a country outside a species' core region that has a single record there, such as an okapi in Germany: often a captive animal or a museum specimen (`AGENTS.md`). The sample keeps those records, and `fact_records` shows them. Oceania lists 9 species but the sample has records of 8, because the listings count every open record while the sample holds at most 2,000 per species (§4.2).

**Exercise:** records and habitat areas by the same country column. Write a DAX query that returns, for each continent, the records and the estimated habitat area in km² (the sum of `fact_country_habitat[est_area_km2]`), both sliced by `dim_country[continent]`. Which continent has area but no records, and why is it in the table?

**Answer:** one measure per fact, both grouped by the shared dimension's column; the model does the drill across. Antarctica: the habitat map covers it, the sample has no record there, and `SUMMARIZECOLUMNS` keeps a group while any of its measures has a value, so its `Records` is blank.

```dax
// q: p2-ex
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/fact_country_habitat.csv, star/dim_country.csv
// twin: p2-ex-check
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_country_habitat[Habitat km2] = SUM ( fact_country_habitat[est_area_km2] )
EVALUATE
SUMMARIZECOLUMNS (
    dim_country[continent],
    "Records", [Records],
    "Habitat km2", [Habitat km2]
)
ORDER BY dim_country[continent]
```

Its twin, the table it should return:

```sql
-- q: p2-ex-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT c.continent, r.records, h.habitat_km2
FROM (SELECT DISTINCT continent FROM dim_country) AS c
LEFT JOIN (SELECT d.continent, count(*) AS records
           FROM fact_records AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS r ON r.continent = c.continent
LEFT JOIN (SELECT d.continent, sum(f.est_area_km2) AS habitat_km2
           FROM fact_country_habitat AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS h ON h.continent = c.continent
WHERE r.records IS NOT NULL OR h.habitat_km2 IS NOT NULL
ORDER BY c.continent;
```

```text
-- result: p2-ex-check · 8 rows · sha256 755d2b0ec7e2
continent | records | habitat_km2
Africa | 10791 | 29703399.22
Antarctica | NULL | 12356486.85
Asia | 2985 | 31108178.20
Europe | 469 | 23004583.24
North America | 9688 | 24217714.23
… 3 more rows
```

**Check:** eight rows, the seven continents with records plus Antarctica, with 12,356,486.85 km² and no records. The areas add up to 146,579,613.97 km², p1's total; `Unknown` (`ZZ`) has neither records nor area, so it's left out. Records and areas sit side by side only because both facts reach `dim_country`: put `dim_species[class]` in place of the continent and every row shows the same total area, since the habitat fact has no species. The area is land the habitat map classifies, estimated from it: it says nothing about where a species lives, and the records say only where it was recorded.

**Dialects:**
- **Excel (Windows):** the same model in Excel's Data Model (Power Pivot): Data → Relationships, or Power Pivot → Manage → Diagram View, with the same nine relationships and the same DAX measures. A PivotTable on the Data Model gives the same table; Excel has no DAX query view.
- **Tableau:** relationships in the Data Source page's logical layer join each table to the others by its keys, and since Tableau 2024.2 a model may hold several facts sharing dimensions. Each measure is computed at its own table's grain before the tables meet, as in Power BI.
- **pandas:** no model, so do the drill across yourself: group each fact by the shared column, then put the results side by side. `records.merge(dim_country, on="country_code").groupby("continent").size()` and `habitat.merge(dim_country, on="country_code").groupby("continent")["est_area_km2"].sum()`, then `pd.concat([...], axis=1)`. Merging the two facts on `country_code` instead repeats each record once for each of its country's habitat classes.
- **SQL:** `p2-check`'s shape: one subquery per fact, grouped by the dimension's column, joined on that column (d6). The same direct join of two facts multiplies rows here too.

#### p3 · dax

**Tool:** PBI + PG · **Time:** 2.0 h · **Prereqs:** p2

**Concept:** measures that stay right under any filter. A **measure** is a formula Power BI evaluates in the current **filter context**: the filters a cell of a visual sits under, from slicers, the visual's rows and columns, and the relationships p2 set. A measure isn't stored. A **calculated column** is: it is computed once per row when the data loads, so a slicer can't change it. Four functions do most of the work:
- `COUNTROWS ( table )` counts the table's rows the filters leave visible; `DISTINCTCOUNT ( column )` counts a column's distinct visible values.
- `CALCULATE ( expression, filter, … )` evaluates an expression under changed filters. A filter such as `dim_habitat_class[level1_name] = "Forest"` replaces any filter on that column; `ALL ( dim_country )` removes every filter on the table, which gives a total to divide by. `REMOVEFILTERS` is the same thing under a clearer name.
- `DIVIDE ( numerator, denominator )` returns blank, not an error, when the denominator is 0 or blank. Blank isn't zero: a visual leaves out a row whose measures are all blank, and blank times a number is still blank.
- A ratio of two facts with different grains (one row per record; one row per country and habitat class) works because both are filtered by the same `dim_country`, and only through what they share.

The ratio this module builds is **sample records divided by forest area**: the records of critwire's sample in a country for each 1,000 km² of its forest. Say exactly that, because the name invites more. It isn't sampling effort, nor records made in forest: the numerator counts every record in the country, in forest or not, and the sample holds at most 2,000 records per species (§4.2), so a country where a much-recorded species lives holds fewer of its records than GBIF does. Nor is it how many animals live there: records say where someone recorded a species, not how many there are.

**Data:** `fact_records`, `fact_country_habitat`, `dim_habitat_class` and `dim_country`, with p2's relationships. The habitat fact holds estimates for every country the habitat map covers: 246 of the 251 rows of `dim_country`.

**Worked example:** three measures and one query, for every country with forest. `Forest km2` sums the habitat fact with the class filter replaced by forest; the ratio divides with `DIVIDE`. `ADDCOLUMNS ( VALUES ( dim_country[country_code] ), … )` makes one row per country code and evaluates each measure on it, with that row's country as the filter: a measure used inside a row turns the row into a filter (**context transition**). `FILTER` keeps the countries with forest.

```dax
// q: p3-measures
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/fact_country_habitat.csv, star/dim_habitat_class.csv, star/dim_country.csv
// twin: p3-check
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_country_habitat[Forest km2] =
        CALCULATE ( SUM ( fact_country_habitat[est_area_km2] ), dim_habitat_class[level1_name] = "Forest" )
    MEASURE fact_records[Sample records per 1,000 km2 of forest] =
        VAR forest = [Forest km2]
        RETURN IF ( NOT ISBLANK ( forest ), 1000 * DIVIDE ( COALESCE ( [Records], 0 ), forest ) )
EVALUATE
FILTER (
    ADDCOLUMNS (
        VALUES ( dim_country[country_code] ),
        "Records", COALESCE ( [Records], 0 ),
        "Forest km2", [Forest km2],
        "Sample records per 1,000 km2 of forest", [Sample records per 1,000 km2 of forest]
    ),
    NOT ISBLANK ( [Forest km2] )
)
ORDER BY dim_country[country_code]
```

The table it should return, from the same star in PostGIS. `NULLIF ( h.forest_km2, 0 )` turns a zero area into unknown, so the division gives NULL where `DIVIDE` gives blank, instead of an error.

```sql
-- q: p3-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT h.country_code,
       coalesce(r.records, 0) AS records,
       h.forest_km2,
       round(1000 * coalesce(r.records, 0) / NULLIF(h.forest_km2, 0), 3) AS sample_records_per_1000_km2_forest
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
-- result: p3-check · 215 rows · sha256 a26cfe30c3ed
country_code | records | forest_km2 | sample_records_per_1000_km2_forest
AD | 0 | 179.18 | 0.000
AE | 0 | 13.11 | 0.000
AF | 0 | 2985.10 | 0.000
AG | 0 | 51.59 | 0.000
AI | 0 | 0.12 | 0.000
… 210 more rows
```

**Lab:**
1. Run `p3-measures` in DAX query view and compare it with `p3-check`, row by row. Power BI shows the ratio with every decimal; the twin rounds it to 3 places.
2. Make the measures part of the model. A `DEFINE MEASURE` lasts for one query; a model measure is what every visual uses. In Report view, select `fact_records` in the Data pane, Home → New measure, and type the measure in the formula bar as name = formula: `Records = COUNTROWS ( fact_records )`. Add `Forest km2` the same way on `fact_country_habitat`, then the ratio on `fact_records`, and give the ratio 3 decimal places (Measure tools → Format).
3. A table visual with `dim_country[name]`, `Records`, `Forest km2` and the ratio, sorted by the ratio, highest first. Mauritania heads it with 20,000: 2 records over 0.10 km² of forest. A ratio over a tiny denominator is noise; 22 countries have less than 10 km² of forest. Add a filter on this visual, `Forest km2` is greater than or equal to 1,000: Benin now heads the list with 230.269 (961 records, 4,173.38 km²), then Kenya and South Africa.
4. Add a slicer with `dim_species[common_name]` and choose Jaguar. The records change and the forest doesn't, because `dim_species` filters `fact_records` only (p2): Costa Rica shows 94 records and 4.050, Brazil 1,370 records and 0.320. The ratio is now that species' sample records per 1,000 km² of forest. Countries without a jaguar record still show their forest and a ratio of 0, because `COALESCE` turns their blank count into 0.
5. A calculated column next to the measure. Select `dim_country`, Table tools → New column, and type `Records (column) = COUNTROWS ( RELATEDTABLE ( fact_records ) )`. Add it to the table: with Jaguar still chosen, it shows each country's records of every species, because it was computed when the data loaded, before any slicer. Delete the column: a count that ignores the report's filters belongs in a measure, with `ALL` when the total is what's wanted.

**Result:** 215 rows, one for each country the habitat map gives some forest; 105 of them have sample records. They hold 40,394 of the 40,395 records. The last is in Niue, whose habitat estimates hold no forest, so `FILTER` leaves it out, with the 30 other countries in the same case. Trinidad and Tobago has 2 records and 2,806.26 km² of forest: 0.713 sample records per 1,000 km². Åland has 187.69 km² of forest and no records: 0. No country's forest area is 0, so `NULLIF` changes no row here; it is there for the data that will have one.

**Exercise:** shares of a total. Write a DAX query that returns, for each continent, the records and the habitat area in km², and each as a share of its total over every country: the continent's value divided by the value with no country filter. Which continents hold a larger share of the records than of the area?

**Answer:** `CALCULATE ( [Records], ALL ( dim_country ) )` is the records with every country filter removed, so dividing by it gives the share; the same for the area. Africa, North America, Oceania and South America hold a larger share of the records than of the area; Asia and Europe a smaller one, and Antarctica none. The comparison is s6's record-to-area ratio, by continent: it shows where the sample's species were recorded more than area alone predicts. That follows from which species critwire lists and where people record them, not from where wildlife is.

```dax
// q: p3-ex
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/fact_country_habitat.csv, star/dim_country.csv
// twin: p3-ex-check
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_country_habitat[Habitat km2] = SUM ( fact_country_habitat[est_area_km2] )
    MEASURE fact_records[Share of records] =
        DIVIDE ( [Records], CALCULATE ( [Records], ALL ( dim_country ) ) )
    MEASURE fact_country_habitat[Share of area] =
        DIVIDE ( [Habitat km2], CALCULATE ( [Habitat km2], ALL ( dim_country ) ) )
EVALUATE
SUMMARIZECOLUMNS (
    dim_country[continent],
    "Records", [Records],
    "Habitat km2", [Habitat km2],
    "Share of records", [Share of records],
    "Share of area", [Share of area]
)
ORDER BY dim_country[continent]
```

Its twin, the table it should return, with the shares rounded to 4 places. A window over no partition, `sum(…) OVER ()`, is SQL's total over every row: what `ALL` gives in DAX.

```sql
-- q: p3-ex-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT c.continent, r.records, h.habitat_km2,
       round(r.records / sum(r.records) OVER (), 4) AS share_of_records,
       round(h.habitat_km2 / sum(h.habitat_km2) OVER (), 4) AS share_of_area
FROM (SELECT DISTINCT continent FROM dim_country) AS c
LEFT JOIN (SELECT d.continent, count(*) AS records
           FROM fact_records AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS r ON r.continent = c.continent
LEFT JOIN (SELECT d.continent, sum(f.est_area_km2) AS habitat_km2
           FROM fact_country_habitat AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS h ON h.continent = c.continent
WHERE r.records IS NOT NULL OR h.habitat_km2 IS NOT NULL
ORDER BY c.continent;
```

```text
-- result: p3-ex-check · 8 rows · sha256 70c1540a66db
continent | records | habitat_km2 | share_of_records | share_of_area
Africa | 10791 | 29703399.22 | 0.2671 | 0.2026
Antarctica | NULL | 12356486.85 | NULL | 0.0843
Asia | 2985 | 31108178.20 | 0.0739 | 0.2122
Europe | 469 | 23004583.24 | 0.0116 | 0.1569
North America | 9688 | 24217714.23 | 0.2398 | 0.1652
… 3 more rows
```

**Check:** eight rows, p2's exercise with two more columns. Europe holds 1.2% of the records and 15.7% of the area, Asia 7.4% and 21.2%; South America 28.0% and 12.1%, Oceania 12.7% and 5.8%. Each share column adds up to 1. Antarctica's share of records is blank, not 0: `DIVIDE` of a blank count is blank, as the twin's NULL is.

**Dialects:**
- **Excel (Windows):** the same measures in Excel's Data Model: Power Pivot → Measures → New Measure, the same DAX, shown in a PivotTable on the Data Model. Worksheet formulas such as `SUMIFS` give the same totals, but each cell names its own criteria; there is no filter context.
- **Tableau:** an aggregate calculation such as `COUNT([Record Id]) / SUM([Est Area Km2])` is evaluated under the view's filters, as a measure is. A level of detail expression does what `CALCULATE` does: `{FIXED : COUNT([Record Id])}` is the total with every dimension removed, like `ALL`. Dividing by zero gives null, as `DIVIDE` gives blank.
- **pandas:** group, then divide. `records / forest.replace(0, pd.NA)` gives missing, not `inf`, for a zero area, and `s / s.sum()` a share of the total. Join each grouped fact to the other on `country_code`, never the facts row by row (p2).
- **SQL:** `p3-check`'s `NULLIF` for `DIVIDE`, and `p3-ex-check`'s `sum(…) OVER ()` for `CALCULATE ( …, ALL ( … ) )`.

#### p4 · maps-report

**Tool:** PBI + PG · **Time:** 1.5 h · **Prereqs:** p3

**Concept:** a report that maps records honestly, credits its sources and refreshes by itself. Four parts:
- **Map visuals:** the **Azure Maps** visual places each record by `fact_records[latitude]` and `[longitude]`, once their **data category** (what kind of place a column holds) is set to Latitude and Longitude. Microsoft recommends it over the older Bing-based Map and Filled map visuals, and your organization's admin may have to enable it. Colour the points by `basis_of_record` or by dataset, and the way each was recorded shows: s1's GPS collars as dense tracks, an atlas's sightings as scattered points. To map countries instead of records, use `dim_country[name]` with the data category Country, not the two-letter code, which a map can misread (`NA` is Namibia).
- **Honest labels:** a map of records shows where people recorded the animal. Its title says "records", gives the count and the source, and never says "range", "distribution" or "where it lives" (`AGENTS.md`). A measure writes the title, so it stays true when a slicer changes the species.
- **Credits:** CC BY 4.0 asks you to credit each dataset whose records you show; CC0 asks for nothing (e4). A measure counts the datasets to credit among the records shown, and a table visual from `dim_dataset` lists them. The report also cites the sample as a whole: the GBIF download's DOI, `10.15468/dl.fbpk9w`, and the derived dataset that credits every dataset in it; both citations are in `star/manifest.json`, under `fact_records.csv`'s sources.
- **Publishing and refresh:** Home → Publish sends the report to the **Power BI Service**, Microsoft's website for shared reports. Its data and queries travel as a **semantic model**. In the model's settings, set the critwire.com source to Anonymous with privacy level Public, then schedule a refresh. The Service refreshes the CSV sources directly, with no gateway, because the base URL is fixed (p1).

**Data:** the model from p2, with p3's `Records` measure. Each record has a latitude and a longitude: 40,395 of 40,395.

**Worked example:** the title and credit measures, evaluated for the Tasmanian devil. `SELECTEDVALUE ( dim_species[common_name], "Selected species" )` returns the species' name when the filters leave exactly one, and the fallback text otherwise. `FORMAT ( [Records], "#,0" )` writes the count with a thousands separator. `Datasets to credit` counts the datasets left by the records shown that carry a CC BY 4.0 license. `CALCULATETABLE` evaluates a table under a filter, as `CALCULATE` does a value; `ROW` makes a one-row table to show the measures.

```dax
// q: p4-labels
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/dim_species.csv, star/dim_dataset.csv
// twin: p4-check
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

What they should return, from the same star in PostGIS. `to_char ( count(*), 'FM999,999' )` writes the count as `FORMAT` does, and `count ( DISTINCT … ) FILTER ( WHERE … )` counts the datasets with a CC BY 4.0 record.

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

**Lab:**
1. Run `p4-labels` in DAX query view and compare it with `p4-check`. Then add `Map title` and `Datasets to credit` to the model as p3 did (select `fact_records`, Home → New measure); `Records` is there from p3.
2. Prepare the coordinates. Select `fact_records[latitude]` in the Data pane and, under Column tools, set Data category to Latitude and Summarization to Don't summarize; the same for `longitude`, with Longitude. Otherwise the visual sums or averages them and draws one point where there should be many.
3. The map. Add a slicer with `dim_species[common_name]` and choose Tasmanian Devil. Add an Azure Maps visual (if it isn't in the Visualizations pane, your admin has turned it off): `latitude` to Latitude, `longitude` to Longitude, `basis_of_record` to Legend, and `dim_dataset[title]` to Tooltips. Records at the same coordinates share a point: the devil's 2,000 records sit at 1,014 places. Almost all are on Tasmania; 4 records lie north of Bass Strait, and one point is in Albuquerque, New Mexico: two preserved specimens, CC0, from a museum collection there. A point is where a record was made, which for a specimen can be far from any wild animal; the map says nothing about where the devil isn't. Choose Jaguar: 1,948 of its 2,000 records are GPS-collar fixes from the Jaguar Movement Database (`MACHINE_OBSERVATION`), and they draw the paths of a few collared animals; the jaguar's records lie mostly in Brazil (1,370) and Paraguay (302).
4. The title. Select the map, and in the Format pane, General → Title → Text, select the fx button, Format style Field value, field `Map title`. The title now follows the slicer: "Jaguar: 2,000 open GBIF records (where people recorded it, not its range)"; choose Maned Wolf and it reads 1,128. Clear the slicer and it reads "Selected species: 40,395 …": a title must hold for every state of the page, the empty one too.
5. Credits. A card visual with `Datasets to credit`, and a text box beneath the map with the sample's citations from `star/manifest.json`. For the devil, the card shows 7; for the jaguar, 22 of its 25 datasets. The exercise builds the table that names them.
6. Countries. A second Azure Maps visual, or a copy of the first: `dim_country[name]` in Location, with its data category set to Country, and `Records` in Size. With no species chosen, Namibia shows 176 records under its name; its code `NA` could be read as a missing value.
7. Publish. Home → Publish, sign in and choose a workspace. In the Service, open the workspace, the semantic model's Settings → Data source credentials → Edit credentials: Anonymous, privacy level Public. Then Refresh → Scheduled refresh: on, and add a time. A Pro licence allows eight refreshes a day. Each refresh fetches the eight files again, so the report shows critwire's current star without anyone opening Power BI Desktop.

**Result:** the title reads "Tasmanian Devil: 2,000 open GBIF records (where people recorded it, not its range)". The devil's records come from 9 datasets, 7 of which supply CC BY 4.0 records and must be credited. Choose another species, and the title, count and credits change with it.

**Exercise:** the credits table. Write a DAX query that lists, for the Tasmanian devil, every dataset its records come from: title, publisher and DOI, its records, and its CC BY 4.0 records, most CC BY records first. Which datasets must be credited, and which may be?

**Answer:** `SUMMARIZECOLUMNS` groups by the three dataset columns and leaves out a group whose measures are all blank, so only the datasets with devil records appear. `TREATAS ( { "Sarcophilus harrisii" }, dim_species[scientific_name] )` filters by a list of values, as a slicer does. A dataset with records but none under CC BY needs 0, not blank, so the second measure is 0 when `Records` isn't blank.

```dax
// q: p4-ex
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv, star/dim_species.csv, star/dim_dataset.csv
// twin: p4-ex-check
DEFINE
    MEASURE fact_records[Records] = COUNTROWS ( fact_records )
    MEASURE fact_records[CC BY records] =
        IF (
            NOT ISBLANK ( [Records] ),
            COALESCE ( CALCULATE ( [Records], fact_records[license] = "CC BY 4.0" ), 0 )
        )
EVALUATE
SUMMARIZECOLUMNS (
    dim_dataset[title],
    dim_dataset[publisher],
    dim_dataset[doi],
    TREATAS ( { "Sarcophilus harrisii" }, dim_species[scientific_name] ),
    "Records", [Records],
    "CC BY records", [CC BY records]
)
ORDER BY [CC BY records] DESC, [Records] DESC, dim_dataset[title]
```

Its twin, the table it should return:

```sql
-- q: p4-ex-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT d.title, d.publisher, d.doi,
       count(*) AS records,
       count(*) FILTER (WHERE f.license = 'CC BY 4.0') AS cc_by_records
FROM fact_records AS f
JOIN dim_species AS s ON s.species_id = f.species_id
JOIN dim_dataset AS d ON d.dataset_key = f.dataset_key
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY d.title, d.publisher, d.doi
ORDER BY cc_by_records DESC, records DESC, d.title;
```

```text
-- result: p4-ex-check · 9 rows · sha256 561748a1ef09
title | publisher | doi | records | cc_by_records
Tasmanian Natural Values Atlas | Department of Natural Resources and Environment Tasmania | 10.15468/rtnb4m | 1413 | 1413
Tasmanian Museum and Art Gallery provider for OZCAM | Tasmanian Museum and Art Gallery | 10.15468/ijp8p9 | 569 | 569
Museums Victoria provider for OZCAM | Museums Victoria | 10.15468/lp1ctu | 5 | 5
Australian Museum provider for OZCAM | Australian Museum | 10.15468/e7susi | 3 | 3
South Australian Museum Adelaide provider for OZCAM | South Australian Museum | 10.15468/wz4rrh | 3 | 3
… 4 more rows
```

**Check:** nine rows, the 9 datasets of `p4-check`. The first seven hold CC BY 4.0 records and must be credited: the Tasmanian Natural Values Atlas (1,413 records) and the Tasmanian Museum and Art Gallery (569) supply 1,982 of the 2,000, and five other Australian museums 13. The last two, the MVZ and MSB mammal collections in Arctos, hold 5 CC0 records and ask for no credit; credit them anyway, as e4 does, since it costs one line. In the report, this is a table visual with the same five fields under the species slicer; the derived dataset's DOI credits all nine at once.

**Dialects:**
- **Excel (Windows):** Excel's 3D Maps (Insert → 3D Map) plots rows by latitude and longitude from the Data Model; a chart title can come from a cell (select the title, type `=` and click the cell), where a formula such as `=B1&": "&TEXT(B2,"#,##0")&" open GBIF records"` writes it.
- **Tableau:** a map from `Latitude` and `Longitude` as dimensions, not measures (which Tableau would average into one point). A title can insert a field or a calculated field, so it changes with the filters as the measure does; `COUNTD([Dataset Key])` counts datasets.
- **pandas:** `geopandas.GeoDataFrame` with `points_from_xy(longitude, latitude)` and `.explore()` draws an interactive map; the title is an f-string from the filtered frame's `len()`, and `df.loc[df.license == "CC BY 4.0", "dataset_key"].nunique()` counts the datasets to credit.
- **SQL:** `p4-check` writes the title with `||` and `to_char`, and `p4-ex-check` the credits with `count(*) FILTER (WHERE …)`.

### 5.7 Capstone

One module, eight hours, in your own PostGIS (§3.2), Python (§3.3) and Power BI Desktop (§3.5). Build mission L5 (§9) wrote it in full from its outline, in §5.3's form. It asks a game designer's question, "what could a player meet here?", and answers it with a pipeline built from the earlier modules, ending in a file a game can read. Records can only say where people recorded an animal, so the file says that too, in its own fields.

#### c1 · game-feed

**Tool:** PG + Py + PBI · **Time:** 8.0 h · **Prereqs:** s5, e4, p4

**Goal:** one pipeline from GBIF to a game, each stage a module already done, with the honesty rules kept at every stage.
- **Extract and load** (e1–e4): a GBIF download for the species and region the game needs (your own predicate, or the lab sample), loaded into PostGIS in one transaction, re-runnable, checked, and with its credits.
- **Look before counting** (s1): which datasets, which basis of record, any GPS collars? A species whose records are mostly one telemetry study gives a feed about that study, and the feed's numbers would say so only if you looked.
- **Grid and hot spots** (g6, s5): equal-area hexagons, records per cell, Gi\* with the false discovery rate. The feed flags the surviving cells as **recording hot spots**: places people recorded the animal most, not places it is most common.
- **Report** (p1–p4): Power BI reads the feed itself, with p1's `Web.Contents` pattern, and turns its cells into a typed table; the report maps the cells by their centre, sizes them by records, colours them by hot spot, and takes its title from p4's measure. Reading the feed, not a copy of its cells, means the report shows exactly what the game gets.
- **The feed:** one static JSON file per species and region, written by one SQL statement, valid against the JSON Schema below, versioned. Each cell has an encounter **weight**, its share of the records; the game draws a cell with probability weight ÷ Σ weight (a cumulative sum and one random number), so rounding never matters. A cell missing from the feed means "no record", never "no animal". The feed carries its own license (CC BY 4.0, the license of the data critwire writes) and attribution, the download's citation, and every dataset with CC BY 4.0 records in it with its DOI (e4), because the attribution travels with anything derived from them and a game copies the feed alone; the game shows them on its credits screen.
- **Shipping and refresh:** the game ships the file with its own static files, so it is read from the game's own origin and needs no CORS (§4.6). e5's schedule rebuilds it; a change to its fields bumps `version` and the schema. A game with its own PostGIS, such as Critter Connect's, can run the same statement there instead.

**Diagram:** `c1-pipeline`, after the Goal's list: GBIF download → extract and load (e1–e4) → look before counting (s1) → grid and hot spots (g6, s4, s5) → the feed (c1), which the report (p1–p4) and the game both read; beside each stage its honesty rule: cite the download's DOI; credits from the loaded datasets, never typed; name a dominant study in `meaning`; equal-area cells, and hot spots only after the false discovery rate, called recording hot spots; a weight is a share of the records, not the range; the report's title says records, the game shows the credits and reads a missing cell as no record.

**Data:** `s4_cells` (s4's 5 km hexagons over Tasmania's main island, with the devil's record counts), `s5_gistar` (s5's Gi\* per cell), `occurrences`, `datasets`, `species`. The worked example is the Tasmanian devil; in L5's lab the learner repeats it for a species and region of their own.

**Worked example:** the feed for the Tasmanian devil, in two blocks. `c1-feed` builds the feed with one statement, from s4's 5 km cells and s5's Gi\* (`s5_gistar`, so it runs after `s5-gistar`), and keeps it as a temporary view, `c1_feed`: one row, one `jsonb` column, `doc`. It then returns the feed's summary and its fullest cell. Four parts make the feed:
- `sp`: the species, by its scientific name.
- `cells`: the cells holding a record (`c.n > 0`), each with its centre in WGS 84 (`ST_Transform` of the hexagon's centre from EPSG:3577), its **weight**, its share of the records, rounded to six places (`n / sum(n) OVER ()`), and whether Gi\* made it a hot spot that survives the false discovery rate (`z > 0 AND fdr`).
- `credit`: the datasets with a CC BY 4.0 record inside those cells, with title, publisher and DOI; `ST_Contains` finds a record's cell, after `ST_Transform` puts the record's point in the cells' projection.
- the final `SELECT`: `jsonb_build_object` writes the document, and `jsonb_agg (… ORDER BY id)` the cells in a fixed order, so the same data always gives the same file.

```sql
-- q: c1-feed
-- status: ran
-- engine: postgis
-- after: s5-gistar
CREATE OR REPLACE TEMP VIEW c1_feed AS
WITH sp AS (
  SELECT id, scientific_name, common_name FROM species WHERE scientific_name = 'Sarcophilus harrisii'
), cells AS (
  SELECT c.id, c.n, c.geom, ST_Transform(ST_Point(c.cx, c.cy, 3577), 4326) AS centre,
         round(c.n::numeric / sum(c.n) OVER (), 6) AS weight,
         g.z > 0 AND g.fdr AS hot_spot
  FROM s4_cells AS c JOIN s5_gistar AS g ON g.id = c.id
  WHERE c.edge_m = 5000 AND c.n > 0
), credit AS (
  SELECT DISTINCT d.title, d.publisher, d.doi
  FROM occurrences AS o
  JOIN sp ON sp.id = o.species_id
  JOIN cells AS c ON ST_Contains(c.geom, ST_Transform(o.geom, 3577))
  JOIN datasets AS d ON d.dataset_key = o.dataset_key
  WHERE o.license = 'CC BY 4.0'
)
SELECT jsonb_build_object(
  'version', 1,
  'species', (SELECT jsonb_build_object('scientific_name', scientific_name, 'common_name', common_name) FROM sp),
  'cell', '5 km hexagon, EPSG:3577',
  'meaning', 'share of the open GBIF records in each cell: where people recorded the animal, not its range',
  'license', 'CC BY 4.0',
  'license_url', 'https://creativecommons.org/licenses/by/4.0/',
  'attribution', 'critwire (https://critwire.com), CC BY 4.0',
  'source', 'GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w',
  'credit', coalesce((SELECT jsonb_agg(to_jsonb(credit) ORDER BY title, publisher, doi) FROM credit), '[]'),
  'cells', jsonb_agg(jsonb_build_object(
    'id', id, 'lon', round(ST_X(centre)::numeric, 4), 'lat', round(ST_Y(centre)::numeric, 4),
    'records', n, 'weight', weight, 'recording_hot_spot', hot_spot) ORDER BY id)
) AS doc
FROM cells;
SELECT jsonb_array_length(doc -> 'cells') AS cells,
       (SELECT sum((c ->> 'records')::int) FROM jsonb_array_elements(doc -> 'cells') AS c) AS records,
       (SELECT sum((c ->> 'weight')::numeric) FROM jsonb_array_elements(doc -> 'cells') AS c) AS weight_sum,
       (SELECT count(*) FROM jsonb_array_elements(doc -> 'cells') AS c
        WHERE (c ->> 'recording_hot_spot')::boolean) AS hot_spots,
       jsonb_array_length(doc -> 'credit') AS datasets_to_credit,
       octet_length(doc::text) AS bytes,
       (SELECT c::text FROM jsonb_array_elements(doc -> 'cells') AS c
        ORDER BY (c ->> 'records')::int DESC, (c ->> 'id')::int LIMIT 1) AS fullest
FROM c1_feed;
```

```text
-- result: c1-feed · 1 row · sha256 4eb751b94b5d
cells | records | weight_sum | hot_spots | datasets_to_credit | bytes | fullest
307 | 1972 | 0.999954 | 37 | 7 | 35178 | {"id": 917, "lat": -42.8981, "lon": 147.8865, "weight": 0.12…
```

`c1-feed-file` returns the file itself: `doc::text` writes the document as one line of JSON, and that one text cell is, byte for byte, the worked feed critwire publishes, `/learn/labs/c1-feed.json` (`pnpm learn:check --update` writes it from this block, §7.3). Its result shows the cell's first 60 characters; its sha256 covers the whole file.

```sql
-- q: c1-feed-file
-- status: ran
-- engine: postgis
-- after: s5-gistar, c1-feed
SELECT doc::text AS feed FROM c1_feed;
```

```text
-- result: c1-feed-file · 1 row · sha256 330d13fc6135
feed
{"cell": "5 km hexagon, EPSG:3577", "cells": [{"id": 6, "lat…
```

**The feed's fields:** a game reads these, so each says what it is.
- `version`: 1. A change to the fields bumps it and the schema.
- `species`: the scientific and common name.
- `cell`: the cells' shape, size and projection, `5 km hexagon, EPSG:3577` (Australian Albers, an equal-area projection, so every cell covers the same ground).
- `meaning`: what a weight is, in words a player-facing screen can quote: where people recorded the animal, not its range.
- `license` and `license_url`: the feed's own license, CC BY 4.0, and its deed: anyone may copy and change the feed, crediting as the next three fields say.
- `attribution`: who made the feed, in the words they ask to be credited with: `critwire (https://critwire.com), CC BY 4.0`. A feed you make names you.
- `source`: GBIF's citation of the download, with its DOI, which lists every dataset in the download.
- `credit`: every dataset with CC BY 4.0 records in the feed's cells, by title, publisher and DOI (`null` for a dataset without one), sorted by those three.
- `cells`: one object per cell that holds a record: `id` (s4's cell id), `lon` and `lat` (the cell's centre in WGS 84, four decimal places, about 10 m), `records`, `weight` and `recording_hot_spot`.

A game draws a cell with probability weight ÷ Σ weight: it adds the weights up in order (a cumulative sum), takes one random number between 0 and the total, and picks the first cell whose running sum passes it. A cell missing from the feed means "no record", never "no animal".

**Diagram:** `c1-feed`, after the paragraph above: the fullest cell (917) as the feed writes it; its weight, 256 ÷ 1,972 = 0.129817, a share of the records, with the 307 weights summing to 0.999954; the draw on the running sum of the weights, where one random number, 0.83, falls in cell 917's span (0.768217 to 0.898034); and cell 7, with 0 records, left out of the feed: no record, never no animal.

The feed's JSON Schema (draft 2020-12), which L5 publishes beside its worked feed and checks the feed against:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://critwire.com/learn/labs/c1-feed.schema.json",
  "title": "Encounter weights from open GBIF records",
  "description": "Where people recorded a species, per equal-area cell. Records, not a range: a missing cell means no record, not no animal.",
  "type": "object",
  "required": ["version", "species", "cell", "meaning", "license", "license_url", "attribution", "source", "credit", "cells"],
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
    "license": { "type": "string", "description": "The feed's license" },
    "license_url": { "type": "string", "pattern": "^https://", "description": "The license's deed" },
    "attribution": { "type": "string", "description": "Who made the feed, as they ask to be credited" },
    "source": { "type": "string", "description": "GBIF's citation of the download, with its DOI" },
    "credit": {
      "type": "array",
      "description": "Every dataset with CC BY 4.0 records in the feed, with its DOI (null if it has none)",
      "items": {
        "type": "object",
        "required": ["title", "publisher", "doi"],
        "additionalProperties": false,
        "properties": { "title": { "type": "string" }, "publisher": { "type": "string" }, "doi": { "type": ["string", "null"] } }
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

**Expected:** 307 of the 1,094 cells hold a record, so the feed has 307 cells and 1,972 records (the devil's 2,000, less the 28 off the main island's cells, as in g6). The weights, rounded to six places, sum to 0.999954, which is why the game divides by their sum. 37 cells are recording hot spots: s5's 39, less 2 cells with no record of their own, flagged by Gi\* because their neighbours are full (Gi\* counts a cell's neighbours too), and absent from a feed of recorded cells. The fullest cell (id 917) holds 256 records, 13.0 % of the weight, and is a hot spot. 7 datasets must be credited. The file is 35,178 bytes, small enough to ship with any game. critwire publishes it and its schema under `/learn/labs/` (§7), and the report in the Lab reads that file.

**Lab:** the pipeline again, for a species and region of your own; each stage keeps its honesty rule.
1. **Extract and load** (e1–e4, Python). Choose a species and a region. Build the request with e1's `build_request` and your species' GBIF key, and run e1's client with your GBIF account (`e1.py` carries it commented out); then load, check and credit the download as e2, e3 and e4 do, pointing their downloads (`e2.py`, `e3.py`, `e4.py`) at your files instead of the lab's. The rule: the feed's `source` is your download's citation, with its DOI, and its `credit` comes from your loaded `datasets`, never typed by hand. Without a GBIF account, take a species of the lab sample in a region of your own, and keep the course download's citation.
2. **Look before counting** (s1). Run `s1-devil` with your species' name: which datasets, which basis of record, which years. The jaguar's 2,000 records are 1,948 GPS-collar fixes of a few animals, so a jaguar feed would describe those animals' paths. If one study dominates, say so in `meaning`, or leave the study out and say that instead.
3. **Grid and hot spots** (g6, s5). Copy `s4-cells` and change the region (`island`), the species and the projection: EPSG:3577, Australian Albers, is equal-area over Australia only; EPSG:6933 (WGS 84 / NSIDC EASE-Grid 2.0 Global) is equal-area anywhere. Change every `3577` in it, in `s4_neighbours` and in `c1-feed`. Then run `s5-gistar` unchanged. The rule: equal-area cells, so each covers the same ground, and hot spots only after the false discovery rate, called recording hot spots.
4. **The feed.** Copy `c1-feed` and change the species' name, `cell` (your cells' size and projection), `source` (your download's citation) and `attribution`: your name and site, followed by CC BY 4.0, because a feed you make names you, as critwire's names critwire. Keep `meaning` and the license. To save the file, in the same psql session: `\pset format unaligned`, `\pset tuples_only on`, `\o my-feed.json`, `SELECT doc::text FROM c1_feed;`, `\o`. Validate it against the schema before you ship it (Dialects names validators).
5. **The report** (p1–p4). In Power BI Desktop: Home → Get data → Blank query, then Advanced editor, paste `c1-report` and name the query `cells`. It reads the worked feed from critwire.com as p1 reads the star; for your own feed, replace the `Web.Contents (…)` call with `File.Contents ( "C:\path\my-feed.json" )` (the Service then needs a gateway to refresh it, as d5's PostgreSQL connection does). It fails, rather than guessing, if a cell lacks a field.
6. **The map** (p4). Set `lat` and `lon` to the Latitude and Longitude data categories, Don't summarize (p4, step 2). An Azure Maps visual: `lat` and `lon`, `records` to Size, `kind` to Legend, `weight` to Tooltips. The title, as p4's measure: `Map title = SELECTEDVALUE ( cells[species] ) & ": " & FORMAT ( SUM ( cells[records] ), "#,0" ) & " open GBIF records in " & COUNTROWS ( cells ) & " cells (where people recorded it, not its range)"`. Credits: a second blank query, `Table.FromRecords ( Json.Document ( Web.Contents ( "https://critwire.com", [RelativePath = "learn/labs/c1-feed.json"] ) )[credit] )`, in a table visual, and a text box quoting `attribution` and `source`.
7. **Ship and refresh** (e5). The game copies the file in with its own static files and reads it from its own origin. Its credits screen shows `attribution`, `source` and each `credit` with its DOI (as a link, `https://doi.org/` followed by the DOI). e5's schedule rebuilds the feed; new numbers keep `version`, a changed field bumps it and the schema.

The report reads the feed, the file the game gets:

```m
// q: c1-report
// status: untested: Power BI is Windows-only
// input: labs/c1-feed.json
let
    Source = Json.Document(Web.Contents("https://critwire.com", [RelativePath = "learn/labs/c1-feed.json"]), 65001),
    Cells = Table.FromRecords(Source[cells], {"id", "lon", "lat", "records", "weight", "recording_hot_spot"}, MissingField.Error),
    Typed = Table.TransformColumnTypes(Cells, {
        {"id", Int64.Type}, {"lon", type number}, {"lat", type number},
        {"records", Int64.Type}, {"weight", type number}, {"recording_hot_spot", type logical}
    }),
    Species = Table.AddColumn(Typed, "species", each Source[species][common_name], type text),
    Kind = Table.AddColumn(Species, "kind", each if [recording_hot_spot] then "recording hot spot" else "other recorded cell", type text)
in
    Kind
```

`Json.Document` parses the file into records and lists; `Table.FromRecords` with `MissingField.Error` makes one row per cell and stops at a cell without one of the six fields. `species` repeats the feed's common name on each row, for the title; `kind` spells out the legend, so it never shows a bare True or False.

**Result:** your feed: one file, valid against the schema, with your species, your cells' size and projection, you in `attribution`, your download in `source`, every dataset with CC BY 4.0 records in `credit`, and "not its range" in `meaning`. On the worked feed, the report's title reads "Tasmanian Devil: 1,972 open GBIF records in 307 cells (where people recorded it, not its range)", 37 cells are recording hot spots, and the largest bubble is cell 917, with 256 records.

**Exercise:** look before counting, on the feed's fullest cell. Cell 917 holds 13.0 % of the weight: a game would place about one devil in eight there. Who made its records, how, at how many places and in which years? Find the fullest cell from `c1_feed`, as `c1-feed`'s summary does, and break its devil records down by dataset and basis of record, with the number of distinct places and the first and last year.

**Answer:** `jsonb_array_elements` turns the feed's cells back into rows, and `ORDER BY … LIMIT 1` takes the fullest, the same tie rule as `c1-feed`'s `fullest`. The records are placed in that cell as `c1-feed` places them, with `ST_Contains` after `ST_Transform`. `count(DISTINCT (o.longitude, o.latitude))` counts places: records at the same coordinates count once. The block runs after `s5-gistar` and `c1-feed`, so the view exists.

```sql
-- q: c1-ex
-- status: ran
-- engine: postgis
-- after: s5-gistar, c1-feed
WITH fullest AS (
  SELECT (c ->> 'id')::int AS id
  FROM c1_feed, jsonb_array_elements(doc -> 'cells') AS c
  ORDER BY (c ->> 'records')::int DESC, (c ->> 'id')::int
  LIMIT 1
)
SELECT f.id AS cell, d.title, o.basis_of_record,
       count(*) AS records,
       count(DISTINCT (o.longitude, o.latitude)) AS places,
       min(o.year) AS first_year, max(o.year) AS last_year
FROM fullest AS f
JOIN s4_cells AS c ON c.id = f.id AND c.edge_m = 5000
JOIN occurrences AS o ON ST_Contains(c.geom, ST_Transform(o.geom, 3577))
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY f.id, d.title, o.basis_of_record
ORDER BY records DESC, d.title, o.basis_of_record;
```

```text
-- result: c1-ex · 3 rows · sha256 161c0f8ea4f7
cell | title | basis_of_record | records | places | first_year | last_year
917 | Tasmanian Natural Values Atlas | OBSERVATION | 225 | 90 | 2005 | 2011
917 | Tasmanian Museum and Art Gallery provider for OZCAM | MATERIAL_SAMPLE | 22 | 1 | 2006 | 2009
917 | Tasmanian Natural Values Atlas | OCCURRENCE | 9 | 9 | 2007 | 2008
```

**Check:** three rows, 256 records. The Tasmanian Natural Values Atlas's observations supply 225 of them, at 90 places, all made from 2005 to 2011; 9 more atlas records, at 9 places, from 2007 and 2008. The Tasmanian Museum and Art Gallery's 22 material samples share one place, from 2006 to 2009. No record in the cell is later than 2011. The cell is full because people recorded devils there, intensively, for a few years; a weight can't tell such a survey from many devils, and says nothing about the years since. `meaning` already says what a weight is. A game designer who reads this may still choose to keep it, cap a cell's weight, or note the years: each is honest once it is stated.

**Dialects:**
- **Python:** `json.dumps(doc, separators=(", ", ": "))` spaces the text as `jsonb` does, but `jsonb` orders an object's keys by length, then byte by byte (`"id"` before `"lat"`, `"cell"` before `"cells"`), so a byte-identical file sorts them the same way. PostgreSQL's `round(numeric, 6)` rounds halves away from zero; Python's `round` on a float rounds the binary value, halves to even, so use `decimal.Decimal` with `ROUND_HALF_UP` for the same weights.
- **DuckDB:** `json_object` builds the document, and `to_json(list(… ORDER BY id))` the cells in order (`json_group_array` takes no `ORDER BY`); the spatial extension adds `ST_Transform` and `ST_Contains`. Its JSON text has no space after `:` or `,` and keeps keys in the order written: the same document, not the same bytes.
- **JSON Schema validators:** ajv in JavaScript (critwire's tests validate the worked feed with it) and Python's `jsonschema` package (not in the course's pins) both read draft 2020-12.
- **Excel:** Data → Get Data → From Web runs the same M, on Windows and Mac; 3D Maps (Windows) maps the cells.
- **Tableau:** the JSON file connector reads `cells` as a table; put `lat` and `lon` on the map as dimensions, `records` on Size and `recording_hot_spot` on Colour.
- **The game (JavaScript):** with `total` the weights' sum, `let r = Math.random() * total;` then `cells.find((c) => (r -= c.weight) < 0) ?? cells.at(-1)` draws a cell; the fallback catches a float that passes every cell.

## 6. ERDs

Three diagrams, one per database a learner meets: the browser's tables (schema v2), the PostGIS lab, and the star that Power BI reads. Each is a Mermaid source under `site/learn/erd/`, the only copy, and each is checked against the database it describes in one place: `schema.mmd` against the browser's catalog in E2E, `lab.mmd` against `learn_curriculum` in `pnpm learn:check`, `star.mmd` against the star's manifest in `pnpm build`. A column, key or line in the picture that the database lacks fails, and so does the reverse. Each has a page (`/learn/schema/`, `/learn/schema/lab/`, `/learn/schema/star/`, §7) with its data dictionary: column, type, key and meaning come from the `.mmd` itself, and each column's source from the build's source map (`scripts/build/learn/erd.ts`); a table with no source fails the build.

How to read the lines: `||` exactly one, `|o` zero or one, `o{` zero or more, `|{` one or more. The side with the crow's foot holds the foreign key. PK is the primary key, FK a foreign key, UK a unique key.

The pictures are drawn offline by Mermaid in a headless browser, as SVG only (plain text labels, so it shows inside an `<img>`), by `pnpm erd`. Each source carries `accTitle:` and `accDescr:`, which become the SVG's `<title>` and `<desc>`. Each SVG records the sha256 of the source it was drawn from, so the build refuses a picture older than its source (002 §3): `site/learn/erd/lab.svg is stale: run pnpm erd`.

### 6.1 Schema v2: the browser's tables

`site/learn/erd/schema.mmd`. 002's six tables and their lines are unchanged: it names `v1.mmd` (002's schema v1, first `plans/002-learn-erd.mmd`) on its `%% extends:` line, and the build compares them and allows no new line between them; v2 adds the lab sample. A record belongs to one species and one dataset. Its country is optional: `country_code_gbif` keeps GBIF's code as delivered, and `country_code` holds it only when it is a row of `countries`, so GBIF's `ZZ` (unknown) and `XZ` (high seas) never break the foreign key. The view `species_taxonomy (species_id, class, order_name, family, genus)` stores nothing and isn't drawn.

### 6.2 The lab database (PostGIS)

`site/learn/erd/lab.mmd`, schema `learn_curriculum`. The same keyed tables as schema v2 in PostgreSQL types (`text`, `float8`; GBIF's dataset key is a `uuid`), plus the shapes the GIS modules join to: country outlines, admin-1 areas for nine countries, RESOLVE's biomes and ecoregions, and the habitat map's classes. Every shape is `geometry` in WGS 84 (SRID 4326) with a GiST index; a record's point is a generated column, so it can never disagree with its longitude and latitude. Two lists sit beside the diagram, as comments in the source:

- **Lab-made:** tables the lessons create in the lab (s4's hexagon grids, the smoke check's table, d1's field notes, d3's copy in year order, d4's sightings feed and its run log, the ETL's staging tables, d6's star and its species history). They aren't part of the loaded lab, so they aren't drawn; the check excuses them when a lesson's setup has made them.
- **Planned:** none since L3, which added `occurrence_habitats` (the habitat class at each record) and `habitat_clips` (two whole-country clips of the habitat map, as in-database rasters in 256-cell tiles keyed (`clip`, `tile`); the diagram names the column's type `raster`). The marker stays in the check's rules: a table listed as planned is drawn so the design is whole, excused while it doesn't exist, and fails the check once it does, so the marker can't go stale.

### 6.3 The Power BI star

`site/learn/erd/star.mmd`: the eight CSV files `star.sql` writes (d6, §A.3), checked against the star's `manifest.json`. `fact_records` holds one row per sample record; `fact_species_country` has no measure (a factless fact: a row says a species has open records in a country); `fact_country_habitat` holds the habitat estimates per country and class (§4.1). `dim_species` is shared by the two species facts (`fact_records`, `fact_species_country`), not by the habitat fact, which has no species; `dim_country` by all three. A shared dimension is conformed: one slicer on it filters every fact that uses it. Every fact foreign key is filled: a record with no year points at `dim_year`'s `-1` member, one with no country at `dim_country`'s `ZZ`, so every line is "exactly one" on the dimension's side.

All eight are published since L5, which added `dim_habitat_class` and `fact_country_habitat` from L3's habitat summaries (L2 published the other six while the two waited on a `%% planned:` line). The star page says the habitat areas are map estimates.

## 7. The site

Learn stays what 002 §8 designed: static pages in the same `dist/`, written by the same offline `pnpm build`, served by the same Caddy block, with no server process and no web framework. Every page is complete HTML; one bundled script adds the browser engine, the editors, cards and checks. 002 §8's editor, accessibility rules, light and dark themes, "before the database loads" behaviour, one engine start per visit, serving rules and playground are kept as written (§1). What changes is the shape of the course: tracks and modules instead of a 16-lesson path, pages for labs that run on the learner's own tools, downloadable lab files, and a lab-data index.

### 7.1 URLs

| URL | Page | Built in |
|---|---|---|
| `/learn/` | The curriculum map (§2): the seven tracks in order, each module with its tool badges, hours, prerequisites and a done tick; "Clear progress"; links to setup, the schemas, the data and the playground. Every module is built and linked since L5; a module not yet built would be listed, unlinked, as "in preparation" | L2 |
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
- **PostGIS and Python blocks** can't run in the page. Each shows its code (read-only, with a Copy button), the result `learn:check` recorded, with the date and the versions it ran on (PostgreSQL, PostGIS, GEOS and GDAL; from L4 Python and the `requirements.txt` hash; from `checked.json`), and a link to the module's download. A "Lab schema" button opens the lab ERD as the Schema button opens schema v2's. A block marked `untested` shows its reason in place of a result, in the same words as here.
- **Power BI blocks** (```` ```m ````, ```` ```dax ````) show their code and, instead of a result, the files they read with their rows and sha256 (the `// input:` checks), the line "Not run by critwire: Power BI Desktop is Windows-only.", and for a DAX block one line linking its PostGIS twin (`p2-check`…, shown with its result on the same page) and saying what the twin doesn't check. A Power BI exercise shows its answer behind Show answer, as a PostGIS one does.
- **Results are numbers from the published files.** A result shown under a PostGIS or Python block was produced by `learn:check` on the same `/learn/data/` files the page links to; the build refuses it otherwise (7.4).

The playground and the browser blocks use one engine start per visit (002 §8): moving between module pages keeps the running database.

### 7.3 Downloads

The lab files are written by the build from the same blocks the pages show, so the page and the download can't disagree (E2E checks it, 7.6):
- **`<module>.sql`**: the module's PostGIS blocks in page order, each exactly as `learn:check` runs it: its `-- after:` blocks first, the whole wrapped in `BEGIN; … ROLLBACK;`, except `-- tx: own` blocks (as written). Headers stay as comments, so every block keeps its id. It starts with §0's `pg-session` (`SET search_path`), then the boot setup (below), and runs with `psql -X -d <your database> -f <module>.sql` after the loader (§4.3). No `ON_ERROR_STOP`, because some blocks show an error on purpose (`-- expect: error`, `-- fails:`), and the file says so at the top. The setup page's PostGIS checks (§0) download as `pg-checks.sql`, since `setup.sql` is the browser's schema. A block that runs in two sessions (`-- sessions:`) is commented out like an untested one (below): it needs one psql window per session.
- **The boot setup.** A download includes every `-- boot` block it needs, once, right after `pg-session` (or `py-connect`), committed, and not again at its page position. It needs one when any block in it, or an `-- after:` block they bring, names a table or view the boot block creates (the names in its `CREATE TABLE` and `CREATE VIEW` statements, matched as whole words). Today that is `s4-cells`, in `s2`, `s3`, `s4`, `s5` and `c1` (`.sql`; c1 through `s5-gistar`) and in `s2`, `s3`, `s4`, `s5` and `setup` (`.py`; `setup` for §3.3's `gpkg-export`). A boot block drops what it builds before building it, so a file runs on a freshly loaded database, and again: a learner can open any module's file first, in any order. In a `.py` the boot block runs through the helper, `with connect() as conn: conn.execute("""<its SQL>""")` (psycopg sends a statement list without parameters as one simple query, and the `with` commits it), and in a notebook it is its own cell. A miss is caught by the assembled run (7.6), which starts each file from a fresh load.
- **Untested blocks** are in their download, so the learner has them, but never run from it: running `e1.py` mustn't submit a GBIF download or stop on missing credentials, and `d5.sql` mustn't change the learner's database. In a `.sql` or `.py`, such a block at its page position is one line `-- not run from this file: <its reason>. Run it by hand, as its page says.` (`#` in Python), its headers as written, then every other line of its code behind `-- ` (`# `): no `BEGIN; … ROLLBACK;`, no `-- after:` blocks brought for it, and it doesn't count towards the boot setup. In a notebook it is a Markdown cell, the same line and then the code as a fenced block, never a code cell. Which blocks follows their status in the build's own run, so a block a later mission makes `ran` is live in its file from then on. Today: `d5-database` (L2), `g3-iucn` (L3), `e1-submit` (L4) and §3.4's `arcpy-moran`, which runs in Pro's Python window: `setup.py` carries it commented out, `setup.ipynb` as a Markdown cell. Power BI's M and DAX are in no download (below).
- **`<module>.py`** and **`<module>.ipynb`**: the module's Python blocks, `py-connect` first, then the boot setup, then each block once, in page order, with its `# q:` line as a comment (the notebook: one cell per block, and a Markdown cell with the block's heading). They read the lab data from `LEARN_BASE` (default `https://critwire.com`) and connect with libpq's `PG*` variables, as in §3.3. §3.3's Python blocks (`py-smoke`, `gpkg-export`) download as `setup.py` and `setup.ipynb`.
- **`requirements.txt`**: §3.3's pins; the setup page gives the `uv` commands.
- **Power BI** has no download of its own: a `.pbix` can't be built or tested here (§3.5). Its data files are the star's CSVs under `/learn/data/star/`, which p1 loads by URL.
- **The capstone's worked feed** (`c1-feed.json`) and its schema (`c1-feed.schema.json`, §5.7). The feed is the one text cell `c1-feed-file` returns (`SELECT doc::text AS feed …`): a whole `learn:check --update` run writes it to `site/learn/labs/checked/c1-feed.json`, byte for byte, once every result settled, and the build binds it to that block's recorded result, whose sha256 covers the whole text. The schema is its fence in §5.7, which `learn:port` writes to `site/learn/labs/c1-feed.schema.json` (a `json` fence whose `$id` is `https://critwire.com/learn/labs/<name>.json`). Both are copied under `/learn/labs/`, outside `/learn/data/`, so the cap and the data manifest don't count them.

### 7.4 Progress, without accounts

One `localStorage` key, `critwire.learn.done.v1`, holds `{ "<module id>": "<YYYY-MM-DD>" }`. "Mark done" on a module page sets it, and so does solving a foundations module's "Already know this?" exercise. The map and the track pages show a tick for each done module; "Clear progress" on `/learn/` removes the key. Nothing else is stored: no editor text (002), no answers, no cookie, nothing sent anywhere. A browser that refuses storage still runs every module; the ticks just don't persist.

### 7.5 How the build writes it

`writeLearn` (002 §8), generalized, still offline and still one step of `pnpm build`.

**Sources in the repository:**
- `site/learn/curriculum.json`: the tracks in order, and each module's `id`, `slug`, `title`, `track`, `tools` (`B`, `PG`, `Py`, `PBI`), `hours`, `prereqs`, `state` (`built` or `planned`; the commit that adds a module's page sets it `built`), and the `skill` and `questions` the track pages show. §2's table is its first content.
- `site/learn/modules/<id>.html`: each built module's text, with `{{block:<q-id>}}` slots where its blocks go, `{{exercise:<q-id>}}` and `{{skip:<q-id>}}` for an exercise and an "Already know this?" check, and `{{diagram:<name>}}` (below).
- `site/learn/sql/<q-id>.sql` and `<q-id>.py`: every block, its fence body exactly as here, headers included (`pnpm learn:port` writes it, and seeds each ran block's result from the fence under it; the page shows it without its test headers, `-- show: cards` kept); L1's `setup.sql` is the one header-less file. Power BI blocks the same, as `.m` and `.dax`; a `.dax` names its twin (`// twin:`, §0).
- `site/learn/labs/checked/`: what `learn:check` recorded, one file per block (its result) and `checked.json` (below).
- `site/learn/diagrams/<name>.html` and `<name>-dark.html`: the teaching diagrams other than the ERDs, drawn with the diagram-design plugin (profile `critwire`: default tokens, system fonts), exported to `<name>.svg` and `<name>-dark.svg` with `export_svg.py --system-fonts`. A page shows one with `{{diagram:<name>}}`: a `<picture>` whose dark source follows the reader's colour scheme, its `alt` the SVG's `<title>`.

**It refuses** (each a build failure naming the file):
- a module whose prerequisite is unknown, or prerequisites that form a cycle; a module slot with no block file, or a block file no page uses;
- a stale ERD SVG (002 §3);
- a teaching diagram missing one of its four files, an SVG without a `<title>` or with any reference outside itself, a diagram no page shows, or a file in `site/learn/diagrams/` that isn't one;
- a PostGIS or Python block whose freshness key differs from `checked.json`: "lab <id> is stale: run pnpm learn:check";
- a star block (d6) whose result in the build's DuckDB differs from what `learn:check` recorded on PostGIS;
- a breach of the 120 MB cap (§4.4); a lab file without `sources`, or another credit failure (§4.5);
- a Power BI `// input:` other than a published star file or `labs/c1-feed.json`; a DAX block without a `// twin:`, an M block with one, or a twin that isn't a ran PostGIS block of the same page;
- once the course has `c1-feed-file`: a missing `checked/c1-feed.json` or `c1-feed.schema.json`, or a feed that isn't that block's recorded result ("…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check --update"); before it has one, a feed file at all (nothing would bind it);
- any missing file.

The staleness refusals (lab, star and feed) only warn in `pnpm build --draft`, a preview that is never deployed, so `learn:check` can run on a draft of the change it is about to prove, and `learn:check --update` can rewrite the feed.

**`checked.json` freshness.** For each lab block, one sha256 over everything that decides its result: its own source; the source of every block it runs with, which is its `-- after:` (`# after:`) blocks, transitively, every `-- boot` block (committed before every PostGIS and Python block, so `gpkg-export`, which reads `s4_cells`, depends on `s4-cells`), and `pg-session` or `py-connect`; the data files' sha256s from the manifest's `files`, the loader's among them, outside `star/` (not its `dois`, which a `--draft` build leaves out, nor sizes or the star, which can't move a lab result); the checker's own source files and the canary's SQL; and `requirements.txt`. Each input enters with its id or path, in a fixed order (block ids sorted, then the files), so editing `s4-cells`, `py-connect` or an exercise's lesson makes every block that runs it stale, not just the block edited. Beside each key, the sha256 of the block's recorded result, so a result edited after the run loses its stamp; and each download's sha256 as assembled (7.3), so a download that changes, through its blocks or the assembly itself, is stale until 7.6 runs it again; and one sha256 over what decides the lab ERD check (`lab.mmd`, the loader and the boot blocks). All are files in the repository or in `dist/`, so the build recomputes them offline and compares. The versions of PostgreSQL, PostGIS, GEOS, GDAL, Python and the packages are recorded beside them and shown on the page, but not compared: the build may run on a machine with other versions, and `deploy` must not depend on the checker's machine. The file's date moves only when something else in it changes, so a rerun with nothing changed leaves it byte for byte.

### 7.6 `pnpm learn:check`

A development command, never part of `build` or `deploy`. It is the repository's port of §0's runner, PostGIS and Python engines, not a second harness: once L2 lands it, the spike is frozen as this mission's evidence and never extended.
- It runs the loader and every PostGIS block, and (from L4) every Python block in `.venv-learn`, and writes their results and `checked.json`; with `--update` (L5), also the capstone's feed, from `c1-feed-file`'s one row and one text column `feed` (a `jsonb` cell, or any other shape, is refused naming the block), only when it changed (7.3).
- **The agreement gates** (from L4) compare the run's SQL and PySAL results, where a module shows the same statistic both ways: global Moran's I (`s4-moran-sql` against `s4-agree`: a row per grid, n equal, I, E[I], the normality variance and z within 5e-7 and the same to 6 decimals), Gi\* (`s5-gistar`'s line equals `s5-gistar-pysal`'s), LISA (`s5-lisa-sql`'s cells per quadrant equal `s5-lisa`'s) and zonal (each zone `s6-zones` shows has `s6-geopandas`' records and km² within 1). A pair is checked when both its blocks ran; a difference fails the run and nothing is written. A disagreement is fixed in the SQL, never in the threshold.
- **Then it runs every download as assembled**, as a learner would: the files the build's own assembly function writes (7.3), each on a freshly loaded database (the loader, then the file), so no file leans on another's tables. A `.sql` runs with `psql -X -f`; its `ERROR:` lines must be exactly those its `-- expect: error` and `-- fails:` statements announce, in order, each containing the announced text. A `.py` runs as assembled with `python -I` in `.venv-learn` from an empty folder, with the Python blocks' environment (no `GBIF_*` variable), and must exit 0 within its blocks' timeouts plus 60 s per boot block it runs, so an `e1-submit` left live fails here. The `.ipynb` isn't run again: E2E proves its cells equal the `.py` (7.7). The leak check (§0) runs after each file, a failed one too. A failure names the file and its first unexpected error (a `.py`: its exit code and stderr's last lines), then any leftover the leak check found, and nothing is written to `checked.json`.
- It connects with libpq's `PG*` variables, or `LEARN_PG_URL`, never `DATABASE_URL` (whose role, `critwire`, can't create roles). On critwire's server that is `critwire_dev` as `critwire_lab` through `LEARN_PG_URL` (§0; `learn:check --setup` creates the role and writes the URL); on the owner's WSL, the owner's own PostGIS (`AGENTS.md`'s two machines).
- It refuses the database `critwire` twice: by name before connecting, and by `current_database()` after, so a service file or `PGDATABASE` can't slip past. It refuses a superuser lab role, and one with CREATE on `public`: the labs run with a learner's privileges, so a block that needs more fails here as it would for a learner (`learn:check --setup` makes the role right). It checks for CREATEROLE and says it's needed. The `learn_spatial` canary (§0) runs only where that schema exists, read as libpq's default role (the schema's owner), so `critwire_lab` needs no grant on A2's schema.
- **The loader stage (L1)**, under one advisory lock (`critwire.learn`) for the whole run: the loader's sha256 against the manifest; two loads, each giving the manifest's `tables` counts; then the **forced failure**: a temp copy of the loader with the first `occurrences` row repeated before that COPY's `\.`. Every COPY succeeds and psql must exit non-zero at `ALTER TABLE occurrences ADD PRIMARY KEY`, naming the duplicate id, with every table's count and md5 equal to the second load's: the whole load is one transaction. A cut COPY isn't used (on a row boundary psql exits 0 and the disconnect rolls back), and a loader without exactly one `COPY occurrences (id, …)` with rows fails "loader layout changed" before any load. Then the leak check, so a loader that leaves a `learn_` object is named before any block runs. **The blocks stage** then runs every PostGIS block of the pages in page order (`pg-role-smoke` among them), each inside the runner's transaction (§0), against its recorded result. **Then the Python blocks** (L4), in page order, in `.venv-learn`, which the static stage checks against the labs' `requirements.txt` before connecting (its Python and the file's sha256 go into `checked.json`'s versions). Each runs as `python -I` from an empty folder with its own empty `HOME` and only these variables: the lab's `PG*`, `PGOPTIONS=-c search_path=pg_catalog` (so a block finds the lab tables only through `py-connect`), the run's `PGAPPNAME`, one `MPLCONFIGDIR` for the run and `LEARN_BASE`, the built site under test as a `file://` URL. Its code is its `# after:` blocks' then its own, its time limit its `# timeout:` (60 s by default), and its stdout its result. A block fails on a non-zero exit or the timeout (its process group is killed), on a process it started outside that group still holding its output 1 s after it exited, on a session of the run still open 10 s after it exited (ended and named), or on a committed `learn_` object (the lab role's dropped, any other named); a change to `learn_curriculum` stops the run there, since the blocks after it would read another lab. Both engines' results are compared, or written, together. Then the canary and the leak check. Before the first `-- needs: raster` block, once, the raster check (§0): `postgis_raster` answers and `postgis.enable_outdb_rasters` and `postgis.gdal_enabled_drivers` hold a learner's defaults, as `critwire_lab`, or the run stops naming the block and the setting. A server without PostGIS raster is refused at connect, since the loader needs it.
- **Cleanup:** the lock is held by a cleanup connection that runs no block. Every exit, a failed check or SIGINT/SIGTERM included, cancels the running psql (SIGINT, so the server rolls back) or block statement and removes the temp loader, then, in this order: **terminate** every session the run opened that still runs (`pg_terminate_backend`, 10 s each; one still alive fails the run, named): the runner's by pid, and (L4) the Python blocks' by the run's name. Each run names itself once, `critwire-learn-check-py-<12 hex>`, and every Python process gets it as `PGAPPNAME` (no block may set `application_name`); cleanup ends only sessions of this database, the lab role and this name, since the lock is per database and `pg_stat_activity` spans the server. An earlier run's Python session in this database (same prefix, another name) is never ended: the next run refuses at connect, after the lock, naming its pid and `select pg_terminate_backend(<pid>)`; **sweep**, still under the lock, the new `learn_%` objects the lab role made (roles it holds ADMIN OPTION on, then schemas it owns), naming any other new one with the superuser's cleanup command, never dropping it; **unlock** and end the connections. If the cleanup connection was lost, the lock went with it: nothing is dropped and every new object is named.
- **Modes:** before connecting, a static stage reads and lints the whole course, so a lint error needs no database. `--update` runs each block twice (a boot block once) and writes its result once both runs agree and every block passed, the same rule for every engine; `--module <page>` runs the course's `-- boot` blocks (page order), then one page's blocks and its download, and prints their results, writing nothing (no result, no feed): a page reading another page's boot tables runs as in a whole run, and a block naming a prerequisite page's block in `-- after:` replays it from that page's file (so `--module c1` runs `s5-gistar`'s statements before `c1-feed`, and takes about as long). `checked.json` is written only by a whole run.
- L1 creates it with the loader stage; L2 adds the static stage, the blocks, the lab ERD check, the downloads, two-session blocks, the cleanup lint and the in-transaction leak check (§0); L3 the raster check and GDAL's version; L4 the Python blocks and `.py` downloads, the agreement gates, and the lab role's refusal of superuser or CREATE on `public`.

### 7.7 E2E

The repository's harness, unchanged in kind (002 §8): `pnpm build`, then Playwright headless Chromium against the local Caddy copy of the live block on 3100; expectations computed from `data/` and the manifests, never typed in; no request leaves 3100. New specs:
- **`learn-map`**: the map lists `curriculum.json`'s tracks and modules in order, with hours and prerequisites; planned modules aren't links; a done tick survives a reload, and "Clear progress" removes it. **L5**: all 33 modules built, each linked from the map and its track page and returning 200; no `/learn/` page says "in preparation".
- **`learn-browser`**: every browser block runs in its page without an error; every exercise accepts its answer and rejects a fixed wrong one; every "Already know this?" check marks its module done; Reset and Stop work; moving across three module pages starts the engine once.
- **`learn-labs`**: each PostGIS, Python and Power BI block's code on its page equals its download; each download that names a boot block's table holds that boot block right after `pg-session` or `py-connect`; each `untested` block is in its `.sql` or `.py` commented out under its reason (its code, the `-- `/`# ` taken off, equals the page's) and in its notebook as a Markdown cell, never a code cell; the result shown equals the recorded one; every `.ipynb` cell equals its block in the `.py`. **L5**: every Power BI block is `untested` and shows its inputs, each `// input:` file matching the star's manifest (or the feed); each DAX block links its PostGIS twin; the capstone's feed validates against its schema (`ajv`, JSON Schema 2020-12) and its license, attribution and credits equal the served manifest and `datasets.csv`.
- **`learn-data`**: every file's sha256 and size against `manifest.json`, row counts, CSV headers, the star's key coverage, the 120 MB cap, every file's `sources`, and the `/learn/data/` index listing every dataset of the sample with title, publisher and license.
  - **L1** (`e2e/learn-data.spec.ts`): the manifest lists exactly the folder's files; each file's sha256 and size; Parquet and CSV rows and columns (types as the build's reader sees them: GeoParquet's `geom` as WKB) and CSV headers; the occurrences equal `data/raw/gbif-sample/sample.csv` and `datasets.csv` its `datasets.json` entries; the loader's `tables` equal counts from `data/`; the cap; sources and citations; both DOIs equal the sample's `registration.json`; `inputs` equal the served `/v1` files and the committed sample; the index lists every file, every dataset (title, publisher, DOI, license, records) and both DOIs; screenshots at 1280 and 375 px. Global setup's `assertBuilt` also refuses a `dist/learn/data/` whose `inputs` or copied `data/learn/` files are stale.
  - **L2**: the star's key coverage (the star files are L2's).
  - **L5**: all eight star files, the habitat fact's included, pass the input check (§0: header, keys, rows, sha256) as served, with the unknown members (`ZZ`, `-1`) and `NA` as Namibia, text; every Power BI block's star inputs against them.
  - **L3**: the habitat files as `habitat.json` records them (sha256, size, Jung v004's credit, no stand-in); `occurrence_habitats` one row per sample record with known codes; `habitat_clips.parquet`'s columns (`clip`, `tile`, `rast`) and its rows = the clips' tiles; `clips/*.tif` start with TIFF's magic and answer a Range request with 206.
- **`schema`**: `schema.mmd` against the browser's catalog (`lab.mmd` and `star.mmd` are checked by `learn:check` and `pnpm build`, §6); the three ERD pages with their SVGs, relationships and dictionaries; the Schema and Lab schema dialogs by keyboard; the teaching diagrams, light and dark.
- **`learn-screens`**: the screenshots (below), each page fitting its width.
- **`learn-timing`**: five first visits to the playground, each in a fresh context; the median time to the end of `setup.sql` must be at most 1.5 × A1's 2.9 s first visit (002 §1; the sample's boot, §A.1).
- **`serving`**: `.wasm` content types and the fixed modification times of `/learn/assets/` (002 §8).

**Artifacts**, as today in `E2E_ARTIFACTS`: the Playwright HTML report, a trace per test, `results.json` and screenshots at 1280 and 375 px of the map, f3 (browser), d3 (PostGIS), g3 and g7 (L3), s4, s5 and e2 (L4), the lab schema and the setup page, each light and dark, and of the data index, reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

**Release smoke** (`e2e/release/`, never in the default run): after a deploy, with `dist/` the released build, `RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=<dir> pnpm exec playwright test -c playwright.release.config.ts` checks every `dist/` file is served with its bytes, the `.wasm` files' content type, f3's first browser block's result, and (L4) the origin's `s4.py`, run after the origin's loader in `.venv-learn` as the lab role: exit 0, s4's recorded outputs printed in page order, nothing left behind.

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
| L3 | `plans/briefs/critwire-learn-l3-gis.md` | `critwire-learn-l3-gis` | `ingest habitat` (003 §5, v004): summaries for every country, `occurrence_habitats`, the Costa Rica and Tasmania clips (whole countries, 256-cell tiles; the cap raised to 120 MB by the owner); the loader and the lab ERD grow; `learn:check`'s raster check; g1–g7 in full (§5.3); review items: the `/v1` contract (`contracts/v1.json`), `docs/recovery.md`, `db:load` in batches | L2's pages, templates and `learn:check` | 28–34 |
| L4 | `plans/briefs/critwire-learn-l4-stats-etl.md` | `critwire-learn-l4-stats-etl` | `requirements.txt` and `uv` (§3.3; L1 brought them, L4 split off the ingests' file); `learn:check`'s Python stage, the agreement gates and the lab role's refusals (§7.6); `.py` and `.ipynb` downloads (§7.3); s1–s6 and e1–e5 in full (§5.4–5.5), Moran, Gi\* and LISA tested against esda; three teaching diagrams (`s4-band`, `e2-load`, `e5-refresh`); review items: `e2-geopandas` in `learn_curriculum` as the lab role, a restartable refresh (e3, e5), the e1, e2, e4, e5 corrections, Python cleanup | L3's habitat data; the hexagon cells (g6, s4) | 30–36 |
| L5 | `plans/briefs/critwire-learn-l5-powerbi-capstone.md` | `critwire-learn-l5-powerbi-capstone` | The habitat fact in `writeStar` (eight star files; `est_area_km2 >= 0`, foreign keys NOT NULL); cross-page `-- after:` (§0); Power BI blocks' `// input:` checks and DAX `// twin:` (§0); p1–p4 and c1 in full (§5.6–5.7), the game feed `c1-feed.json` (written by `c1-feed-file`, with its license, attribution and credit DOIs) and its JSON Schema; two teaching diagrams (`c1-pipeline`, `c1-feed`); a curriculum pass (all 33 modules built); a handoff item for the owner's Power BI check | L4's s5 (Gi\*), s4's cells and e4's credits | 22–28 |
| | | | | **Total** | **146–176** |

**Why this order.** Every lab reads L1's files, and L1 holds the course's only network write (the derived-dataset registration), so data comes first. L2 builds the site on it with the ten modules this document already writes in full. The habitat ingest is the largest data job and spatial statistics and Power BI both read it, so L3 comes before them. Python (L4) arrives with the modules that need it. Power BI and the capstone (L5) use every earlier track.

**The same data throughout.** L1 republishes the spike's sample (§4.2: the same download and the same rules give the same 40,395 records), so every result recorded here holds on the published files, and a build mission that gets a different result has found a bug, not a new number. The one planned change was L3's: its habitat summaries replaced A2's two-country stand-ins, so the built blocks that read them (`pg-smoke`, `d4-xmin-load`, `d6-star-fact-country-habitat` and `d6-drill-across`) were re-run and updated, with the reason, in the same commit; its whole-country clips changed `pg-smoke` and `d4-xmin-load` once more (the clips' tile rows). L5 re-measured `p1-load`'s inputs on the published star (§A.3's two habitat rows) and re-ran `p3-check` on L3's summaries: 215 rows instead of 2, with `NULLIF` and the column renamed `sample_records_per_1000_km2_forest` (Trinidad and Tobago 0.713, 0.698 on the stand-ins).

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

**Inputs.** The lab tables (the browser schema v2 plus the habitat estimates); d6's eight `d6-star-*` blocks (§5.2), which the spike reads from this file by id; p1's `p1-load` (§5.6), whose `// input:` line names the eight files.

**Commands.** `SP/star-export/run.sh`: loads the lab data, then `SP/star-export/export.ts`: runs the blocks in Node DuckDB over the published files and writes each table as CSV ordered by its primary key (the canonical files, with `manifest.json`); runs the same blocks in PostGIS in a transaction it rolls back, `\copy`-ing each table; compares the two by value; checks every file as the Power BI input check does. The runner (`run-queries.ts`) checks `p1-load`'s inputs against the manifest on every run and logs one `-- input:` line per file.

| File | Grain or key | Rows | Bytes |
|---|---|---|---|
| `dim_species.csv` | species | 76 | 6,186 |
| `dim_country.csv` | country, plus `ZZ` | 251 | 11,227 |
| `dim_dataset.csv` | dataset (its credit) | 400 | 72,797 |
| `dim_year.csv` | year, plus `-1` | 177 | 2,670 |
| `fact_records.csv` | one sample record | 40,395 | 4,475,330 |
| `fact_species_country.csv` | species × country (factless) | 472 | 2,818 |
| `dim_habitat_class.csv` | habitat class | 75 | 4,525 |
| `fact_country_habitat.csv` | country × class | 5,578 | 78,367 |

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

**Sizes fit a 50 MB cap** (F6; raised to 120 MB by the owner in L3, H5, for the whole-country habitat clips). 003 measured its files for `/v1` with no total in mind: admin-0 at 1:10m (7.35 MB), admin-1 as GeoJSON (40.7 MB), the RESOLVE zip (149 MB), the `spatial` extension (23.6 MB per DuckDB version). Lab data is copied on every deploy and stays in git history, so 004 caps it at 50 MB: Natural Earth at 1:50m, RESOLVE simplified at 0.05° (6.69 MB), the capped sample, no `spatial`. The spike's lab files under `/learn/data/` come to about 43.7 MB; §4 gives the budget.

**Lab data lives under `/learn/data/`, not `/v1`** (F7). 003's grown tables were to be read from `/v1/<table>.parquet`. `/v1` is critwire's data contract and only ever grows, while lab samples are redrawn and resized as the course changes. No lab reader needs `/v1`'s CORS: the course's own pages are same-origin, and PostGIS, Python and Power BI aren't browsers. The one `/v1` addition is 002's countries file. §10 asks whether other sites' pages should be able to read the lab files.

**No `spatial` extension in the browser, and no `setup-grown`** (§10 item 3). 002 §10 item 11 left extensions beyond `parquet` to A2, and 003 §8 item 5 recommended committing `spatial` (23.6 MB per DuckDB version) for its browser spatial lessons. 004 does light spatial work in the browser in plain SQL (bounding boxes, 10° bins, a haversine distance) and teaches GIS in PostGIS, where practitioners use it. That saves 23.6 MB per DuckDB version, at the cost of no `ST_` functions in the browser. 003's second setup, `setup-grown`, kept stand-in tables apart from 002's `setup`; it goes too: schema v2's two tables are additions at the end of the one `setup` (002's part stays byte for byte), and the other spatial tables live in the lab database.

**Natural Earth's `release` in `attribution.json` is an object** (002 §6 Credit; L1 S5). 002 gave the entry `"release": "v5.1.2"`, a bare string, while Catalogue of Life's `release` in the same array is an object (`key`, `alias`, `version`, `issued`). One key with two types breaks typed readers (a Parquet or pandas column, a TypeScript type). L1 publishes `"release": {"version": "v5.1.2", "issued": "2022-05-13"}`, a subset of COL's keys, so the key keeps one shape. The rest of 002 §6's entry is as designed: `fields` `countries.{name,continent,region,subregion}`, `records` 250, `license` "Public domain" with a null `licenseUrl`, the long citation, and `notes`.
