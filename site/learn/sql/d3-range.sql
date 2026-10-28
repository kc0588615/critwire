-- q: d3-range
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-many-rows
-- plan: rows 26
-- plan: occurrences_year_idx
-- plan: Index Cond: ((year >= 1850) AND (year <= 1859))
-- plan: no Seq Scan
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year BETWEEN 1850 AND 1859;
