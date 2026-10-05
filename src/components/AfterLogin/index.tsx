import React from 'react'

import { LegalLinks } from '@/components/legal/LegalLinks'

/** Below the sign-in form: the legal documents, as every site footer links them. */
const AfterLogin: React.FC = () => (
  <LegalLinks className="after-login-legal" label="Legal" />
)

export default AfterLogin
