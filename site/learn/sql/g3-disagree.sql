-- q: g3-disagree
-- status: ran
-- engine: postgis
WITH hits AS (
  SELECT o.id, o.country_code_gbif AS gbif_code,
         string_agg(c.country_code, '+' ORDER BY c.country_code) AS outline_code,
         bool_or(c.country_code = o.country_code_gbif) AS agrees
  FROM country_shapes AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
  GROUP BY o.id, o.country_code_gbif
)
SELECT gbif_code, outline_code, count(*) AS records
FROM hits
WHERE NOT agrees
GROUP BY gbif_code, outline_code
ORDER BY records DESC, gbif_code, outline_code
LIMIT 10;
