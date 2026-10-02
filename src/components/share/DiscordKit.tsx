'use client'

import { useRouter } from 'next/navigation'
import React, { useState, useTransition } from 'react'

import { gameShareHref } from '@/lib/admin/paths'
import { disconnectDiscord } from '@/lib/discord/actions'

import type { DiscordOutcome, DiscordTab } from './discordTab'

type Status = DiscordOutcome | 'disconnected' | 'disconnect-failed'

const STATUS_TEXT: Record<Status, string> = {
  cancelled: 'You cancelled on Discord, so nothing changed.',
  'disconnect-failed': 'Couldn’t disconnect. Try again.',
  disconnected: 'Disconnected from Discord.',
  failed: 'Discord couldn’t be linked. Try again.',
  linked: 'Your game is linked to your Discord server.',
}

/** Discord's own address for a channel. */
const channelURL = (guildId: string, channelId: string): string =>
  `https://discord.com/channels/${guildId}/${channelId}`

const WhatItDoes: React.FC = () => (
  <ul className="share-kit-list">
    <li>
      Players type <code>/feedback</code> in your server to send a bug or an idea. It reaches your
      review queue like any other report.
    </li>
    <li>
      Moderators right-click a player’s message, then <strong>Apps → Send to critwire</strong>, to
      turn it into a report.
    </li>
    <li>
      critwire posts in a channel you choose when you publish an update, and when an item reaches
      Planned, In progress or Shipped.
    </li>
  </ul>
)

/**
 * "Add critwire to your Discord", and the game's link once it has one:
 * the posts channel, how posts are timed, and Disconnect. Installing is a
 * plain link to `/api/discord/install` on the configured site URL, which
 * sends the studio to Discord's own screen. After Disconnect the admin
 * view re-renders with the cleared link.
 */
export const DiscordKit: React.FC<{ discord: DiscordTab; siteURL: string }> = ({
  discord: { gameID, link, outcome },
  siteURL,
}) => {
  const router = useRouter()
  const [status, setStatus] = useState<Status | undefined>(outcome)
  const [pending, startTransition] = useTransition()
  const installURL = `${siteURL}/api/discord/install?game=${gameID}`
  const linked = link !== 'unknown' && link !== null ? link : null

  const disconnect = () =>
    startTransition(async () => {
      try {
        await disconnectDiscord(gameID)
        setStatus('disconnected')
        router.refresh()
      } catch {
        setStatus('disconnect-failed')
      }
    })

  return (
    <div className="share-kit-body">
      <p aria-live="polite" className="share-kit-status" role="status">
        {status ? STATUS_TEXT[status] : null}
      </p>

      {linked ? (
        <>
          <h3 className="share-kit-subtitle">Linked to your Discord server</h3>
          {linked.channelId ? (
            <p>
              <a
                className="share-kit-action"
                href={channelURL(linked.guildId, linked.channelId)}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open the posts channel
              </a>
            </p>
          ) : (
            <p className="share-kit-note">
              Posts are off: the webhook was removed in Discord. Add critwire again to choose a
              channel.
            </p>
          )}
          <WhatItDoes />

          <h3 className="share-kit-heading">How posts work</h3>
          <p className="share-kit-note">
            critwire posts about a minute after the last change, once per update and once per stage,
            so quick changes become one post. Each post links to the update or the item on your
            portal.
          </p>

          <h3 className="share-kit-heading">Several games</h3>
          <p className="share-kit-note">
            Add critwire from each game’s Share tab and pick the same server. Each game posts to its
            own channel, and <code>/feedback</code> asks players which game.
          </p>

          <h3 className="share-kit-heading">Change or disconnect</h3>
          <p className="share-kit-note">
            Add critwire again to change the channel, or move its webhook in Discord (Server Settings
            → Integrations). Disconnect stops posts and <code>/feedback</code> for this game.
          </p>
          <div className="share-kit-actions">
            <a className="share-kit-action share-kit-action-secondary" href={installURL}>
              Add critwire again
            </a>
            <button
              className="share-kit-action share-kit-action-secondary"
              disabled={pending}
              onClick={disconnect}
              type="button"
            >
              {pending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        </>
      ) : (
        <>
          <WhatItDoes />
          <p>
            <a className="share-kit-action" href={installURL}>
              Add critwire to your Discord
            </a>
          </p>
          <p className="share-kit-note">
            Discord asks which server to add critwire to and which channel it posts in. You need
            Manage Server and Manage Webhooks there.
          </p>
          {link === 'unknown' ? (
            <p className="share-kit-note">
              Already added it? Your game’s{' '}
              <a href={`${siteURL}${gameShareHref(gameID)}`}>Share tab in the admin</a> shows the
              server it’s linked to.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
