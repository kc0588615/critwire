import { render } from 'react-email'
import type React from 'react'

/** Renders an email template to the HTML and plain-text bodies every message sends. */
export const renderEmail = async (
  element: React.ReactElement,
): Promise<{ html: string; text: string }> => {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])

  return { html, text }
}
