-- q: s5-gistar
-- status: ran
-- engine: postgis
CREATE OR REPLACE TEMP VIEW s5_gistar AS
WITH c AS (
  SELECT id, y FROM s4_cells WHERE edge_m = 5000
), stats AS (
  SELECT count(*)::float8 AS n, avg(y) AS ybar, sqrt(avg(y * y) - avg(y) ^ 2) AS s FROM c
), w AS (
  SELECT i, j FROM s4_neighbours WHERE edge_m = 5000
  UNION ALL
  SELECT id, id FROM c
), sums AS (
  SELECT w.i, sum(c.y) AS wy, count(*)::float8 AS wsum
  FROM w JOIN c ON c.id = w.j
  GROUP BY w.i
), z AS (
  SELECT u.i, (u.wy - st.ybar * u.wsum) / (st.s * sqrt((st.n * u.wsum - u.wsum ^ 2) / (st.n - 1))) AS z
  FROM sums AS u, stats AS st
), p AS (
  SELECT i, z, erfc(abs(z) / sqrt(2)) AS p,
         row_number() OVER (ORDER BY erfc(abs(z) / sqrt(2)), i) AS rank,
         count(*) OVER () AS m
  FROM z
), cut AS (
  SELECT coalesce(max(rank) FILTER (WHERE p <= rank * 0.05 / m), 0) AS k FROM p
)
SELECT p.i AS id, p.z, p.p, p.rank <= cut.k AS fdr
FROM p, cut;
SELECT count(*) AS cells,
       count(*) FILTER (WHERE z > 0 AND p <= 0.05) AS hot_05,
       count(*) FILTER (WHERE z < 0 AND p <= 0.05) AS cold_05,
       count(*) FILTER (WHERE z > 0 AND fdr) AS hot_fdr,
       count(*) FILTER (WHERE z < 0 AND fdr) AS cold_fdr,
       round(max(z)::numeric, 6) AS max_z,
       round(min(z)::numeric, 6) AS min_z
FROM s5_gistar;
