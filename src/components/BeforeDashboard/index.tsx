import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to Critwire</h4>
      </Banner>
      <ul className={`${baseClass}__instructions`}>
        <li>Create a tenant (studio workspace) under Tenants.</li>
        <li>Assign users to the tenant with owner or member roles.</li>
        <li>Use the tenant selector in the top bar to switch between studios.</li>
      </ul>
    </div>
  )
}

export default BeforeDashboard
