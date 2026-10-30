-- q: p3-ex-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT c.continent, r.records, h.habitat_km2,
       round(r.records / sum(r.records) OVER (), 4) AS share_of_records,
       round(h.habitat_km2 / sum(h.habitat_km2) OVER (), 4) AS share_of_area
FROM (SELECT DISTINCT continent FROM dim_country) AS c
LEFT JOIN (SELECT d.continent, count(*) AS records
           FROM fact_records AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS r ON r.continent = c.continent
LEFT JOIN (SELECT d.continent, sum(f.est_area_km2) AS habitat_km2
           FROM fact_country_habitat AS f JOIN dim_country AS d ON d.country_code = f.country_code
           GROUP BY d.continent) AS h ON h.continent = c.continent
WHERE r.records IS NOT NULL OR h.habitat_km2 IS NOT NULL
ORDER BY c.continent;
