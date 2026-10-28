-- q: d2-fd-license
-- status: ran
SELECT dataset_key, count(DISTINCT license) AS licenses
FROM occurrences
GROUP BY dataset_key
HAVING count(DISTINCT license) > 1
ORDER BY dataset_key;
