-- q: s3-islands
-- status: ran
-- engine: postgis
SELECT a.country_code, c.name, count(o.id) AS records
FROM country_shapes AS a
JOIN countries AS c ON c.code = a.country_code
JOIN occurrences AS o ON o.country_code = a.country_code
WHERE NOT EXISTS (SELECT 1 FROM country_shapes AS b
                  WHERE b.country_code <> a.country_code AND ST_Intersects(a.geom, b.geom))
GROUP BY a.country_code, c.name
ORDER BY records DESC, a.country_code;
