import { render } from 'react-email'
import React from 'react'

import type { ContactFormEmailProps } from './templates/ContactFormEmail'

import { ContactFormEmail } from './templates/ContactFormEmail'

export const renderContactFormEmail = async (
  props: ContactFormEmailProps,
): Promise<{ html: string; text: string }> => {
  const template = <ContactFormEmail {...props} />

  const [html, text] = await Promise.all([
    render(template),
    render(template, { plainText: true }),
  ])

  return { html, text }
}
