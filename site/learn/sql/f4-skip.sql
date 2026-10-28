-- q: f4-skip
-- status: ran
WITH per_year AS (
  SELECT species_id, year, count(*) AS records
  FROM occurrences
  WHERE year IS NOT NULL
  GROUP BY species_id, year
),
ranked AS (
  SELECT species_id, year, records,
         sum(records) OVER (PARTITION BY species_id) AS dated,
         row_number() OVER (PARTITION BY species_id ORDER BY records DESC, year DESC) AS place
  FROM per_year
)
SELECT species_id, year, records, dated, round(100.0 * records / dated, 1) AS share_pct
FROM ranked
WHERE place = 1 AND dated >= 1000
ORDER BY share_pct DESC, species_id;
