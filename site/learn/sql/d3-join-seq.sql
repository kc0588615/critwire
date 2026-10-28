-- q: d3-join-seq
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 9
-- plan: Hash Join
-- plan: Seq Scan on occurrences o (actual rows=40395
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.slug = 'temmincks-pangolin';
