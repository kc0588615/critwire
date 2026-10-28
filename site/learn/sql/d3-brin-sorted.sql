-- q: d3-brin-sorted
-- status: ran
-- engine: postgis
-- plan: rows 26
-- plan: Bitmap Index Scan on occurrences_by_year_brin
-- plan: Heap Blocks: lossy=128
CREATE TABLE occurrences_by_year AS
SELECT * FROM occurrences ORDER BY year, id;
CREATE INDEX occurrences_by_year_brin ON occurrences_by_year USING brin (year);
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences_by_year;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences_by_year
WHERE year BETWEEN 1850 AND 1859;
