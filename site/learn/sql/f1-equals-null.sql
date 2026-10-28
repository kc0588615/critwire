-- q: f1-equals-null
-- status: ran
SELECT count(*) AS animals
FROM species
WHERE photo_url = NULL;
