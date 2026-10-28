-- q: d2-flat
-- status: ran
CREATE TABLE records_flat AS
SELECT o.id, o.species_id, s.common_name, o.dataset_key, d.title, d.publisher, o.license
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key;
SELECT count(*) AS rows, count(DISTINCT dataset_key) AS datasets, count(DISTINCT title) AS titles,
       count(DISTINCT publisher) AS publishers
FROM records_flat;
