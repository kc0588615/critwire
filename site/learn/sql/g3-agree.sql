-- q: g3-agree
-- status: ran
-- engine: postgis
WITH hits AS (
  SELECT o.id, count(*) AS outlines, bool_or(c.country_code = o.country_code_gbif) AS agrees
  FROM country_shapes AS c
  JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
  GROUP BY o.id
)
SELECT CASE WHEN h.id IS NULL THEN 'no outline' WHEN h.agrees THEN 'agree' ELSE 'disagree' END AS outcome,
       count(*) AS records,
       count(*) FILTER (WHERE h.outlines > 1) AS in_two_outlines
FROM occurrences AS o
LEFT JOIN hits AS h ON h.id = o.id
GROUP BY 1
ORDER BY 1;
