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
