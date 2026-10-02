'use client'

import React, { useMemo, useState } from 'react'

import type { ButtonScheme } from '@/lib/share/buttons'
import { shareKit, type ShareItem } from '@/lib/share/kit'
import { SHARE_PLATFORMS, type SharePlatform, SNIPPET_FORMATS } from '@/lib/share/platforms'

import { CopyRow, KitChoice } from './KitControls'

const SCHEMES: readonly { id: ButtonScheme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

/** A button or the badge: its preview, the snippets the platform takes, and its image URLs. */
const ShareImage: React.FC<{ item: ShareItem }> = ({ item }) => (
  <div className="share-kit-item">
    <p className="share-kit-item-label">{item.label}</p>
    <div className="share-kit-preview">
      {/* A preview of the hosted image exactly as host pages show it, so no next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={item.alt} src={item.svg} />
    </div>
    {item.snippets.map(({ code, format }) => (
      <CopyRow
        copyLabel={`Copy ${SNIPPET_FORMATS[format]} for ${item.label}`}
        key={format}
        label={SNIPPET_FORMATS[format]}
        value={code}
      />
    ))}
    <CopyRow copyLabel={`Copy ${item.label} SVG URL`} label="SVG" value={item.svg} />
    <CopyRow copyLabel={`Copy ${item.label} PNG URL`} label="PNG" value={item.png} />
  </div>
)

/**
 * The kit's links and buttons for the place the studio picks. Each
 * choice is local state: the kit is pure, so nothing is fetched.
 */
export const LinksAndButtons: React.FC<{ siteURL: string; slug: string }> = ({ siteURL, slug }) => {
  const [platformID, setPlatformID] = useState<SharePlatform['id']>(SHARE_PLATFORMS[0].id)
  const [scheme, setScheme] = useState<ButtonScheme>('light')
  const platform = SHARE_PLATFORMS.find((candidate) => candidate.id === platformID) ?? SHARE_PLATFORMS[0]
  const kit = useMemo(() => shareKit({ platform, scheme, siteURL, slug }), [platform, scheme, siteURL, slug])

  return (
    <div className="share-kit-body">
      <KitChoice
        legend="Where will you put it?"
        onChange={setPlatformID}
        options={SHARE_PLATFORMS}
        value={platform.id}
      />
      {platform.guidance ? <p className="share-kit-note">{platform.guidance}</p> : null}

      <h3 className="share-kit-heading">Links</h3>
      <p className="share-kit-note">
        Each link carries <code>?ref={platform.id}</code>, so you can see which places bring players. RSS
        doesn’t: feed readers subscribe to it.
      </p>
      <div className="share-kit-rows">
        {kit.links.map((link) => (
          <CopyRow copyLabel={`Copy ${link.label} URL`} key={link.key} label={link.label} value={link.url} />
        ))}
      </div>

      <h3 className="share-kit-heading">Buttons</h3>
      <KitChoice
        legend="For a page that’s"
        onChange={setScheme}
        options={SCHEMES}
        value={scheme}
      />
      <div className="share-kit-items">
        {kit.buttons.map((item) => (
          <ShareImage item={item} key={item.id} />
        ))}
      </div>

      <h3 className="share-kit-heading">Live badge</h3>
      <p className="share-kit-note">
        Your public feedback counts and latest version, in your game’s colours. It updates within five minutes.
      </p>
      <div className="share-kit-items">
        <ShareImage item={kit.badge} />
      </div>
    </div>
  )
}
