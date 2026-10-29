-- q: g5-coast
-- status: ran
-- engine: postgis
WITH inside AS (
  SELECT DISTINCT o.id FROM country_shapes AS c JOIN occurrences AS o ON ST_Covers(c.geom, o.geom)
), nearest AS (
  SELECT o.id, o.country_code_gbif, n.country_code,
         ST_Distance(o.geom::geography, n.geom::geography) / 1000 AS km
  FROM occurrences AS o
  CROSS JOIN LATERAL (SELECT c.country_code, c.geom FROM country_shapes AS c ORDER BY c.geom <-> o.geom LIMIT 1) AS n
  WHERE o.id NOT IN (SELECT id FROM inside)
)
SELECT CASE WHEN km < 1 THEN 'under 1 km' WHEN km < 5 THEN '1 to 5 km' WHEN km < 25 THEN '5 to 25 km' ELSE '25 km or more' END AS distance,
       count(*) AS records,
       count(*) FILTER (WHERE country_code = country_code_gbif) AS nearest_is_gbif_country,
       round(max(km)::numeric, 1) AS max_km
FROM nearest
GROUP BY 1
ORDER BY min(km);
