'use client'

import React, { useId, useMemo, useState } from 'react'

import { BUTTON_SCHEMES, type ButtonScheme } from '@/lib/share/buttons'
import { shareKit, type ShareItem } from '@/lib/share/kit'
import { SHARE_PLATFORMS, SNIPPET_FORMATS, type RefSource } from '@/lib/share/platforms'

import { CopyButton } from './CopyButton'

const SCHEME_LABELS: Record<ButtonScheme, string> = { light: 'Light', dark: 'Dark' }

/** One copyable value. `copyLabel` is the button's accessible name, unique in the panel. */
const CopyRow: React.FC<{ copyLabel: string; label: string; value: string }> = ({ copyLabel, label, value }) => (
  <div className="share-kit-row">
    <span className="share-kit-row-label">{label}</span>
    <code className="share-kit-value">{value}</code>
    <CopyButton className="share-kit-copy" label={copyLabel} text={value} />
  </div>
)

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
  const id = useId()
  const [platformID, setPlatformID] = useState<RefSource>(SHARE_PLATFORMS[0].id)
  const [scheme, setScheme] = useState<ButtonScheme>('light')
  const platform = SHARE_PLATFORMS.find((candidate) => candidate.id === platformID) ?? SHARE_PLATFORMS[0]
  const kit = useMemo(() => shareKit({ platform, scheme, siteURL, slug }), [platform, scheme, siteURL, slug])

  return (
    <div className="share-kit-body">
      <fieldset className="share-kit-choice">
        <legend className="share-kit-legend">Where will you put it?</legend>
        {SHARE_PLATFORMS.map((candidate) => (
          <label className="share-kit-option" key={candidate.id}>
            <input
              checked={candidate.id === platform.id}
              name={`${id}-platform`}
              onChange={() => setPlatformID(candidate.id)}
              type="radio"
              value={candidate.id}
            />
            {candidate.label}
          </label>
        ))}
      </fieldset>
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
      <fieldset className="share-kit-choice">
        <legend className="share-kit-legend">For a page that’s</legend>
        {BUTTON_SCHEMES.map((candidate) => (
          <label className="share-kit-option" key={candidate}>
            <input
              checked={candidate === scheme}
              name={`${id}-scheme`}
              onChange={() => setScheme(candidate)}
              type="radio"
              value={candidate}
            />
            {SCHEME_LABELS[candidate]}
          </label>
        ))}
      </fieldset>
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
