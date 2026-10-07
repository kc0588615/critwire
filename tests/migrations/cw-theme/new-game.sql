-- Migration-check for cw-theme (plan S17, Failure mode MB8), after
-- assert.sql passed: the column defaults are cw dark's, so a game inserted
-- with them alone (P6) gets cw dark and `standard`.
--
-- Run with psql -v ON_ERROR_STOP=1. Inserts P6, then raises on the first
-- mismatch; prints one NOTICE per passed group.

INSERT INTO game_projects (tenant_id, name, slug, updated_at, created_at)
SELECT t.id, 'Migcheck P6', 'migcheck-p6', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00'
FROM tenants t WHERE t.slug = 'migcheck-studio';

DO $$
DECLARE
  d record;
  got text;
BEGIN
  FOR d IN SELECT * FROM migcheck.defaults LOOP
    SELECT column_default INTO got FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_projects' AND column_name = d.column_name;
    IF got NOT LIKE quote_literal(d.new_value) || '::%' THEN
      RAISE EXCEPTION 'MB8: the default of % is %, expected %', d.column_name, got, d.new_value;
    END IF;
    EXECUTE format('SELECT %I::text FROM game_projects WHERE slug = %L', d.column_name, 'migcheck-p6') INTO got;
    IF got IS DISTINCT FROM d.new_value THEN
      RAISE EXCEPTION 'MB8: P6 % is %, expected %', d.column_name, got, d.new_value;
    END IF;
  END LOOP;
  RAISE NOTICE 'ok MB8: the eleven column defaults are cw dark and standard, and P6 holds them';
END $$;
