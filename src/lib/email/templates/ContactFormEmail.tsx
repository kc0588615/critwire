import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email'
import React from 'react'

export type ContactFormEmailProps = {
  email?: string
  gameName: string
  message: string
  name?: string
  portalUrl: string
  subject?: string
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

const label = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
}

const value = {
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 16px',
}

export const ContactFormEmail: React.FC<ContactFormEmailProps> = ({
  email,
  gameName,
  message,
  name,
  portalUrl,
  subject,
}) => {
  const senderName = name?.trim() || 'Anonymous player'
  const senderEmail = email?.trim() || 'Not provided'
  const preview = `${gameName} contact form: ${subject?.trim() || 'New player message'}`

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={{ fontSize: '22px', lineHeight: '30px', margin: '0 0 16px' }}>
            New contact form submission
          </Heading>
          <Text style={{ color: '#4b5563', fontSize: '15px', lineHeight: '22px' }}>
            A player sent a message from the {gameName} portal.
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Section>
            <Text style={label}>Name</Text>
            <Text style={value}>{senderName}</Text>
            <Text style={label}>Email</Text>
            <Text style={value}>{senderEmail}</Text>
            <Text style={label}>Subject</Text>
            <Text style={value}>{subject?.trim() || 'No subject'}</Text>
            <Text style={label}>Message</Text>
            <Text style={{ ...value, whiteSpace: 'pre-wrap' }}>{message}</Text>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ color: '#6b7280', fontSize: '13px', lineHeight: '20px' }}>
            Sent via Critwire. Portal: {portalUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
