-- q: s5-ex
-- status: ran
-- engine: postgis
-- after: s5-gistar
WITH devils AS (
  SELECT o.dataset_key, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), placed AS (
  SELECT d.dataset_key, g.fdr AND g.z > 0 AS hot
  FROM devils AS d
  JOIN s4_cells AS c ON c.edge_m = 5000 AND ST_Contains(c.geom, d.geom)
  JOIN s5_gistar AS g ON g.id = c.id
)
SELECT ds.title,
       count(*) FILTER (WHERE p.hot) AS hot_records,
       round(100.0 * count(*) FILTER (WHERE p.hot) / sum(count(*) FILTER (WHERE p.hot)) OVER (), 1) AS hot_pct,
       count(*) AS records_in_cells,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM placed AS p JOIN datasets AS ds USING (dataset_key)
GROUP BY ds.title
ORDER BY hot_records DESC, records_in_cells DESC, ds.title;
