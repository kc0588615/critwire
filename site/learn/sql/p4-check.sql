-- q: p4-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT s.common_name || ': ' || to_char(count(*), 'FM999,999')
         || ' open GBIF records (where people recorded it, not its range)' AS map_title,
       count(*) AS records,
       count(DISTINCT f.dataset_key) AS datasets,
       count(DISTINCT f.dataset_key) FILTER (WHERE f.license = 'CC BY 4.0') AS datasets_to_credit
FROM fact_records AS f
JOIN dim_species AS s ON s.species_id = f.species_id
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY s.common_name;
