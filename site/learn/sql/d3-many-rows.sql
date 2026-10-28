-- q: d3-many-rows
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 29261
-- plan: Seq Scan on occurrences
-- plan: no occurrences_year_idx
CREATE INDEX occurrences_year_idx ON occurrences (year);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, species_id
FROM occurrences
WHERE year >= 2000;
