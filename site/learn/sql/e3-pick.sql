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
