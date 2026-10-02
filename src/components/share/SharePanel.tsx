'use client'

import React, { useId } from 'react'

import { LinksAndButtons } from './LinksAndButtons'
import './share-kit.css'

/**
 * "Put critwire on your site": everything a studio pastes on the pages
 * it already has. Public URLs only, so it's safe wherever it renders.
 * The embed and Discord missions add their tabs beside the links and buttons.
 * `headingLevel` fits the title into the page's outline: 2 on its own
 * admin tab, 3 inside the hub's welcome panel.
 */
export const SharePanel: React.FC<{ headingLevel?: 2 | 3; siteURL: string; slug: string }> = ({
  headingLevel = 2,
  siteURL,
  slug,
}) => {
  const titleID = useId()
  const Title = `h${headingLevel}` as const

  return (
    <section aria-labelledby={titleID} className="share-kit">
      <Title className="share-kit-title" id={titleID}>
        Put critwire on your site
      </Title>
      <LinksAndButtons siteURL={siteURL} slug={slug} />
    </section>
  )
}
