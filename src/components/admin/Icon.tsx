import React from 'react'

import { Wordmark } from '@/components/marketing/Wordmark'

/** The breadcrumb's first step, the small wordmark; Payload already wraps it in a link to the dashboard. */
export default function Icon() {
  return <Wordmark linked={false} size="m" />
}
