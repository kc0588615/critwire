'use client'

import React, { useMemo, useState } from 'react'

import { EMBED_PLATFORMS, EMBED_SUPPORT, EMBED_SUPPORT_GROUPS } from '@/lib/embed/platforms'
import { type EmbedTheme, type EmbedWidget, embedSnippets } from '@/lib/embed/snippets'

import { CopyRow, KitChoice } from './KitControls'

const WIDGETS: readonly { id: EmbedWidget; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'updates', label: 'Updates' },
  { id: 'button', label: 'Floating button' },
]

const THEMES: readonly { id: EmbedTheme; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const PREVIEW_TITLES: Record<EmbedWidget, string> = {
  board: 'Preview of the board',
  updates: 'Preview of the updates',
  button: 'Preview of the board the button opens',
}

/**
 * The snippets for the widget and mode the studio picks, a live preview
 * of the widget, and where each kind of snippet works. Each choice is
 * local state: the snippets are pure, so nothing is fetched but the
 * preview itself.
 */
export const EmbedKit: React.FC<{ siteURL: string; slug: string }> = ({ siteURL, slug }) => {
  const [widget, setWidget] = useState<EmbedWidget>('board')
  const [theme, setTheme] = useState<EmbedTheme>('auto')
  const snippets = useMemo(
    () => embedSnippets({ siteURL, slug, theme, widget }),
    [siteURL, slug, theme, widget],
  )

  return (
    <div className="share-kit-body">
      <KitChoice legend="Widget" onChange={setWidget} options={WIDGETS} value={widget} />
      <KitChoice legend="Mode" onChange={setTheme} options={THEMES} value={theme} />
      <p className="share-kit-note">
        Auto follows each visitor’s light or dark setting. The widget takes your game’s colours and,
        through the script, your page’s font.
      </p>

      <h3 className="share-kit-heading">Snippet</h3>
      <p className="share-kit-note">
        {widget === 'button'
          ? 'Paste the script anywhere in your page. It adds a Feedback button in the corner that opens your board.'
          : 'Paste the script where the widget goes. It fits its height to what it shows.'}
      </p>
      <div className="share-kit-rows">
        <CopyRow copyLabel="Copy script snippet" label="Script" value={snippets.script} />
        {snippets.iframe ? (
          <>
            <CopyRow copyLabel="Copy iframe snippet" label="Iframe" value={snippets.iframe} />
            <CopyRow copyLabel="Copy embed URL" label="URL" value={snippets.url} />
          </>
        ) : null}
      </div>
      {snippets.iframe ? (
        <p className="share-kit-note">
          Where scripts aren’t allowed, paste the iframe, or the URL where a builder asks for one.
          It keeps a fixed height.
        </p>
      ) : null}

      <h3 className="share-kit-heading">Preview</h3>
      <iframe
        className="share-kit-embed-preview"
        src={snippets.url}
        title={PREVIEW_TITLES[widget]}
      />

      <h3 className="share-kit-heading">Where it works</h3>
      {EMBED_SUPPORT_GROUPS.map((support) => (
        <div className="share-kit-platforms" key={support}>
          <h4 className="share-kit-platform-group">{EMBED_SUPPORT[support]}</h4>
          <ul className="share-kit-platform-list">
            {EMBED_PLATFORMS.filter((platform) => platform.support === support).map((platform) => (
              <li key={platform.name}>
                <strong>{platform.name}:</strong> {platform.how}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
