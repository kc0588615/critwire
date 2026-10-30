-- q: s1-ex
-- status: ran
WITH totals AS (
  SELECT species_id, count(*) AS records
  FROM occurrences
  GROUP BY species_id
  HAVING count(*) >= 100
), per_year AS (
  SELECT species_id, year, count(*) AS n,
         row_number() OVER (PARTITION BY species_id ORDER BY count(*) DESC, year) AS place
  FROM occurrences
  WHERE year IS NOT NULL
  GROUP BY species_id, year
)
SELECT s.common_name, t.records, p.year AS top_year, p.n AS top_year_records,
       round(100.0 * p.n / t.records, 1) AS top_pct
FROM totals AS t
JOIN per_year AS p ON p.species_id = t.species_id AND p.place = 1
JOIN species AS s ON s.id = t.species_id
ORDER BY top_pct DESC, t.records DESC, s.id;
