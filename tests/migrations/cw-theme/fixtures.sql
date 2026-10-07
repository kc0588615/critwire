-- Migration-check fixtures for cw-theme (plan S17, Failure modes MB1-MB12).
--
-- Written against the base schema (23 migrations, before
-- cw_typography_standard and cw_portal_defaults), on the copy
-- critwire_m_cw_theme_migcheck of an empty database. Adds one tenant and
-- five game projects, found by slug, never by ID, and a snapshot of both
-- tables in the schema `migcheck`, which the assertions compare against.
-- Every fixture's updated_at is in the past, so a write that touches it
-- shows. Run once, with psql -v ON_ERROR_STOP=1.

BEGIN;

CREATE SCHEMA migcheck;

-- The eleven columns cw_portal_defaults changes: the old defaults (from
-- 20260930_072559_portal_theme) and cw dark's.
CREATE TABLE migcheck.defaults (column_name text PRIMARY KEY, old_value text NOT NULL, new_value text NOT NULL);
INSERT INTO migcheck.defaults VALUES
  ('theme_colors_background',        '#1f2030', '#000000'),
  ('theme_colors_foreground',        '#f1f1f5', '#ffffff'),
  ('theme_colors_muted_foreground',  '#a9acc2', '#a1a3a6'),
  ('theme_colors_surface',           '#282a3d', '#1f2022'),
  ('theme_colors_accent',            '#aeb8ff', '#31c3e8'),
  ('theme_colors_accent_foreground', '#1f2030', '#000000'),
  ('theme_colors_border',            '#3b3e56', '#37383a'),
  ('theme_colors_success',           '#6fd39b', '#76ef6b'),
  ('theme_colors_warning',           '#f2a05c', '#ffa344'),
  ('theme_colors_error',             '#ff7b86', '#ff5263'),
  ('theme_typography',               'modern',  'standard');

INSERT INTO tenants (name, slug, updated_at, created_at)
VALUES ('Migcheck Studio', 'migcheck-studio', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00');

-- Every theme column is written explicitly, so no column default fills one.
INSERT INTO game_projects (
  tenant_id, name, slug, updated_at, created_at,
  theme_colors_background, theme_colors_foreground, theme_colors_muted_foreground,
  theme_colors_surface, theme_colors_accent, theme_colors_accent_foreground,
  theme_colors_border, theme_colors_success, theme_colors_warning, theme_colors_error,
  theme_typography, theme_shape, theme_density, theme_motion
)
SELECT t.id, f.name, f.slug, '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00',
  f.bg, f.fg, f.muted, f.surface, f.accent, f.accent_fg, f.border, f.success, f.warning, f.error,
  f.typography::enum_game_projects_theme_typography, f.shape::enum_game_projects_theme_shape,
  f.density::enum_game_projects_theme_density, f.motion::enum_game_projects_theme_motion
FROM tenants t, (VALUES
  -- P1, Astra's case: a custom surface, mutedForeground and typography
  -- unset, the rest at the old defaults. Over cw dark's mutedForeground
  -- it would fail the schema (4.10:1).
  ('Migcheck P1', 'migcheck-p1', '#1f2030', '#f1f1f5', NULL, '#404040', '#aeb8ff', '#1f2030',
   '#3b3e56', '#6fd39b', '#f2a05c', '#ff7b86', NULL, 'balanced', 'cinematic', 'subtle'),
  -- P2: P1, with mutedForeground '' (unset, as mergeTheme reads it).
  ('Migcheck P2', 'migcheck-p2', '#1f2030', '#f1f1f5', '', '#404040', '#aeb8ff', '#1f2030',
   '#3b3e56', '#6fd39b', '#f2a05c', '#ff7b86', NULL, 'balanced', 'cinematic', 'subtle'),
  -- P3: Riso's complete palette and tokens (tests/screenshots/themes.ts).
  ('Migcheck P3', 'migcheck-p3', '#eef4d2', '#1c1a3a', '#4f4e6e', '#fbfdf2', '#2446e8', '#ffffff',
   '#c8d49a', '#1f7a45', '#9a5a00', '#b8302a', 'editorial', 'sharp', 'compact', 'subtle'),
  -- P4: every column at the old default, as games created so far hold them.
  ('Migcheck P4', 'migcheck-p4', '#1f2030', '#f1f1f5', '#a9acc2', '#282a3d', '#aeb8ff', '#1f2030',
   '#3b3e56', '#6fd39b', '#f2a05c', '#ff7b86', 'modern', 'balanced', 'cinematic', 'subtle'),
  -- P5: complete colours and typography; shape, density and motion unset.
  ('Migcheck P5', 'migcheck-p5', '#1f2030', '#f1f1f5', '#a9acc2', '#282a3d', '#aeb8ff', '#1f2030',
   '#3b3e56', '#6fd39b', '#f2a05c', '#ff7b86', 'technical', NULL, NULL, NULL)
) AS f(name, slug, bg, fg, muted, surface, accent, accent_fg, border, success, warning, error,
       typography, shape, density, motion)
WHERE t.slug = 'migcheck-studio';

-- The before-snapshot.
CREATE TABLE migcheck.game_projects AS SELECT * FROM game_projects;
CREATE TABLE migcheck.tenants AS SELECT * FROM tenants;

COMMIT;
