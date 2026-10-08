/**
 * The site this instance is: critwire.com is Critter Connect's feedback
 * and updates site. `/` redirects to this game's hub, and critwire's own
 * pages carry its name, lockup and operator. A self-hosted copy changes
 * this one module, and `gameSlug` must name a game that exists
 * (`docs/self-hosting.md`). Pure data: `redirects.ts` and boot code import it.
 */
export const SITE = {
  name: 'Critter Connect',
  gameSlug: 'critter-connect',
  operator: 'Haunted Pavement LLC',
  /** The lockup for each colour scheme: dark text on light, light text on dark. */
  logo: { light: '/brand/critterconnect-logo-light.svg', dark: '/brand/critterconnect-logo.svg' },
  appIcon: '/brand/app-icon-512.png',
} as const
