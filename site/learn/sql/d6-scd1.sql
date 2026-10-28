-- q: d6-scd1
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
UPDATE dim_species SET common_name = 'Temminck''s Ground Pangolin' WHERE species_id = 63;
SELECT sp.common_name, count(*) AS records, min(f.year) FILTER (WHERE f.year > 0) AS first_year
FROM fact_records AS f
JOIN dim_species AS sp ON sp.species_id = f.species_id
WHERE f.species_id = 63
GROUP BY sp.common_name;
