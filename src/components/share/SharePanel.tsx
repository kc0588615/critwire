'use client'

import React, { useId, useRef, useState } from 'react'

import { DiscordKit } from './DiscordKit'
import type { DiscordTab } from './discordTab'
import { EmbedKit } from './EmbedKit'
import { LinksAndButtons } from './LinksAndButtons'
import './share-kit.css'

interface Tab {
  id: string
  label: string
  render: () => React.ReactNode
}

/** The tab an arrow, Home or End key moves to among `count`, or `null` for any other key. */
const tabFor = (key: string, current: number, count: number): null | number => {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count
    case 'ArrowLeft':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/**
 * "Put critwire on your site": everything a studio pastes on the pages
 * it already has. Public URLs only, so it's safe wherever it renders;
 * the Discord tab's link state comes only from the admin, to its members.
 * Its tabs follow the WAI-ARIA tabs pattern, with automatic activation:
 * the arrow keys, Home and End move focus and select. Only the selected
 * tab's kit is mounted, so the embed preview loads only when shown.
 * `headingLevel` fits the title into the page's outline: 2 on its own
 * admin tab, 3 inside the hub's welcome panel. `discord` adds the Discord
 * tab, only while the instance has Discord on; it starts selected when
 * the studio comes back from Discord with an outcome.
 */
export const SharePanel: React.FC<{
  discord?: DiscordTab
  headingLevel?: 2 | 3
  siteURL: string
  slug: string
}> = ({ discord, headingLevel = 2, siteURL, slug }) => {
  const id = useId()
  const kits: Tab[] = [
    {
      id: 'links',
      label: 'Links and buttons',
      render: () => <LinksAndButtons siteURL={siteURL} slug={slug} />,
    },
    { id: 'embed', label: 'Embed', render: () => <EmbedKit siteURL={siteURL} slug={slug} /> },
    ...(discord
      ? [
          {
            id: 'discord',
            label: 'Discord',
            render: () => <DiscordKit discord={discord} siteURL={siteURL} />,
          },
        ]
      : []),
  ]
  const [selected, setSelected] = useState(discord?.outcome ? kits.length - 1 : 0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const Title = `h${headingLevel}` as const

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = tabFor(event.key, selected, kits.length)
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
        {kits.map((tab, index) => (
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
      {kits.map(({ id: tabID, render }, index) => (
        <div
          aria-labelledby={`${id}-${tabID}-tab`}
          hidden={index !== selected}
          id={`${id}-${tabID}-panel`}
          key={tabID}
          role="tabpanel"
          tabIndex={0}
        >
          {index === selected ? render() : null}
        </div>
      ))}
    </section>
  )
}
