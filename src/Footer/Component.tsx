import React from 'react'

import { LegalLinks } from '@/components/legal/LegalLinks'
import { BrandLogo } from '@/components/site/BrandLogo'
import { SITE } from '@/lib/site'

/** Critwire's own pages: the lockup, the three documents and the operator (D28). */
export function Footer() {
  return (
    <footer className="cw-footer">
      <div className="cw-shell cw-footer-bar">
        <BrandLogo />
        <LegalLinks className="cw-footer-links" label="Legal" linkClassName="fs-tap fs-link" />
        <p className="cw-footer-copy">
          © {new Date().getFullYear()} {SITE.operator}
        </p>
      </div>
    </footer>
  )
}
