-- q: d2-sources
-- status: ran
-- DuckDB only: sources is a list of structs in the published file
SELECT s.source, count(DISTINCT s.license) AS licenses, min(s.license) AS license, count(*) AS copies_in_file
FROM (SELECT unnest(sources) AS s FROM read_parquet('species.parquet'))
GROUP BY s.source
ORDER BY s.source;
