-- q: d5-ex
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_devil_dashboard NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_devil_dashboard;
GRANT SELECT ON species, occurrences TO learn_devil_dashboard;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY devil_only ON occurrences FOR SELECT TO learn_devil_dashboard USING (species_id = 48);
SET ROLE learn_devil_dashboard;
SAVEPOINT try;
-- fails: permission denied for table datasets
SELECT count(*) FROM datasets;
ROLLBACK TO SAVEPOINT try;
-- fails: permission denied for table occurrences
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
ROLLBACK TO SAVEPOINT try;
SELECT count(*) AS records, count(DISTINCT species_id) AS species_with_records,
       (SELECT count(*) FROM species) AS species_rows
FROM occurrences;
RESET ROLE;
DROP OWNED BY learn_devil_dashboard;
ALTER TABLE occurrences DISABLE ROW LEVEL SECURITY;
DROP ROLE learn_devil_dashboard;
ROLLBACK;
