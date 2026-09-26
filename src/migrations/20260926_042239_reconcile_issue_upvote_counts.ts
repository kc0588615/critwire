import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Data only. The old vote route recounted votes and wrote the total in
 * separate transactions, so a stale count could be the last write. The
 * IssueVotes hooks now `$inc` the counter, which would carry that error
 * forever, so recount once at cutover. The tenant predicate keeps the
 * statement tenant-scoped; the vote route always copied the issue's
 * tenant onto the vote. Raw SQL leaves `updated_at` alone, so "Recently
 * Fixed" doesn't re-sort.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "issues" SET "upvote_count" = (
    SELECT count(*) FROM "issue_votes" v
    WHERE v."issue_id" = "issues"."id" AND v."tenant_id" = "issues"."tenant_id"
  );`)
}

// Nothing to undo: the recount is correct under the old code too.
export async function down(): Promise<void> {}
