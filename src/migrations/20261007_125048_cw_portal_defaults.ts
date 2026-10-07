import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The portal's default theme becomes cw dark with `standard` typography
 * (the value cw_typography_standard added, committed in that migration's
 * own transaction).
 *
 * Then saved themes are completed: a slot that's unset (null, or '' as
 * `mergeTheme` reads it) fell back to the old default, so it gets that
 * value written down, and every game keeps the look it has today. Set
 * values are never overwritten, and `shape`, `density` and `motion` keep
 * their defaults, so they aren't touched. The old values are literals from
 * 20260930_072559_portal_theme: a migration is a frozen snapshot and must
 * not import `theme.ts`. `theme_typography` is an enum, so it's only
 * checked for null (comparing it with '' raises). Raw SQL leaves
 * `updated_at` alone.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_background" SET DEFAULT '#000000';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_foreground" SET DEFAULT '#ffffff';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_muted_foreground" SET DEFAULT '#a1a3a6';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_surface" SET DEFAULT '#1f2022';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent" SET DEFAULT '#31c3e8';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent_foreground" SET DEFAULT '#000000';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_border" SET DEFAULT '#37383a';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_success" SET DEFAULT '#76ef6b';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_warning" SET DEFAULT '#ffa344';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_error" SET DEFAULT '#ff5263';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_typography" SET DEFAULT 'standard';`)

  const { rows: completed } = await db.execute(sql`
  UPDATE "game_projects" SET
    "theme_colors_background" = COALESCE(NULLIF("theme_colors_background", ''), '#1f2030'),
    "theme_colors_foreground" = COALESCE(NULLIF("theme_colors_foreground", ''), '#f1f1f5'),
    "theme_colors_muted_foreground" = COALESCE(NULLIF("theme_colors_muted_foreground", ''), '#a9acc2'),
    "theme_colors_surface" = COALESCE(NULLIF("theme_colors_surface", ''), '#282a3d'),
    "theme_colors_accent" = COALESCE(NULLIF("theme_colors_accent", ''), '#aeb8ff'),
    "theme_colors_accent_foreground" = COALESCE(NULLIF("theme_colors_accent_foreground", ''), '#1f2030'),
    "theme_colors_border" = COALESCE(NULLIF("theme_colors_border", ''), '#3b3e56'),
    "theme_colors_success" = COALESCE(NULLIF("theme_colors_success", ''), '#6fd39b'),
    "theme_colors_warning" = COALESCE(NULLIF("theme_colors_warning", ''), '#f2a05c'),
    "theme_colors_error" = COALESCE(NULLIF("theme_colors_error", ''), '#ff7b86'),
    "theme_typography" = COALESCE("theme_typography", 'modern')
  WHERE num_nonnulls(
      NULLIF("theme_colors_background", ''),
      NULLIF("theme_colors_foreground", ''),
      NULLIF("theme_colors_muted_foreground", ''),
      NULLIF("theme_colors_surface", ''),
      NULLIF("theme_colors_accent", ''),
      NULLIF("theme_colors_accent_foreground", ''),
      NULLIF("theme_colors_border", ''),
      NULLIF("theme_colors_success", ''),
      NULLIF("theme_colors_warning", ''),
      NULLIF("theme_colors_error", '')
    ) < 10
    OR "theme_typography" IS NULL
  RETURNING "id";`)

  const ids = completed.map((row) => row.id).sort((a, b) => Number(a) - Number(b))
  payload.logger.info(`Saved themes completed with the old defaults: ${ids.join(', ') || 'none'}`)
}

// The old defaults come back, and `standard` goes back to `modern`, so the
// old code parses every row. Completed slots stay: they hold the values the
// old code fell back to anyway.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_background" SET DEFAULT '#1f2030';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_foreground" SET DEFAULT '#f1f1f5';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_muted_foreground" SET DEFAULT '#a9acc2';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_surface" SET DEFAULT '#282a3d';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent" SET DEFAULT '#aeb8ff';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent_foreground" SET DEFAULT '#1f2030';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_border" SET DEFAULT '#3b3e56';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_success" SET DEFAULT '#6fd39b';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_warning" SET DEFAULT '#f2a05c';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_error" SET DEFAULT '#ff7b86';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_typography" SET DEFAULT 'modern';
  UPDATE "game_projects" SET "theme_typography" = 'modern' WHERE "theme_typography" = 'standard';`)
}
