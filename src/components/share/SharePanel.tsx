'use client'

import React, { useId } from 'react'

import { LinksAndButtons } from './LinksAndButtons'
import './share-kit.css'

/**
 * "Put critwire on your site": everything a studio pastes on the pages
 * it already has. Public URLs only, so it's safe wherever it renders.
 * The embed and Discord missions add their tabs beside the links and buttons.
 */
export const SharePanel: React.FC<{ siteURL: string; slug: string }> = ({ siteURL, slug }) => {
  const titleID = useId()

  return (
    <section aria-labelledby={titleID} className="share-kit">
      <h2 className="share-kit-title" id={titleID}>
        Put critwire on your site
      </h2>
      <LinksAndButtons siteURL={siteURL} slug={slug} />
    </section>
  )
}
