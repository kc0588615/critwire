-- q: s2-quadrats
-- status: ran
-- engine: postgis
SELECT edge_m, count(*) AS cells, sum(n) AS records,
       round(avg(n), 3) AS mean,
       round(var_samp(n), 2) AS variance,
       round(var_samp(n) / avg(n), 1) AS vmr
FROM s4_cells
GROUP BY edge_m
ORDER BY edge_m;
