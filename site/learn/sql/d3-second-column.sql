-- q: d3-second-column
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-two-columns
-- plan: rows 107
-- plan: occurrences_species_year_idx
-- plan: Index Cond: ((year >= 1850) AND (year <= 1899))
-- plan: no Seq Scan
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, month
FROM occurrences
WHERE year BETWEEN 1850 AND 1899;
