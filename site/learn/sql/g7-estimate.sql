-- q: g7-estimate
-- status: ran
-- engine: postgis
-- needs: raster
WITH cells AS (
  SELECT p.val::integer AS habitat_code, p.y AS row
  FROM habitat_clips AS h
  JOIN country_shapes AS cs ON cs.country_code = 'CR'
  CROSS JOIN LATERAL ST_PixelAsCentroids(ST_Clip(h.rast, cs.geom), 1) AS p
  WHERE h.clip = 'cr'
), by_row AS (
  SELECT habitat_code, row, count(*) AS cells
  FROM cells
  GROUP BY habitat_code, row
), row_area AS MATERIALIZED (
  SELECT r.row, ST_Area(ST_PixelAsPolygon(h.rast, 1, r.row)::geography) / 1e6 AS cell_km2
  FROM habitat_clips AS h, (SELECT DISTINCT row FROM by_row) AS r
  WHERE h.clip = 'cr'
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
