import type { Where } from 'payload'

import type { PayloadJob } from '../../../src/payload-types'
import { toQueryString, type RestClient } from './api'

/** Enough rounds for a retried job to use up its attempts; more means a job is stuck. */
const MAX_ROUNDS = 20
const PAUSE_MS = 250

/** One run of `queue` through the REST endpoint, as the super admin. */
async function runQueue(superAdmin: RestClient, queue: string, scheduling: boolean): Promise<void> {
  const query = toQueryString({ queue, ...(scheduling ? {} : { disableScheduling: 'true' }) })
  const { status, body } = await superAdmin.raw('GET', `/api/payload-jobs/run${query}`)
  if (status !== 200) throw new Error(`the ${queue} queue run answered ${status}: ${JSON.stringify(body)}`)
}

/** Jobs in `queue` matching `where` that haven't finished: not completed and not failed for good. */
async function unfinishedJobs(superAdmin: RestClient, queue: string, where: Where): Promise<PayloadJob[]> {
  const { status, body } = await superAdmin.find('payload-jobs', {
    depth: 0,
    limit: 100,
    where: {
      and: [where, { queue: { equals: queue } }, { completedAt: { exists: false } }, { hasError: { equals: false } }],
    },
  })
  if (status !== 200) throw new Error(`payload-jobs answered ${status}: ${JSON.stringify(body)}`)
  return body.docs
}

/**
 * The "time passes" step: runs `queue` once, which lets Payload's scheduler
 * queue whatever is scheduled there, then makes the jobs matching `where`
 * due and runs the queue until every one of them has finished. Later runs
 * skip scheduling, or each would queue the next scheduled run. Throws if
 * they haven't finished after `MAX_ROUNDS`.
 */
export async function runDueJobs(superAdmin: RestClient, { queue, where }: { queue: string; where: Where }): Promise<void> {
  await runQueue(superAdmin, queue, true)
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const jobs = await unfinishedJobs(superAdmin, queue, where)
    if (!jobs.length) return

    const due = new Date(Date.now() - 1000).toISOString()
    // A job another runner holds (the servers' own autorun) finishes there.
    for (const job of jobs.filter((job) => !job.processing)) {
      const { status, body } = await superAdmin.update('payload-jobs', job.id, { waitUntil: due })
      if (status !== 200) throw new Error(`making job ${job.id} due answered ${status}: ${JSON.stringify(body)}`)
    }
    await runQueue(superAdmin, queue, false)
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
  }
  throw new Error(`jobs in ${queue} matching ${JSON.stringify(where)} were still unfinished after ${MAX_ROUNDS} runs`)
}
