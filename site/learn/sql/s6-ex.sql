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
