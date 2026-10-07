import { Body, Container, Head, Html, Preview } from 'react-email'
import React from 'react'

import { card, page } from './styles'

/**
 * Every email's frame: the preview line, then one card on the page. The
 * viewport meta lets a phone lay the card out at its own width, not 980 px.
 */
export const EmailLayout: React.FC<{ children: React.ReactNode; preview: string }> = ({ children, preview }) => (
  <Html lang="en">
    <Head>
      <meta content="width=device-width, initial-scale=1" name="viewport" />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={page}>
      <Container style={card}>{children}</Container>
    </Body>
  </Html>
)
