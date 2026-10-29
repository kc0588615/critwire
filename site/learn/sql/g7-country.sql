-- q: g7-country
-- status: ran
-- engine: postgis
-- needs: raster
WITH cr AS (
  SELECT geom AS outline, ST_Area(geom::geography) / 1e6 AS outline_km2 FROM country_shapes WHERE country_code = 'CR'
), clipped AS (
  SELECT ST_Clip(h.rast, cr.outline) AS rast
  FROM habitat_clips AS h JOIN cr ON ST_Intersects(h.rast, cr.outline)
  WHERE h.clip = 'cr'
), by_row AS (
  SELECT p.val::integer AS habitat_code, m.upperlefty + (p.y - 0.5) * m.scaley AS lat, m.scalex AS d, count(*) AS cells
  FROM clipped AS c
  CROSS JOIN LATERAL ST_MetaData(c.rast) AS m
  CROSS JOIN LATERAL ST_PixelAsCentroids(c.rast, 1) AS p
  GROUP BY habitat_code, lat, d
), row_area AS MATERIALIZED (
  SELECT lat, ST_Area(ST_MakeEnvelope(0, lat - d / 2, d, lat + d / 2, 4326)::geography) / 1e6 AS cell_km2
  FROM (SELECT DISTINCT lat, d FROM by_row) AS r
), method1 AS (
  SELECT b.habitat_code, sum(b.cells * ra.cell_km2) AS km2
  FROM by_row AS b JOIN row_area AS ra USING (lat)
  GROUP BY b.habitat_code
), method3 AS (
  SELECT habitat_code, est_area_km2 AS km2 FROM country_habitats WHERE country_code = 'CR'
)
SELECT habitat_code, c.name,
       round(sum(m1.km2)::numeric, 2) AS method1_km2,
       round(sum(m3.km2), 2) AS method3_km2,
       round(100 * (sum(m3.km2) / sum(m1.km2)::numeric - 1), 1) AS diff_pct,
       round((100 * sum(m1.km2) / max(cr.outline_km2))::numeric, 2) AS pct_of_outline
FROM method1 AS m1
FULL JOIN method3 AS m3 USING (habitat_code)
LEFT JOIN habitat_classes AS c ON c.code = habitat_code
CROSS JOIN cr
GROUP BY ROLLUP ((habitat_code, c.name))
ORDER BY habitat_code IS NOT NULL, sum(m1.km2) DESC NULLS LAST, habitat_code;
