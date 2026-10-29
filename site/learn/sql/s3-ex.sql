-- q: s3-ex
-- status: ran
-- engine: postgis
WITH band AS (
  SELECT i, count(*) AS k FROM s4_neighbours WHERE edge_m = 5000 GROUP BY i
), reach AS (
  SELECT band.k, a.n,
         (SELECT ST_Distance(ST_Point(a.cx, a.cy), ST_Point(c.cx, c.cy))
          FROM s4_cells AS c
          WHERE c.edge_m = a.edge_m AND c.id <> a.id
          ORDER BY 1, c.id
          OFFSET 5 LIMIT 1) AS d6_m
  FROM s4_cells AS a JOIN band ON band.i = a.id
  WHERE a.edge_m = 5000
)
SELECT k AS band_neighbours, count(*) AS cells, sum(n) AS records,
       round((min(d6_m) / 1000)::numeric, 2) AS shortest_km,
       round((max(d6_m) / 1000)::numeric, 2) AS longest_km
FROM reach
GROUP BY k
ORDER BY k;
