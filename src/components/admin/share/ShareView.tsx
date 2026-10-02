import { Gutter } from '@payloadcms/ui'
import type { DocumentViewServerProps } from 'payload'
import React from 'react'

import { DISCORD_OUTCOMES, type DiscordTab } from '@/components/share/discordTab'
import { SharePanel } from '@/components/share/SharePanel'
import { isDiscordOn } from '@/lib/discord/config'
import type { GameProject } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

import { ReferralCounts } from './ReferralCounts'
import './index.scss'

/**
 * A game's Share tab (`gameShareHref`). Payload loaded `doc` as the
 * signed-in user, so the multi-tenant plugin already scoped it: another
 * studio's game redirects to the list before this renders. The kit uses
 * the configured site URL, never the host the admin was opened on.
 * "Where players come from" follows the kit.
 */
export default function ShareView({ doc, searchParams }: DocumentViewServerProps) {
  const game = doc as Pick<GameProject, 'discord' | 'id' | 'slug'>

  return (
    <Gutter className="share-view">
      <SharePanel
        discord={isDiscordOn() ? discordTab(game, searchParams?.discord) : undefined}
        siteURL={getServerSideURL()}
        slug={game.slug}
      />
      <ReferralCounts gameID={game.id} />
    </Gutter>
  )
}

/**
 * The Discord tab's state: the server and channel it shows, and the
 * callback's `?discord=` outcome when it's one of its own.
 */
const discordTab = (
  { discord, id }: Pick<GameProject, 'discord' | 'id'>,
  outcome: unknown,
): DiscordTab => ({
  gameID: id,
  link: discord?.guildId ? { channelId: discord.channelId ?? null, guildId: discord.guildId } : null,
  outcome: DISCORD_OUTCOMES.find((known) => known === outcome),
})
