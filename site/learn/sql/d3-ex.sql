-- q: d3-ex
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 20
-- plan: occurrences_species_year_id_idx
-- plan: Index Cond: ((species_id = 48) AND (year >= 2000) AND (year <= 2009))
-- plan: no Sort
-- plan: no Seq Scan
CREATE INDEX occurrences_species_year_id_idx ON occurrences (species_id, year, id);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2009
ORDER BY year DESC, id DESC
LIMIT 20;
