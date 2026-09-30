import React from 'react'

import { Wordmark } from '@/components/marketing/Wordmark'
import { critwireFont } from '@/fonts'

/** The sign-in, forgot-password and reset views' logo: Critwire's wordmark, linking home. */
export default function Logo() {
  return (
    <span className={critwireFont.variable}>
      <Wordmark />
    </span>
  )
}
