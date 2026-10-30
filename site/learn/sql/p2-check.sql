-- q: p2-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-fact-species-country
SELECT c.continent,
       r.records,
       r.species AS species_recorded,
       l.species AS species_listed
FROM (SELECT DISTINCT continent FROM dim_country) AS c
LEFT JOIN (SELECT d.continent, count(*) AS records, count(DISTINCT f.species_id) AS species
           FROM fact_records AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS r ON r.continent = c.continent
LEFT JOIN (SELECT d.continent, count(DISTINCT f.species_id) AS species
           FROM fact_species_country AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS l ON l.continent = c.continent
WHERE r.records IS NOT NULL OR l.species IS NOT NULL
ORDER BY r.records DESC NULLS LAST, c.continent;
