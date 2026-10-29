-- critwire Learn, the lab database: what comes after the rows are in (lab-ddl.sql has the tables).
-- 1. Shapes: base64 WKB → geometry in WGS 84 (SRID 4326), one type per column (polygons become MultiPolygons);
--    each occurrence's point, a generated column from its longitude and latitude; the clips: base64 WKB → raster, one
--    band of 16-bit class codes in SRID 4326.
-- 2. Primary keys, unique keys and foreign keys, as in the browser's schema.
-- 3. GiST indexes on the shapes and the points.

ALTER TABLE country_shapes ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326));
ALTER TABLE admin1_shapes  ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326));
ALTER TABLE ecoregions     ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326) USING ST_Multi(ST_GeomFromWKB(decode(geom, 'base64'), 4326));
ALTER TABLE occurrences ADD COLUMN geom geometry(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;
ALTER TABLE habitat_clips ALTER COLUMN rast TYPE raster USING ST_RastFromWKB(decode(rast, 'base64'));
ALTER TABLE habitat_clips ADD CHECK (ST_SRID(rast) = 4326 AND ST_NumBands(rast) = 1 AND ST_BandPixelType(rast, 1) = '16BUI');

ALTER TABLE taxa ADD PRIMARY KEY (name);
ALTER TABLE taxa ADD FOREIGN KEY (parent_name) REFERENCES taxa (name);

ALTER TABLE species ADD PRIMARY KEY (id);
ALTER TABLE species ADD UNIQUE (slug);
ALTER TABLE species ADD UNIQUE (scientific_name);
ALTER TABLE species ADD UNIQUE (iucn_id);
ALTER TABLE species ADD UNIQUE (gbif_id);
ALTER TABLE species ADD UNIQUE (col_id);
ALTER TABLE species ADD UNIQUE (wikidata_id);
ALTER TABLE species ADD UNIQUE (inaturalist_id);
ALTER TABLE species ADD UNIQUE (ncbi_id);
ALTER TABLE species ADD FOREIGN KEY (genus) REFERENCES taxa (name);

ALTER TABLE sources ADD PRIMARY KEY (name);

ALTER TABLE species_sources ADD PRIMARY KEY (species_id, field);
ALTER TABLE species_sources ADD FOREIGN KEY (species_id) REFERENCES species (id);
ALTER TABLE species_sources ADD FOREIGN KEY (source_name) REFERENCES sources (name);

ALTER TABLE countries ADD PRIMARY KEY (code);
ALTER TABLE countries ADD UNIQUE (name);

ALTER TABLE species_countries ADD PRIMARY KEY (species_id, country_code);
ALTER TABLE species_countries ADD FOREIGN KEY (species_id) REFERENCES species (id);
ALTER TABLE species_countries ADD FOREIGN KEY (country_code) REFERENCES countries (code);

ALTER TABLE datasets ADD PRIMARY KEY (dataset_key);

ALTER TABLE occurrences ADD PRIMARY KEY (id);
ALTER TABLE occurrences ADD FOREIGN KEY (species_id) REFERENCES species (id);
ALTER TABLE occurrences ADD FOREIGN KEY (dataset_key) REFERENCES datasets (dataset_key);
ALTER TABLE occurrences ADD FOREIGN KEY (country_code) REFERENCES countries (code);

ALTER TABLE country_shapes ADD PRIMARY KEY (country_code);
ALTER TABLE country_shapes ADD FOREIGN KEY (country_code) REFERENCES countries (code);

ALTER TABLE admin1_shapes ADD PRIMARY KEY (adm1_code);
ALTER TABLE admin1_shapes ADD FOREIGN KEY (country_code) REFERENCES countries (code);

ALTER TABLE biomes ADD PRIMARY KEY (biome_id);

ALTER TABLE ecoregions ADD PRIMARY KEY (eco_id);
ALTER TABLE ecoregions ADD FOREIGN KEY (biome_id) REFERENCES biomes (biome_id);

ALTER TABLE habitat_classes ADD PRIMARY KEY (code);
ALTER TABLE habitat_classes ADD FOREIGN KEY (level1_code) REFERENCES habitat_classes (code);

ALTER TABLE country_habitats ADD PRIMARY KEY (country_code, habitat_code);
ALTER TABLE country_habitats ADD FOREIGN KEY (country_code) REFERENCES countries (code);
ALTER TABLE country_habitats ADD FOREIGN KEY (habitat_code) REFERENCES habitat_classes (code);

ALTER TABLE occurrence_habitats ADD PRIMARY KEY (occurrence_id);
ALTER TABLE occurrence_habitats ADD FOREIGN KEY (occurrence_id) REFERENCES occurrences (id);
ALTER TABLE occurrence_habitats ADD FOREIGN KEY (habitat_code) REFERENCES habitat_classes (code);

ALTER TABLE habitat_clips ADD PRIMARY KEY (clip);

CREATE INDEX ON country_shapes USING gist (geom);
CREATE INDEX ON admin1_shapes USING gist (geom);
CREATE INDEX ON ecoregions USING gist (geom);
CREATE INDEX ON occurrences USING gist (geom);
