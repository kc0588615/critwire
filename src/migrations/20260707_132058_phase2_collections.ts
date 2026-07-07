import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_projects_contact_target" AS ENUM('EMAIL', 'DISCORD_WEBHOOK', 'EXTERNAL_URL');
  CREATE TYPE "public"."enum_patch_notes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__patch_notes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_issues_category" AS ENUM('INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES', 'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'FEATURE_REQUEST', 'OTHER');
  CREATE TYPE "public"."enum_issues_status" AS ENUM('REPORTED', 'INVESTIGATING', 'NEEDS_MORE_INFO', 'WORKAROUND_AVAILABLE', 'PLANNED', 'FIXED', 'CLOSED');
  CREATE TYPE "public"."enum_issue_reports_category" AS ENUM('INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES', 'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'FEATURE_REQUEST', 'OTHER');
  CREATE TYPE "public"."enum_issue_reports_status" AS ENUM('NEW', 'PUBLISHED', 'LINKED', 'DISMISSED');
  CREATE TABLE "game_projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"logo_id" integer,
  	"banner_id" integer,
  	"accent_color" varchar,
  	"links_website" varchar,
  	"links_steam" varchar,
  	"links_epic" varchar,
  	"links_itch" varchar,
  	"links_discord" varchar,
  	"links_support" varchar,
  	"links_docs" varchar,
  	"links_merch" varchar,
  	"contact_target" "enum_game_projects_contact_target" DEFAULT 'EMAIL',
  	"contact_email" varchar,
  	"contact_discord_webhook_url" varchar,
  	"contact_external_url" varchar,
  	"custom_domain" varchar,
  	"custom_domain_verified" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "patch_notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"game_project_id" integer,
  	"title" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"version_label" varchar,
  	"summary" varchar,
  	"content" jsonb,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_patch_notes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_patch_notes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_game_project_id" integer,
  	"version_title" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_version_label" varchar,
  	"version_summary" varchar,
  	"version_content" jsonb,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__patch_notes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"game_project_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"summary" varchar,
  	"details" jsonb,
  	"category" "enum_issues_category" DEFAULT 'OTHER' NOT NULL,
  	"status" "enum_issues_status" DEFAULT 'REPORTED' NOT NULL,
  	"is_public" boolean DEFAULT true,
  	"is_pinned" boolean DEFAULT false,
  	"needs_more_info_text" varchar,
  	"workaround_text" varchar,
  	"fixed_in_patch_note_id" integer,
  	"upvote_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "issue_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"game_project_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"category" "enum_issue_reports_category" DEFAULT 'OTHER' NOT NULL,
  	"status" "enum_issue_reports_status" DEFAULT 'NEW' NOT NULL,
  	"issue_id" integer,
  	"submitter_email" varchar,
  	"platform" varchar,
  	"game_version" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "issue_votes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"issue_id" integer NOT NULL,
  	"browser_token_hash" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "pages" ADD COLUMN "game_project_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_game_project_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_projects_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "patch_notes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "issues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "issue_reports_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "issue_votes_id" integer;
  ALTER TABLE "game_projects" ADD CONSTRAINT "game_projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_projects" ADD CONSTRAINT "game_projects_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_projects" ADD CONSTRAINT "game_projects_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "patch_notes" ADD CONSTRAINT "patch_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "patch_notes" ADD CONSTRAINT "patch_notes_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_patch_notes_v" ADD CONSTRAINT "_patch_notes_v_parent_id_patch_notes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."patch_notes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_patch_notes_v" ADD CONSTRAINT "_patch_notes_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_patch_notes_v" ADD CONSTRAINT "_patch_notes_v_version_game_project_id_game_projects_id_fk" FOREIGN KEY ("version_game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issues" ADD CONSTRAINT "issues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issues" ADD CONSTRAINT "issues_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issues" ADD CONSTRAINT "issues_fixed_in_patch_note_id_patch_notes_id_fk" FOREIGN KEY ("fixed_in_patch_note_id") REFERENCES "public"."patch_notes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issue_votes" ADD CONSTRAINT "issue_votes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issue_votes" ADD CONSTRAINT "issue_votes_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "game_projects_tenant_idx" ON "game_projects" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "game_projects_slug_idx" ON "game_projects" USING btree ("slug");
  CREATE INDEX "game_projects_logo_idx" ON "game_projects" USING btree ("logo_id");
  CREATE INDEX "game_projects_banner_idx" ON "game_projects" USING btree ("banner_id");
  CREATE UNIQUE INDEX "game_projects_custom_domain_idx" ON "game_projects" USING btree ("custom_domain");
  CREATE INDEX "game_projects_updated_at_idx" ON "game_projects" USING btree ("updated_at");
  CREATE INDEX "game_projects_created_at_idx" ON "game_projects" USING btree ("created_at");
  CREATE INDEX "patch_notes_tenant_idx" ON "patch_notes" USING btree ("tenant_id");
  CREATE INDEX "patch_notes_game_project_idx" ON "patch_notes" USING btree ("game_project_id");
  CREATE INDEX "patch_notes_slug_idx" ON "patch_notes" USING btree ("slug");
  CREATE INDEX "patch_notes_updated_at_idx" ON "patch_notes" USING btree ("updated_at");
  CREATE INDEX "patch_notes_created_at_idx" ON "patch_notes" USING btree ("created_at");
  CREATE INDEX "patch_notes__status_idx" ON "patch_notes" USING btree ("_status");
  CREATE UNIQUE INDEX "gameProject_slug_idx" ON "patch_notes" USING btree ("game_project_id","slug");
  CREATE INDEX "_patch_notes_v_parent_idx" ON "_patch_notes_v" USING btree ("parent_id");
  CREATE INDEX "_patch_notes_v_version_version_tenant_idx" ON "_patch_notes_v" USING btree ("version_tenant_id");
  CREATE INDEX "_patch_notes_v_version_version_game_project_idx" ON "_patch_notes_v" USING btree ("version_game_project_id");
  CREATE INDEX "_patch_notes_v_version_version_slug_idx" ON "_patch_notes_v" USING btree ("version_slug");
  CREATE INDEX "_patch_notes_v_version_version_updated_at_idx" ON "_patch_notes_v" USING btree ("version_updated_at");
  CREATE INDEX "_patch_notes_v_version_version_created_at_idx" ON "_patch_notes_v" USING btree ("version_created_at");
  CREATE INDEX "_patch_notes_v_version_version__status_idx" ON "_patch_notes_v" USING btree ("version__status");
  CREATE INDEX "_patch_notes_v_created_at_idx" ON "_patch_notes_v" USING btree ("created_at");
  CREATE INDEX "_patch_notes_v_updated_at_idx" ON "_patch_notes_v" USING btree ("updated_at");
  CREATE INDEX "_patch_notes_v_latest_idx" ON "_patch_notes_v" USING btree ("latest");
  CREATE INDEX "version_gameProject_version_slug_idx" ON "_patch_notes_v" USING btree ("version_game_project_id","version_slug");
  CREATE INDEX "issues_tenant_idx" ON "issues" USING btree ("tenant_id");
  CREATE INDEX "issues_game_project_idx" ON "issues" USING btree ("game_project_id");
  CREATE INDEX "issues_slug_idx" ON "issues" USING btree ("slug");
  CREATE INDEX "issues_category_idx" ON "issues" USING btree ("category");
  CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");
  CREATE INDEX "issues_is_public_idx" ON "issues" USING btree ("is_public");
  CREATE INDEX "issues_fixed_in_patch_note_idx" ON "issues" USING btree ("fixed_in_patch_note_id");
  CREATE INDEX "issues_updated_at_idx" ON "issues" USING btree ("updated_at");
  CREATE INDEX "issues_created_at_idx" ON "issues" USING btree ("created_at");
  CREATE UNIQUE INDEX "gameProject_slug_1_idx" ON "issues" USING btree ("game_project_id","slug");
  CREATE INDEX "issue_reports_tenant_idx" ON "issue_reports" USING btree ("tenant_id");
  CREATE INDEX "issue_reports_game_project_idx" ON "issue_reports" USING btree ("game_project_id");
  CREATE INDEX "issue_reports_status_idx" ON "issue_reports" USING btree ("status");
  CREATE INDEX "issue_reports_issue_idx" ON "issue_reports" USING btree ("issue_id");
  CREATE INDEX "issue_reports_updated_at_idx" ON "issue_reports" USING btree ("updated_at");
  CREATE INDEX "issue_reports_created_at_idx" ON "issue_reports" USING btree ("created_at");
  CREATE INDEX "issue_votes_tenant_idx" ON "issue_votes" USING btree ("tenant_id");
  CREATE INDEX "issue_votes_issue_idx" ON "issue_votes" USING btree ("issue_id");
  CREATE INDEX "issue_votes_browser_token_hash_idx" ON "issue_votes" USING btree ("browser_token_hash");
  CREATE INDEX "issue_votes_updated_at_idx" ON "issue_votes" USING btree ("updated_at");
  CREATE INDEX "issue_votes_created_at_idx" ON "issue_votes" USING btree ("created_at");
  CREATE UNIQUE INDEX "issue_browserTokenHash_idx" ON "issue_votes" USING btree ("issue_id","browser_token_hash");
  ALTER TABLE "pages" ADD CONSTRAINT "pages_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_game_project_id_game_projects_id_fk" FOREIGN KEY ("version_game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_projects_fk" FOREIGN KEY ("game_projects_id") REFERENCES "public"."game_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_patch_notes_fk" FOREIGN KEY ("patch_notes_id") REFERENCES "public"."patch_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_issues_fk" FOREIGN KEY ("issues_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_issue_reports_fk" FOREIGN KEY ("issue_reports_id") REFERENCES "public"."issue_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_issue_votes_fk" FOREIGN KEY ("issue_votes_id") REFERENCES "public"."issue_votes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_game_project_idx" ON "pages" USING btree ("game_project_id");
  CREATE INDEX "_pages_v_version_version_game_project_idx" ON "_pages_v" USING btree ("version_game_project_id");
  CREATE INDEX "payload_locked_documents_rels_game_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("game_projects_id");
  CREATE INDEX "payload_locked_documents_rels_patch_notes_id_idx" ON "payload_locked_documents_rels" USING btree ("patch_notes_id");
  CREATE INDEX "payload_locked_documents_rels_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("issues_id");
  CREATE INDEX "payload_locked_documents_rels_issue_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("issue_reports_id");
  CREATE INDEX "payload_locked_documents_rels_issue_votes_id_idx" ON "payload_locked_documents_rels" USING btree ("issue_votes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "patch_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_patch_notes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "issues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "issue_reports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "issue_votes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "game_projects" CASCADE;
  DROP TABLE "patch_notes" CASCADE;
  DROP TABLE "_patch_notes_v" CASCADE;
  DROP TABLE "issues" CASCADE;
  DROP TABLE "issue_reports" CASCADE;
  DROP TABLE "issue_votes" CASCADE;
  ALTER TABLE "pages" DROP CONSTRAINT "pages_game_project_id_game_projects_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_game_project_id_game_projects_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_game_projects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_patch_notes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_issues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_issue_reports_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_issue_votes_fk";
  
  DROP INDEX "pages_game_project_idx";
  DROP INDEX "_pages_v_version_version_game_project_idx";
  DROP INDEX "payload_locked_documents_rels_game_projects_id_idx";
  DROP INDEX "payload_locked_documents_rels_patch_notes_id_idx";
  DROP INDEX "payload_locked_documents_rels_issues_id_idx";
  DROP INDEX "payload_locked_documents_rels_issue_reports_id_idx";
  DROP INDEX "payload_locked_documents_rels_issue_votes_id_idx";
  ALTER TABLE "pages" DROP COLUMN "game_project_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_game_project_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_projects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "patch_notes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "issues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "issue_reports_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "issue_votes_id";
  DROP TYPE "public"."enum_game_projects_contact_target";
  DROP TYPE "public"."enum_patch_notes_status";
  DROP TYPE "public"."enum__patch_notes_v_version_status";
  DROP TYPE "public"."enum_issues_category";
  DROP TYPE "public"."enum_issues_status";
  DROP TYPE "public"."enum_issue_reports_category";
  DROP TYPE "public"."enum_issue_reports_status";`)
}
