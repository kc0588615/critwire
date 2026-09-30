-- Migration-check fixtures for the feedback pivot (plan §10 Check).
--
-- Written against the schema at 683de8d (before M12-M15), on a database
-- that ran the Critter Connect seed. Adds what the seed alone lacks: a
-- reserved-slug collision, feature requests, a partial palette, a
-- draft-only page, and the lock and preference rows M15 cleans up.
-- Rows are found by slug or filename, never by hard-coded IDs.
-- Run once, with psql -v ON_ERROR_STOP=1.

BEGIN;

-- Critter Connect: `new` and `new-2` (M13 must pick `new-3`), a feature
-- request issue and report (M13 maps them to IDEA / OTHER), and an
-- ordinary issue locked in the admin (its lock must survive M15).
INSERT INTO issues (tenant_id, game_project_id, title, generate_slug, slug, category, status)
SELECT p.tenant_id, p.id, v.title, true, v.slug, v.category::enum_issues_category, 'REPORTED'
FROM game_projects p
CROSS JOIN (VALUES
  ('New', 'new', 'GAMEPLAY'),
  ('New 2', 'new-2', 'GAMEPLAY'),
  ('Photo mode', 'photo-mode', 'FEATURE_REQUEST')
) AS v(title, slug, category)
WHERE p.slug = 'critter-connect';

INSERT INTO issue_reports (tenant_id, game_project_id, title, description, category, status)
SELECT p.tenant_id, p.id, 'Add a photo mode', 'Let me hide the HUD and frame shots.', 'FEATURE_REQUEST', 'NEW'
FROM game_projects p
WHERE p.slug = 'critter-connect';

-- A project with no description whose published flagship page sets 3 of
-- the 10 colours, a typography and a hero tagline. The colour columns
-- have defaults, so the other seven are NULLed explicitly.
INSERT INTO game_projects (tenant_id, name, slug, description, banner_id)
SELECT t.id, 'Partial Palette', 'partial-palette', NULL, NULL
FROM tenants t
WHERE t.slug = 'demo-studio';

INSERT INTO game_pages (
  tenant_id, game_project_id, kind, title, _status, template,
  site_theme_colors_background, site_theme_colors_foreground, site_theme_colors_accent,
  site_theme_colors_muted_foreground, site_theme_colors_surface, site_theme_colors_accent_foreground,
  site_theme_colors_border, site_theme_colors_success, site_theme_colors_warning, site_theme_colors_error,
  site_theme_typography, site_hero_tagline, site_hero_background_media_id
)
SELECT p.tenant_id, p.id, 'landing', 'Partial Palette', 'published', 'flagship-game-v1',
  '#101010', '#fafafa', '#ff00aa',
  NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  'editorial', 'A tagline from the old hero', m.id
FROM game_projects p
JOIN media m ON m.filename = 'discovery-card.png'
WHERE p.slug = 'partial-palette';

-- A project whose only flagship page is a draft with a full palette.
INSERT INTO game_projects (tenant_id, name, slug, description)
SELECT t.id, 'Draft Only', 'draft-only', 'Its own pitch'
FROM tenants t
WHERE t.slug = 'demo-studio';

INSERT INTO game_pages (
  tenant_id, game_project_id, kind, title, _status, template,
  site_theme_colors_background, site_theme_colors_foreground, site_theme_colors_muted_foreground,
  site_theme_colors_surface, site_theme_colors_accent, site_theme_colors_accent_foreground,
  site_theme_colors_border, site_theme_colors_success, site_theme_colors_warning, site_theme_colors_error,
  site_theme_typography, site_theme_shape, site_theme_density, site_theme_motion, site_hero_tagline
)
SELECT p.tenant_id, p.id, 'landing', 'Draft Only', 'draft', 'flagship-game-v1',
  '#000000', '#ffffff', '#cccccc',
  '#111111', '#ff0000', '#000000',
  '#222222', '#00ff00', '#ffff00', '#ff0000',
  'technical', 'sharp', 'compact', 'off', 'A draft tagline'
FROM game_projects p
WHERE p.slug = 'draft-only';

-- Admin state M15 must clean up: a lock on Critter Connect's game page,
-- beside a lock on an issue that must survive; the list and document
-- preferences for game pages, beside an issues preference that must stay.
WITH lock_page AS (
  INSERT INTO payload_locked_documents DEFAULT VALUES RETURNING id
)
INSERT INTO payload_locked_documents_rels (parent_id, path, game_pages_id)
SELECT l.id, 'document', g.id
FROM lock_page l
JOIN game_projects p ON p.slug = 'critter-connect'
JOIN game_pages g ON g.game_project_id = p.id;

WITH lock_issue AS (
  INSERT INTO payload_locked_documents DEFAULT VALUES RETURNING id
)
INSERT INTO payload_locked_documents_rels (parent_id, path, issues_id)
SELECT l.id, 'document', i.id
FROM lock_issue l
JOIN issues i ON i.slug = 'photo-mode';

INSERT INTO payload_preferences (key, value)
SELECT v.key, '{}'::jsonb
FROM (VALUES
  ('collection-game-pages'),
  ('collection-game-pages-' || (SELECT g.id FROM game_pages g JOIN game_projects p ON p.id = g.game_project_id WHERE p.slug = 'critter-connect')),
  ('collection-issues')
) AS v(key);

INSERT INTO payload_preferences_rels (parent_id, path, users_id)
SELECT pr.id, 'user', u.id
FROM payload_preferences pr
CROSS JOIN (SELECT id FROM users ORDER BY id LIMIT 1) u;

COMMIT;
