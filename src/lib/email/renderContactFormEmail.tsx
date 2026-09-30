import React from 'react'

import type { ContactFormEmailProps } from './templates/ContactFormEmail'

import { renderEmail } from './render'
import { ContactFormEmail } from './templates/ContactFormEmail'

export const renderContactFormEmail = (
  props: ContactFormEmailProps,
): Promise<{ html: string; text: string }> => renderEmail(<ContactFormEmail {...props} />)
