import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "legal_acceptances" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"terms_version" varchar NOT NULL,
  	"privacy_version" varchar NOT NULL,
  	"terms_digest" varchar NOT NULL,
  	"privacy_digest" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "legal_acceptances_id" integer;
  ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "legal_acceptances_user_idx" ON "legal_acceptances" USING btree ("user_id");
  CREATE INDEX "legal_acceptances_updated_at_idx" ON "legal_acceptances" USING btree ("updated_at");
  CREATE INDEX "legal_acceptances_created_at_idx" ON "legal_acceptances" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_acceptances_fk" FOREIGN KEY ("legal_acceptances_id") REFERENCES "public"."legal_acceptances"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_legal_acceptances_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_acceptances_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // The CASCADE also drops the lock table's foreign key to this table, so
  // the generated DROP CONSTRAINT for it is left out (it would fail).
  await db.execute(sql`
   ALTER TABLE "legal_acceptances" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "legal_acceptances" CASCADE;
  DROP INDEX "payload_locked_documents_rels_legal_acceptances_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "legal_acceptances_id";`)
}
