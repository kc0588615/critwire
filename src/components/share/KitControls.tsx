'use client'

import React, { useId } from 'react'

import { CopyButton } from './CopyButton'

/** One copyable value. `copyLabel` is the button's accessible name, unique in the panel. */
export const CopyRow: React.FC<{ copyLabel: string; label: string; value: string }> = ({
  copyLabel,
  label,
  value,
}) => (
  <div className="share-kit-row">
    <span className="share-kit-row-label">{label}</span>
    <code className="share-kit-value">{value}</code>
    <CopyButton className="share-kit-copy" label={copyLabel} text={value} />
  </div>
)

/** A row of radio chips: one choice among `options`. */
export function KitChoice<T extends string>({
  legend,
  onChange,
  options,
  value,
}: {
  legend: string
  onChange: (value: T) => void
  options: readonly { id: T; label: string }[]
  value: T
}) {
  const name = useId()

  return (
    <fieldset className="share-kit-choice">
      <legend className="share-kit-legend">{legend}</legend>
      {options.map((option) => (
        <label className="share-kit-option" key={option.id}>
          <input
            checked={option.id === value}
            name={name}
            onChange={() => onChange(option.id)}
            type="radio"
            value={option.id}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
