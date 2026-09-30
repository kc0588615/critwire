import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_abuse_reports_reason" AS ENUM('spam', 'scam', 'offensive', 'impersonation', 'other');
  CREATE TYPE "public"."enum_abuse_reports_status" AS ENUM('open', 'resolved', 'dismissed');
  CREATE TABLE "abuse_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"page_url" varchar NOT NULL,
  	"game_project_id" integer,
  	"reason" "enum_abuse_reports_reason" NOT NULL,
  	"details" varchar,
  	"reporter_email" varchar,
  	"status" "enum_abuse_reports_status" DEFAULT 'open' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tenants" ADD COLUMN "suspended" boolean DEFAULT false;
  ALTER TABLE "tenants" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "game_projects" ADD COLUMN "flagged" boolean DEFAULT false;
  ALTER TABLE "game_projects" ADD COLUMN "flag_reasons" varchar;
  ALTER TABLE "patch_notes" ADD COLUMN "flagged" boolean DEFAULT false;
  ALTER TABLE "patch_notes" ADD COLUMN "flag_reasons" varchar;
  ALTER TABLE "_patch_notes_v" ADD COLUMN "version_flagged" boolean DEFAULT false;
  ALTER TABLE "_patch_notes_v" ADD COLUMN "version_flag_reasons" varchar;
  ALTER TABLE "users" ADD COLUMN "_verified" boolean;
  ALTER TABLE "users" ADD COLUMN "_verificationtoken" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "abuse_reports_id" integer;
  ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_game_project_id_game_projects_id_fk" FOREIGN KEY ("game_project_id") REFERENCES "public"."game_projects"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "abuse_reports_game_project_idx" ON "abuse_reports" USING btree ("game_project_id");
  CREATE INDEX "abuse_reports_status_idx" ON "abuse_reports" USING btree ("status");
  CREATE INDEX "abuse_reports_updated_at_idx" ON "abuse_reports" USING btree ("updated_at");
  CREATE INDEX "abuse_reports_created_at_idx" ON "abuse_reports" USING btree ("created_at");
  ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_abuse_reports_fk" FOREIGN KEY ("abuse_reports_id") REFERENCES "public"."abuse_reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tenants_suspended_idx" ON "tenants" USING btree ("suspended");
  CREATE UNIQUE INDEX "tenants_created_by_idx" ON "tenants" USING btree ("created_by_id");
  CREATE INDEX "game_projects_flagged_idx" ON "game_projects" USING btree ("flagged");
  CREATE INDEX "patch_notes_flagged_idx" ON "patch_notes" USING btree ("flagged");
  CREATE INDEX "_patch_notes_v_version_version_flagged_idx" ON "_patch_notes_v" USING btree ("version_flagged");
  CREATE INDEX "payload_locked_documents_rels_abuse_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("abuse_reports_id");`)

  // Accounts that existed before email verification keep signing in:
  // with `auth.verify` on, login refuses unverified users.
  await db.execute(sql`UPDATE "users" SET "_verified" = true;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "abuse_reports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "abuse_reports" CASCADE;
  ALTER TABLE "tenants" DROP CONSTRAINT "tenants_created_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_abuse_reports_fk";
  
  DROP INDEX "tenants_suspended_idx";
  DROP INDEX "tenants_created_by_idx";
  DROP INDEX "game_projects_flagged_idx";
  DROP INDEX "patch_notes_flagged_idx";
  DROP INDEX "_patch_notes_v_version_version_flagged_idx";
  DROP INDEX "payload_locked_documents_rels_abuse_reports_id_idx";
  ALTER TABLE "tenants" DROP COLUMN "suspended";
  ALTER TABLE "tenants" DROP COLUMN "created_by_id";
  ALTER TABLE "game_projects" DROP COLUMN "flagged";
  ALTER TABLE "game_projects" DROP COLUMN "flag_reasons";
  ALTER TABLE "patch_notes" DROP COLUMN "flagged";
  ALTER TABLE "patch_notes" DROP COLUMN "flag_reasons";
  ALTER TABLE "_patch_notes_v" DROP COLUMN "version_flagged";
  ALTER TABLE "_patch_notes_v" DROP COLUMN "version_flag_reasons";
  ALTER TABLE "users" DROP COLUMN "_verified";
  ALTER TABLE "users" DROP COLUMN "_verificationtoken";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "abuse_reports_id";
  DROP TYPE "public"."enum_abuse_reports_reason";
  DROP TYPE "public"."enum_abuse_reports_status";`)
}
