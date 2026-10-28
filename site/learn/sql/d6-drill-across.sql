-- q: d6-drill-across
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT 'facts joined to each other' AS way, f.country_code, count(*) AS records, sum(h.est_area_km2) AS habitat_km2
FROM fact_records AS f
JOIN fact_country_habitat AS h ON h.country_code = f.country_code
GROUP BY f.country_code
UNION ALL
SELECT 'each fact summed, then joined', c.country_code, coalesce(r.records, 0), h.habitat_km2
FROM dim_country AS c
JOIN (SELECT country_code, sum(est_area_km2) AS habitat_km2
      FROM fact_country_habitat GROUP BY country_code) AS h ON h.country_code = c.country_code
LEFT JOIN (SELECT country_code, count(*) AS records
           FROM fact_records GROUP BY country_code) AS r ON r.country_code = c.country_code
ORDER BY way, country_code;
