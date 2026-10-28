-- q: d3-few-rows
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-many-rows
-- plan: rows 74
-- plan: occurrences_year_idx
-- plan: Index Cond: (year >= 2026)
-- plan: no Seq Scan
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year >= 2026;
