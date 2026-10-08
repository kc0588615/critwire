import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The portal's default palette becomes cc dark (`DEFAULT_THEME_COLORS`,
 * cc-site D17, D18): the column defaults only. The foreground is #ffffff in
 * both, so nine of the ten change. No row is rewritten: a stored palette,
 * a cw-era one included, keeps its look, and on critwire.com
 * cw_portal_defaults, in the same deploy, has already completed every unset
 * slot. Changing the default is a compatibility contract (D48): see the
 * comment on `DEFAULT_THEME_COLORS`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_background" SET DEFAULT '#051411';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_muted_foreground" SET DEFAULT '#9dafab';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_surface" SET DEFAULT '#142320';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent" SET DEFAULT '#00906c';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent_foreground" SET DEFAULT '#051411';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_border" SET DEFAULT '#30413d';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_success" SET DEFAULT '#00c853';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_warning" SET DEFAULT '#ffea00';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_error" SET DEFAULT '#fc032d';`)
}

// cw dark's defaults come back, as literals copied from
// 20261007_125048_cw_portal_defaults (a migration never imports theme.ts).
// The data stays.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_background" SET DEFAULT '#000000';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_muted_foreground" SET DEFAULT '#a1a3a6';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_surface" SET DEFAULT '#1f2022';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent" SET DEFAULT '#31c3e8';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_accent_foreground" SET DEFAULT '#000000';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_border" SET DEFAULT '#37383a';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_success" SET DEFAULT '#76ef6b';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_warning" SET DEFAULT '#ffa344';
  ALTER TABLE "game_projects" ALTER COLUMN "theme_colors_error" SET DEFAULT '#ff5263';`)
}
