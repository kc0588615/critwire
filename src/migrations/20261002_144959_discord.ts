import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_discord_posts_stage" AS ENUM('planned', 'in-progress', 'shipped');
  CREATE TABLE "discord_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_project_id" integer NOT NULL,
  	"patch_note_id" integer,
  	"issue_id" integer,
  	"stage" "enum_discord_posts_stage",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "game_projects" ADD COLUMN "discord_guild_id" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "discord_channel_id" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "discord_webhook_url" varchar;
  ALTER TABLE "issue_reports" ADD COLUMN "discord_user_id" varchar;
  ALTER TABLE "issue_reports" ADD COLUMN "discord_username" varchar;
  ALTER TABLE "issue_reports" ADD COLUMN "discord_message_url" varchar;
  ALTER TABLE "issue_reports" ADD COLUMN "discord_interaction_id" varchar;
  ALTER TABLE "payload_jobs" ADD COLUMN "concurrency_key" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "discord_posts_id" integer;
  ALTER TABLE "discord_posts" ADD CONSTRAINT "discord_posts_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discord_posts" ADD CONSTRAINT "discord_posts_patch_note_id_patch_notes_id_fk" FOREIGN KEY ("patch_note_id") REFERENCES "public"."patch_notes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discord_posts" ADD CONSTRAINT "discord_posts_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "discord_posts_game_project_idx" ON "discord_posts" USING btree ("game_project_id");
  CREATE UNIQUE INDEX "discord_posts_patch_note_idx" ON "discord_posts" USING btree ("patch_note_id");
  CREATE INDEX "discord_posts_issue_idx" ON "discord_posts" USING btree ("issue_id");
  CREATE INDEX "discord_posts_updated_at_idx" ON "discord_posts" USING btree ("updated_at");
  CREATE INDEX "discord_posts_created_at_idx" ON "discord_posts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discord_posts_fk" FOREIGN KEY ("discord_posts_id") REFERENCES "public"."discord_posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "game_projects_discord_discord_guild_id_idx" ON "game_projects" USING btree ("discord_guild_id");
  CREATE UNIQUE INDEX "issue_reports_discord_discord_interaction_id_idx" ON "issue_reports" USING btree ("discord_interaction_id");
  CREATE INDEX "payload_jobs_concurrency_key_idx" ON "payload_jobs" USING btree ("concurrency_key");
  CREATE INDEX "payload_locked_documents_rels_discord_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("discord_posts_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_discord_posts_fk";
  ALTER TABLE "discord_posts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "discord_posts" CASCADE;
  
  DROP INDEX "game_projects_discord_discord_guild_id_idx";
  DROP INDEX "issue_reports_discord_discord_interaction_id_idx";
  DROP INDEX "payload_jobs_concurrency_key_idx";
  DROP INDEX "payload_locked_documents_rels_discord_posts_id_idx";
  ALTER TABLE "game_projects" DROP COLUMN "discord_guild_id";
  ALTER TABLE "game_projects" DROP COLUMN "discord_channel_id";
  ALTER TABLE "game_projects" DROP COLUMN "discord_webhook_url";
  ALTER TABLE "issue_reports" DROP COLUMN "discord_user_id";
  ALTER TABLE "issue_reports" DROP COLUMN "discord_username";
  ALTER TABLE "issue_reports" DROP COLUMN "discord_message_url";
  ALTER TABLE "issue_reports" DROP COLUMN "discord_interaction_id";
  ALTER TABLE "payload_jobs" DROP COLUMN "concurrency_key";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "discord_posts_id";
  DROP TYPE "public"."enum_discord_posts_stage";`)
}
