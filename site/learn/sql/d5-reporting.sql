-- q: d5-reporting
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO learn_reporting;
CREATE ROLE learn_powerbi LOGIN IN ROLE learn_reporting;
SET ROLE learn_powerbi;
SAVEPOINT try;
-- fails: permission denied for table species
UPDATE species SET common_name = 'Devil' WHERE id = 48;
ROLLBACK TO SAVEPOINT try;
-- fails: permission denied for schema learn_curriculum
CREATE TABLE my_report (id integer);
ROLLBACK TO SAVEPOINT try;
SELECT current_user AS reading_as, count(*) AS records, count(DISTINCT species_id) AS species
FROM occurrences;
RESET ROLE;
DROP OWNED BY learn_powerbi, learn_reporting;
DROP ROLE learn_powerbi, learn_reporting;
ROLLBACK;
