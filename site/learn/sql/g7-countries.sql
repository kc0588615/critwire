-- q: g7-countries
-- status: ran
-- engine: postgis
-- needs: raster
WITH est AS (
  SELECT country_code, sum(est_area_km2) AS est_km2 FROM country_habitats GROUP BY country_code
), cmp AS (
  SELECT cs.country_code, ST_Area(cs.geom::geography) / 1e6 AS outline_km2, coalesce(e.est_km2, 0) AS est_km2
  FROM country_shapes AS cs LEFT JOIN est AS e USING (country_code)
), banded AS (
  SELECT *, abs(est_km2 - outline_km2) / outline_km2 AS err,
         CASE WHEN abs(est_km2 - outline_km2) / outline_km2 < 0.01 THEN 'under 1 %'
              WHEN abs(est_km2 - outline_km2) / outline_km2 < 0.05 THEN '1 to 5 %'
              WHEN abs(est_km2 - outline_km2) / outline_km2 < 0.2 THEN '5 to 20 %'
              ELSE '20 % or more' END AS error
  FROM cmp
)
SELECT coalesce(error, 'all') AS error, count(*) AS countries,
       round(max(outline_km2)::numeric, 2) AS largest_km2,
       round(sum(outline_km2)::numeric) AS outline_km2, round(sum(est_km2)) AS est_km2,
       round(sum(est_km2) / sum(outline_km2)::numeric, 6) AS est_over_outline,
       CASE WHEN GROUPING(error) = 0 THEN
         string_agg(country_code || ' ' || to_char(100 * (est_km2 - outline_km2) / outline_km2, 'FMSG990.0'), ', ' ORDER BY err DESC)
           FILTER (WHERE err >= 0.05) END AS worst_pct
FROM banded
GROUP BY ROLLUP (error)
ORDER BY error IS NOT NULL, min(err);
