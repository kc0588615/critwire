'use client'

import React, { useState } from 'react'

const COPY_RESULTS = {
  copied: 'Copied',
  failed: 'Couldn’t copy: select the text instead',
} as const

/**
 * Copies `text`, and says whether it worked. `label` is the button's
 * accessible name, unique on the page ("Copy Hub URL"); it reads "Copy".
 */
export const CopyButton: React.FC<{ className?: string; label: string; text: string }> = ({
  className,
  label,
  text,
}) => {
  const [result, setResult] = useState<keyof typeof COPY_RESULTS | null>(null)

  const copy = () => {
    // No clipboard API outside a secure context (plain http on a LAN).
    if (!navigator.clipboard) {
      setResult('failed')
      return
    }
    navigator.clipboard.writeText(text).then(
      () => setResult('copied'),
      () => setResult('failed'),
    )
  }

  return (
    <>
      <button aria-label={label} className={className} onClick={copy} type="button">
        Copy
      </button>
      <span aria-live="polite" className="copy-result">
        {result ? COPY_RESULTS[result] : null}
      </span>
    </>
  )
}
