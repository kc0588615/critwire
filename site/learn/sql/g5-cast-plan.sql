-- q: g5-cast-plan
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 55
-- plan: Seq Scan on occurrences
-- plan: no Index
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
WHERE ST_DWithin(o.geom::geography, ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography, 20000);
