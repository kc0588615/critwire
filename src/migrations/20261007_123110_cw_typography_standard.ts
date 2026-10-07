import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Only adds the value. cw_portal_defaults, the next migration, makes it the
// column default: Postgres can't use a value added by ADD VALUE until that
// transaction commits.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_game_projects_theme_typography" ADD VALUE 'standard' BEFORE 'modern';`)
}

// A no-op: Postgres can't drop an enum value without recreating the type,
// and cw_portal_defaults' down leaves no row using 'standard'.
export async function down(): Promise<void> {}
