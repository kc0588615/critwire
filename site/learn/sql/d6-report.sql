-- q: d6-report
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT sp.class, c.continent, count(*) AS records
FROM fact_records AS f
JOIN dim_species AS sp ON sp.species_id = f.species_id
JOIN dim_country AS c ON c.country_code = f.country_code
JOIN dim_year AS y ON y.year = f.year
WHERE y.decade >= 2000
GROUP BY sp.class, c.continent
ORDER BY sp.class, c.continent;
