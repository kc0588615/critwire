-- q: s5-lisa-sql
-- status: ran
-- engine: postgis
WITH c AS (
  SELECT id, n, y - avg(y) OVER () AS z FROM s4_cells WHERE edge_m = 5000
), lag AS (
  SELECT nb.i AS id, avg(c.z) AS lag
  FROM s4_neighbours AS nb JOIN c ON c.id = nb.j
  WHERE nb.edge_m = 5000
  GROUP BY nb.i
), q AS (
  SELECT c.id, c.n,
         CASE WHEN c.z > 0 AND l.lag > 0 THEN 1
              WHEN c.z <= 0 AND l.lag > 0 THEN 2
              WHEN c.z <= 0 AND l.lag <= 0 THEN 3
              ELSE 4 END AS q
  FROM c JOIN lag AS l USING (id)
)
SELECT (ARRAY['high-high', 'low-high', 'low-low', 'high-low'])[q] AS quadrant,
       count(*) AS cells,
       sum(n) AS records
FROM q
GROUP BY q
ORDER BY q;
