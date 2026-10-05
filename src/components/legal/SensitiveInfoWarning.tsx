import React from 'react'

import { SENSITIVE_INFO_WARNING } from '@/lib/legal/copy'

/** The warning's id: every free-text field of a player form names it in `aria-describedby`. */
export const SENSITIVE_INFO_WARNING_ID = 'sensitive-info-warning'

/** Shown once at the top of a player form, and linked from each of its free-text fields. */
export const SensitiveInfoWarning: React.FC = () => (
  <p className="fs-meta fs-sensitive-warning" id={SENSITIVE_INFO_WARNING_ID}>
    {SENSITIVE_INFO_WARNING}
  </p>
)
