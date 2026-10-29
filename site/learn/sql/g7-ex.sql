-- q: g7-ex
-- status: ran
-- engine: postgis
-- needs: raster
WITH grid (x0, y0, d) AS (
  VALUES (-180.0099155291168, 90.00297126602864, 0.009915667822884942)
), win AS (
  SELECT h.rast, cs.geom AS outline
  FROM habitat_clips AS h JOIN country_shapes AS cs ON cs.country_code = 'AU'
  WHERE h.clip = 'tas'
), px AS (
  SELECT p.val::integer AS habitat_code, p.y AS row_100m,
         floor((ST_X(p.geom) - g.x0) / g.d)::integer AS col_1km, floor((g.y0 - ST_Y(p.geom)) / g.d)::integer AS row_1km,
         ST_Intersects(w.outline, p.geom) AS inside
  FROM win AS w, grid AS g, ST_PixelAsCentroids(w.rast, 1) AS p
), area_100m AS MATERIALIZED (
  SELECT r.row_100m, ST_Area(ST_PixelAsPolygon(w.rast, 1, r.row_100m)::geography) / 1e6 AS km2
  FROM win AS w, (SELECT DISTINCT row_100m FROM px) AS r
), cells_1km AS MATERIALIZED (
  SELECT k.col_1km, k.row_1km, ST_Area(k.cell::geography) / 1e6 AS km2,
         ST_Intersects(w.outline, ST_Centroid(k.cell)) AS centre_inside,
         ST_Covers(ST_Envelope(w.rast), k.cell) AS whole
  FROM (SELECT DISTINCT col_1km, row_1km FROM px) AS c
  CROSS JOIN grid AS g
  CROSS JOIN LATERAL (SELECT c.col_1km, c.row_1km,
                             ST_MakeEnvelope(g.x0 + c.col_1km * g.d, g.y0 - (c.row_1km + 1) * g.d,
                                             g.x0 + (c.col_1km + 1) * g.d, g.y0 - c.row_1km * g.d, 4326) AS cell) AS k
  CROSS JOIN win AS w
), counted AS (
  SELECT px.*, count(*) OVER w AS n_1km, count(*) FILTER (WHERE px.inside) OVER w AS n_inside,
         k.km2 AS km2_1km, k.centre_inside, a.km2 AS km2_100m
  FROM px JOIN cells_1km AS k USING (col_1km, row_1km) JOIN area_100m AS a USING (row_100m)
  WHERE k.whole
  WINDOW w AS (PARTITION BY px.col_1km, px.row_1km)
)
SELECT habitat_code,
       round(sum(km2_100m) FILTER (WHERE inside)::numeric, 2) AS method1_km2,
       round(sum(km2_1km / n_1km) FILTER (WHERE centre_inside)::numeric, 2) AS method3_km2,
       round((100 * (sum(km2_1km / n_1km) FILTER (WHERE centre_inside) / sum(km2_100m) FILTER (WHERE inside) - 1))::numeric, 1) AS diff_pct,
       round((100 * coalesce(sum(km2_100m) FILTER (WHERE inside AND n_inside < n_1km), 0)
                  / sum(km2_100m) FILTER (WHERE inside))::numeric, 1) AS border_pct
FROM counted
GROUP BY ROLLUP (habitat_code)
HAVING sum(km2_100m) FILTER (WHERE inside) >= 1
ORDER BY habitat_code NULLS FIRST;
