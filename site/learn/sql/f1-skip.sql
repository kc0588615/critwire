-- q: f1-skip
-- status: ran
SELECT id, common_name, photo_license
FROM species
WHERE photo_license NOT LIKE 'CC%' OR photo_license IS NULL
ORDER BY common_name;
