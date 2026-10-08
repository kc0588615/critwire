import type { ContactFormEmailProps } from '../../src/lib/email/templates/ContactFormEmail'
import { renderContactFormEmail } from '../../src/lib/email/renderContactFormEmail'

/**
 * Prints the HTML of a contact-form email, rendered by the app's own
 * template from the props given as JSON on stdin. The setup runs it with
 * tsx: the E2E servers have no Resend, so the contact job never reaches
 * the outbox, and Playwright's JSX transform can't render React itself.
 */
async function main(): Promise<void> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  const props = JSON.parse(Buffer.concat(chunks).toString('utf8')) as ContactFormEmailProps
  const { html } = await renderContactFormEmail(props)
  process.stdout.write(html)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
