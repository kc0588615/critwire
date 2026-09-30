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
          <p>Add the game project with its pitch, key art, store links and contact routing.</p>
          <Link href="/admin/collections/game-projects">Open Game Projects</Link>
        </section>
        <section>
          <h5>3. Theme and links</h5>
          <p>Match the portal to your own site&apos;s colours and type, and link back to your website.</p>
          <Link href="/admin/collections/game-projects">Open Game Projects</Link>
        </section>
        <section>
          <h5>4. Review submissions</h5>
          <p>Publish player bug reports and ideas to the feedback board, link duplicates, or dismiss them.</p>
          <Link href="/admin/collections/issue-reports">Open Submissions</Link>
        </section>
      </div>
    </div>
  )
}

export default BeforeDashboard
