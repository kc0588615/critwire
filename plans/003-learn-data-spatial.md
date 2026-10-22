# 003: critwire Learn, growing the data and the spatial track

This extends [`002-learn.md`](002-learn.md) (engine, learners' schema, ERD and core lessons, all kept as they are) with what data critwire could add next and an advanced spatial track on PostGIS and the worldwide habitat map. It designs and measures; it builds nothing public. Every SQL block here was run by the spike or says why not (`-- status:`), and the build missions C and D start from the briefs in §7.

## 1. Growing the data

## 2. The grown schema and its ERD

The grown schema adds tables to 002's first version without renaming or changing any of it. Its setup runs after 002's `setup`, copied here byte for byte, with the row counts it gives today:

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

The row count of every table and of the view, today (`countries` is the spike's draft, so this block is `spike-table`):

```sql
-- q: setup-counts
-- status: spike-table
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

## 3. Lessons for the grown data

## 4. The advanced spatial track

The spatial lessons run in one of two places, and each lesson says which: in the browser (DuckDB's `spatial` extension, self-hosted as in 002, or geotiff.js reading a COG by HTTP ranges), or in your own PostgreSQL with PostGIS, where critwire supplies the data files and the setup below. SQL is written PostGIS-style (`ST_` functions); where DuckDB spells something differently, the lesson shows both.

### Your own PostGIS: the session and the tables

Raster lessons read the habitat map with PostGIS's out-db rasters: the database keeps only the raster's grid and a path, and GDAL fetches the pixels it needs from the file when a query asks for them. That is powerful, so PostgreSQL guards the two settings that allow it. `postgis.enable_outdb_rasters` lets GDAL open files outside the database, and `postgis.gdal_enabled_drivers` says which file formats it may read; with both on, a query can make the server read its own files or fetch any URL. Only a superuser may change them, unless a superuser allows your role once (PostgreSQL 15 or later):

```sh
# Once, as your server's superuser. Narrower than making your role a superuser, or ALTER DATABASE … SET for everyone.
psql -d <your database> -c "GRANT SET ON PARAMETER postgis.enable_outdb_rasters, postgis.gdal_enabled_drivers TO <your role>"
psql -d <your database> -c "CREATE EXTENSION IF NOT EXISTS postgis_raster" -c "CREATE SCHEMA IF NOT EXISTS learn_spatial"
```

Then start every session like this. The first line loads the raster library: a setting changed before it loads is quietly forgotten. The last line shows both settings, because a refused or misspelt `SET` can also fail without an error. If you don't see `on` and a list with `COG`, the raster lessons won't work in this session.

```sql
-- q: pg-session
-- status: ran
-- engine: postgis
SELECT postgis_raster_lib_version();
SET postgis.enable_outdb_rasters = on;
SET postgis.gdal_enabled_drivers = 'GTiff COG';
SET search_path = learn_spatial, public;
SELECT current_setting('postgis.enable_outdb_rasters') AS enable_outdb_rasters,
       current_setting('postgis.gdal_enabled_drivers') AS gdal_enabled_drivers;
```

```text
-- result: pg-session · 1 row · sha256 f9b08121f403
enable_outdb_rasters | gdal_enabled_drivers
on | GTiff COG
```

The lessons' tables live in their own schema, `learn_spatial`, built from the same files the browser lessons read: country shapes (Natural Earth, public domain), a sample of GBIF occurrence records (CC0 and CC BY only; records, not native range) and a clip of the habitat map around Costa Rica (Jung et al. 2020, CC BY 4.0), stored in the database so the lessons that use it don't touch the full file. The block below is how critwire builds them; in your own PostGIS, the lesson pages give import commands for the same files instead.

```sql
-- q: pg-setup
-- status: spike-table
-- engine: postgis
-- learn_spatial: the spatial lessons' tables, rebuilt from critwire's files. Each `-- rows:` or `-- bytes:` line names
-- the file passed as $1: a Parquet file's rows as JSON (geometry as WKB hex), or a file's bytes. Only learn_spatial is
-- touched, nothing in it refers to another schema's tables, and running it again gives the same tables.
DROP TABLE IF EXISTS learn_spatial.habitat_clips;
DROP TABLE IF EXISTS learn_spatial.occurrences;
DROP TABLE IF EXISTS learn_spatial.country_shapes;

CREATE TABLE learn_spatial.country_shapes (
  country_code text PRIMARY KEY,
  geom geometry(Geometry, 4326) NOT NULL
);

-- rows: country_shapes.parquet
INSERT INTO learn_spatial.country_shapes (country_code, geom)
SELECT r.country_code, ST_GeomFromWKB(decode(r.geom, 'hex'), 4326)
FROM jsonb_to_recordset($1::jsonb) AS r(country_code text, geom text);

CREATE INDEX country_shapes_geom ON learn_spatial.country_shapes USING gist (geom);

CREATE TABLE learn_spatial.occurrences (
  id bigint PRIMARY KEY,
  species_id integer NOT NULL,
  dataset_key text NOT NULL,
  license text NOT NULL,
  longitude double precision NOT NULL,
  latitude double precision NOT NULL,
  country_code text,
  year integer
);

-- rows: occurrences.parquet
INSERT INTO learn_spatial.occurrences (id, species_id, dataset_key, license, longitude, latitude, country_code, year)
SELECT r.id, r.species_id, r.dataset_key, r.license, r.longitude, r.latitude, r.country_code, r.year
FROM jsonb_to_recordset($1::jsonb) AS r(id bigint, species_id integer, dataset_key text, license text,
                                        longitude double precision, latitude double precision, country_code text, year integer);

-- The habitat map cut to Costa Rica, stored in the database: lessons that read it don't touch the full file.
CREATE TABLE learn_spatial.habitat_clips (
  clip text PRIMARY KEY,
  rast raster NOT NULL
);

-- bytes: clips/cr.cog.tif
INSERT INTO learn_spatial.habitat_clips (clip, rast)
VALUES ('cr', ST_FromGDALRaster($1));

ANALYZE learn_spatial.country_shapes;
ANALYZE learn_spatial.occurrences;
ANALYZE learn_spatial.habitat_clips;
```

What the setup built, today:

```sql
-- q: pg-setup-counts
-- status: spike-table
-- engine: postgis
SELECT (SELECT count(*) FROM country_shapes)              AS country_shapes,
       (SELECT sum(ST_NPoints(geom)) FROM country_shapes) AS shape_vertices,
       (SELECT count(*) FROM occurrences)                 AS occurrences,
       (SELECT count(*) FROM habitat_clips)               AS habitat_clips,
       (SELECT ST_Width(rast) || ' × ' || ST_Height(rast) || ' cells, SRID ' || ST_SRID(rast)
          FROM habitat_clips WHERE clip = 'cr')           AS cr_clip;
```

```text
-- result: pg-setup-counts · 1 row · sha256 ce70d0ac6e97
country_shapes | shape_vertices | occurrences | habitat_clips | cr_clip
250 | 551273 | 528 | 1 | 4923 × 6223 cells, SRID 3857
```

## 5. The habitat raster

## 6. IUCN

## 7. The build missions

## 8. For the owner

## Disagreements with 002
