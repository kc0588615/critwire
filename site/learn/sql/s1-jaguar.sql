-- q: s1-jaguar
-- status: ran
-- engine: postgis
SELECT CASE WHEN o.basis_of_record = 'MACHINE_OBSERVATION' AND d.title ILIKE '%GPS%'
            THEN 'GPS collars' ELSE 'everything else' END AS source,
       count(DISTINCT o.dataset_key) AS datasets,
       count(*) AS records,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
       count(DISTINCT o.country_code) AS countries,
       count(DISTINCT (o.longitude, o.latitude)) AS locations,
       min(o.year) AS first_year,
       max(o.year) AS last_year
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name = 'Panthera onca'
GROUP BY 1
ORDER BY records DESC;
