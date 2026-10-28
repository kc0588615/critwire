-- q: d3-distance
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 186
-- plan: Join Filter: (st_distance(
-- plan: Seq Scan on occurrences o
-- plan: no occurrences_geom_idx
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM admin1_shapes AS a
JOIN occurrences AS o ON ST_Distance(o.geom, ST_PointOnSurface(a.geom)) < 0.5
WHERE a.name = 'Tasmania';
