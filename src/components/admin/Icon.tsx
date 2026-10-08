import React from 'react'

import { SITE } from '@/lib/site'

/** The breadcrumb's first step, the site's favicon; Payload already wraps it in a link to the dashboard. */
export default function Icon() {
  // The favicon as served, at Payload's icon size: nothing for next/image to optimise.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={SITE.name} className="cw-admin-icon" height={18} src="/favicon.svg" width={18} />
}
