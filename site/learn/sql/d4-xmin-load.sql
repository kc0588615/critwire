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
