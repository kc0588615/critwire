-- q: d2-license-differs
-- status: ran
SELECT d.title, d.license AS dataset_license, o.license AS record_license, count(*) AS records
FROM occurrences AS o
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE o.license <> d.license
GROUP BY d.title, d.license, o.license
ORDER BY records DESC, d.title;
