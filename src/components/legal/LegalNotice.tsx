import React from 'react'

import { SUBMIT_NOTICE } from '@/lib/legal/copy'

import { LegalCopyText } from './LegalCopyText'

/** The notice's id: each player form's submit button names it in `aria-describedby`. */
export const LEGAL_NOTICE_ID = 'legal-notice'

/** "By sending this, you agree to…", beside a player form's submit button. */
export const LegalNotice: React.FC = () => (
  <p className="fs-meta fs-legal-notice" id={LEGAL_NOTICE_ID}>
    <LegalCopyText parts={SUBMIT_NOTICE} />
  </p>
)
