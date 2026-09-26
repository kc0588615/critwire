import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * `issue_votes.issue_id` is NOT NULL but its foreign key is Payload's
 * default ON DELETE SET NULL, so a voted issue can't be deleted until its
 * votes are gone. Deletes them in the issue delete's own transaction: if
 * the delete is then refused (another studio's issue), they roll back.
 * The adapter call skips the IssueVotes counter hooks; the issue's own
 * `afterDelete` revalidates the landing.
 */
export const deleteIssueVotes: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.db.deleteMany({
    collection: 'issue-votes',
    req,
    where: { issue: { equals: id } },
  })
}
