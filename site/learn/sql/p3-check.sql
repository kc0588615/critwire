-- q: p3-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-star-dim-habitat-class, d6-star-fact-country-habitat
SELECT h.country_code,
       coalesce(r.records, 0) AS records,
       h.forest_km2,
       round(1000 * coalesce(r.records, 0) / NULLIF(h.forest_km2, 0), 3) AS sample_records_per_1000_km2_forest
FROM (SELECT f.country_code, sum(f.est_area_km2) AS forest_km2
      FROM fact_country_habitat AS f
      JOIN dim_habitat_class AS c ON c.habitat_code = f.habitat_code
      WHERE c.level1_name = 'Forest'
      GROUP BY f.country_code) AS h
LEFT JOIN (SELECT country_code, count(*) AS records FROM fact_records GROUP BY country_code) AS r
  ON r.country_code = h.country_code
ORDER BY h.country_code;
