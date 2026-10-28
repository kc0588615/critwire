-- q: d3-dwithin
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 186
-- plan: Bitmap Index Scan on occurrences_geom_idx
-- plan: Index Cond: (geom && st_expand(
-- plan: no Seq Scan on occurrences
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM admin1_shapes AS a
JOIN occurrences AS o ON ST_DWithin(o.geom, ST_PointOnSurface(a.geom), 0.5)
WHERE a.name = 'Tasmania';
