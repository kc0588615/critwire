import { Heading, Hr, Section, Text } from 'react-email'
import React from 'react'

import { EmailLayout } from './EmailLayout'
import { body, divider, heading, label, small, value } from './styles'

export type ContactFormEmailProps = {
  email?: string
  gameName: string
  message: string
  name?: string
  portalUrl: string
  subject?: string
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
    <EmailLayout preview={preview}>
      <Heading as="h1" style={heading}>
        New contact form submission
      </Heading>
      <Text style={{ ...body, margin: 0 }}>A player sent a message from the {gameName} portal.</Text>

      <Hr style={divider} />

      <Section>
        <Text style={label}>Name</Text>
        <Text style={value}>{senderName}</Text>
        <Text style={label}>Email</Text>
        <Text style={value}>{senderEmail}</Text>
        <Text style={label}>Subject</Text>
        <Text style={value}>{subject?.trim() || 'No subject'}</Text>
        <Text style={label}>Message</Text>
        <Text style={{ ...value, margin: 0, whiteSpace: 'pre-wrap' }}>{message}</Text>
      </Section>

      <Hr style={divider} />

      <Text style={{ ...small, margin: 0 }}>Sent via Critwire. Portal: {portalUrl}</Text>
    </EmailLayout>
  )
}
