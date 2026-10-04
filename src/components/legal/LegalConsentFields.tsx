import React from 'react'

import { AGREE_TO_TERMS, CONFIRM_AGE } from '@/lib/legal/copy'
import { currentLegalVersions } from '@/lib/legal/documents'

import { LegalCopyText } from './LegalCopyText'

/**
 * The two consent boxes, unticked and required, for signup and
 * `/legal/accept`, and the versions they're ticked for in hidden inputs.
 * The server checks both boxes and that those versions are still current
 * (`legalConsentSchema`), so a page left open across a version bump is
 * refused rather than recorded against text it didn't show.
 */
export const LegalConsentFields: React.FC = () => {
  const { privacy, terms } = currentLegalVersions()
  return (
    <div className="fs-consent">
      <div className="fs-check">
        <input id="acceptTerms" name="acceptTerms" required type="checkbox" />
        <label htmlFor="acceptTerms">
          <LegalCopyText parts={AGREE_TO_TERMS} />
        </label>
      </div>
      <div className="fs-check">
        <input id="confirmAge" name="confirmAge" required type="checkbox" />
        <label htmlFor="confirmAge">{CONFIRM_AGE}</label>
      </div>
      <input name="termsVersion" type="hidden" value={terms} />
      <input name="privacyVersion" type="hidden" value={privacy} />
    </div>
  )
}
