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
