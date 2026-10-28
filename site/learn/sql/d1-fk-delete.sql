-- q: d1-fk-delete
-- status: ran
-- engine: postgis
-- expect: error violates foreign key constraint
DELETE FROM datasets
WHERE dataset_key = (SELECT dataset_key FROM occurrences
                     GROUP BY dataset_key
                     ORDER BY count(*) DESC, dataset_key
                     LIMIT 1);
