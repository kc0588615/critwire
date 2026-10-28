-- q: d2-ex-two-titles
-- status: ran
-- after: d2-flat, d2-ex
-- expect: error PRIMARY KEY or UNIQUE constraint violation
INSERT INTO r_datasets
SELECT dataset_key, 'Natuurmuseum Brabant - Vertebrates', publisher
FROM r_datasets
WHERE title = 'Natuurmuseum Brabant, Tilburg - Vertebrates';
