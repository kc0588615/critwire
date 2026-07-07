import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_pages_blocks_game_hero_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_game_pages_blocks_game_c_t_a_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_game_pages_kind" AS ENUM('landing');
  CREATE TYPE "public"."enum_game_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__game_pages_v_blocks_game_hero_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__game_pages_v_blocks_game_c_t_a_buttons_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__game_pages_v_version_kind" AS ENUM('landing');
  CREATE TYPE "public"."enum__game_pages_v_version_status" AS ENUM('draft', 'published');
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
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_game_pages_status" DEFAULT 'draft'
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
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__game_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "pages" DROP CONSTRAINT "pages_tenant_id_tenants_id_fk";
  
  ALTER TABLE "pages" DROP CONSTRAINT "pages_game_project_id_game_projects_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_tenant_id_tenants_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_game_project_id_game_projects_id_fk";
  
  DROP INDEX "pages_tenant_idx";
  DROP INDEX "pages_game_project_idx";
  DROP INDEX "_pages_v_version_version_tenant_idx";
  DROP INDEX "_pages_v_version_version_game_project_idx";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_pages_id" integer;
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
  CREATE INDEX "game_pages_updated_at_idx" ON "game_pages" USING btree ("updated_at");
  CREATE INDEX "game_pages_created_at_idx" ON "game_pages" USING btree ("created_at");
  CREATE INDEX "game_pages__status_idx" ON "game_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "gameProject_kind_idx" ON "game_pages" USING btree ("game_project_id","kind");
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
  CREATE INDEX "_game_pages_v_version_version_updated_at_idx" ON "_game_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_game_pages_v_version_version_created_at_idx" ON "_game_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_game_pages_v_version_version__status_idx" ON "_game_pages_v" USING btree ("version__status");
  CREATE INDEX "_game_pages_v_created_at_idx" ON "_game_pages_v" USING btree ("created_at");
  CREATE INDEX "_game_pages_v_updated_at_idx" ON "_game_pages_v" USING btree ("updated_at");
  CREATE INDEX "_game_pages_v_latest_idx" ON "_game_pages_v" USING btree ("latest");
  CREATE INDEX "version_gameProject_version_kind_idx" ON "_game_pages_v" USING btree ("version_game_project_id","version_kind");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_pages_fk" FOREIGN KEY ("game_pages_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_game_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("game_pages_id");
  ALTER TABLE "pages" DROP COLUMN "tenant_id";
  ALTER TABLE "pages" DROP COLUMN "game_project_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_tenant_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_game_project_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
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
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_game_pages_fk";
  
  DROP INDEX "payload_locked_documents_rels_game_pages_id_idx";
  ALTER TABLE "pages" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "pages" ADD COLUMN "game_project_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_tenant_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_game_project_id" integer;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_game_project_id_game_projects_id_fk" FOREIGN KEY ("version_game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_tenant_idx" ON "pages" USING btree ("tenant_id");
  CREATE INDEX "pages_game_project_idx" ON "pages" USING btree ("game_project_id");
  CREATE INDEX "_pages_v_version_version_tenant_idx" ON "_pages_v" USING btree ("version_tenant_id");
  CREATE INDEX "_pages_v_version_version_game_project_idx" ON "_pages_v" USING btree ("version_game_project_id");
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_pages_id";
  DROP TYPE "public"."enum_game_pages_blocks_game_hero_buttons_variant";
  DROP TYPE "public"."enum_game_pages_blocks_game_c_t_a_buttons_variant";
  DROP TYPE "public"."enum_game_pages_kind";
  DROP TYPE "public"."enum_game_pages_status";
  DROP TYPE "public"."enum__game_pages_v_blocks_game_hero_buttons_variant";
  DROP TYPE "public"."enum__game_pages_v_blocks_game_c_t_a_buttons_variant";
  DROP TYPE "public"."enum__game_pages_v_version_kind";
  DROP TYPE "public"."enum__game_pages_v_version_status";`)
}
