import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'react-email'
import React from 'react'

export type AuthLinkEmailProps = {
  buttonLabel: string
  heading: string
  sentence: string
  url: string
}

const main = {
  backgroundColor: '#f6f7fb',
  color: '#111827',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '32px auto',
  padding: '28px',
  width: '560px',
}

const button = {
  backgroundColor: '#111827',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 20px',
  textDecoration: 'none',
}

const small = { color: '#6b7280', fontSize: '13px', lineHeight: '20px' }

/** One account email: a heading, one sentence, a button and the same link in plain text. */
export const AuthLinkEmail: React.FC<AuthLinkEmailProps> = ({
  buttonLabel,
  heading,
  sentence,
  url,
}) => (
  <Html lang="en">
    <Head />
    <Preview>{sentence}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading as="h1" style={{ fontSize: '22px', lineHeight: '30px', margin: '0 0 16px' }}>
          {heading}
        </Heading>
        <Text style={{ color: '#4b5563', fontSize: '15px', lineHeight: '22px' }}>{sentence}</Text>
        <Button href={url} style={button}>
          {buttonLabel}
        </Button>
        <Text style={{ ...small, marginTop: '24px' }}>
          Or open this link: <Link href={url}>{url}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)
