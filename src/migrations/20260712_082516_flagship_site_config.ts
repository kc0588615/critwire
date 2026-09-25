import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_projects_availability_platforms_platform" AS ENUM('windows', 'mac', 'linux', 'steamDeck', 'playstation', 'xbox', 'switch', 'ios', 'android', 'web');
  CREATE TYPE "public"."enum_game_projects_availability_release_state" AS ENUM('comingSoon', 'earlyAccess', 'released', 'freeToPlay');
  CREATE TYPE "public"."enum_game_pages_site_nav_links_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum_game_pages_site_community_actions_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
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
  CREATE TYPE "public"."enum__game_pages_v_version_site_nav_links_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
  CREATE TYPE "public"."enum__game_pages_v_version_site_community_actions_ref" AS ENUM('primary-store', 'demo', 'steam', 'epic', 'itch', 'discord', 'updates', 'issues', 'report', 'contact');
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
  CREATE TABLE "game_projects_availability_platforms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_game_projects_availability_platforms_platform" NOT NULL,
  	"store_url" varchar,
  	"label" varchar
  );
  
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
  
  CREATE TABLE "game_pages_generation_change_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
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
  
  CREATE TABLE "_game_pages_v_version_generation_change_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "game_projects" ADD COLUMN "links_playstation" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_xbox" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_nintendo" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_gog" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_youtube" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_press_kit" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_privacy" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_terms" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "links_trailer" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "availability_release_state" "enum_game_projects_availability_release_state" DEFAULT 'comingSoon';
  ALTER TABLE "game_projects" ADD COLUMN "availability_release_date" timestamp(3) with time zone;
  ALTER TABLE "game_projects" ADD COLUMN "availability_current_version" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "availability_demo_url" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_developer" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_publisher" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_engine" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "meta_rating" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "template" "enum_game_pages_template" DEFAULT 'flagship-game-v1';
  ALTER TABLE "game_pages" ADD COLUMN "schema_version" numeric DEFAULT 1;
  ALTER TABLE "game_pages" ADD COLUMN "site_nav_cta_ref" "enum_game_pages_site_nav_cta_ref";
  ALTER TABLE "game_pages" ADD COLUMN "site_nav_cta_label" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_background" varchar DEFAULT '#0b0d14';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_foreground" varchar DEFAULT '#f2f5fa';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_muted_foreground" varchar DEFAULT '#a8b1c4';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_surface" varchar DEFAULT '#141927';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_accent" varchar DEFAULT '#22d3ee';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_accent_foreground" varchar DEFAULT '#07181d';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_border" varchar DEFAULT '#273043';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_success" varchar DEFAULT '#34d399';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_warning" varchar DEFAULT '#fbbf24';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_colors_error" varchar DEFAULT '#fb7185';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_typography" "enum_game_pages_site_theme_typography" DEFAULT 'modern';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_shape" "enum_game_pages_site_theme_shape" DEFAULT 'balanced';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_density" "enum_game_pages_site_theme_density" DEFAULT 'cinematic';
  ALTER TABLE "game_pages" ADD COLUMN "site_theme_motion" "enum_game_pages_site_theme_motion" DEFAULT 'subtle';
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_variant" "enum_game_pages_site_hero_variant" DEFAULT 'leftEditorial';
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_eyebrow" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_tagline" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_show_logo" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_background_media_id" integer;
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_primary_action_ref" "enum_game_pages_site_hero_primary_action_ref";
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_primary_action_label" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_secondary_action_ref" "enum_game_pages_site_hero_secondary_action_ref";
  ALTER TABLE "game_pages" ADD COLUMN "site_hero_secondary_action_label" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_availability_enabled" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_availability_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_availability_note" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_features_variant" "enum_game_pages_site_features_variant" DEFAULT 'cardGrid';
  ALTER TABLE "game_pages" ADD COLUMN "site_features_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_features_intro" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_trailer_enabled" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_trailer_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_trailer_poster_id" integer;
  ALTER TABLE "game_pages" ADD COLUMN "site_gallery_variant" "enum_game_pages_site_gallery_variant" DEFAULT 'editorialMosaic';
  ALTER TABLE "game_pages" ADD COLUMN "site_gallery_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_adaptive_kind" "enum_game_pages_site_adaptive_kind" DEFAULT 'story';
  ALTER TABLE "game_pages" ADD COLUMN "site_adaptive_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_adaptive_body" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_adaptive_media_id" integer;
  ALTER TABLE "game_pages" ADD COLUMN "site_latest_update_enabled" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_latest_update_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_known_issues_enabled" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_known_issues_variant" "enum_game_pages_site_known_issues_variant" DEFAULT 'compact';
  ALTER TABLE "game_pages" ADD COLUMN "site_known_issues_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_community_enabled" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_community_variant" "enum_game_pages_site_community_variant" DEFAULT 'split';
  ALTER TABLE "game_pages" ADD COLUMN "site_community_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_community_body" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_community_background_id" integer;
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_enabled" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_heading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_subheading" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_background_id" integer;
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_primary_action_ref" "enum_game_pages_site_final_cta_primary_action_ref";
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_primary_action_label" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_secondary_action_ref" "enum_game_pages_site_final_cta_secondary_action_ref";
  ALTER TABLE "game_pages" ADD COLUMN "site_final_cta_secondary_action_label" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_footer_tagline" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "site_footer_show_legal_links" boolean DEFAULT true;
  ALTER TABLE "game_pages" ADD COLUMN "generation_model" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "generation_prompt" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "generation_generated_at" timestamp(3) with time zone;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_template" "enum__game_pages_v_version_template" DEFAULT 'flagship-game-v1';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_schema_version" numeric DEFAULT 1;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_nav_cta_ref" "enum__game_pages_v_version_site_nav_cta_ref";
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_nav_cta_label" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_background" varchar DEFAULT '#0b0d14';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_foreground" varchar DEFAULT '#f2f5fa';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_muted_foreground" varchar DEFAULT '#a8b1c4';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_surface" varchar DEFAULT '#141927';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_accent" varchar DEFAULT '#22d3ee';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_accent_foreground" varchar DEFAULT '#07181d';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_border" varchar DEFAULT '#273043';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_success" varchar DEFAULT '#34d399';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_warning" varchar DEFAULT '#fbbf24';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_colors_error" varchar DEFAULT '#fb7185';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_typography" "enum__game_pages_v_version_site_theme_typography" DEFAULT 'modern';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_shape" "enum__game_pages_v_version_site_theme_shape" DEFAULT 'balanced';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_density" "enum__game_pages_v_version_site_theme_density" DEFAULT 'cinematic';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_theme_motion" "enum__game_pages_v_version_site_theme_motion" DEFAULT 'subtle';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_variant" "enum__game_pages_v_version_site_hero_variant" DEFAULT 'leftEditorial';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_eyebrow" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_tagline" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_show_logo" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_background_media_id" integer;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_primary_action_ref" "enum__game_pages_v_version_site_hero_primary_action_ref";
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_primary_action_label" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_secondary_action_ref" "enum__game_pages_v_version_site_hero_secondary_action_ref";
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_hero_secondary_action_label" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_availability_enabled" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_availability_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_availability_note" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_features_variant" "enum__game_pages_v_version_site_features_variant" DEFAULT 'cardGrid';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_features_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_features_intro" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_trailer_enabled" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_trailer_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_trailer_poster_id" integer;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_gallery_variant" "enum__game_pages_v_version_site_gallery_variant" DEFAULT 'editorialMosaic';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_gallery_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_adaptive_kind" "enum__game_pages_v_version_site_adaptive_kind" DEFAULT 'story';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_adaptive_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_adaptive_body" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_adaptive_media_id" integer;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_latest_update_enabled" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_latest_update_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_known_issues_enabled" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_known_issues_variant" "enum__game_pages_v_version_site_known_issues_variant" DEFAULT 'compact';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_known_issues_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_community_enabled" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_community_variant" "enum__game_pages_v_version_site_community_variant" DEFAULT 'split';
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_community_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_community_body" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_community_background_id" integer;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_enabled" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_heading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_subheading" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_background_id" integer;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_primary_action_ref" "enum__game_pages_v_version_site_final_cta_primary_action_ref";
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_primary_action_label" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_secondary_action_ref" "enum__game_pages_v_version_site_final_cta_secondary_action_ref";
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_final_cta_secondary_action_label" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_footer_tagline" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_site_footer_show_legal_links" boolean DEFAULT true;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_generation_model" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_generation_prompt" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_generation_generated_at" timestamp(3) with time zone;
  ALTER TABLE "game_projects_availability_platforms" ADD CONSTRAINT "game_projects_availability_platforms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_nav_links" ADD CONSTRAINT "game_pages_site_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_features_items" ADD CONSTRAINT "game_pages_site_features_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_site_features_items" ADD CONSTRAINT "game_pages_site_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_gallery_items" ADD CONSTRAINT "game_pages_site_gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages_site_gallery_items" ADD CONSTRAINT "game_pages_site_gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_adaptive_items" ADD CONSTRAINT "game_pages_site_adaptive_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_site_community_actions" ADD CONSTRAINT "game_pages_site_community_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_pages_generation_change_summary" ADD CONSTRAINT "game_pages_generation_change_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_nav_links" ADD CONSTRAINT "_game_pages_v_version_site_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_features_items" ADD CONSTRAINT "_game_pages_v_version_site_features_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_features_items" ADD CONSTRAINT "_game_pages_v_version_site_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_gallery_items" ADD CONSTRAINT "_game_pages_v_version_site_gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_gallery_items" ADD CONSTRAINT "_game_pages_v_version_site_gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_adaptive_items" ADD CONSTRAINT "_game_pages_v_version_site_adaptive_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_site_community_actions" ADD CONSTRAINT "_game_pages_v_version_site_community_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_generation_change_summary" ADD CONSTRAINT "_game_pages_v_version_generation_change_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "game_projects_availability_platforms_order_idx" ON "game_projects_availability_platforms" USING btree ("_order");
  CREATE INDEX "game_projects_availability_platforms_parent_id_idx" ON "game_projects_availability_platforms" USING btree ("_parent_id");
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
  CREATE INDEX "game_pages_generation_change_summary_order_idx" ON "game_pages_generation_change_summary" USING btree ("_order");
  CREATE INDEX "game_pages_generation_change_summary_parent_id_idx" ON "game_pages_generation_change_summary" USING btree ("_parent_id");
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
  CREATE INDEX "_game_pages_v_version_generation_change_summary_order_idx" ON "_game_pages_v_version_generation_change_summary" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_generation_change_summary_parent_id_idx" ON "_game_pages_v_version_generation_change_summary" USING btree ("_parent_id");
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_hero_background_media_id_media_id_fk" FOREIGN KEY ("site_hero_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_trailer_poster_id_media_id_fk" FOREIGN KEY ("site_trailer_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_adaptive_media_id_media_id_fk" FOREIGN KEY ("site_adaptive_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_community_background_id_media_id_fk" FOREIGN KEY ("site_community_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_pages" ADD CONSTRAINT "game_pages_site_final_cta_background_id_media_id_fk" FOREIGN KEY ("site_final_cta_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_hero_background_media_id_media_id_fk" FOREIGN KEY ("version_site_hero_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_trailer_poster_id_media_id_fk" FOREIGN KEY ("version_site_trailer_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_adaptive_media_id_media_id_fk" FOREIGN KEY ("version_site_adaptive_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_community_background_id_media_id_fk" FOREIGN KEY ("version_site_community_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_game_pages_v" ADD CONSTRAINT "_game_pages_v_version_site_final_cta_background_id_media_id_fk" FOREIGN KEY ("version_site_final_cta_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "game_pages_site_hero_site_hero_background_media_idx" ON "game_pages" USING btree ("site_hero_background_media_id");
  CREATE INDEX "game_pages_site_trailer_site_trailer_poster_idx" ON "game_pages" USING btree ("site_trailer_poster_id");
  CREATE INDEX "game_pages_site_adaptive_site_adaptive_media_idx" ON "game_pages" USING btree ("site_adaptive_media_id");
  CREATE INDEX "game_pages_site_community_site_community_background_idx" ON "game_pages" USING btree ("site_community_background_id");
  CREATE INDEX "game_pages_site_final_cta_site_final_cta_background_idx" ON "game_pages" USING btree ("site_final_cta_background_id");
  CREATE INDEX "_game_pages_v_version_site_hero_version_site_hero_backgr_idx" ON "_game_pages_v" USING btree ("version_site_hero_background_media_id");
  CREATE INDEX "_game_pages_v_version_site_trailer_version_site_trailer__idx" ON "_game_pages_v" USING btree ("version_site_trailer_poster_id");
  CREATE INDEX "_game_pages_v_version_site_adaptive_version_site_adaptiv_idx" ON "_game_pages_v" USING btree ("version_site_adaptive_media_id");
  CREATE INDEX "_game_pages_v_version_site_community_version_site_commun_idx" ON "_game_pages_v" USING btree ("version_site_community_background_id");
  CREATE INDEX "_game_pages_v_version_site_final_cta_version_site_final__idx" ON "_game_pages_v" USING btree ("version_site_final_cta_background_id");`)

  // Postgres backfills ADD COLUMN defaults into existing rows, but pages
  // that predate the flagship template must keep rendering their legacy
  // blocks until a flagship configuration is explicitly published —
  // template stays NULL for them. New documents get the default from
  // Payload's application-level defaultValue on create.
  await db.execute(sql`
  UPDATE "game_pages" SET "template" = NULL;
  UPDATE "_game_pages_v" SET "version_template" = NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects_availability_platforms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_nav_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_gallery_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_adaptive_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_site_community_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_pages_generation_change_summary" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_nav_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_gallery_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_adaptive_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_site_community_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_game_pages_v_version_generation_change_summary" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "game_projects_availability_platforms" CASCADE;
  DROP TABLE "game_pages_site_nav_links" CASCADE;
  DROP TABLE "game_pages_site_features_items" CASCADE;
  DROP TABLE "game_pages_site_gallery_items" CASCADE;
  DROP TABLE "game_pages_site_adaptive_items" CASCADE;
  DROP TABLE "game_pages_site_community_actions" CASCADE;
  DROP TABLE "game_pages_generation_change_summary" CASCADE;
  DROP TABLE "_game_pages_v_version_site_nav_links" CASCADE;
  DROP TABLE "_game_pages_v_version_site_features_items" CASCADE;
  DROP TABLE "_game_pages_v_version_site_gallery_items" CASCADE;
  DROP TABLE "_game_pages_v_version_site_adaptive_items" CASCADE;
  DROP TABLE "_game_pages_v_version_site_community_actions" CASCADE;
  DROP TABLE "_game_pages_v_version_generation_change_summary" CASCADE;
  ALTER TABLE "game_pages" DROP CONSTRAINT "game_pages_site_hero_background_media_id_media_id_fk";
  
  ALTER TABLE "game_pages" DROP CONSTRAINT "game_pages_site_trailer_poster_id_media_id_fk";
  
  ALTER TABLE "game_pages" DROP CONSTRAINT "game_pages_site_adaptive_media_id_media_id_fk";
  
  ALTER TABLE "game_pages" DROP CONSTRAINT "game_pages_site_community_background_id_media_id_fk";
  
  ALTER TABLE "game_pages" DROP CONSTRAINT "game_pages_site_final_cta_background_id_media_id_fk";
  
  ALTER TABLE "_game_pages_v" DROP CONSTRAINT "_game_pages_v_version_site_hero_background_media_id_media_id_fk";
  
  ALTER TABLE "_game_pages_v" DROP CONSTRAINT "_game_pages_v_version_site_trailer_poster_id_media_id_fk";
  
  ALTER TABLE "_game_pages_v" DROP CONSTRAINT "_game_pages_v_version_site_adaptive_media_id_media_id_fk";
  
  ALTER TABLE "_game_pages_v" DROP CONSTRAINT "_game_pages_v_version_site_community_background_id_media_id_fk";
  
  ALTER TABLE "_game_pages_v" DROP CONSTRAINT "_game_pages_v_version_site_final_cta_background_id_media_id_fk";
  
  DROP INDEX "game_pages_site_hero_site_hero_background_media_idx";
  DROP INDEX "game_pages_site_trailer_site_trailer_poster_idx";
  DROP INDEX "game_pages_site_adaptive_site_adaptive_media_idx";
  DROP INDEX "game_pages_site_community_site_community_background_idx";
  DROP INDEX "game_pages_site_final_cta_site_final_cta_background_idx";
  DROP INDEX "_game_pages_v_version_site_hero_version_site_hero_backgr_idx";
  DROP INDEX "_game_pages_v_version_site_trailer_version_site_trailer__idx";
  DROP INDEX "_game_pages_v_version_site_adaptive_version_site_adaptiv_idx";
  DROP INDEX "_game_pages_v_version_site_community_version_site_commun_idx";
  DROP INDEX "_game_pages_v_version_site_final_cta_version_site_final__idx";
  ALTER TABLE "game_projects" DROP COLUMN "links_playstation";
  ALTER TABLE "game_projects" DROP COLUMN "links_xbox";
  ALTER TABLE "game_projects" DROP COLUMN "links_nintendo";
  ALTER TABLE "game_projects" DROP COLUMN "links_gog";
  ALTER TABLE "game_projects" DROP COLUMN "links_youtube";
  ALTER TABLE "game_projects" DROP COLUMN "links_press_kit";
  ALTER TABLE "game_projects" DROP COLUMN "links_privacy";
  ALTER TABLE "game_projects" DROP COLUMN "links_terms";
  ALTER TABLE "game_projects" DROP COLUMN "links_trailer";
  ALTER TABLE "game_projects" DROP COLUMN "availability_release_state";
  ALTER TABLE "game_projects" DROP COLUMN "availability_release_date";
  ALTER TABLE "game_projects" DROP COLUMN "availability_current_version";
  ALTER TABLE "game_projects" DROP COLUMN "availability_demo_url";
  ALTER TABLE "game_projects" DROP COLUMN "meta_developer";
  ALTER TABLE "game_projects" DROP COLUMN "meta_publisher";
  ALTER TABLE "game_projects" DROP COLUMN "meta_engine";
  ALTER TABLE "game_projects" DROP COLUMN "meta_rating";
  ALTER TABLE "game_pages" DROP COLUMN "template";
  ALTER TABLE "game_pages" DROP COLUMN "schema_version";
  ALTER TABLE "game_pages" DROP COLUMN "site_nav_cta_ref";
  ALTER TABLE "game_pages" DROP COLUMN "site_nav_cta_label";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_background";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_foreground";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_muted_foreground";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_surface";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_accent";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_accent_foreground";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_border";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_success";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_warning";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_colors_error";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_typography";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_shape";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_density";
  ALTER TABLE "game_pages" DROP COLUMN "site_theme_motion";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_variant";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_eyebrow";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_tagline";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_show_logo";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_background_media_id";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_primary_action_ref";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_primary_action_label";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_secondary_action_ref";
  ALTER TABLE "game_pages" DROP COLUMN "site_hero_secondary_action_label";
  ALTER TABLE "game_pages" DROP COLUMN "site_availability_enabled";
  ALTER TABLE "game_pages" DROP COLUMN "site_availability_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_availability_note";
  ALTER TABLE "game_pages" DROP COLUMN "site_features_variant";
  ALTER TABLE "game_pages" DROP COLUMN "site_features_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_features_intro";
  ALTER TABLE "game_pages" DROP COLUMN "site_trailer_enabled";
  ALTER TABLE "game_pages" DROP COLUMN "site_trailer_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_trailer_poster_id";
  ALTER TABLE "game_pages" DROP COLUMN "site_gallery_variant";
  ALTER TABLE "game_pages" DROP COLUMN "site_gallery_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_adaptive_kind";
  ALTER TABLE "game_pages" DROP COLUMN "site_adaptive_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_adaptive_body";
  ALTER TABLE "game_pages" DROP COLUMN "site_adaptive_media_id";
  ALTER TABLE "game_pages" DROP COLUMN "site_latest_update_enabled";
  ALTER TABLE "game_pages" DROP COLUMN "site_latest_update_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_known_issues_enabled";
  ALTER TABLE "game_pages" DROP COLUMN "site_known_issues_variant";
  ALTER TABLE "game_pages" DROP COLUMN "site_known_issues_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_community_enabled";
  ALTER TABLE "game_pages" DROP COLUMN "site_community_variant";
  ALTER TABLE "game_pages" DROP COLUMN "site_community_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_community_body";
  ALTER TABLE "game_pages" DROP COLUMN "site_community_background_id";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_enabled";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_heading";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_subheading";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_background_id";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_primary_action_ref";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_primary_action_label";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_secondary_action_ref";
  ALTER TABLE "game_pages" DROP COLUMN "site_final_cta_secondary_action_label";
  ALTER TABLE "game_pages" DROP COLUMN "site_footer_tagline";
  ALTER TABLE "game_pages" DROP COLUMN "site_footer_show_legal_links";
  ALTER TABLE "game_pages" DROP COLUMN "generation_model";
  ALTER TABLE "game_pages" DROP COLUMN "generation_prompt";
  ALTER TABLE "game_pages" DROP COLUMN "generation_generated_at";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_template";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_schema_version";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_nav_cta_ref";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_nav_cta_label";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_background";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_foreground";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_muted_foreground";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_surface";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_accent";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_accent_foreground";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_border";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_success";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_warning";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_colors_error";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_typography";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_shape";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_density";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_theme_motion";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_variant";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_eyebrow";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_tagline";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_show_logo";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_background_media_id";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_primary_action_ref";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_primary_action_label";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_secondary_action_ref";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_hero_secondary_action_label";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_availability_enabled";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_availability_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_availability_note";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_features_variant";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_features_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_features_intro";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_trailer_enabled";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_trailer_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_trailer_poster_id";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_gallery_variant";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_gallery_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_adaptive_kind";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_adaptive_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_adaptive_body";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_adaptive_media_id";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_latest_update_enabled";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_latest_update_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_known_issues_enabled";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_known_issues_variant";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_known_issues_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_community_enabled";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_community_variant";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_community_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_community_body";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_community_background_id";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_enabled";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_heading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_subheading";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_background_id";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_primary_action_ref";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_primary_action_label";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_secondary_action_ref";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_final_cta_secondary_action_label";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_footer_tagline";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_site_footer_show_legal_links";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_generation_model";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_generation_prompt";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_generation_generated_at";
  DROP TYPE "public"."enum_game_projects_availability_platforms_platform";
  DROP TYPE "public"."enum_game_projects_availability_release_state";
  DROP TYPE "public"."enum_game_pages_site_nav_links_ref";
  DROP TYPE "public"."enum_game_pages_site_community_actions_ref";
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
  DROP TYPE "public"."enum__game_pages_v_version_site_nav_links_ref";
  DROP TYPE "public"."enum__game_pages_v_version_site_community_actions_ref";
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
  DROP TYPE "public"."enum__game_pages_v_version_site_final_cta_secondary_action_ref";`)
}
