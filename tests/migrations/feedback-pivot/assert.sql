-- Migration-check assertions for the feedback pivot (plan §10 Check).
--
-- Run with psql -v ON_ERROR_STOP=1 on the copy of the fixtures database
-- after `pnpm payload migrate` applied M12-M15. Raises on the first
-- mismatch; prints one NOTICE per passed group.

DO $$
DECLARE
  cc game_projects%ROWTYPE;
  partial game_projects%ROWTYPE;
  draft game_projects%ROWTYPE;
  n integer;
  default_palette text := '#1f2030 #f1f1f5 #a9acc2 #282a3d #aeb8ff #1f2030 #3b3e56 #6fd39b #f2a05c #ff7b86';
BEGIN
  -- Every migration ran.
  SELECT count(*) INTO n FROM payload_migrations WHERE name IN (
    '20260930_060748_remove_site_generator',
    '20260930_061601_feedback_model',
    '20260930_072559_portal_theme',
    '20260930_080647_remove_landing_builder'
  );
  IF n <> 4 THEN RAISE EXCEPTION 'expected M12-M15 in payload_migrations, found %', n; END IF;
  RAISE NOTICE 'ok: M12-M15 recorded';

  SELECT * INTO cc FROM game_projects WHERE slug = 'critter-connect';
  SELECT * INTO partial FROM game_projects WHERE slug = 'partial-palette';
  SELECT * INTO draft FROM game_projects WHERE slug = 'draft-only';
  IF cc.id IS NULL OR partial.id IS NULL OR draft.id IS NULL THEN
    RAISE EXCEPTION 'a fixture project is missing';
  END IF;

  -- Critter Connect keeps the seed's theme, banner and description.
  IF concat_ws(' ', cc.theme_colors_background, cc.theme_colors_foreground, cc.theme_colors_muted_foreground,
       cc.theme_colors_surface, cc.theme_colors_accent, cc.theme_colors_accent_foreground, cc.theme_colors_border,
       cc.theme_colors_success, cc.theme_colors_warning, cc.theme_colors_error)
     <> '#0f1f26 #e6f1f0 #9ab5b8 #172b33 #f3b340 #10191c #28444e #5bd49c #ef8a50 #ff6f7d' THEN
    RAISE EXCEPTION 'Critter Connect palette not copied: background %', cc.theme_colors_background;
  END IF;
  IF concat_ws(' ', cc.theme_typography, cc.theme_shape, cc.theme_density, cc.theme_motion)
     <> 'technical balanced cinematic subtle' THEN
    RAISE EXCEPTION 'Critter Connect tokens wrong: % % % %', cc.theme_typography, cc.theme_shape, cc.theme_density, cc.theme_motion;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM media WHERE id = cc.banner_id AND filename = 'field-binder-hero.png') THEN
    RAISE EXCEPTION 'Critter Connect lost its banner (banner_id %)', cc.banner_id;
  END IF;
  IF cc.description NOT LIKE 'Build a field binder of hard-won discoveries.%' THEN
    RAISE EXCEPTION 'Critter Connect description changed: %', cc.description;
  END IF;
  RAISE NOTICE 'ok: Critter Connect keeps its theme, banner and description';

  -- The seeded issue and report are bugs; the new defaults hold.
  IF (SELECT type::text FROM issues WHERE game_project_id = cc.id AND slug = 'card-flicker-on-open') IS DISTINCT FROM 'BUG' THEN
    RAISE EXCEPTION 'the seeded issue is not BUG';
  END IF;
  IF (SELECT type::text FROM issue_reports WHERE game_project_id = cc.id AND title = 'Clue trail disappears after fast travel') IS DISTINCT FROM 'BUG' THEN
    RAISE EXCEPTION 'the seeded report is not BUG';
  END IF;
  IF EXISTS (SELECT 1 FROM issue_reports WHERE flagged IS DISTINCT FROM false) THEN
    RAISE EXCEPTION 'an existing report is flagged';
  END IF;
  IF EXISTS (SELECT 1 FROM game_projects WHERE report_form_accept_ideas IS NOT TRUE OR report_form_review_submissions IS NOT TRUE) THEN
    RAISE EXCEPTION 'an existing project has ideas or review off';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'enum_issues_status' AND e.enumlabel = 'IN_PROGRESS') THEN
    RAISE EXCEPTION 'enum_issues_status has no IN_PROGRESS';
  END IF;
  RAISE NOTICE 'ok: seeded issue and report are BUG; ideas and review on; IN_PROGRESS exists';

  -- `new` became `new-3`; `new-2` is unchanged.
  IF EXISTS (SELECT 1 FROM issues WHERE slug = 'new') THEN
    RAISE EXCEPTION 'an issue is still slugged new';
  END IF;
  IF (SELECT slug FROM issues WHERE game_project_id = cc.id AND title = 'New') IS DISTINCT FROM 'new-3' THEN
    RAISE EXCEPTION 'the issue titled New is slugged %, not new-3',
      (SELECT slug FROM issues WHERE game_project_id = cc.id AND title = 'New');
  END IF;
  IF (SELECT generate_slug FROM issues WHERE game_project_id = cc.id AND title = 'New') IS NOT FALSE THEN
    RAISE EXCEPTION 'the renamed issue still regenerates its slug';
  END IF;
  IF (SELECT slug FROM issues WHERE game_project_id = cc.id AND title = 'New 2') IS DISTINCT FROM 'new-2' THEN
    RAISE EXCEPTION 'new-2 changed';
  END IF;
  RAISE NOTICE 'ok: new -> new-3, new-2 unchanged';

  -- Feature requests are ideas with the category OTHER.
  IF (SELECT type::text || '/' || category::text FROM issues WHERE game_project_id = cc.id AND slug = 'photo-mode')
     IS DISTINCT FROM 'IDEA/OTHER' THEN
    RAISE EXCEPTION 'the feature-request issue was not mapped to IDEA/OTHER';
  END IF;
  IF (SELECT type::text || '/' || category::text FROM issue_reports WHERE game_project_id = cc.id AND title = 'Add a photo mode')
     IS DISTINCT FROM 'IDEA/OTHER' THEN
    RAISE EXCEPTION 'the feature-request report was not mapped to IDEA/OTHER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname IN ('enum_issues_category', 'enum_issue_reports_category') AND e.enumlabel = 'FEATURE_REQUEST') THEN
    RAISE EXCEPTION 'FEATURE_REQUEST is still a category';
  END IF;
  RAISE NOTICE 'ok: feature requests are IDEA/OTHER';

  -- The partial palette is ignored, but the page's typography, hero art
  -- and tagline are copied.
  IF concat_ws(' ', partial.theme_colors_background, partial.theme_colors_foreground, partial.theme_colors_muted_foreground,
       partial.theme_colors_surface, partial.theme_colors_accent, partial.theme_colors_accent_foreground,
       partial.theme_colors_border, partial.theme_colors_success, partial.theme_colors_warning, partial.theme_colors_error)
     <> default_palette THEN
    RAISE EXCEPTION 'the partial palette leaked: background %, accent %', partial.theme_colors_background, partial.theme_colors_accent;
  END IF;
  IF partial.theme_typography::text <> 'editorial' THEN
    RAISE EXCEPTION 'the partial-palette project has typography %, not editorial', partial.theme_typography;
  END IF;
  IF partial.description IS DISTINCT FROM 'A tagline from the old hero' THEN
    RAISE EXCEPTION 'the partial-palette project description is %', partial.description;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM media WHERE id = partial.banner_id AND filename = 'discovery-card.png') THEN
    RAISE EXCEPTION 'the partial-palette project did not get the hero art as key art (banner_id %)', partial.banner_id;
  END IF;
  RAISE NOTICE 'ok: partial palette -> default palette, page typography, tagline and key art';

  -- The draft-only page is ignored entirely.
  IF concat_ws(' ', draft.theme_colors_background, draft.theme_colors_foreground, draft.theme_colors_muted_foreground,
       draft.theme_colors_surface, draft.theme_colors_accent, draft.theme_colors_accent_foreground,
       draft.theme_colors_border, draft.theme_colors_success, draft.theme_colors_warning, draft.theme_colors_error)
     <> default_palette
     OR concat_ws(' ', draft.theme_typography, draft.theme_shape, draft.theme_density, draft.theme_motion)
        <> 'modern balanced cinematic subtle' THEN
    RAISE EXCEPTION 'the draft-only project took its draft page''s theme';
  END IF;
  IF draft.description IS DISTINCT FROM 'Its own pitch' THEN
    RAISE EXCEPTION 'the draft-only project description is %', draft.description;
  END IF;
  RAISE NOTICE 'ok: draft-only project has the default theme';

  -- The landing builder is gone: tables, types, dropped columns.
  SELECT count(*) INTO n FROM pg_tables
  WHERE schemaname = 'public' AND (tablename LIKE 'game\_pages%' OR tablename LIKE '\_game\_pages\_v%');
  IF n <> 0 THEN RAISE EXCEPTION '% game_pages tables remain', n; END IF;
  SELECT count(*) INTO n FROM pg_type WHERE typname LIKE 'enum\_game\_pages\_%' OR typname LIKE 'enum\_\_game\_pages\_v\_%';
  IF n <> 0 THEN RAISE EXCEPTION '% game_pages enum types remain', n; END IF;
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'game_projects' AND column_name IN (
           'accent_color', 'links_trailer', 'availability_demo_url',
           'meta_developer', 'meta_publisher', 'meta_engine', 'meta_rating'))
      OR (table_name = 'payload_locked_documents_rels' AND column_name = 'game_pages_id'));
  IF n <> 0 THEN RAISE EXCEPTION '% dropped columns remain', n; END IF;
  RAISE NOTICE 'ok: no game_pages table, enum type or dropped column remains';

  -- Admin state: the game-page lock and preferences went; the rest stayed.
  SELECT count(*) INTO n FROM payload_preferences WHERE key LIKE 'collection-game-pages%';
  IF n <> 0 THEN RAISE EXCEPTION '% collection-game-pages preferences remain', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM payload_preferences WHERE key = 'collection-issues') THEN
    RAISE EXCEPTION 'the collection-issues preference was deleted';
  END IF;
  SELECT count(*) INTO n FROM payload_locked_documents d
  WHERE NOT EXISTS (SELECT 1 FROM payload_locked_documents_rels r WHERE r.parent_id = d.id);
  IF n <> 0 THEN RAISE EXCEPTION '% lock rows point at nothing', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM payload_locked_documents_rels r JOIN issues i ON i.id = r.issues_id WHERE i.slug = 'photo-mode') THEN
    RAISE EXCEPTION 'the issue lock was deleted';
  END IF;
  SELECT count(*) INTO n FROM payload_locked_documents;
  IF n <> 1 THEN RAISE EXCEPTION 'expected only the issue lock to remain, found % lock rows', n; END IF;
  RAISE NOTICE 'ok: game-page lock and preferences deleted; issue lock and preference kept';

  RAISE NOTICE 'ALL ASSERTIONS PASSED';
END
$$;
