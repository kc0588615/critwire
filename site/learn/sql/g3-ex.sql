-- q: g3-ex
-- status: ran
-- engine: postgis
WITH outlines AS MATERIALIZED (
  SELECT country_code, geom, ST_Area(geom::geography) AS m2 FROM country_shapes
), hits AS (
  SELECT c.country_code, row_number() OVER (PARTITION BY o.id ORDER BY c.m2) AS rank
  FROM outlines AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
)
SELECT CASE WHEN GROUPING(country_code) = 1 THEN 'all' ELSE country_code END AS country,
       count(*) AS every_outline, count(*) FILTER (WHERE rank = 1) AS smallest_outline
FROM hits
GROUP BY ROLLUP (country_code)
HAVING count(*) <> count(*) FILTER (WHERE rank = 1)
ORDER BY GROUPING(country_code), country_code;
