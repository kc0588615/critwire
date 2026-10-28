-- q: d5-privileges
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_reporting NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO learn_reporting;
SELECT object, privilege, allowed
FROM (
  SELECT 1 AS level, 'this database' AS object, p AS privilege,
         has_database_privilege('learn_reporting', current_database(), p) AS allowed
  FROM unnest(ARRAY['CONNECT', 'TEMPORARY', 'CREATE']) AS p
  UNION ALL
  SELECT 2, 'schema ' || s, p, has_schema_privilege('learn_reporting', s, p)
  FROM unnest(ARRAY['learn_curriculum', 'public']) AS s, unnest(ARRAY['USAGE', 'CREATE']) AS p
  UNION ALL
  SELECT 3, 'table species', p, has_table_privilege('learn_reporting', 'species', p)
  FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p
  UNION ALL
  SELECT 4, 'function ST_Area(geometry)', 'EXECUTE',
         has_function_privilege('learn_reporting', 'ST_Area(geometry)', 'EXECUTE')
) AS checked
ORDER BY level, object, privilege;
DROP OWNED BY learn_reporting;
DROP ROLE learn_reporting;
ROLLBACK;
