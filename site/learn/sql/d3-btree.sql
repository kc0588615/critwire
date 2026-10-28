-- q: d3-btree
-- status: ran
-- engine: postgis
-- after: d3-analyze
-- plan: rows 9
-- plan: Bitmap Index Scan on occurrences_species_id_idx
-- plan: Index Cond: (species_id = 63)
-- plan: Heap Blocks: exact=6
-- plan: no Seq Scan
CREATE INDEX occurrences_species_id_idx ON occurrences (species_id);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, year, month
FROM occurrences
WHERE species_id = 63;
