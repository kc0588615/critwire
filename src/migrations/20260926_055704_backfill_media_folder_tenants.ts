import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Data only. `tenant_scoped_media_folders` added a nullable tenant to
 * folders, so every existing folder is visible only to super admins. Give
 * a folder the tenant of its contents when those are unambiguous: its
 * subtree (the folder and all its descendants) holds at least one media
 * item, and every media item in it has that one tenant. Descendant folders'
 * own tenants aren't consulted; they are all null when this runs. A folder
 * that already has a tenant is never overwritten. `UNION` (not `UNION ALL`)
 * makes a parent cycle terminate. Raw SQL leaves `updated_at` alone.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const { rows: assigned } = await db.execute(sql`
  WITH RECURSIVE subtree(root_id, folder_id) AS (
    SELECT "id", "id" FROM "payload_folders" WHERE "tenant_id" IS NULL
    UNION
    SELECT s."root_id", f."id" FROM "payload_folders" f
    JOIN subtree s ON f."folder_id" = s."folder_id"
  ), owner AS (
    SELECT s."root_id", min(m."tenant_id") AS "tenant_id"
    FROM subtree s JOIN "media" m ON m."folder_id" = s."folder_id"
    GROUP BY s."root_id"
    HAVING count(*) = count(m."tenant_id") AND count(DISTINCT m."tenant_id") = 1
  )
  UPDATE "payload_folders" f SET "tenant_id" = o."tenant_id"
  FROM owner o
  WHERE f."id" = o."root_id" AND f."tenant_id" IS NULL
  RETURNING f."id";`)

  const { rows: unassigned } = await db.execute(sql`
  SELECT "id" FROM "payload_folders" WHERE "tenant_id" IS NULL ORDER BY "id";`)

  const ids = (rows: Record<string, unknown>[]) => rows.map((row) => row.id).join(', ')
  payload.logger.info(`Media folders given their contents' tenant: ${ids(assigned) || 'none'}`)
  if (unassigned.length > 0) {
    payload.logger.warn(
      `Media folders left without a tenant (empty, or holding media of several studios or of none; only super admins see them): ${ids(unassigned)}`,
    )
  }
}

// Nothing to undo: a tenant on a folder is valid under the old code too.
export async function down(): Promise<void> {}
