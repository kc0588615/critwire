-- q: g3-two-outlines
-- status: ran
-- engine: postgis
WITH hits AS (
  SELECT o.id, o.country_code_gbif AS gbif_code, string_agg(c.country_code, '+' ORDER BY c.country_code) AS outlines
  FROM country_shapes AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
  GROUP BY o.id, o.country_code_gbif
  HAVING count(*) > 1
)
SELECT outlines, gbif_code, count(*) AS records
FROM hits
GROUP BY outlines, gbif_code
ORDER BY records DESC, outlines, gbif_code;
