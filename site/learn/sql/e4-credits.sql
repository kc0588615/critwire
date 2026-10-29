-- q: e4-credits
-- status: ran
-- engine: postgis
SELECT d.title, d.publisher, d.doi, o.license, count(*) AS records
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name IN ('Sarcophilus harrisii', 'Panthera onca')
GROUP BY d.title, d.publisher, d.doi, o.license
ORDER BY records DESC, d.doi, o.license;
