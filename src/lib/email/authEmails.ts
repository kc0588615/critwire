import { SITE } from '@/lib/site'
import { getServerSideURL } from '@/utilities/getURL'

import { renderAuthLinkEmail } from './renderAuthLinkEmail'

type AuthEmail = { html: string; subject: string }

// Links come only from the configured server URL, never from the
// request's host, so a forged Host header can't redirect a token.
const link = (path: string): string => `${getServerSideURL()}${path}`

const authEmail = async (
  subject: string,
  props: Parameters<typeof renderAuthLinkEmail>[0],
): Promise<AuthEmail> => ({ html: (await renderAuthLinkEmail(props)).html, subject })

export const verificationEmail = (token: string): Promise<AuthEmail> =>
  authEmail('Confirm your email and choose a password', {
    buttonLabel: 'Confirm and choose a password',
    heading: 'Confirm your email',
    sentence:
      `Open this link to confirm your email address and choose the password for your ${SITE.name} account.`,
    url: link(`/verify/${encodeURIComponent(token)}`),
  })

export const accountCreatedEmail = (): Promise<AuthEmail> =>
  authEmail('An account was created for you', {
    buttonLabel: 'Sign in',
    heading: `Your ${SITE.name} account is ready`,
    sentence: `An administrator of the ${SITE.name} site created an account for this email address.`,
    url: link('/admin/login'),
  })

export const passwordResetEmail = (token: string): Promise<AuthEmail> =>
  authEmail(`Reset your ${SITE.name} password`, {
    buttonLabel: 'Choose a new password',
    heading: 'Reset your password',
    sentence:
      'Someone asked to reset the password for this email address. If it was you, open this link to choose a new one; otherwise ignore this email.',
    url: link(`/admin/reset/${encodeURIComponent(token)}`),
  })
