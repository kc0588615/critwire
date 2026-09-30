import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // The `type` columns come first so Feature Request rows can become ideas
  // before the category enums are recreated without FEATURE_REQUEST: in the
  // other order the cast back to the new enum fails on those rows.
  await db.execute(sql`
   CREATE TYPE "public"."enum_issues_type" AS ENUM('BUG', 'IDEA');
  CREATE TYPE "public"."enum_issue_reports_type" AS ENUM('BUG', 'IDEA');
  ALTER TABLE "issues" ADD COLUMN "type" "enum_issues_type" DEFAULT 'BUG' NOT NULL;
  ALTER TABLE "issue_reports" ADD COLUMN "type" "enum_issue_reports_type" DEFAULT 'BUG' NOT NULL;
  UPDATE "issues" SET "type" = 'IDEA', "category" = 'OTHER' WHERE "category" = 'FEATURE_REQUEST';
  UPDATE "issue_reports" SET "type" = 'IDEA', "category" = 'OTHER' WHERE "category" = 'FEATURE_REQUEST';
  ALTER TYPE "public"."enum_issues_status" ADD VALUE 'IN_PROGRESS' BEFORE 'FIXED';
  ALTER TABLE "issues" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "issues" ALTER COLUMN "category" SET DEFAULT 'OTHER'::text;
  DROP TYPE "public"."enum_issues_category";
  CREATE TYPE "public"."enum_issues_category" AS ENUM('INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES', 'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'OTHER');
  ALTER TABLE "issues" ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."enum_issues_category";
  ALTER TABLE "issues" ALTER COLUMN "category" SET DATA TYPE "public"."enum_issues_category" USING "category"::"public"."enum_issues_category";
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DEFAULT 'OTHER'::text;
  DROP TYPE "public"."enum_issue_reports_category";
  CREATE TYPE "public"."enum_issue_reports_category" AS ENUM('INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES', 'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'OTHER');
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."enum_issue_reports_category";
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DATA TYPE "public"."enum_issue_reports_category" USING "category"::"public"."enum_issue_reports_category";
  ALTER TABLE "game_projects" ADD COLUMN "report_form_accept_ideas" boolean DEFAULT true;
  ALTER TABLE "game_projects" ADD COLUMN "report_form_review_submissions" boolean DEFAULT true;
  ALTER TABLE "issue_reports" ADD COLUMN "flagged" boolean DEFAULT false;
  ALTER TABLE "issue_reports" ADD COLUMN "flag_reasons" varchar;
  CREATE INDEX "issues_type_idx" ON "issues" USING btree ("type");
  CREATE INDEX "issue_reports_flagged_idx" ON "issue_reports" USING btree ("flagged");`)

  // `new` is reserved for the submit form at /feedback/new. Each item slugged
  // `new` (at most one per game, by the unique (game, slug) index) moves to
  // the first free `new-<n>`, n >= 2: the sequence promotion follows, so the
  // rename can't collide. Generation is switched off so the slug sticks.
  const reserved = await db.execute(
    sql`SELECT "id", "game_project_id" FROM "issues" WHERE "slug" = 'new'`,
  )
  for (const row of reserved.rows) {
    const taken = await db.execute(
      sql`SELECT "slug" FROM "issues" WHERE "game_project_id" = ${row.game_project_id} AND "slug" LIKE 'new-%'`,
    )
    const used = new Set(taken.rows.map((issue) => issue.slug))
    let n = 2
    while (used.has(`new-${n}`)) n += 1
    await db.execute(
      sql`UPDATE "issues" SET "slug" = ${`new-${n}`}, "generate_slug" = false WHERE "id" = ${row.id}`,
    )
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // The categories go through text so ideas can map back to FEATURE_REQUEST
  // in this transaction (a value added with ADD VALUE can't be used until
  // commit). In-progress items fall back to Planned. Renamed `new` slugs stay.
  await db.execute(sql`
   ALTER TABLE "issues" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "issues" ALTER COLUMN "category" SET DEFAULT 'OTHER'::text;
  DROP TYPE "public"."enum_issues_category";
  CREATE TYPE "public"."enum_issues_category" AS ENUM('INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES', 'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'FEATURE_REQUEST', 'OTHER');
  UPDATE "issues" SET "category" = 'FEATURE_REQUEST' WHERE "type" = 'IDEA';
  ALTER TABLE "issues" ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."enum_issues_category";
  ALTER TABLE "issues" ALTER COLUMN "category" SET DATA TYPE "public"."enum_issues_category" USING "category"::"public"."enum_issues_category";
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DEFAULT 'OTHER'::text;
  DROP TYPE "public"."enum_issue_reports_category";
  CREATE TYPE "public"."enum_issue_reports_category" AS ENUM('INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES', 'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'FEATURE_REQUEST', 'OTHER');
  UPDATE "issue_reports" SET "category" = 'FEATURE_REQUEST' WHERE "type" = 'IDEA';
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."enum_issue_reports_category";
  ALTER TABLE "issue_reports" ALTER COLUMN "category" SET DATA TYPE "public"."enum_issue_reports_category" USING "category"::"public"."enum_issue_reports_category";
  ALTER TABLE "issues" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'REPORTED'::text;
  UPDATE "issues" SET "status" = 'PLANNED' WHERE "status" = 'IN_PROGRESS';
  DROP TYPE "public"."enum_issues_status";
  CREATE TYPE "public"."enum_issues_status" AS ENUM('REPORTED', 'INVESTIGATING', 'NEEDS_MORE_INFO', 'WORKAROUND_AVAILABLE', 'PLANNED', 'FIXED', 'CLOSED');
  ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'REPORTED'::"public"."enum_issues_status";
  ALTER TABLE "issues" ALTER COLUMN "status" SET DATA TYPE "public"."enum_issues_status" USING "status"::"public"."enum_issues_status";
  DROP INDEX "issues_type_idx";
  DROP INDEX "issue_reports_flagged_idx";
  ALTER TABLE "game_projects" DROP COLUMN "report_form_accept_ideas";
  ALTER TABLE "game_projects" DROP COLUMN "report_form_review_submissions";
  ALTER TABLE "issues" DROP COLUMN "type";
  ALTER TABLE "issue_reports" DROP COLUMN "type";
  ALTER TABLE "issue_reports" DROP COLUMN "flagged";
  ALTER TABLE "issue_reports" DROP COLUMN "flag_reasons";
  DROP TYPE "public"."enum_issues_type";
  DROP TYPE "public"."enum_issue_reports_type";`)
}
