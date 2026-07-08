import { Banner } from '@payloadcms/ui/elements/Banner'
import Link from 'next/link'
import React from 'react'

import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Launch checklist</h4>
      </Banner>
      <div className={`${baseClass}__grid`}>
        <section>
          <h5>1. Set up the workspace</h5>
          <p>Create a tenant for the studio, then add owner/member access for the team.</p>
          <Link href="/admin/collections/tenants">Open Tenants</Link>
        </section>
        <section>
          <h5>2. Create the game portal</h5>
          <p>Add the game project, external links, branding, and contact routing target.</p>
          <Link href="/admin/collections/game-projects">Open Game Projects</Link>
        </section>
        <section>
          <h5>3. Publish public content</h5>
          <p>Publish a landing page, patch notes, and public known issues when ready.</p>
          <Link href="/admin/collections/game-pages">Open Game Pages</Link>
        </section>
        <section>
          <h5>4. Triage player reports</h5>
          <p>Review incoming reports, publish them as public issues, link them, or dismiss them.</p>
          <Link href="/admin/collections/issue-reports">Open Issue Reports</Link>
        </section>
      </div>
    </div>
  )
}

export default BeforeDashboard
