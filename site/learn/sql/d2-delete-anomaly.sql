-- q: d2-delete-anomaly
-- status: ran
-- after: d2-flat
DELETE FROM records_flat
WHERE dataset_key IN (SELECT dataset_key FROM records_flat GROUP BY dataset_key HAVING count(*) = 1);
SELECT (SELECT count(DISTINCT dataset_key) FROM records_flat) AS datasets_in_flat,
       (SELECT count(*) FROM datasets) AS datasets_in_table;
