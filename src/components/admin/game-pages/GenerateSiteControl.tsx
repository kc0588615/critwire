'use client'

import { Button, useDocumentInfo, useFormModified, useFormProcessing } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

import type { SiteSlotId } from '@/site-templates/flagship-game-v1/schema/refs'

import './generate-site-control.scss'

const SLOTS: Array<{ label: string; value: SiteSlotId }> = [
  { label: 'Hero', value: 'hero' },
  { label: 'Availability', value: 'availability' },
  { label: 'Features', value: 'features' },
  { label: 'Trailer', value: 'trailer' },
  { label: 'Gallery', value: 'gallery' },
  { label: 'Adaptive section', value: 'adaptive' },
  { label: 'Latest update', value: 'latestUpdate' },
  { label: 'Known issues', value: 'knownIssues' },
  { label: 'Community', value: 'community' },
  { label: 'Final CTA', value: 'finalCta' },
]

type GenerationResponse = {
  changeSummary?: string[]
  error?: string
  model?: string
}

const storageKey = (id: number | string): string => `critwire:site-generation:${id}`

export const GenerateSiteControl: React.FC = () => {
  const { collectionSlug, documentIsLocked, id } = useDocumentInfo()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [scope, setScope] = useState<'full' | 'slot' | 'theme'>('full')
  const [slot, setSlot] = useState<SiteSlotId>('hero')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [summary, setSummary] = useState<string[]>([])
  const [model, setModel] = useState<null | string>(null)

  useEffect(() => {
    if (id == null) return
    const saved = window.sessionStorage.getItem(storageKey(id))
    if (!saved) return
    window.sessionStorage.removeItem(storageKey(id))
    try {
      const result = JSON.parse(saved) as GenerationResponse
      const restore = window.setTimeout(() => {
        setSummary(result.changeSummary ?? [])
        setModel(result.model ?? null)
        setOpen(true)
      }, 0)
      return () => window.clearTimeout(restore)
    } catch {
      // A stale/malformed session value should never block document editing.
    }
  }, [id])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (collectionSlug !== 'game-pages') return null

  const savedID = typeof id === 'number' ? id : Number(id)
  const unavailable =
    id == null || !Number.isInteger(savedID) || modified || processing || documentIsLocked || busy

  const generate = async (): Promise<void> => {
    if (unavailable || prompt.trim().length < 3) return
    setBusy(true)
    setError(null)
    setSummary([])

    try {
      const response = await fetch('/next/generate-site', {
        body: JSON.stringify({
          gamePageId: savedID,
          prompt: prompt.trim(),
          scope,
          ...(scope === 'slot' ? { slot } : {}),
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = (await response.json()) as GenerationResponse
      if (!response.ok) throw new Error(result.error || 'Site generation failed.')

      window.sessionStorage.setItem(storageKey(savedID), JSON.stringify(result))
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Site generation failed.')
      setBusy(false)
    }
  }

  const disabledReason =
    id == null
      ? 'Save the page before generating.'
      : modified
        ? 'Save or discard manual changes before generating.'
        : documentIsLocked
          ? 'This document is locked by another editor.'
          : undefined

  return (
    <>
      <Button
        buttonStyle="secondary"
        disabled={unavailable}
        margin={false}
        onClick={() => {
          setError(null)
          setSummary([])
          setOpen(true)
        }}
        size="small"
        tooltip={disabledReason}
        type="button"
      >
        Generate with AI
      </Button>

      <dialog
        aria-labelledby="generate-site-title"
        className="generate-site-control"
        onCancel={() => setOpen(false)}
        ref={dialogRef}
      >
        <div className="generate-site-control__header">
          <div>
            <h2 id="generate-site-title">Generate flagship site</h2>
            <p>The result is saved as a draft version. It is never published automatically.</p>
          </div>
          <button aria-label="Close generator" onClick={() => setOpen(false)} type="button">
            ×
          </button>
        </div>

        {summary.length > 0 ? (
          <div className="generate-site-control__result" role="status">
            <h3>Draft updated</h3>
            {model ? <p>Generated with {model}.</p> : null}
            <ul>
              {summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>You can now review the preview or correct any typed field manually.</p>
          </div>
        ) : (
          <div className="generate-site-control__form">
            <label htmlFor="site-generation-scope">Scope</label>
            <select
              id="site-generation-scope"
              onChange={(event) => setScope(event.target.value as typeof scope)}
              value={scope}
            >
              <option value="full">Full site</option>
              <option value="theme">Theme only</option>
              <option value="slot">One section</option>
            </select>

            {scope === 'slot' ? (
              <>
                <label htmlFor="site-generation-slot">Section</label>
                <select
                  id="site-generation-slot"
                  onChange={(event) => setSlot(event.target.value as SiteSlotId)}
                  value={slot}
                >
                  {SLOTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label htmlFor="site-generation-prompt">What should change?</label>
            <textarea
              autoFocus
              id="site-generation-prompt"
              maxLength={2000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Make the site feel like a moody field expedition, emphasizing discovery and player reports."
              rows={6}
              value={prompt}
            />

            {error ? <p className="generate-site-control__error" role="alert">{error}</p> : null}

            <div className="generate-site-control__actions">
              <Button buttonStyle="secondary" margin={false} onClick={() => setOpen(false)} type="button">
                Cancel
              </Button>
              <Button
                buttonStyle="primary"
                disabled={busy || prompt.trim().length < 3}
                margin={false}
                onClick={() => void generate()}
                type="button"
              >
                {busy ? 'Generating…' : 'Generate draft'}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}

export default GenerateSiteControl
