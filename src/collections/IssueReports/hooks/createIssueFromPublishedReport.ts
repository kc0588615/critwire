import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { ValidationError } from 'payload'
import { extractID } from 'payload/shared'

import type { IssueReport } from '@/payload-types'

const slugify = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'issue'
}

const uniqueIssueSlug = async ({
  projectID,
  req,
  title,
}: {
  projectID: number | string
  req: PayloadRequest
  title: string
}): Promise<string> => {
  const base = slugify(title)
  let candidate = base
  let suffix = 2

  while (true) {
    const existing = await req.payload.find({
      collection: 'issues',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [{ gameProject: { equals: projectID } }, { slug: { equals: candidate } }],
      },
    })

    if (!existing.docs[0]) return candidate

    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

// Creates the public Issue in the report's own transaction and links it in
// the same write, so a failed save leaves neither an orphan issue nor an
// unlinked report.
export const createIssueFromPublishedReport: CollectionBeforeChangeHook<IssueReport> = async ({
  data,
  originalDoc,
  req,
}) => {
  // Field validation has run, so the merged report is complete.
  const report = { ...originalDoc, ...data } as IssueReport
  if (report.status !== 'PUBLISHED' || originalDoc?.status === 'PUBLISHED') return data
  if (report.issue) return data

  if (!report.gameProject || !report.tenant) {
    throw new ValidationError({
      collection: 'issue-reports',
      errors: [{ message: 'A published report needs a game project and a studio.', path: 'status' }],
    })
  }

  const projectID = extractID(report.gameProject)
  const slug = await uniqueIssueSlug({ projectID, req, title: report.title })

  const issue = await req.payload.create({
    collection: 'issues',
    data: {
      category: report.category,
      gameProject: projectID,
      isPublic: true,
      slug,
      status: 'REPORTED',
      summary: report.description,
      tenant: extractID(report.tenant),
      title: report.title,
    },
    overrideAccess: true,
    req,
  })

  return { ...data, issue: issue.id }
}
