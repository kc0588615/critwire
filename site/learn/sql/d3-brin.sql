-- q: d3-brin
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 26
-- plan: Bitmap Index Scan on occurrences_year_brin
-- plan: Heap Blocks: lossy=512
CREATE INDEX occurrences_year_brin ON occurrences USING brin (year);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year BETWEEN 1850 AND 1859;
