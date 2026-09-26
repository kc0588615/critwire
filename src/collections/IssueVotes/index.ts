import type { CollectionConfig } from 'payload'

import { extractID } from 'payload/shared'

import type { User } from '@/payload-types'

import { isSuperAdmin } from '../../access/isSuperAdmin'
import { tenantMemberAccess } from '../../access/tenantAccess'
import { adjustUpvoteCount } from './hooks/adjustUpvoteCount'

export const IssueVotes: CollectionConfig = {
  slug: 'issue-votes',
  access: {
    // Votes are only written by the public voting endpoint (Phase 5)
    // via the Local API with overrideAccess — never through REST/admin.
    read: tenantMemberAccess,
    create: () => false,
    update: () => false,
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    defaultColumns: ['issue', 'createdAt'],
    group: 'Game Portal',
    hidden: ({ user }) => !isSuperAdmin(user as unknown as User),
  },
  fields: [
    {
      name: 'issue',
      type: 'relationship',
      relationTo: 'issues',
      required: true,
      index: true,
    },
    {
      // SHA-256 of the signed browser vote token — raw tokens are never stored.
      name: 'browserTokenHash',
      type: 'text',
      required: true,
      index: true,
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          await adjustUpvoteCount({ delta: 1, issueID: extractID(doc.issue), req })
        }
        return doc
      },
    ],
    // Before, not after: the `$inc` locks the issue row before deleteByID
    // re-reads the vote, so a concurrent withdrawal of the same vote waits,
    // finds it gone, throws NotFound and rolls back its own decrement.
    beforeDelete: [
      async ({ id, req }) => {
        const vote = await req.payload.findByID({
          collection: 'issue-votes',
          depth: 0,
          disableErrors: true,
          id,
          req,
        })
        if (vote) await adjustUpvoteCount({ delta: -1, issueID: extractID(vote.issue), req })
      },
    ],
  },
  indexes: [
    {
      // One vote per browser token per issue.
      fields: ['issue', 'browserTokenHash'],
      unique: true,
    },
  ],
  timestamps: true,
}
