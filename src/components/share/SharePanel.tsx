'use client'

import React, { useId, useRef, useState } from 'react'

import { EmbedKit } from './EmbedKit'
import { LinksAndButtons } from './LinksAndButtons'
import './share-kit.css'

const TABS = [
  { id: 'links', label: 'Links and buttons', Kit: LinksAndButtons },
  { id: 'embed', label: 'Embed', Kit: EmbedKit },
] as const

/** The tab an arrow, Home or End key moves to, or `null` for any other key. */
const tabFor = (key: string, current: number): null | number => {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % TABS.length
    case 'ArrowLeft':
      return (current - 1 + TABS.length) % TABS.length
    case 'Home':
      return 0
    case 'End':
      return TABS.length - 1
    default:
      return null
  }
}

/**
 * "Put critwire on your site": everything a studio pastes on the pages
 * it already has. Public URLs only, so it's safe wherever it renders.
 * Its tabs follow the WAI-ARIA tabs pattern, with automatic activation:
 * the arrow keys, Home and End move focus and select. Only the selected
 * tab's kit is mounted, so the embed preview loads only when shown.
 * `headingLevel` fits the title into the page's outline: 2 on its own
 * admin tab, 3 inside the hub's welcome panel.
 */
export const SharePanel: React.FC<{ headingLevel?: 2 | 3; siteURL: string; slug: string }> = ({
  headingLevel = 2,
  siteURL,
  slug,
}) => {
  const id = useId()
  const [selected, setSelected] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const Title = `h${headingLevel}` as const

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = tabFor(event.key, selected)
    if (next === null) return
    event.preventDefault()
    setSelected(next)
    tabs.current[next]?.focus()
  }

  return (
    <section aria-labelledby={`${id}-title`} className="share-kit">
      <Title className="share-kit-title" id={`${id}-title`}>
        Put critwire on your site
      </Title>
      <div
        aria-label="What to put on your site"
        className="share-kit-tabs"
        onKeyDown={onKeyDown}
        role="tablist"
      >
        {TABS.map((tab, index) => (
          <button
            aria-controls={`${id}-${tab.id}-panel`}
            aria-selected={index === selected}
            className="share-kit-tab"
            id={`${id}-${tab.id}-tab`}
            key={tab.id}
            onClick={() => setSelected(index)}
            ref={(element) => {
              tabs.current[index] = element
            }}
            role="tab"
            tabIndex={index === selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map(({ Kit, id: tabID }, index) => (
        <div
          aria-labelledby={`${id}-${tabID}-tab`}
          hidden={index !== selected}
          id={`${id}-${tabID}-panel`}
          key={tabID}
          role="tabpanel"
          tabIndex={0}
        >
          {index === selected ? <Kit siteURL={siteURL} slug={slug} /> : null}
        </div>
      ))}
    </section>
  )
}
