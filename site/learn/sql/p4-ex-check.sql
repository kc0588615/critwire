-- q: p4-ex-check
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT d.title, d.publisher, d.doi,
       count(*) AS records,
       count(*) FILTER (WHERE f.license = 'CC BY 4.0') AS cc_by_records
FROM fact_records AS f
JOIN dim_species AS s ON s.species_id = f.species_id
JOIN dim_dataset AS d ON d.dataset_key = f.dataset_key
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY d.title, d.publisher, d.doi
ORDER BY cc_by_records DESC, records DESC, d.title;
