import { siteThemeSchema, type SiteThemeV1 } from '../../src/lib/game-portal/theme'

/** A light theme with a strong accent, to prove the portal holds up under any valid theme (plan §3). */
export const RISO_THEME: SiteThemeV1 = siteThemeSchema.parse({
  colors: {
    background: '#eef4d2',
    surface: '#fbfdf2',
    foreground: '#1c1a3a',
    mutedForeground: '#4f4e6e',
    accent: '#2446e8',
    accentForeground: '#ffffff',
    border: '#c8d49a',
    success: '#1f7a45',
    warning: '#9a5a00',
    error: '#b8302a',
  },
  typography: 'editorial',
  shape: 'sharp',
  density: 'compact',
  motion: 'subtle',
})
