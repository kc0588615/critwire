import { E2E_CONTACT_URL, SECOND_BASE_URL } from './support/env'
import { expect, test } from './support/fixtures'

/**
 * Critwire's own home page tells the feedback story. The hosted instance
 * (open signup, the first E2E server) offers "Create your portal"; a
 * self-hosted one (the second server) offers no signup at all. The
 * Contact link reads CRITWIRE_CONTACT_URL, which the E2E servers set.
 */

const GITHUB_REPO_URL = 'https://github.com/kc0588615/critwire'
const SIGNUP_NAME = /sign ?up|get started|create (an )?account|create your portal/i

test('S8.1 the home page tells the feedback story and links to signup, GitHub and Contact', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Player feedback and updates for the game site you already have.',
  )
  await expect(page.getByRole('heading', { name: 'Free to self-host (MIT). Free hosted early access.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'See a live portal' })).toHaveAttribute('href', '/g/critter-connect')

  const mainNav = page.getByRole('navigation', { name: 'Main' })
  await expect(mainNav.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', GITHUB_REPO_URL)
  await expect(page.getByRole('link', { exact: true, name: 'Contact' })).toHaveAttribute('href', E2E_CONTACT_URL)
  await expect(mainNav.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/admin')

  // "Create your portal" sits beside "Critwire on GitHub", and is the only signup link.
  const actions = page
    .getByRole('main')
    .locator('.cw-actions')
    .filter({ has: page.getByRole('link', { name: 'Critwire on GitHub' }) })
  await expect(actions.getByRole('link', { name: 'Critwire on GitHub' })).toHaveAttribute('href', GITHUB_REPO_URL)
  await expect(actions.getByRole('link', { name: 'Create your portal' })).toHaveAttribute('href', '/signup')
  await expect(page.getByRole('link', { name: SIGNUP_NAME })).toHaveCount(1)

  await actions.getByRole('link', { name: 'Create your portal' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Create your portal' })).toBeVisible()
})

test('S8.2 a self-hosted home page offers no signup', async ({ page }) => {
  const response = await page.goto(`${SECOND_BASE_URL}/`)
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('main').getByRole('link', { name: 'Critwire on GitHub' })).toHaveAttribute(
    'href',
    GITHUB_REPO_URL,
  )
  await expect(page.getByRole('link', { name: SIGNUP_NAME })).toHaveCount(0)
  await expect(page.getByRole('button', { name: SIGNUP_NAME })).toHaveCount(0)
})
