-- q: s3-knn
-- status: ran
-- engine: postgis
WITH near AS (
  SELECT a.id AS i, b.id AS j, b.d_m
  FROM s4_cells AS a
  CROSS JOIN LATERAL (
    SELECT c.id, round(ST_Distance(ST_Point(a.cx, a.cy), ST_Point(c.cx, c.cy))::numeric, 2) AS d_m
    FROM s4_cells AS c
    WHERE c.edge_m = a.edge_m AND c.id <> a.id
    ORDER BY d_m, c.id
    LIMIT 7
  ) AS b
  WHERE a.edge_m = 5000
), ranked AS (
  SELECT i, j, d_m, row_number() OVER (PARTITION BY i ORDER BY d_m, j) AS rank FROM near
)
SELECT k.k,
       count(*) FILTER (WHERE r.rank <= k.k) AS links,
       count(*) FILTER (WHERE r.rank <= k.k AND NOT EXISTS (
         SELECT 1 FROM ranked AS back WHERE back.i = r.j AND back.j = r.i AND back.rank <= k.k)) AS one_way,
       count(*) FILTER (WHERE r.rank = k.k AND r.d_m = (
         SELECT nx.d_m FROM ranked AS nx WHERE nx.i = r.i AND nx.rank = k.k + 1)) AS tied_cells
FROM ranked AS r, (VALUES (4), (6)) AS k (k)
GROUP BY k.k
ORDER BY k.k;
