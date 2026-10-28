-- q: f1-no-photo
-- status: ran
-- show: cards
SELECT id, common_name, photo_url
FROM species
WHERE photo_url IS NULL
ORDER BY id;
