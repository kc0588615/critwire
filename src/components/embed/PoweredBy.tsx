import React from 'react'

import { embedHref } from '@/lib/embed/links'

import { EmbedLink } from './EmbedLink'

/** The embed's last line. */
export const PoweredBy: React.FC = () => (
  <p className="cw-embed-powered fs-meta">
    Powered by{' '}
    <EmbedLink className="fs-link" href={embedHref('/')}>
      Critwire
    </EmbedLink>
  </p>
)
