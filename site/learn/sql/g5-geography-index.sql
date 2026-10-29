-- q: g5-geography-index
-- status: ran
-- engine: postgis
-- after: g5-analyze
-- plan: rows 55
-- plan: Bitmap Index Scan on occurrences_geography_idx
CREATE INDEX occurrences_geography_idx ON occurrences USING gist ((geom::geography));
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id
FROM occurrences AS o
WHERE ST_DWithin(o.geom::geography, ST_SetSRID(ST_Point(147.33, -42.88), 4326)::geography, 20000);
