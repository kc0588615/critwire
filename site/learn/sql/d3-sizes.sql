-- q: d3-sizes
-- status: ran
-- engine: postgis
-- after: d3-brin-sorted
CREATE INDEX occurrences_by_year_btree ON occurrences_by_year (year);
SELECT pg_size_pretty(pg_relation_size('occurrences_by_year')) AS table_size,
       pg_size_pretty(pg_relation_size('occurrences_by_year_btree')) AS btree_size,
       pg_size_pretty(pg_relation_size('occurrences_by_year_brin')) AS brin_size;
