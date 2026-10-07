-- Migration-check for cw-theme (plan S17, Failure mode MB10), after
-- new-game.sql and `pnpm payload migrate:down`: the old code can parse
-- every row again.
--
-- Run with psql -v ON_ERROR_STOP=1. Raises on the first mismatch; prints
-- one NOTICE per passed group.

DO $$
DECLARE
  d record;
  got text;
  n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM payload_migrations WHERE name LIKE '%\_cw\_portal\_defaults') THEN
    RAISE EXCEPTION 'MB10: cw_portal_defaults is still recorded';
  END IF;

  FOR d IN SELECT * FROM migcheck.defaults LOOP
    SELECT column_default INTO got FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_projects' AND column_name = d.column_name;
    IF got NOT LIKE quote_literal(d.old_value) || '::%' THEN
      RAISE EXCEPTION 'MB10: the default of % is %, expected %', d.column_name, got, d.old_value;
    END IF;
  END LOOP;
  RAISE NOTICE 'ok MB10: the eleven column defaults are the old ones';

  SELECT count(*) INTO n FROM game_projects WHERE theme_typography::text = 'standard';
  IF n <> 0 THEN RAISE EXCEPTION 'MB10: % rows still hold standard', n; END IF;
  IF (SELECT theme_typography::text FROM game_projects WHERE slug = 'migcheck-p6') IS DISTINCT FROM 'modern' THEN
    RAISE EXCEPTION 'MB10: P6 is not modern';
  END IF;
  RAISE NOTICE 'ok MB10: no row holds standard; P6 is modern';

  IF (SELECT count(*) FROM game_projects
      WHERE slug IN ('migcheck-p1', 'migcheck-p2')
        AND theme_colors_muted_foreground = '#a9acc2' AND theme_typography = 'modern') <> 2 THEN
    RAISE EXCEPTION 'MB10: P1 and P2 lost their completed values';
  END IF;
  RAISE NOTICE 'ok MB10: P1 and P2 keep their completed values';
END $$;
