-- q: g5-ex
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 20
-- plan: Index Scan using occurrences_geography_idx
-- plan: Order By: ((geom)::geography <->
-- plan: no Sort
-- plan: no Seq Scan
CREATE INDEX occurrences_geography_idx ON occurrences USING gist ((geom::geography));
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
ORDER BY o.geom::geography <-> ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography
LIMIT 20;
