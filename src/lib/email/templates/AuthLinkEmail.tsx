import { Button, Heading, Link, Text } from 'react-email'
import React from 'react'

import { EmailLayout } from './EmailLayout'
import { body, button, heading as headingStyle, link, small } from './styles'

export type AuthLinkEmailProps = {
  buttonLabel: string
  heading: string
  sentence: string
  url: string
}

/** One account email: a heading, one sentence, a button and the same link in plain text. */
export const AuthLinkEmail: React.FC<AuthLinkEmailProps> = ({
  buttonLabel,
  heading,
  sentence,
  url,
}) => (
  <EmailLayout preview={sentence}>
    <Heading as="h1" style={headingStyle}>
      {heading}
    </Heading>
    <Text style={body}>{sentence}</Text>
    <Button href={url} style={button}>
      {buttonLabel}
    </Button>
    <Text style={small}>
      Or open this link:{' '}
      <Link href={url} style={link}>
        {url}
      </Link>
    </Text>
  </EmailLayout>
)
