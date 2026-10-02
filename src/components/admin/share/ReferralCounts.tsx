import * as Sentry from '@sentry/nextjs'
import React from 'react'

import { getLogger } from '@/lib/logger'
import { isReferralCounterOn, readReferrals, type ReferralDay } from '@/lib/referrals/counter'
import { SHARE_PLATFORMS } from '@/lib/share/platforms'

const log = getLogger('admin.referrals')

const DAYS = 30
const TITLE_ID = 'referral-counts-title'

const dayLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

type Counts = { state: 'failed' } | { state: 'off' } | { state: 'on'; days: ReferralDay[] }

/** The game's last 30 days of counts, or why there are none to show. */
async function loadCounts(gameID: number): Promise<Counts> {
  if (!isReferralCounterOn()) return { state: 'off' }
  try {
    return { state: 'on', days: await readReferrals(gameID, DAYS) }
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, gameID, msg: 'Reading referral counts failed.' })
    return { state: 'failed' }
  }
}

/** One row per day with visits, one column per place that sent any, and the totals. */
const CountsTable: React.FC<{ days: ReferralDay[] }> = ({ days }) => {
  const visited = days.filter((day) => Object.keys(day.counts).length > 0)
  if (visited.length === 0) {
    return (
      <p className="referral-counts-note">No visits from tagged links in the last {DAYS} days.</p>
    )
  }

  const sources = SHARE_PLATFORMS.filter((platform) =>
    visited.some((day) => day.counts[platform.id]),
  )
  const total = (id: (typeof sources)[number]['id']) =>
    visited.reduce((sum, day) => sum + (day.counts[id] ?? 0), 0)

  return (
    // Scrolls on its own on narrow screens, so the table keeps its table semantics.
    <div className="referral-counts-scroll">
      <table className="referral-counts-table">
        <caption>Visits from tagged links, last {DAYS} days (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {sources.map((source) => (
              <th key={source.id} scope="col">
                {source.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visited.map(({ day, counts }) => (
            <tr key={day}>
              <th scope="row">
                <time dateTime={day}>{dayLabel.format(new Date(`${day}T00:00:00Z`))}</time>
              </th>
              {sources.map((source) => (
                <td key={source.id}>{counts[source.id] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {sources.map((source) => (
              <td key={source.id}>{total(source.id)}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/**
 * "Where players come from" on a game's Share tab: arrivals through kit
 * links, per day and per place. Read only for the game Payload already
 * loaded as the signed-in user. A failure here never hides the kit above.
 */
export async function ReferralCounts({ gameID }: { gameID: number }) {
  const counts = await loadCounts(gameID)

  return (
    <section aria-labelledby={TITLE_ID} className="referral-counts">
      <h2 className="referral-counts-title" id={TITLE_ID}>
        Where players come from
      </h2>
      {counts.state === 'off' ? (
        <p className="referral-counts-note">
          Referral counting is off on this instance. It needs Upstash Redis (see
          docs/self-hosting.md).
        </p>
      ) : counts.state === 'failed' ? (
        <p className="referral-counts-note">Couldn’t load the counts right now.</p>
      ) : (
        <>
          <p className="referral-counts-note">
            Each visit through a kit link counts once, under the place its link was made for. Tags
            come from links, so the counts are a guide.
          </p>
          <CountsTable days={counts.days} />
        </>
      )}
    </section>
  )
}
