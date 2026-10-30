-- q: e4-quarantine
-- status: ran
-- engine: postgis
WITH staged (gbif_id, longitude, latitude, coordinate_uncertainty_m, year) AS (
  VALUES (9000000001, 146.8, -41.4, CAST(30 AS double precision), 2019),
         (9000000002, 146.8, -41.4, CAST(-30 AS double precision), 2019),
         (9000000003, 146.8, -41.4, CAST('NaN' AS double precision), 2019),
         (9000000004, 146.8, -41.4, CAST('Infinity' AS double precision), 2019),
         (9000000005, 0.0, 0.0, CAST(10 AS double precision), 2019),
         (9000000006, 146.8, -41.4, CAST('-Infinity' AS double precision), 2031)
)
SELECT s.gbif_id, c.check_name, c.value
FROM staged AS s
CROSS JOIN LATERAL (VALUES
  -- NaN sorts above Infinity in PostgreSQL, so this range fails negative, NaN, Infinity and -Infinity; NULL is a flag, not a reject
  ('coordinate uncertainty negative, NaN or infinite',
   NOT (s.coordinate_uncertainty_m >= 0 AND s.coordinate_uncertainty_m < 'Infinity'),
   CAST(s.coordinate_uncertainty_m AS text)),
  -- this dataset's rule: none of its records lies near 0, 0, so there two zeros mean a missing coordinate
  ('coordinates exactly 0, 0', s.longitude = 0 AND s.latitude = 0, s.longitude || ', ' || s.latitude),
  ('year after the download (2026)', s.year > 2026, CAST(s.year AS text))
) AS c (check_name, failed, value)
WHERE c.failed
ORDER BY s.gbif_id, c.check_name;
