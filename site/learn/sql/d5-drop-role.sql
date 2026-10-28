-- q: d5-drop-role
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_reporting;
GRANT SELECT ON species, occurrences TO learn_reporting;
SAVEPOINT before_drop;
-- fails: role "learn_reporting" cannot be dropped because some objects depend on it
DROP ROLE learn_reporting;
ROLLBACK TO SAVEPOINT before_drop;
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'learn_reporting'
ORDER BY table_name;
DROP OWNED BY learn_reporting;
DROP ROLE learn_reporting;
ROLLBACK;
