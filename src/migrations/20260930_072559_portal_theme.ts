import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_projects_theme_typography" AS ENUM('modern', 'editorial', 'technical');
  CREATE TYPE "public"."enum_game_projects_theme_shape" AS ENUM('sharp', 'balanced', 'soft');
  CREATE TYPE "public"."enum_game_projects_theme_density" AS ENUM('compact', 'cinematic');
  CREATE TYPE "public"."enum_game_projects_theme_motion" AS ENUM('off', 'subtle');
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_background" varchar DEFAULT '#1f2030';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_foreground" varchar DEFAULT '#f1f1f5';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_muted_foreground" varchar DEFAULT '#a9acc2';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_surface" varchar DEFAULT '#282a3d';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_accent" varchar DEFAULT '#aeb8ff';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_accent_foreground" varchar DEFAULT '#1f2030';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_border" varchar DEFAULT '#3b3e56';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_success" varchar DEFAULT '#6fd39b';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_warning" varchar DEFAULT '#f2a05c';
  ALTER TABLE "game_projects" ADD COLUMN "theme_colors_error" varchar DEFAULT '#ff7b86';
  ALTER TABLE "game_projects" ADD COLUMN "theme_typography" "enum_game_projects_theme_typography" DEFAULT 'modern';
  ALTER TABLE "game_projects" ADD COLUMN "theme_shape" "enum_game_projects_theme_shape" DEFAULT 'balanced';
  ALTER TABLE "game_projects" ADD COLUMN "theme_density" "enum_game_projects_theme_density" DEFAULT 'cinematic';
  ALTER TABLE "game_projects" ADD COLUMN "theme_motion" "enum_game_projects_theme_motion" DEFAULT 'subtle';`)

  // The theme moves from the landing page onto the project. Only a
  // published flagship page counts: Payload writes the main game_pages
  // row only when a save isn't a draft (a later draft stays in
  // _game_pages_v), so its _status is the published state. Projects
  // without one keep the default theme. At most one page per project
  // (unique on game_project_id, kind, and kind has one value).
  // The palette is copied only when all ten colours are set, since the
  // old renderer treated a partial palette as unset.
  await db.execute(sql`
  UPDATE "game_projects" p SET
    "theme_colors_background" = g."site_theme_colors_background",
    "theme_colors_foreground" = g."site_theme_colors_foreground",
    "theme_colors_muted_foreground" = g."site_theme_colors_muted_foreground",
    "theme_colors_surface" = g."site_theme_colors_surface",
    "theme_colors_accent" = g."site_theme_colors_accent",
    "theme_colors_accent_foreground" = g."site_theme_colors_accent_foreground",
    "theme_colors_border" = g."site_theme_colors_border",
    "theme_colors_success" = g."site_theme_colors_success",
    "theme_colors_warning" = g."site_theme_colors_warning",
    "theme_colors_error" = g."site_theme_colors_error"
  FROM "game_pages" g
  WHERE g."game_project_id" = p."id"
    AND g."_status" = 'published'
    AND g."template" = 'flagship-game-v1'
    AND num_nonnulls(
      NULLIF(g."site_theme_colors_background", ''),
      NULLIF(g."site_theme_colors_foreground", ''),
      NULLIF(g."site_theme_colors_muted_foreground", ''),
      NULLIF(g."site_theme_colors_surface", ''),
      NULLIF(g."site_theme_colors_accent", ''),
      NULLIF(g."site_theme_colors_accent_foreground", ''),
      NULLIF(g."site_theme_colors_border", ''),
      NULLIF(g."site_theme_colors_success", ''),
      NULLIF(g."site_theme_colors_warning", ''),
      NULLIF(g."site_theme_colors_error", '')
    ) = 10;`)

  // The tokens, when set; the page's hero art and tagline fill the
  // project's key art and pitch only where the project has none.
  await db.execute(sql`
  UPDATE "game_projects" p SET
    "theme_typography" = COALESCE(g."site_theme_typography"::text::"enum_game_projects_theme_typography", p."theme_typography"),
    "theme_shape" = COALESCE(g."site_theme_shape"::text::"enum_game_projects_theme_shape", p."theme_shape"),
    "theme_density" = COALESCE(g."site_theme_density"::text::"enum_game_projects_theme_density", p."theme_density"),
    "theme_motion" = COALESCE(g."site_theme_motion"::text::"enum_game_projects_theme_motion", p."theme_motion"),
    "banner_id" = COALESCE(p."banner_id", g."site_hero_background_media_id"),
    "description" = CASE
      WHEN COALESCE(p."description", '') = '' AND COALESCE(g."site_hero_tagline", '') <> ''
        THEN g."site_hero_tagline"
      ELSE p."description"
    END
  FROM "game_pages" g
  WHERE g."game_project_id" = p."id"
    AND g."_status" = 'published'
    AND g."template" = 'flagship-game-v1';`)
}

// The copied key art and pitch stay on the project.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" DROP COLUMN "theme_colors_background";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_foreground";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_muted_foreground";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_surface";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_accent";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_accent_foreground";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_border";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_success";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_warning";
  ALTER TABLE "game_projects" DROP COLUMN "theme_colors_error";
  ALTER TABLE "game_projects" DROP COLUMN "theme_typography";
  ALTER TABLE "game_projects" DROP COLUMN "theme_shape";
  ALTER TABLE "game_projects" DROP COLUMN "theme_density";
  ALTER TABLE "game_projects" DROP COLUMN "theme_motion";
  DROP TYPE "public"."enum_game_projects_theme_typography";
  DROP TYPE "public"."enum_game_projects_theme_shape";
  DROP TYPE "public"."enum_game_projects_theme_density";
  DROP TYPE "public"."enum_game_projects_theme_motion";`)
}
