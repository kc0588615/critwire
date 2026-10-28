-- q: d5-defaults
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_etl NOLOGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_etl;
GRANT SELECT ON occurrences TO learn_etl;
CREATE SCHEMA learn_reports AUTHORIZATION learn_etl;
GRANT USAGE ON SCHEMA learn_reports TO learn_reporting;
SET ROLE learn_etl;
CREATE TABLE learn_reports.report_1_by_year AS
SELECT year, count(*) AS records FROM occurrences WHERE year IS NOT NULL GROUP BY year;
GRANT SELECT ON ALL TABLES IN SCHEMA learn_reports TO learn_reporting;
CREATE TABLE learn_reports.report_2_by_species AS
SELECT species_id, count(*) AS records FROM occurrences GROUP BY species_id;
RESET ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE learn_etl IN SCHEMA learn_reports
  GRANT SELECT ON TABLES TO learn_reporting;
SET ROLE learn_etl;
CREATE TABLE learn_reports.report_3_by_country AS
SELECT country_code, count(*) AS records FROM occurrences GROUP BY country_code;
RESET ROLE;
SELECT tablename AS table_name, tableowner AS owner,
       has_table_privilege('learn_reporting', format('%I.%I', schemaname, tablename), 'SELECT') AS reporting_can_read
FROM pg_tables
WHERE schemaname = 'learn_reports'
ORDER BY tablename;
DROP SCHEMA learn_reports CASCADE;
DROP OWNED BY learn_etl, learn_reporting;
DROP ROLE learn_etl, learn_reporting;
ROLLBACK;
