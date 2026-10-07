-- Migration-check assertions for cw-theme (plan S17, Failure modes MB1-MB6,
-- MB12), after `pnpm payload migrate` applied cw_typography_standard and
-- cw_portal_defaults to the fixtures (fixtures.sql). MB7 shows as migrate
-- raising, MB9 in the migrate log, MB11 in check-themes.ts.
--
-- Run with psql -v ON_ERROR_STOP=1. Raises on the first mismatch; prints
-- one NOTICE per passed group. On the unmigrated fixtures it must raise.

DO $$
DECLARE
  a integer;
  b integer;
  n integer;
  d record;
  want text;
  got text;
  fixture text;
  cols text[];
BEGIN
  -- MB1. Both migrations are recorded, the enum value's first.
  SELECT id INTO a FROM payload_migrations WHERE name LIKE '%\_cw\_typography\_standard';
  SELECT id INTO b FROM payload_migrations WHERE name LIKE '%\_cw\_portal\_defaults';
  IF a IS NULL OR b IS NULL THEN RAISE EXCEPTION 'MB1: cw_typography_standard (%) or cw_portal_defaults (%) is not recorded', a, b; END IF;
  IF a >= b THEN RAISE EXCEPTION 'MB1: cw_typography_standard (id %) is not before cw_portal_defaults (id %)', a, b; END IF;
  RAISE NOTICE 'ok MB1: both migrations recorded, cw_typography_standard first';

  -- MB2, MB3. P1 and P2 hold the old default in each unset slot and keep
  -- their set ones: the value each rendered with before.
  FOREACH fixture IN ARRAY ARRAY['migcheck-p1', 'migcheck-p2'] LOOP
    FOR d IN SELECT * FROM migcheck.defaults LOOP
      EXECUTE format('SELECT COALESCE(NULLIF(%I::text, %L), %L) FROM migcheck.game_projects WHERE slug = %L',
                     d.column_name, '', d.old_value, fixture) INTO want;
      EXECUTE format('SELECT %I::text FROM game_projects WHERE slug = %L', d.column_name, fixture) INTO got;
      IF got IS DISTINCT FROM want THEN
        RAISE EXCEPTION 'MB2/MB3: % % is %, expected %', fixture, d.column_name, got, want;
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM game_projects
      WHERE slug IN ('migcheck-p1', 'migcheck-p2')
        AND theme_colors_muted_foreground = '#a9acc2' AND theme_colors_surface = '#404040'
        AND theme_typography = 'modern') <> 2 THEN
    RAISE EXCEPTION 'MB2/MB3: P1 and P2 must hold #a9acc2 on #404040 and modern';
  END IF;
  RAISE NOTICE 'ok MB2, MB3: P1 and P2 completed with the old defaults (null and empty alike)';

  -- MB4, MB5, MB6, MB12. Every other row, in both tables, is unchanged
  -- byte for byte (P3's and P4's set values, P5's null shape, density and
  -- motion, every updated_at); P1 and P2 differ only in the eleven columns.
  SELECT array_agg(column_name) INTO cols FROM migcheck.defaults;
  SELECT count(*) INTO n FROM (
    (SELECT to_jsonb(g) - CASE WHEN g.slug IN ('migcheck-p1', 'migcheck-p2') THEN cols ELSE '{}' END FROM game_projects g
     EXCEPT
     SELECT to_jsonb(s) - CASE WHEN s.slug IN ('migcheck-p1', 'migcheck-p2') THEN cols ELSE '{}' END FROM migcheck.game_projects s)
    UNION ALL
    (SELECT to_jsonb(s) - CASE WHEN s.slug IN ('migcheck-p1', 'migcheck-p2') THEN cols ELSE '{}' END FROM migcheck.game_projects s
     EXCEPT
     SELECT to_jsonb(g) - CASE WHEN g.slug IN ('migcheck-p1', 'migcheck-p2') THEN cols ELSE '{}' END FROM game_projects g)
  ) diff;
  IF n <> 0 THEN RAISE EXCEPTION 'MB4/MB5/MB6/MB12: % game_projects rows differ from the snapshot outside the backfill', n; END IF;
  IF (SELECT count(*) FROM game_projects) <> (SELECT count(*) FROM migcheck.game_projects) THEN
    RAISE EXCEPTION 'MB12: the count of game_projects changed';
  END IF;
  SELECT count(*) INTO n FROM (
    (SELECT to_jsonb(t) FROM tenants t EXCEPT SELECT to_jsonb(s) FROM migcheck.tenants s)
    UNION ALL
    (SELECT to_jsonb(s) FROM migcheck.tenants s EXCEPT SELECT to_jsonb(t) FROM tenants t)
  ) diff;
  IF n <> 0 THEN RAISE EXCEPTION 'MB12: % tenants rows differ from the snapshot', n; END IF;
  IF EXISTS (SELECT 1 FROM migcheck.game_projects WHERE slug = 'migcheck-p5'
             AND (theme_shape IS NOT NULL OR theme_density IS NOT NULL OR theme_motion IS NOT NULL)) THEN
    RAISE EXCEPTION 'MB6: the fixture P5 is wrong: its shape, density and motion must be null';
  END IF;
  RAISE NOTICE 'ok MB4, MB5, MB6, MB12: P3-P5, every updated_at and the tenants unchanged; counts equal';

  -- No row is left with an unset slot in the eleven columns.
  FOR d IN SELECT * FROM migcheck.defaults LOOP
    EXECUTE format('SELECT count(*) FROM game_projects WHERE NULLIF(%I::text, %L) IS NULL', d.column_name, '') INTO n;
    IF n <> 0 THEN RAISE EXCEPTION 'MB2: % rows still have % unset', n, d.column_name; END IF;
  END LOOP;
  RAISE NOTICE 'ok: no row has an unset slot in the eleven columns';
END $$;
