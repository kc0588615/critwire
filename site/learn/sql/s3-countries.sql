-- q: s3-countries
-- status: ran
-- engine: postgis
WITH pairs AS (
  SELECT a.country_code, b.country_code AS other, ST_Touches(a.geom, b.geom) AS touches
  FROM country_shapes AS a
  LEFT JOIN country_shapes AS b ON b.country_code <> a.country_code AND ST_Intersects(a.geom, b.geom)
), per_country AS (
  SELECT country_code, count(other) AS intersecting, count(other) FILTER (WHERE touches) AS touching
  FROM pairs
  GROUP BY country_code
)
SELECT count(*) AS countries,
       count(*) FILTER (WHERE intersecting = 0) AS islands,
       count(*) FILTER (WHERE touching = 0) AS islands_by_touches,
       count(*) FILTER (WHERE intersecting > touching) AS overlapping,
       max(intersecting) AS most_neighbours
FROM per_country;
