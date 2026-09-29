import React from 'react'

/** Props every form control spreads, so its id and hint link are set in one place. */
export type FormControlProps = {
  'aria-describedby'?: string
  id: string
}

/**
 * A portal form field: the label, the control, then an optional hint.
 * The hint sits outside the `<label>` and is linked by
 * `aria-describedby`, so the control's accessible name is the label alone.
 */
export const FormField: React.FC<{
  children: (control: FormControlProps) => React.ReactNode
  className?: string
  hint?: string
  id: string
  label: string
}> = ({ children, className, hint, id, label }) => {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className={className ? `fs-field ${className}` : 'fs-field'}>
      <label className="fs-label" htmlFor={id}>
        {label}
      </label>
      {children({ 'aria-describedby': hintId, id })}
      {hint ? (
        <p className="fs-meta fs-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
