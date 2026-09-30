import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The generator's "DROP CONSTRAINT payload_locked_documents_rels_game_pages_fk"
// is removed from `up`: "DROP TABLE game_pages CASCADE" already drops it.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Before the drops: a lock on a game page would outlive its page (the
  // drop removes the foreign key, not the rows), and the admin's list and
  // document preferences for the collection would be orphaned. These are
  // the only preference keys Payload 3.85 writes for a collection without
  // folders.
  await db.execute(sql`
  DELETE FROM "payload_locked_documents" WHERE "id" IN (
    SELECT "parent_id" FROM "payload_locked_documents_rels" WHERE "game_pages_id" IS NOT NULL
  );
  DELETE FROM "payload_preferences"
  WHERE "key" = 'collection-game-pages' OR "key" LIKE 'collection-game-pages-%';`)

  // Media the pages used stays in the library.
  await db.execute(sql`
   ALTER TABLE "game_pages_site_nav_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_gallery_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_adaptive_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_community_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_game_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_game_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_game_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_game_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_media_gallery_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_media_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_game_c_t_a_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_game_c_t_a" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_blocks_trailer_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_nav_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_gallery_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_adaptive_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_community_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_game_hero_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_game_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_game_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_game_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_media_gallery_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_media_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_game_c_t_a_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_game_c_t_a" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_blocks_trailer_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "game_pages_site_nav_links" CASCADE;
  DROP TABLE "game_pages_site_features_items" CASCADE;
  DROP TABLE "game_pages_site_gallery_items" CASCADE;
  DROP TABLE "game_pages_site_adaptive_items" CASCADE;
  DROP TABLE "game_pages_site_community_actions" CASCADE;
  DROP TABLE "game_pages_blocks_game_hero_buttons" CASCADE;
  DROP TABLE "game_pages_blocks_game_hero" CASCADE;
  DROP TABLE "game_pages_blocks_game_features_items" CASCADE;
  DROP TABLE "game_pages_blocks_game_features" CASCADE;
  DROP TABLE "game_pages_blocks_media_gallery_items" CASCADE;
  DROP TABLE "game_pages_blocks_media_gallery" CASCADE;
  DROP TABLE "game_pages_blocks_game_c_t_a_buttons" CASCADE;
  DROP TABLE "game_pages_blocks_game_c_t_a" CASCADE;
  DROP TABLE "game_pages_blocks_trailer_embed" CASCADE;
  DROP TABLE "game_pages" CASCADE;
  DROP TABLE "_game_pages_v_version_site_nav_links" CASCADE;
  DROP TABLE "_game_pages_v_version_site_features_items" CASCADE;
  DROP TABLE "_game_pages_v_version_site_gallery_items" CASCADE;
  DROP TABLE "_game_pages_v_version_site_adaptive_items" CASCADE;
  DROP TABLE "_game_pages_v_version_site_community_actions" CASCADE;
  DROP TABLE "_game_pages_v_blocks_game_hero_buttons" CASCADE;
  DROP TABLE "_game_pages_v_blocks_game_hero" CASCADE;
  DROP TABLE "_game_pages_v_blocks_game_features_items" CASCADE;
  DROP TABLE "_game_pages_v_blocks_game_features" CASCADE;
  DROP TABLE "_game_pages_v_blocks_media_gallery_items" CASCADE;
  DROP TABLE "_game_pages_v_blocks_media_gallery" CASCADE;
  DROP TABLE "_game_pages_v_blocks_game_c_t_a_buttons" CASCADE;
  DROP TABLE "_game_pages_v_blocks_game_c_t_a" CASCADE;
  DROP TABLE "_game_pages_v_blocks_trailer_embed" CASCADE;
  DROP TABLE "_game_pages_v" CASCADE;
  DROP INDEX "payload_locked_documents_rels_game_pages_id_idx";
  ALTER TABLE "game_projects" DROP COLUMN "accent_color";
  ALTER TABLE "game_projects" DROP COLUMN "links_trailer";
  ALTER TABLE "game_projects" DROP COLUMN "availability_demo_url";
  ALTER TABLE "game_projects" DROP COLUMN "meta_developer";
  ALTER TABLE "game_projects" DROP COLUMN "meta_publisher";
  ALTER TABLE "game_projects" DROP COLUMN "meta_engine";
  ALTER TABLE "game_projects" DROP COLUMN "meta_rating";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_pages_id";
  DROP TYPE "public"."enum_game_pages_site_nav_links_ref";
  DROP TYPE "public"."enum_game_pages_site_community_actions_ref";
  DROP TYPE "public"."enum_game_pages_blocks_game_hero_buttons_variant";
  DROP TYPE "public"."enum_game_pages_blocks_game_c_t_a_buttons_variant";
  DROP TYPE "public"."enum_game_pages_kind";
  DROP TYPE "public"."enum_game_pages_template";
  DROP TYPE "public"."enum_game_pages_site_nav_cta_ref";
  DROP TYPE "public"."enum_game_pages_site_theme_typography";
  DROP TYPE "public"."enum_game_pages_site_theme_shape";
  DROP TYPE "public"."enum_game_pages_site_theme_density";
  DROP TYPE "public"."enum_game_pages_site_theme_motion";
  DROP TYPE "public"."enum_game_pages_site_hero_variant";
  DROP TYPE "public"."enum_game_pages_site_hero_primary_action_ref";
  DROP TYPE "public"."enum_game_pages_site_hero_secondary_action_ref";
  DROP TYPE "public"."enum_game_pages_site_features_variant";
  DROP TYPE "public"."enum_game_pages_site_gallery_variant";
  DROP TYPE "public"."enum_game_pages_site_adaptive_kind";
  DROP TYPE "public"."enum_game_pages_site_known_issues_variant";
  DROP TYPE "public"."enum_game_pages_site_community_variant";
  DROP TYPE "public"."enum_game_pages_site_final_cta_primary_action_ref";
  DROP TYPE "public"."enum_game_pages_site_final_cta_secondary_action_ref";
  DROP TYPE "public"."enum_game_pages_status";
  DROP TYPE "public"."enum__game_pages_v_version_site_nav_links_ref";
  DROP TYPE "public"."enum__game_pages_v_version_site_community_actions_ref";
  DROP TYPE "public"."enum__game_pages_v_blocks_game_hero_buttons_variant";
  DROP TYPE "public"."enum__game_pages_v_blocks_game_c_t_a_buttons_variant";
  DROP TYPE "public"."enum__game_pages_v_version_kind";
  DROP TYPE "public"."enum__game_pages_v_version_template";
  DROP TYPE "public"."enum__game_pages_v_version_site_nav_cta_ref";
  DROP TYPE "public"."enum__game_pages_v_version_site_theme_typography";
  DROP TYPE "public"."enum__game_pages_v_version_site_theme_shape";
  DROP TYPE "public"."enum__game_pages_v_version_site_theme_density";
  DROP TYPE "public"."enum__game_pages_v_version_site_theme_motion";
  DROP TYPE "public"."enum__game_pages_v_version_site_hero_variant";
  DROP TYPE "public"."enum__game_pages_v_version_site_hero_primary_action_ref";
  DROP TYPE "public"."enum__game_pages_v_version_site_hero_secondary_action_ref";
  DROP TYPE "public"."enum__game_pages_v_version_site_features_variant";
  DROP TYPE "public"."enum__game_pages_v_version_site_gallery_variant";
  DROP TYPE "public"."enum__game_pages_v_version_site_adaptive_kind";
  DROP TYPE "public"."enum__game_pages_v_version_site_known_issues_variant";
  DROP TYPE "public"."enum__game_pages_v_version_site_community_variant";
  DROP TYPE "public"."enum__game_pages_v_version_site_final_cta_primary_action_ref";
  DROP TYPE "public"."enum__game_pages_v_version_site_final_cta_secondary_action_ref";
  DROP TYPE "public"."enum__game_pages_v_version_status";`)
}

// Restores the schema only: the pages, their versions, locks and
// preferences, and the dropped project fields' values are gone.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_pages_site_nav_links_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_site_community_actions_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_blocks_game_hero_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_game_pages_blocks_game_c_t_a_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_game_pages_kind" AS ENUM('landing');
  CREATE TYPE "public"."enum_game_pages_template" AS ENUM('flagship-game-v1');
  CREATE TYPE "public"."enum_game_pages_site_nav_cta_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_site_theme_typography" AS ENUM('modern', 'editorial', 'technical');
  CREATE TYPE "public"."enum_game_pages_site_theme_shape" AS ENUM('sharp', 'balanced', 'soft');
  CREATE TYPE "public"."enum_game_pages_site_theme_density" AS ENUM('compact', 'cinematic');
  CREATE TYPE "public"."enum_game_pages_site_theme_motion" AS ENUM('off', 'subtle');
  CREATE TYPE "public"."enum_game_pages_site_hero_variant" AS ENUM('centeredCinematic', 'leftEditorial', 'split', 'trailerBackground');
  CREATE TYPE "public"."enum_game_pages_site_hero_primary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_site_hero_secondary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_site_features_variant" AS ENUM('editorialThree', 'cardGrid', 'alternating', 'featurePlusTwo');
  CREATE TYPE "public"."enum_game_pages_site_gallery_variant" AS ENUM('editorialMosaic', 'horizontalStrip', 'carousel', 'twoColumn');
  CREATE TYPE "public"."enum_game_pages_site_adaptive_kind" AS ENUM('story', 'world', 'characters', 'modes', 'roadmap', 'systems', 'philosophy');
  CREATE TYPE "public"."enum_game_pages_site_known_issues_variant" AS ENUM('compact', 'pinned', 'recentlyFixed');
  CREATE TYPE "public"."enum_game_pages_site_community_variant" AS ENUM('artworkBanner', 'split');
  CREATE TYPE "public"."enum_game_pages_site_final_cta_primary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_site_final_cta_secondary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__game_pages_v_version_site_nav_links_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_site_community_actions_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_blocks_game_hero_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__game_pages_v_blocks_game_c_t_a_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__game_pages_v_version_kind" AS ENUM('landing');
  CREATE TYPE "public"."enum__game_pages_v_version_template" AS ENUM('flagship-game-v1');
  CREATE TYPE "public"."enum__game_pages_v_version_site_nav_cta_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_site_theme_typography" AS ENUM('modern', 'editorial', 'technical');
  CREATE TYPE "public"."enum__game_pages_v_version_site_theme_shape" AS ENUM('sharp', 'balanced', 'soft');
  CREATE TYPE "public"."enum__game_pages_v_version_site_theme_density" AS ENUM('compact', 'cinematic');
  CREATE TYPE "public"."enum__game_pages_v_version_site_theme_motion" AS ENUM('off', 'subtle');
  CREATE TYPE "public"."enum__game_pages_v_version_site_hero_variant" AS ENUM('centeredCinematic', 'leftEditorial', 'split', 'trailerBackground');
  CREATE TYPE "public"."enum__game_pages_v_version_site_hero_primary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_site_hero_secondary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_site_features_variant" AS ENUM('editorialThree', 'cardGrid', 'alternating', 'featurePlusTwo');
  CREATE TYPE "public"."enum__game_pages_v_version_site_gallery_variant" AS ENUM('editorialMosaic', 'horizontalStrip', 'carousel', 'twoColumn');
  CREATE TYPE "public"."enum__game_pages_v_version_site_adaptive_kind" AS ENUM('story', 'world', 'characters', 'modes', 'roadmap', 'systems', 'philosophy');
  CREATE TYPE "public"."enum__game_pages_v_version_site_known_issues_variant" AS ENUM('compact', 'pinned', 'recentlyFixed');
  CREATE TYPE "public"."enum__game_pages_v_version_site_community_variant" AS ENUM('artworkBanner', 'split');
  CREATE TYPE "public"."enum__game_pages_v_version_site_final_cta_primary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_site_final_cta_secondary_action_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "game_pages_site_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ref" "enum_game_pages_site_nav_links_ref",
  	"label" varchar
  );
  
  CREATE TABLE "game_pages_site_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"media_id" integer
  );
  
  CREATE TABLE "game_pages_site_gallery_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"alt" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "game_pages_site_adaptive_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "game_pages_site_community_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ref" "enum_game_pages_site_community_actions_ref",
  	"label" varchar
  );
  
  CREATE TABLE "game_pages_blocks_game_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum_game_pages_blocks_game_hero_buttons_variant" DEFAULT 'primary'
  );
  
  CREATE TABLE "game_pages_blocks_game_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"tagline" varchar,
  	"background_image_id" integer,
  	"show_logo" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "game_pages_blocks_game_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "game_pages_blocks_game_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "game_pages_blocks_media_gallery_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "game_pages_blocks_media_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "game_pages_blocks_game_c_t_a_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum_game_pages_blocks_game_c_t_a_buttons_variant" DEFAULT 'primary'
  );
  
  CREATE TABLE "game_pages_blocks_game_c_t_a" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "game_pages_blocks_trailer_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "game_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"game_project_id" integer,
  	"kind" "enum_game_pages_kind" DEFAULT 'landing',
  	"title" varchar,
  	"template" "enum_game_pages_template" DEFAULT 'flagship-game-v1',
  	"schema_version" numeric DEFAULT 1,
  	"site_nav_cta_ref" "enum_game_pages_site_nav_cta_ref",
  	"site_nav_cta_label" varchar,
  	"site_theme_colors_background" varchar DEFAULT '#1f2030',
  	"site_theme_colors_foreground" varchar DEFAULT '#f1f1f5',
  	"site_theme_colors_muted_foreground" varchar DEFAULT '#a9acc2',
  	"site_theme_colors_surface" varchar DEFAULT '#282a3d',
  	"site_theme_colors_accent" varchar DEFAULT '#aeb8ff',
  	"site_theme_colors_accent_foreground" varchar DEFAULT '#1f2030',
  	"site_theme_colors_border" varchar DEFAULT '#3b3e56',
  	"site_theme_colors_success" varchar DEFAULT '#6fd39b',
  	"site_theme_colors_warning" varchar DEFAULT '#f2a05c',
  	"site_theme_colors_error" varchar DEFAULT '#ff7b86',
  	"site_theme_typography" "enum_game_pages_site_theme_typography" DEFAULT 'modern',
  	"site_theme_shape" "enum_game_pages_site_theme_shape" DEFAULT 'balanced',
  	"site_theme_density" "enum_game_pages_site_theme_density" DEFAULT 'cinematic',
  	"site_theme_motion" "enum_game_pages_site_theme_motion" DEFAULT 'subtle',
  	"site_hero_variant" "enum_game_pages_site_hero_variant" DEFAULT 'leftEditorial',
  	"site_hero_eyebrow" varchar,
  	"site_hero_heading" varchar,
  	"site_hero_tagline" varchar,
  	"site_hero_show_logo" boolean DEFAULT true,
  	"site_hero_background_media_id" integer,
  	"site_hero_primary_action_ref" "enum_game_pages_site_hero_primary_action_ref",
  	"site_hero_primary_action_label" varchar,
  	"site_hero_secondary_action_ref" "enum_game_pages_site_hero_secondary_action_ref",
  	"site_hero_secondary_action_label" varchar,
  	"site_availability_enabled" boolean DEFAULT true,
  	"site_availability_heading" varchar,
  	"site_availability_note" varchar,
  	"site_features_variant" "enum_game_pages_site_features_variant" DEFAULT 'cardGrid',
  	"site_features_heading" varchar,
  	"site_features_intro" varchar,
  	"site_trailer_enabled" boolean DEFAULT true,
  	"site_trailer_heading" varchar,
  	"site_trailer_poster_id" integer,
  	"site_gallery_variant" "enum_game_pages_site_gallery_variant" DEFAULT 'editorialMosaic',
  	"site_gallery_heading" varchar,
  	"site_adaptive_kind" "enum_game_pages_site_adaptive_kind" DEFAULT 'story',
  	"site_adaptive_heading" varchar,
  	"site_adaptive_body" varchar,
  	"site_adaptive_media_id" integer,
  	"site_latest_update_enabled" boolean DEFAULT true,
  	"site_latest_update_heading" varchar,
  	"site_known_issues_enabled" boolean DEFAULT true,
  	"site_known_issues_variant" "enum_game_pages_site_known_issues_variant" DEFAULT 'compact',
  	"site_known_issues_heading" varchar,
  	"site_community_enabled" boolean DEFAULT true,
  	"site_community_variant" "enum_game_pages_site_community_variant" DEFAULT 'split',
  	"site_community_heading" varchar,
  	"site_community_body" varchar,
  	"site_community_background_id" integer,
  	"site_final_cta_enabled" boolean DEFAULT true,
  	"site_final_cta_heading" varchar,
  	"site_final_cta_subheading" varchar,
  	"site_final_cta_background_id" integer,
  	"site_final_cta_primary_action_ref" "enum_game_pages_site_final_cta_primary_action_ref",
  	"site_final_cta_primary_action_label" varchar,
  	"site_final_cta_secondary_action_ref" "enum_game_pages_site_final_cta_secondary_action_ref",
  	"site_final_cta_secondary_action_label" varchar,
  	"site_footer_tagline" varchar,
  	"site_footer_show_legal_links" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_game_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_game_pages_v_version_site_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" "enum__game_pages_v_version_site_nav_links_ref",
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_version_site_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_version_site_gallery_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"alt" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_version_site_adaptive_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_version_site_community_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" "enum__game_pages_v_version_site_community_actions_ref",
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_game_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum__game_pages_v_blocks_game_hero_buttons_variant" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_game_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"tagline" varchar,
  	"background_image_id" integer,
  	"show_logo" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_game_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_game_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_media_gallery_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_media_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_game_c_t_a_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum__game_pages_v_blocks_game_c_t_a_buttons_variant" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_game_c_t_a" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_game_pages_v_blocks_trailer_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_game_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_game_project_id" integer,
  	"version_kind" "enum__game_pages_v_version_kind" DEFAULT 'landing',
  	"version_title" varchar,
  	"version_template" "enum__game_pages_v_version_template" DEFAULT 'flagship-game-v1',
  	"version_schema_version" numeric DEFAULT 1,
  	"version_site_nav_cta_ref" "enum__game_pages_v_version_site_nav_cta_ref",
  	"version_site_nav_cta_label" varchar,
  	"version_site_theme_colors_background" varchar DEFAULT '#1f2030',
  	"version_site_theme_colors_foreground" varchar DEFAULT '#f1f1f5',
  	"version_site_theme_colors_muted_foreground" varchar DEFAULT '#a9acc2',
  	"version_site_theme_colors_surface" varchar DEFAULT '#282a3d',
  	"version_site_theme_colors_accent" varchar DEFAULT '#aeb8ff',
  	"version_site_theme_colors_accent_foreground" varchar DEFAULT '#1f2030',
  	"version_site_theme_colors_border" varchar DEFAULT '#3b3e56',
  	"version_site_theme_colors_success" varchar DEFAULT '#6fd39b',
  	"version_site_theme_colors_warning" varchar DEFAULT '#f2a05c',
  	"version_site_theme_colors_error" varchar DEFAULT '#ff7b86',
  	"version_site_theme_typography" "enum__game_pages_v_version_site_theme_typography" DEFAULT 'modern',
  	"version_site_theme_shape" "enum__game_pages_v_version_site_theme_shape" DEFAULT 'balanced',
  	"version_site_theme_density" "enum__game_pages_v_version_site_theme_density" DEFAULT 'cinematic',
  	"version_site_theme_motion" "enum__game_pages_v_version_site_theme_motion" DEFAULT 'subtle',
  	"version_site_hero_variant" "enum__game_pages_v_version_site_hero_variant" DEFAULT 'leftEditorial',
  	"version_site_hero_eyebrow" varchar,
  	"version_site_hero_heading" varchar,
  	"version_site_hero_tagline" varchar,
  	"version_site_hero_show_logo" boolean DEFAULT true,
  	"version_site_hero_background_media_id" integer,
  	"version_site_hero_primary_action_ref" "enum__game_pages_v_version_site_hero_primary_action_ref",
  	"version_site_hero_primary_action_label" varchar,
  	"version_site_hero_secondary_action_ref" "enum__game_pages_v_version_site_hero_secondary_action_ref",
  	"version_site_hero_secondary_action_label" varchar,
  	"version_site_availability_enabled" boolean DEFAULT true,
  	"version_site_availability_heading" varchar,
  	"version_site_availability_note" varchar,
  	"version_site_features_variant" "enum__game_pages_v_version_site_features_variant" DEFAULT 'cardGrid',
  	"version_site_features_heading" varchar,
  	"version_site_features_intro" varchar,
  	"version_site_trailer_enabled" boolean DEFAULT true,
  	"version_site_trailer_heading" varchar,
  	"version_site_trailer_poster_id" integer,
  	"version_site_gallery_variant" "enum__game_pages_v_version_site_gallery_variant" DEFAULT 'editorialMosaic',
  	"version_site_gallery_heading" varchar,
  	"version_site_adaptive_kind" "enum__game_pages_v_version_site_adaptive_kind" DEFAULT 'story',
  	"version_site_adaptive_heading" varchar,
  	"version_site_adaptive_body" varchar,
  	"version_site_adaptive_media_id" integer,
  	"version_site_latest_update_enabled" boolean DEFAULT true,
  	"version_site_latest_update_heading" varchar,
  	"version_site_known_issues_enabled" boolean DEFAULT true,
  	"version_site_known_issues_variant" "enum__game_pages_v_version_site_known_issues_variant" DEFAULT 'compact',
  	"version_site_known_issues_heading" varchar,
  	"version_site_community_enabled" boolean DEFAULT true,
  	"version_site_community_variant" "enum__game_pages_v_version_site_community_variant" DEFAULT 'split',
  	"version_site_community_heading" varchar,
  	"version_site_community_body" varchar,
  	"version_site_community_background_id" integer,
  	"version_site_final_cta_enabled" boolean DEFAULT true,
  	"version_site_final_cta_heading" varchar,
  	"version_site_final_cta_subheading" varchar,
  	"version_site_final_cta_background_id" integer,
  	"version_site_final_cta_primary_action_ref" "enum__game_pages_v_version_site_final_cta_primary_action_ref",
  	"version_site_final_cta_primary_action_label" varchar,
  	"version_site_final_cta_secondary_action_ref" "enum__game_pages_v_version_site_final_cta_secondary_action_ref",
  	"version_site_final_cta_secondary_action_label" varchar,
  	"version_site_footer_tagline" varchar,
  	"version_site_footer_show_legal_links" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__game_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "game_projects" ADD COLUMN "accent_color" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_trailer" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "availability_demo_url" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_developer" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_publisher" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_engine" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_rating" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_pages_id" integer;
  ALTER TABLE "game_pages_site_nav_links" ADD CONSTRAINT "game_pages_site_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_features_items" ADD CONSTRAINT "game_pages_site_features_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_site_features_items" ADD CONSTRAINT "game_pages_site_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_gallery_items" ADD CONSTRAINT "game_pages_site_gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_site_gallery_items" ADD CONSTRAINT "game_pages_site_gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_adaptive_items" ADD CONSTRAINT "game_pages_site_adaptive_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_community_actions" ADD CONSTRAINT "game_pages_site_community_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_hero_buttons" ADD CONSTRAINT "game_pages_blocks_game_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages_blocks_game_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_hero" ADD CONSTRAINT "game_pages_blocks_game_hero_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_hero" ADD CONSTRAINT "game_pages_blocks_game_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_features_items" ADD CONSTRAINT "game_pages_blocks_game_features_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_features_items" ADD CONSTRAINT "game_pages_blocks_game_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages_blocks_game_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_features" ADD CONSTRAINT "game_pages_blocks_game_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_media_gallery_items" ADD CONSTRAINT "game_pages_blocks_media_gallery_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_media_gallery_items" ADD CONSTRAINT "game_pages_blocks_media_gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages_blocks_media_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_media_gallery" ADD CONSTRAINT "game_pages_blocks_media_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_c_t_a_buttons" ADD CONSTRAINT "game_pages_blocks_game_c_t_a_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages_blocks_game_c_t_a"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_game_c_t_a" ADD CONSTRAINT "game_pages_blocks_game_c_t_a_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_blocks_trailer_embed" ADD CONSTRAINT "game_pages_blocks_trailer_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_hero_background_media_id_media_id_fk" FOREIGN KEY ("site_hero_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_trailer_poster_id_media_id_fk" FOREIGN KEY ("site_trailer_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_adaptive_media_id_media_id_fk" FOREIGN KEY ("site_adaptive_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_community_background_id_media_id_fk" FOREIGN KEY ("site_community_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_final_cta_background_id_media_id_fk" FOREIGN KEY ("site_final_cta_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_nav_links" ADD CONSTRAINT "_game_pages_v_version_site_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_features_items" ADD CONSTRAINT "_game_pages_v_version_site_features_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_features_items" ADD CONSTRAINT "_game_pages_v_version_site_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_gallery_items" ADD CONSTRAINT "_game_pages_v_version_site_gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_gallery_items" ADD CONSTRAINT "_game_pages_v_version_site_gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_adaptive_items" ADD CONSTRAINT "_game_pages_v_version_site_adaptive_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_community_actions" ADD CONSTRAINT "_game_pages_v_version_site_community_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_hero_buttons" ADD CONSTRAINT "_game_pages_v_blocks_game_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v_blocks_game_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_hero" ADD CONSTRAINT "_game_pages_v_blocks_game_hero_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_hero" ADD CONSTRAINT "_game_pages_v_blocks_game_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_features_items" ADD CONSTRAINT "_game_pages_v_blocks_game_features_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_features_items" ADD CONSTRAINT "_game_pages_v_blocks_game_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v_blocks_game_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_features" ADD CONSTRAINT "_game_pages_v_blocks_game_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_media_gallery_items" ADD CONSTRAINT "_game_pages_v_blocks_media_gallery_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_media_gallery_items" ADD CONSTRAINT "_game_pages_v_blocks_media_gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v_blocks_media_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_media_gallery" ADD CONSTRAINT "_game_pages_v_blocks_media_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_c_t_a_buttons" ADD CONSTRAINT "_game_pages_v_blocks_game_c_t_a_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v_blocks_game_c_t_a"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_game_c_t_a" ADD CONSTRAINT "_game_pages_v_blocks_game_c_t_a_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_blocks_trailer_embed" ADD CONSTRAINT "_game_pages_v_blocks_trailer_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_parent_id_game_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."game_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_game_project_id_game_projects_id_fk" FOREIGN KEY ("version_game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_hero_background_media_id_media_id_fk" FOREIGN KEY ("version_site_hero_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_trailer_poster_id_media_id_fk" FOREIGN KEY ("version_site_trailer_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_adaptive_media_id_media_id_fk" FOREIGN KEY ("version_site_adaptive_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_community_background_id_media_id_fk" FOREIGN KEY ("version_site_community_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_final_cta_background_id_media_id_fk" FOREIGN KEY ("version_site_final_cta_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "game_pages_site_nav_links_order_idx" ON "game_pages_site_nav_links" USING btree ("_order");
  CREATE INDEX "game_pages_site_nav_links_parent_id_idx" ON "game_pages_site_nav_links" USING btree ("_parent_id");
  CREATE INDEX "game_pages_site_features_items_order_idx" ON "game_pages_site_features_items" USING btree ("_order");
  CREATE INDEX "game_pages_site_features_items_parent_id_idx" ON "game_pages_site_features_items" USING btree ("_parent_id");
  CREATE INDEX "game_pages_site_features_items_media_idx" ON "game_pages_site_features_items" USING btree ("media_id");
  CREATE INDEX "game_pages_site_gallery_items_order_idx" ON "game_pages_site_gallery_items" USING btree ("_order");
  CREATE INDEX "game_pages_site_gallery_items_parent_id_idx" ON "game_pages_site_gallery_items" USING btree ("_parent_id");
  CREATE INDEX "game_pages_site_gallery_items_media_idx" ON "game_pages_site_gallery_items" USING btree ("media_id");
  CREATE INDEX "game_pages_site_adaptive_items_order_idx" ON "game_pages_site_adaptive_items" USING btree ("_order");
  CREATE INDEX "game_pages_site_adaptive_items_parent_id_idx" ON "game_pages_site_adaptive_items" USING btree ("_parent_id");
  CREATE INDEX "game_pages_site_community_actions_order_idx" ON "game_pages_site_community_actions" USING btree ("_order");
  CREATE INDEX "game_pages_site_community_actions_parent_id_idx" ON "game_pages_site_community_actions" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_hero_buttons_order_idx" ON "game_pages_blocks_game_hero_buttons" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_game_hero_buttons_parent_id_idx" ON "game_pages_blocks_game_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_hero_order_idx" ON "game_pages_blocks_game_hero" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_game_hero_parent_id_idx" ON "game_pages_blocks_game_hero" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_hero_path_idx" ON "game_pages_blocks_game_hero" USING btree ("_path");
  CREATE INDEX "game_pages_blocks_game_hero_background_image_idx" ON "game_pages_blocks_game_hero" USING btree ("background_image_id");
  CREATE INDEX "game_pages_blocks_game_features_items_order_idx" ON "game_pages_blocks_game_features_items" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_game_features_items_parent_id_idx" ON "game_pages_blocks_game_features_items" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_features_items_image_idx" ON "game_pages_blocks_game_features_items" USING btree ("image_id");
  CREATE INDEX "game_pages_blocks_game_features_order_idx" ON "game_pages_blocks_game_features" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_game_features_parent_id_idx" ON "game_pages_blocks_game_features" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_features_path_idx" ON "game_pages_blocks_game_features" USING btree ("_path");
  CREATE INDEX "game_pages_blocks_media_gallery_items_order_idx" ON "game_pages_blocks_media_gallery_items" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_media_gallery_items_parent_id_idx" ON "game_pages_blocks_media_gallery_items" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_media_gallery_items_image_idx" ON "game_pages_blocks_media_gallery_items" USING btree ("image_id");
  CREATE INDEX "game_pages_blocks_media_gallery_order_idx" ON "game_pages_blocks_media_gallery" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_media_gallery_parent_id_idx" ON "game_pages_blocks_media_gallery" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_media_gallery_path_idx" ON "game_pages_blocks_media_gallery" USING btree ("_path");
  CREATE INDEX "game_pages_blocks_game_c_t_a_buttons_order_idx" ON "game_pages_blocks_game_c_t_a_buttons" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_game_c_t_a_buttons_parent_id_idx" ON "game_pages_blocks_game_c_t_a_buttons" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_c_t_a_order_idx" ON "game_pages_blocks_game_c_t_a" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_game_c_t_a_parent_id_idx" ON "game_pages_blocks_game_c_t_a" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_game_c_t_a_path_idx" ON "game_pages_blocks_game_c_t_a" USING btree ("_path");
  CREATE INDEX "game_pages_blocks_trailer_embed_order_idx" ON "game_pages_blocks_trailer_embed" USING btree ("_order");
  CREATE INDEX "game_pages_blocks_trailer_embed_parent_id_idx" ON "game_pages_blocks_trailer_embed" USING btree ("_parent_id");
  CREATE INDEX "game_pages_blocks_trailer_embed_path_idx" ON "game_pages_blocks_trailer_embed" USING btree ("_path");
  CREATE INDEX "game_pages_tenant_idx" ON "game_pages" USING btree ("tenant_id");
  CREATE INDEX "game_pages_game_project_idx" ON "game_pages" USING btree ("game_project_id");
  CREATE INDEX "game_pages_site_hero_site_hero_background_media_idx" ON "game_pages" USING btree ("site_hero_background_media_id");
  CREATE INDEX "game_pages_site_trailer_site_trailer_poster_idx" ON "game_pages" USING btree ("site_trailer_poster_id");
  CREATE INDEX "game_pages_site_adaptive_site_adaptive_media_idx" ON "game_pages" USING btree ("site_adaptive_media_id");
  CREATE INDEX "game_pages_site_community_site_community_background_idx" ON "game_pages" USING btree ("site_community_background_id");
  CREATE INDEX "game_pages_site_final_cta_site_final_cta_background_idx" ON "game_pages" USING btree ("site_final_cta_background_id");
  CREATE INDEX "game_pages_updated_at_idx" ON "game_pages" USING btree ("updated_at");
  CREATE INDEX "game_pages_created_at_idx" ON "game_pages" USING btree ("created_at");
  CREATE INDEX "game_pages__status_idx" ON "game_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "gameProject_kind_idx" ON "game_pages" USING btree ("game_project_id","kind");
  CREATE INDEX "_game_pages_v_version_site_nav_links_order_idx" ON "_game_pages_v_version_site_nav_links" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_site_nav_links_parent_id_idx" ON "_game_pages_v_version_site_nav_links" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_version_site_features_items_order_idx" ON "_game_pages_v_version_site_features_items" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_site_features_items_parent_id_idx" ON "_game_pages_v_version_site_features_items" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_version_site_features_items_media_idx" ON "_game_pages_v_version_site_features_items" USING btree ("media_id");
  CREATE INDEX "_game_pages_v_version_site_gallery_items_order_idx" ON "_game_pages_v_version_site_gallery_items" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_site_gallery_items_parent_id_idx" ON "_game_pages_v_version_site_gallery_items" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_version_site_gallery_items_media_idx" ON "_game_pages_v_version_site_gallery_items" USING btree ("media_id");
  CREATE INDEX "_game_pages_v_version_site_adaptive_items_order_idx" ON "_game_pages_v_version_site_adaptive_items" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_site_adaptive_items_parent_id_idx" ON "_game_pages_v_version_site_adaptive_items" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_version_site_community_actions_order_idx" ON "_game_pages_v_version_site_community_actions" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_site_community_actions_parent_id_idx" ON "_game_pages_v_version_site_community_actions" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_hero_buttons_order_idx" ON "_game_pages_v_blocks_game_hero_buttons" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_game_hero_buttons_parent_id_idx" ON "_game_pages_v_blocks_game_hero_buttons" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_hero_order_idx" ON "_game_pages_v_blocks_game_hero" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_game_hero_parent_id_idx" ON "_game_pages_v_blocks_game_hero" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_hero_path_idx" ON "_game_pages_v_blocks_game_hero" USING btree ("_path");
  CREATE INDEX "_game_pages_v_blocks_game_hero_background_image_idx" ON "_game_pages_v_blocks_game_hero" USING btree ("background_image_id");
  CREATE INDEX "_game_pages_v_blocks_game_features_items_order_idx" ON "_game_pages_v_blocks_game_features_items" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_game_features_items_parent_id_idx" ON "_game_pages_v_blocks_game_features_items" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_features_items_image_idx" ON "_game_pages_v_blocks_game_features_items" USING btree ("image_id");
  CREATE INDEX "_game_pages_v_blocks_game_features_order_idx" ON "_game_pages_v_blocks_game_features" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_game_features_parent_id_idx" ON "_game_pages_v_blocks_game_features" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_features_path_idx" ON "_game_pages_v_blocks_game_features" USING btree ("_path");
  CREATE INDEX "_game_pages_v_blocks_media_gallery_items_order_idx" ON "_game_pages_v_blocks_media_gallery_items" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_media_gallery_items_parent_id_idx" ON "_game_pages_v_blocks_media_gallery_items" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_media_gallery_items_image_idx" ON "_game_pages_v_blocks_media_gallery_items" USING btree ("image_id");
  CREATE INDEX "_game_pages_v_blocks_media_gallery_order_idx" ON "_game_pages_v_blocks_media_gallery" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_media_gallery_parent_id_idx" ON "_game_pages_v_blocks_media_gallery" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_media_gallery_path_idx" ON "_game_pages_v_blocks_media_gallery" USING btree ("_path");
  CREATE INDEX "_game_pages_v_blocks_game_c_t_a_buttons_order_idx" ON "_game_pages_v_blocks_game_c_t_a_buttons" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_game_c_t_a_buttons_parent_id_idx" ON "_game_pages_v_blocks_game_c_t_a_buttons" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_c_t_a_order_idx" ON "_game_pages_v_blocks_game_c_t_a" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_game_c_t_a_parent_id_idx" ON "_game_pages_v_blocks_game_c_t_a" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_game_c_t_a_path_idx" ON "_game_pages_v_blocks_game_c_t_a" USING btree ("_path");
  CREATE INDEX "_game_pages_v_blocks_trailer_embed_order_idx" ON "_game_pages_v_blocks_trailer_embed" USING btree ("_order");
  CREATE INDEX "_game_pages_v_blocks_trailer_embed_parent_id_idx" ON "_game_pages_v_blocks_trailer_embed" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_blocks_trailer_embed_path_idx" ON "_game_pages_v_blocks_trailer_embed" USING btree ("_path");
  CREATE INDEX "_game_pages_v_parent_idx" ON "_game_pages_v" USING btree ("parent_id");
  CREATE INDEX "_game_pages_v_version_version_tenant_idx" ON "_game_pages_v" USING btree ("version_tenant_id");
  CREATE INDEX "_game_pages_v_version_version_game_project_idx" ON "_game_pages_v" USING btree ("version_game_project_id");
  CREATE INDEX "_game_pages_v_version_site_hero_version_site_hero_backgr_idx" ON "_game_pages_v" USING btree ("version_site_hero_background_media_id");
  CREATE INDEX "_game_pages_v_version_site_trailer_version_site_trailer__idx" ON "_game_pages_v" USING btree ("version_site_trailer_poster_id");
  CREATE INDEX "_game_pages_v_version_site_adaptive_version_site_adaptiv_idx" ON "_game_pages_v" USING btree ("version_site_adaptive_media_id");
  CREATE INDEX "_game_pages_v_version_site_community_version_site_commun_idx" ON "_game_pages_v" USING btree ("version_site_community_background_id");
  CREATE INDEX "_game_pages_v_version_site_final_cta_version_site_final__idx" ON "_game_pages_v" USING btree ("version_site_final_cta_background_id");
  CREATE INDEX "_game_pages_v_version_version_updated_at_idx" ON "_game_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_game_pages_v_version_version_created_at_idx" ON "_game_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_game_pages_v_version_version__status_idx" ON "_game_pages_v" USING btree ("version__status");
  CREATE INDEX "_game_pages_v_created_at_idx" ON "_game_pages_v" USING btree ("created_at");
  CREATE INDEX "_game_pages_v_updated_at_idx" ON "_game_pages_v" USING btree ("updated_at");
  CREATE INDEX "_game_pages_v_latest_idx" ON "_game_pages_v" USING btree ("latest");
  CREATE INDEX "version_gameProject_version_kind_idx" ON "_game_pages_v" USING btree ("version_game_project_id","version_kind");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_pages_fk" FOREIGN KEY ("game_pages_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_game_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("game_pages_id");`)
}
