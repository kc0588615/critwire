import type { CollectionAfterChangeHook } from 'payload'

import * as Sentry from '@sentry/nextjs'
import { revalidatePath } from 'next/cache'

import type { IssueReport } from '@/payload-types'

import { resolveProjectSlug } from '@/hooks/resolveProjectSlug'

const relationID = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id
    if (typeof id === 'number') return id
  }
  return undefined
}

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
  projectID: number
  req: Parameters<CollectionAfterChangeHook>[0]['req']
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
      where: {
        and: [{ gameProject: { equals: projectID } }, { slug: { equals: candidate } }],
      },
    })

    if (!existing.docs[0]) return candidate

    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export const promoteIssueReport: CollectionAfterChangeHook<IssueReport> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context?.skipIssueReportPromotion) return doc
  if (doc.status !== 'PUBLISHED' || previousDoc?.status === 'PUBLISHED') return doc
  if (relationID(doc.issue)) return doc

  try {
    req.payload.logger.info({ msg: 'Promoting issue report.', reportID: doc.id })

    const projectID = relationID(doc.gameProject)
    const tenantID = relationID(doc.tenant)

    if (!projectID || !tenantID) {
      throw new Error(`Cannot promote issue report ${doc.id}: missing project or tenant.`)
    }

    const slug = await uniqueIssueSlug({ projectID, req, title: doc.title })
    req.payload.logger.info({
      msg: 'Issue report promotion slug resolved.',
      reportID: doc.id,
      slug,
    })

    const issue = await req.payload.create({
      collection: 'issues',
      context: { skipIssueReportPromotion: true },
      data: {
        category: doc.category,
        gameProject: projectID,
        isPublic: true,
        slug,
        status: 'REPORTED',
        summary: doc.description,
        tenant: tenantID,
        title: doc.title,
      },
      overrideAccess: true,
    })
    req.payload.logger.info({
      issueID: issue.id,
      msg: 'Issue created from report.',
      reportID: doc.id,
    })

    setTimeout(() => {
      void req.payload
        .update({
          collection: 'issue-reports',
          context: { skipIssueReportPromotion: true },
          data: { issue: issue.id },
          id: doc.id,
          overrideAccess: true,
        })
        .then(() => {
          req.payload.logger.info({
            issueID: issue.id,
            msg: 'Issue relation set on report.',
            reportID: doc.id,
          })
        })
        .catch((err) => {
          Sentry.captureException(err)
          req.payload.logger.error({
            err,
            issueID: issue.id,
            msg: 'Could not set issue relation on report.',
            reportID: doc.id,
          })
        })
    }, 0)

    const projectSlug = await resolveProjectSlug(projectID, req.payload)
    if (projectSlug) revalidatePath(`/g/${projectSlug}/issues`, 'layout')

    return { ...doc, issue: issue.id }
  } catch (err) {
    Sentry.captureException(err)
    throw err
  }
}
