-- q: s3-contiguity
-- status: ran
-- engine: postgis
SELECT c.edge_m, k.k AS neighbours, count(*) AS cells
FROM s4_cells AS c
CROSS JOIN LATERAL (SELECT count(*) AS k FROM s4_neighbours AS nb WHERE nb.i = c.id) AS k
GROUP BY c.edge_m, k.k
ORDER BY c.edge_m, k.k;
