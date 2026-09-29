import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_background" SET DEFAULT '#1f2030';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_foreground" SET DEFAULT '#f1f1f5';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_muted_foreground" SET DEFAULT '#a9acc2';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_surface" SET DEFAULT '#282a3d';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_accent" SET DEFAULT '#aeb8ff';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_accent_foreground" SET DEFAULT '#1f2030';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_border" SET DEFAULT '#3b3e56';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_success" SET DEFAULT '#6fd39b';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_warning" SET DEFAULT '#f2a05c';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_error" SET DEFAULT '#ff7b86';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_background" SET DEFAULT '#1f2030';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_foreground" SET DEFAULT '#f1f1f5';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_muted_foreground" SET DEFAULT '#a9acc2';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_surface" SET DEFAULT '#282a3d';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_accent" SET DEFAULT '#aeb8ff';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_accent_foreground" SET DEFAULT '#1f2030';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_border" SET DEFAULT '#3b3e56';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_success" SET DEFAULT '#6fd39b';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_warning" SET DEFAULT '#f2a05c';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_error" SET DEFAULT '#ff7b86';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_background" SET DEFAULT '#0b0d14';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_foreground" SET DEFAULT '#f2f5fa';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_muted_foreground" SET DEFAULT '#a8b1c4';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_surface" SET DEFAULT '#141927';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_accent" SET DEFAULT '#22d3ee';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_accent_foreground" SET DEFAULT '#07181d';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_border" SET DEFAULT '#273043';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_success" SET DEFAULT '#34d399';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_warning" SET DEFAULT '#fbbf24';
  ALTER TABLE "game_pages" ALTER COLUMN "site_theme_colors_error" SET DEFAULT '#fb7185';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_background" SET DEFAULT '#0b0d14';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_foreground" SET DEFAULT '#f2f5fa';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_muted_foreground" SET DEFAULT '#a8b1c4';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_surface" SET DEFAULT '#141927';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_accent" SET DEFAULT '#22d3ee';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_accent_foreground" SET DEFAULT '#07181d';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_border" SET DEFAULT '#273043';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_success" SET DEFAULT '#34d399';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_warning" SET DEFAULT '#fbbf24';
  ALTER TABLE "_game_pages_v" ALTER COLUMN "version_site_theme_colors_error" SET DEFAULT '#fb7185';`)
}
