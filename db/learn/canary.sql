-- Content canary on A2's schema learn_spatial (plan D10 checks 5 and 11; ported from the spike's scripts/canary.sql):
-- read only. Its table list from pg_class, then per table: name, count(*) and md5 of every row's text, in a fixed order.
-- A row count alone misses updates. Run as libpq's default role: psql -X -At -d critwire_dev -f db/learn/canary.sql
-- (learn:check passes -v schema=<name> for its test fixtures; without it, learn_spatial.)
\if :{?schema}
\else
\set schema learn_spatial
\endif
SELECT 'tables: ' || coalesce(string_agg(c.relname || ':' || c.relkind::text, ',' ORDER BY c.relname), '')
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = :'schema' AND c.relkind IN ('r', 'v', 'm', 'p', 'f');
SELECT format('SELECT %L || ''|'' || count(*) || ''|'' || coalesce(md5(string_agg(t::text, '''' ORDER BY t::text)), ''-'') FROM %I.%I AS t', c.relname, n.nspname, c.relname)
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = :'schema' AND c.relkind IN ('r', 'p')
ORDER BY c.relname
\gexec
