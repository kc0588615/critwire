-- q: g3-edges
-- status: ran
-- engine: postgis
SELECT count(*) FILTER (WHERE ST_Contains(c.geom, o.geom)) AS contains,
       count(*) FILTER (WHERE ST_Covers(c.geom, o.geom)) AS covers,
       count(*) AS intersects
FROM country_shapes AS c
JOIN occurrences AS o ON ST_Intersects(c.geom, o.geom);
