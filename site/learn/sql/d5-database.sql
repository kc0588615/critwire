-- q: d5-database
-- status: untested: changes the database's own privileges, which the tests never do
-- engine: postgis
REVOKE CONNECT, TEMPORARY ON DATABASE learn FROM PUBLIC;
GRANT CONNECT ON DATABASE learn TO learn_reporting;
ALTER ROLE learn_powerbi SET default_transaction_read_only = on;
