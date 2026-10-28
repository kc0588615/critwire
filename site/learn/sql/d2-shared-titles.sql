-- q: d2-shared-titles
-- status: ran
-- after: d2-flat
SELECT title, count(DISTINCT dataset_key) AS datasets
FROM records_flat
GROUP BY title
HAVING count(DISTINCT dataset_key) > 1
ORDER BY title;
