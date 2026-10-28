-- q: d3-function
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-many-rows
-- plan: rows 26
-- plan: Seq Scan on occurrences
-- plan: Filter: ((year / 10) = 185)
-- plan: no occurrences_year_idx
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year / 10 = 185;
