-- q: s4-ex
-- status: ran
-- engine: postgis
WITH v AS (
  SELECT id, edge_m, CASE WHEN n > 0 THEN 1.0 ELSE 0.0 END::float8 AS y FROM s4_cells
), z AS (
  SELECT id, edge_m, y - avg(y) OVER (PARTITION BY edge_m) AS z FROM v
), w AS (
  SELECT edge_m, i, j, 1 / count(*) OVER (PARTITION BY i)::float8 AS w FROM s4_neighbours
), pairs AS (
  SELECT w.edge_m, w.i, w.j, w.w AS w_ij, t.w AS w_ji
  FROM w JOIN w AS t ON t.i = w.j AND t.j = w.i
), sums AS (
  SELECT p.edge_m,
         sum(p.w_ij * zi.z * zj.z) AS wzz,
         sum(p.w_ij) AS s0,
         sum((p.w_ij + p.w_ji) ^ 2) / 2 AS s1
  FROM pairs AS p JOIN z AS zi ON zi.id = p.i JOIN z AS zj ON zj.id = p.j
  GROUP BY p.edge_m
), s2 AS (
  SELECT edge_m, sum(ws ^ 2) AS s2
  FROM (SELECT edge_m, i, sum(w_ij) + sum(w_ji) AS ws FROM pairs GROUP BY edge_m, i) AS cell
  GROUP BY edge_m
), cells AS (
  SELECT z.edge_m, count(*)::float8 AS n, sum(z.z * z.z) AS zz, sum(v.y)::integer AS with_records
  FROM z JOIN v USING (id)
  GROUP BY z.edge_m
), moran AS (
  SELECT c.edge_m, c.n, c.with_records,
         c.n / s.s0 * s.wzz / c.zz AS i,
         -1 / (c.n - 1) AS ei,
         (c.n ^ 2 * s.s1 - c.n * s2.s2 + 3 * s.s0 ^ 2) / ((c.n - 1) * (c.n + 1) * s.s0 ^ 2) - (1 / (c.n - 1)) ^ 2 AS var_norm
  FROM cells AS c JOIN sums AS s USING (edge_m) JOIN s2 USING (edge_m)
)
SELECT edge_m, n::integer AS n, with_records,
       round(i::numeric, 6) AS i,
       round(ei::numeric, 6) AS ei,
       round(((i - ei) / sqrt(var_norm))::numeric, 2) AS z
FROM moran
ORDER BY edge_m;
