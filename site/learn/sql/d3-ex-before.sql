-- q: d3-ex-before
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 20
-- plan: Sort Key: year DESC, id DESC
-- plan: Seq Scan on occurrences (actual rows=1390
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2009
ORDER BY year DESC, id DESC
LIMIT 20;
