-- q: d3-gist-join
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 184
-- plan: Index Scan using country_shapes_pkey
-- plan: Index Cond: (geom @ cs.geom)
-- plan: Filter: st_covers(cs.geom, geom)
-- plan: no Seq Scan on occurrences
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT o.id, o.year
FROM country_shapes AS cs
JOIN occurrences AS o ON ST_Covers(cs.geom, o.geom)
WHERE cs.country_code = 'NP';
