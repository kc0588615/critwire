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
