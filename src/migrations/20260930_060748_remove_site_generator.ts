import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "game_pages_generation_change_summary" CASCADE;
  DROP TABLE "_game_pages_v_version_generation_change_summary" CASCADE;
  ALTER TABLE "game_pages" DROP COLUMN "generation_model";
  ALTER TABLE "game_pages" DROP COLUMN "generation_prompt";
  ALTER TABLE "game_pages" DROP COLUMN "generation_generated_at";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_generation_model";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_generation_prompt";
  ALTER TABLE "_game_pages_v" DROP COLUMN "version_generation_generated_at";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "game_pages_generation_change_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "_game_pages_v_version_generation_change_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "game_pages" ADD COLUMN "generation_model" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "generation_prompt" varchar;
  ALTER TABLE "game_pages" ADD COLUMN "generation_generated_at" timestamp(3) with time zone;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_generation_model" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_generation_prompt" varchar;
  ALTER TABLE "_game_pages_v" ADD COLUMN "version_generation_generated_at" timestamp(3) with time zone;
  ALTER TABLE "game_pages_generation_change_summary" ADD CONSTRAINT "game_pages_generation_change_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_game_pages_v_version_generation_change_summary" ADD CONSTRAINT "_game_pages_v_version_generation_change_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_game_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "game_pages_generation_change_summary_order_idx" ON "game_pages_generation_change_summary" USING btree ("_order");
  CREATE INDEX "game_pages_generation_change_summary_parent_id_idx" ON "game_pages_generation_change_summary" USING btree ("_parent_id");
  CREATE INDEX "_game_pages_v_version_generation_change_summary_order_idx" ON "_game_pages_v_version_generation_change_summary" USING btree ("_order");
  CREATE INDEX "_game_pages_v_version_generation_change_summary_parent_id_idx" ON "_game_pages_v_version_generation_change_summary" USING btree ("_parent_id");`)
}
