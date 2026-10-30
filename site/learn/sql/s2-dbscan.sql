-- q: s2-dbscan
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), devils AS (
  SELECT o.id, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id, island
  WHERE s.scientific_name = 'Sarcophilus harrisii'
    AND ST_Contains(island.geom, ST_Transform(o.geom, 3577))
), labelled AS (
  SELECT id, geom, ST_ClusterDBSCAN(geom, eps := 2000, minpoints := 20) OVER () AS cluster
  FROM devils
), clusters AS (
  SELECT cluster, count(*) AS points, count(DISTINCT (ST_X(geom), ST_Y(geom))) AS locations
  FROM labelled
  GROUP BY cluster
)
SELECT count(*) FILTER (WHERE cluster IS NOT NULL) AS clusters,
       sum(points) FILTER (WHERE cluster IS NOT NULL) AS clustered,
       sum(points) FILTER (WHERE cluster IS NULL) AS noise,
       max(points) FILTER (WHERE cluster IS NOT NULL) AS largest,
       count(*) FILTER (WHERE cluster IS NOT NULL AND locations = 1) AS one_location_clusters
FROM clusters;
