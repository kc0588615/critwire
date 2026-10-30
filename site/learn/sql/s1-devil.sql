-- q: s1-devil
-- status: ran
-- engine: postgis
SELECT d.title, o.basis_of_record,
       count(*) AS records,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
       min(o.year) AS first_year,
       max(o.year) AS last_year
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY d.title, o.basis_of_record
ORDER BY records DESC, d.title, o.basis_of_record;
