-- q: d3-two-columns
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 182
-- plan: occurrences_species_year_idx
-- plan: Index Cond: ((species_id = 48) AND (year = 2010))
-- plan: no Seq Scan
CREATE INDEX occurrences_species_year_idx ON occurrences (species_id, year);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, month
FROM occurrences
WHERE species_id = 48 AND year = 2010;
