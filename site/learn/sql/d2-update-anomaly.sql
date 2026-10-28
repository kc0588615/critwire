-- q: d2-update-anomaly
-- status: ran
-- after: d2-flat
UPDATE records_flat
SET title = 'Natuurmuseum Brabant - Vertebrates'
WHERE id = (SELECT min(id) FROM records_flat WHERE title = 'Natuurmuseum Brabant, Tilburg - Vertebrates');
SELECT dataset_key, title, count(*) AS records
FROM records_flat
WHERE dataset_key IN (SELECT dataset_key FROM records_flat GROUP BY dataset_key HAVING count(DISTINCT title) > 1)
GROUP BY dataset_key, title
ORDER BY records DESC, title;
