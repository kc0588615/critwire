import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_folders" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "payload_folders" ADD CONSTRAINT "payload_folders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_folders_tenant_idx" ON "payload_folders" USING btree ("tenant_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_folders" DROP CONSTRAINT "payload_folders_tenant_id_tenants_id_fk";
  
  DROP INDEX "payload_folders_tenant_idx";
  ALTER TABLE "payload_folders" DROP COLUMN "tenant_id";`)
}
