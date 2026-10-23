# critwire Learn: a practitioner curriculum (design)

Design for critwire Learn as a practitioner course in database architecture, GIS in SQL, spatial statistics, ETL and Power BI, taught on critwire's open species data and other open data. It starts from a little SQL and everyday GIS, covers the foundations fast, then goes deep. It replaces the course in `plans/002-learn.md` and `plans/003-learn-data-spatial.md` and reuses their engine, schema, data and licensing findings (§1). Every SQL and Python block here is tested (§0). Nothing public changes until the build missions in §9 run.

Written by mission `critwire-learn-curriculum` (plan `plans/2026-10-23-critwire-learn-curriculum.md`); a section marked "(S<n>)" is written by that plan's step S<n>.

## 0. Conventions

How blocks are labelled, which engine runs them and how to re-run them (S13).

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

(S13)

## 2. The curriculum map

(S14)

## 3. Lab environments and setup

(S14)

## 4. Lab data

(S15)

## 5. Modules

### 5.1 Foundations

(S16, S17)

### 5.2 Database architecture

(S18–S23)

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

(S26)

### 5.7 Capstone

(S27)

## 6. ERDs

(S12)

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
| `postgis/learn_curriculum.sql` (all lab tables, with these two) | | 29,597,960 |

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

(S11: A.3.)

## B. Disagreements with 002 and 003

(S13)
