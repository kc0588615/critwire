import React from 'react'

import { embedHref } from '@/lib/embed/links'
import { isPoweredByShown } from '@/lib/hosting'

import { EmbedLink } from './EmbedLink'

/** The embed's last line, unless this instance hides it (`isPoweredByShown`). */
export const PoweredBy: React.FC = () =>
  isPoweredByShown() ? (
    <p className="cw-embed-powered fs-meta">
      Powered by{' '}
      <EmbedLink className="fs-link" href={embedHref('/')}>
        Critwire
      </EmbedLink>
    </p>
  ) : null
