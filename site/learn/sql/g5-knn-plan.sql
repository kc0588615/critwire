-- q: g5-knn-plan
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 5
-- plan: Index Scan using occurrences_geom_idx
-- plan: Order By
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
ORDER BY o.geom <-> ST_SetSRID(ST_Point(147.33, -42.88), 4326)
LIMIT 5;
