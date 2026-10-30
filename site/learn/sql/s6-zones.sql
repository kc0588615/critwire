-- q: s6-zones
-- status: ran
-- engine: postgis
WITH country AS (
  SELECT geom FROM country_shapes WHERE country_code = 'CR'
), zones AS (
  SELECT e.eco_id, e.name, ST_Intersection(e.geom, country.geom) AS geom
  FROM ecoregions AS e, country
  WHERE ST_Intersects(e.geom, country.geom)
), records AS (
  SELECT o.id, o.species_id, o.geom
  FROM occurrences AS o, country
  WHERE o.country_code = 'CR' AND ST_Contains(country.geom, o.geom)
), per_zone AS (
  SELECT z.eco_id, z.name, ST_Area(z.geom::geography) / 1e6 AS km2,
         count(r.id) AS records,
         count(r.id) FILTER (WHERE r.species_id = (SELECT id FROM species WHERE scientific_name = 'Panthera onca')) AS jaguar
  FROM zones AS z
  LEFT JOIN records AS r ON ST_Contains(z.geom, r.geom)
  GROUP BY z.eco_id, z.name, z.geom
)
SELECT eco_id, name, round(km2::numeric) AS km2, records, jaguar,
       round((1000 * records / km2)::numeric, 1) AS per_1000_km2,
       round(((records / sum(records) OVER ()) / (km2 / sum(km2) OVER ()))::numeric, 2) AS record_ratio,
       round(((jaguar::numeric / nullif(records, 0)) / (sum(jaguar) OVER () / sum(records) OVER ()))::numeric, 2) AS jaguar_ratio
FROM per_zone
ORDER BY km2 DESC, eco_id;
