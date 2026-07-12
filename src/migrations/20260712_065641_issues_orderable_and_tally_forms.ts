import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_projects_contact_tally_display" AS ENUM('embed', 'button');
  CREATE TYPE "public"."enum_game_projects_report_form_provider" AS ENUM('native', 'tally', 'external');
  CREATE TYPE "public"."enum_game_projects_report_form_tally_display" AS ENUM('embed', 'button');
  ALTER TYPE "public"."enum_game_projects_contact_target" ADD VALUE 'TALLY';
  ALTER TABLE "game_projects" ADD COLUMN "contact_tally_url" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "contact_tally_display" "enum_game_projects_contact_tally_display" DEFAULT 'embed';
  ALTER TABLE "game_projects" ADD COLUMN "report_form_provider" "enum_game_projects_report_form_provider" DEFAULT 'native';
  ALTER TABLE "game_projects" ADD COLUMN "report_form_tally_url" varchar;
  ALTER TABLE "game_projects" ADD COLUMN "report_form_tally_display" "enum_game_projects_report_form_tally_display" DEFAULT 'embed';
  ALTER TABLE "game_projects" ADD COLUMN "report_form_external_url" varchar;
  ALTER TABLE "issues" ADD COLUMN "_order" varchar;
  CREATE INDEX "issues__order_idx" ON "issues" USING btree ("_order");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "game_projects" ALTER COLUMN "contact_target" SET DATA TYPE text;
  ALTER TABLE "game_projects" ALTER COLUMN "contact_target" SET DEFAULT 'EMAIL'::text;
  DROP TYPE "public"."enum_game_projects_contact_target";
  CREATE TYPE "public"."enum_game_projects_contact_target" AS ENUM('EMAIL', 'DISCORD_WEBHOOK', 'EXTERNAL_URL');
  ALTER TABLE "game_projects" ALTER COLUMN "contact_target" SET DEFAULT 'EMAIL'::"public"."enum_game_projects_contact_target";
  ALTER TABLE "game_projects" ALTER COLUMN "contact_target" SET DATA TYPE "public"."enum_game_projects_contact_target" USING "contact_target"::"public"."enum_game_projects_contact_target";
  DROP INDEX "issues__order_idx";
  ALTER TABLE "game_projects" DROP COLUMN "contact_tally_url";
  ALTER TABLE "game_projects" DROP COLUMN "contact_tally_display";
  ALTER TABLE "game_projects" DROP COLUMN "report_form_provider";
  ALTER TABLE "game_projects" DROP COLUMN "report_form_tally_url";
  ALTER TABLE "game_projects" DROP COLUMN "report_form_tally_display";
  ALTER TABLE "game_projects" DROP COLUMN "report_form_external_url";
  ALTER TABLE "issues" DROP COLUMN "_order";
  DROP TYPE "public"."enum_game_projects_contact_tally_display";
  DROP TYPE "public"."enum_game_projects_report_form_provider";
  DROP TYPE "public"."enum_game_projects_report_form_tally_display";`)
}
