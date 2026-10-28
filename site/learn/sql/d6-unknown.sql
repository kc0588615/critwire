-- q: d6-unknown
-- status: ran
-- engine: postgis
-- after: d6-at-sea, d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT 1 AS step, 'occurrences' AS counted, count(*) AS records FROM occurrences
UNION ALL
SELECT 2, 'occurrences joined to countries', count(*)
FROM occurrences AS o JOIN countries AS c ON c.code = o.country_code
UNION ALL
SELECT 3, 'fact_records joined to dim_country', count(*)
FROM fact_records AS f JOIN dim_country AS c ON c.country_code = f.country_code
UNION ALL
SELECT 4, 'of them in ZZ', count(*) FROM fact_records WHERE country_code = 'ZZ'
UNION ALL
SELECT 5, 'of them in year -1', count(*) FROM fact_records WHERE year = -1
ORDER BY step;
