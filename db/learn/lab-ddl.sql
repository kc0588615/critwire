-- critwire Learn, the lab database (PostGIS, schema learn_curriculum): its tables, before their rows.
-- Columns, NOT NULL and CHECK only; keys, foreign keys and indexes come after the load (lab-keys.sql), the usual order
-- for a bulk load. Shapes arrive as base64 WKB (text) and become geometry in lab-keys.sql.
-- 002's six tables and its view are the browser's schema (site/learn/sql/setup.sql) in PostgreSQL types.

CREATE TABLE taxa (
  name        text NOT NULL,
  taxon_rank  text NOT NULL CHECK (taxon_rank IN ('class', 'order', 'family', 'genus')),
  parent_name text,
  CHECK ((taxon_rank = 'class') = (parent_name IS NULL))
);

CREATE TABLE species (
  id              integer NOT NULL,
  slug            text NOT NULL,
  scientific_name text NOT NULL,
  common_name     text NOT NULL,
  genus           text NOT NULL,
  range_status    text NOT NULL CHECK (range_status IN ('ok', 'no-open-records', 'identity-unsettled')),
  photo_url       text,
  photo_credit    text,
  photo_license   text,
  photo_page      text,
  iucn_id         integer,
  gbif_id         bigint,
  col_id          text,
  wikidata_id     text,
  inaturalist_id  integer,
  ncbi_id         integer
);

CREATE TABLE sources (
  name      text NOT NULL,
  license   text NOT NULL,
  retrieved date
);

CREATE TABLE species_sources (
  species_id  integer NOT NULL,
  field       text NOT NULL,
  source_name text NOT NULL
);

CREATE TABLE countries (
  code      text NOT NULL,
  name      text NOT NULL,
  continent text NOT NULL,
  region    text NOT NULL,
  subregion text NOT NULL
);

-- Countries with open (CC0 / CC BY) occurrence records, not the native range.
CREATE TABLE species_countries (
  species_id   integer NOT NULL,
  country_code text NOT NULL
);

-- The GBIF datasets of the lab sample, each credited (title, publisher, DOI). license is the dataset's declared one.
CREATE TABLE datasets (
  dataset_key uuid NOT NULL,
  title       text NOT NULL,
  publisher   text NOT NULL,
  doi         text,
  license     text NOT NULL
);

-- The lab sample: open GBIF records (at most 2,000 per species), where someone recorded the animal, not where it lives.
-- license is the record's effective license (the more restrictive of its own and its dataset's). country_code_gbif is
-- GBIF's code as delivered (ZZ unknown, XZ international waters); country_code is that code only when it is a countries
-- row. geom (a generated point) is added after the load, in lab-keys.sql.
CREATE TABLE occurrences (
  id                       bigint NOT NULL,
  species_id               integer NOT NULL,
  dataset_key              uuid NOT NULL,
  license                  text NOT NULL CHECK (license IN ('CC0 1.0', 'CC BY 4.0')),
  basis_of_record          text NOT NULL CHECK (basis_of_record IN ('HUMAN_OBSERVATION', 'OBSERVATION',
                             'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN', 'MATERIAL_SAMPLE',
                             'MATERIAL_CITATION', 'OCCURRENCE')),
  longitude                double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude                 double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  coordinate_uncertainty_m double precision,
  country_code_gbif        text,
  country_code             text,
  year                     integer,
  month                    integer CHECK (month BETWEEN 1 AND 12)
);

-- Natural Earth admin-0, 1:50m (public domain).
CREATE TABLE country_shapes (
  country_code text NOT NULL,
  geom         text NOT NULL
);

-- Natural Earth admin-1, 1:50m (public domain): states and provinces of 9 countries only.
CREATE TABLE admin1_shapes (
  adm1_code    text NOT NULL,
  country_code text NOT NULL,
  name         text NOT NULL,
  geom         text NOT NULL
);

-- RESOLVE Ecoregions 2017 (CC BY 4.0), simplified to 0.05°.
CREATE TABLE biomes (
  biome_id integer NOT NULL,
  name     text NOT NULL
);

-- biome_id and realm are NULL for "Rock and Ice" only.
CREATE TABLE ecoregions (
  eco_id   integer NOT NULL,
  biome_id integer,
  name     text NOT NULL,
  realm    text,
  geom     text NOT NULL
);

-- The habitat map's classes (Jung et al. 2020, v004 legend, CC BY 4.0): level-2 classes point at their level-1 class.
CREATE TABLE habitat_classes (
  code        integer NOT NULL,
  level1_code integer,
  name        text NOT NULL,
  CHECK ((code % 100 = 0) = (level1_code IS NULL))
);

-- Estimated area of each habitat class per country (stand-in until L3).
CREATE TABLE country_habitats (
  country_code text NOT NULL,
  habitat_code integer NOT NULL,
  est_area_km2 numeric(12, 2) NOT NULL
);

CREATE VIEW species_taxonomy AS
SELECT s.id AS species_id, c.name AS class, o.name AS order_name, f.name AS family, g.name AS genus
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
JOIN taxa AS o ON o.name = f.parent_name
JOIN taxa AS c ON c.name = o.parent_name;
