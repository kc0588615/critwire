-- q: g7-estimate
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2007, 9.8493, -83.4501, 10.5999, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
), cells AS (
  SELECT p.val::integer AS habitat_code, p.y AS row
  FROM w
  JOIN country_shapes AS cs ON cs.country_code = 'CR'
  CROSS JOIN LATERAL ST_PixelAsCentroids(ST_Clip(w.rast, cs.geom), 1) AS p
), by_row AS (
  SELECT habitat_code, row, count(*) AS cells
  FROM cells
  GROUP BY habitat_code, row
), row_area AS MATERIALIZED (
  SELECT r.row, ST_Area(ST_PixelAsPolygon(w.rast, 1, r.row)::geography) / 1e6 AS cell_km2
  FROM w, (SELECT DISTINCT row FROM by_row) AS r
), est AS (
  SELECT b.habitat_code, sum(b.cells) AS cells, sum(b.cells * ra.cell_km2) AS est_km2
  FROM by_row AS b JOIN row_area AS ra USING (row)
  GROUP BY b.habitat_code
)
SELECT e.habitat_code, c.name, e.cells,
       round(e.cells * 0.01, 2) AS map_km2,
       round(e.est_km2::numeric, 2) AS est_km2,
       round((100 * e.est_km2 / sum(e.est_km2) OVER ())::numeric, 1) AS pct
FROM est AS e
LEFT JOIN habitat_classes AS c ON c.code = e.habitat_code
ORDER BY e.cells DESC, e.habitat_code;
