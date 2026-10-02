import { Gutter } from '@payloadcms/ui'
import type { DocumentViewServerProps } from 'payload'
import React from 'react'

import { SharePanel } from '@/components/share/SharePanel'
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
export default function ShareView({ doc }: DocumentViewServerProps) {
  const game = doc as Pick<GameProject, 'id' | 'slug'>

  return (
    <Gutter className="share-view">
      <SharePanel siteURL={getServerSideURL()} slug={game.slug} />
      <ReferralCounts gameID={game.id} />
    </Gutter>
  )
}
