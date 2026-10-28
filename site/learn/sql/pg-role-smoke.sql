-- critwire Learn: 004 §0's pg-role-smoke in its own transaction, after the loader (pnpm learn:check, plan D10 check 10).
-- It proves CREATEROLE and createrole_self_grant: creates a read-only role, reads a table as it, and removes it again.
-- The ROLLBACK leaves nothing even if a line fails; the last SELECT gives 0, as 004's block does.
BEGIN;
SET LOCAL search_path = learn_curriculum, public;
CREATE ROLE learn_smoke NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_smoke;
GRANT SELECT ON species TO learn_smoke;
SET ROLE learn_smoke;
SELECT current_user AS role, count(*) AS species FROM species;
RESET ROLE;
DROP OWNED BY learn_smoke;
DROP ROLE learn_smoke;
SELECT count(*) AS learn_smoke_left FROM pg_roles WHERE rolname = 'learn_smoke';
ROLLBACK;
