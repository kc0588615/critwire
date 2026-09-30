import React from 'react'

import { Wordmark } from '@/components/marketing/Wordmark'
import { critwireFont } from '@/fonts'

/** The breadcrumb's first step, which Payload already wraps in a link to the dashboard. */
export default function Icon() {
  return (
    <span className={critwireFont.variable}>
      <Wordmark linked={false} />
    </span>
  )
}
