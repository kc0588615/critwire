-- q: d3-seq
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 9
-- plan: Seq Scan on occurrences
-- plan: Rows Removed by Filter: 40386
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 63;
