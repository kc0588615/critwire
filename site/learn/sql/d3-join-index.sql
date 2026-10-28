-- q: d3-join-index
-- status: ran
-- engine: postgis
-- after: d3-analyze, d3-btree
-- plan: rows 9
-- plan: Nested Loop
-- plan: Index Cond: (species_id = s.id)
-- plan: no Seq Scan on occurrences
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.slug = 'temmincks-pangolin';
