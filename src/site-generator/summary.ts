import type { SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'

const SECTION_LABELS: Record<keyof SiteConfigV1, string> = {
  adaptive: 'adaptive section',
  availability: 'availability section',
  community: 'community call-to-action',
  features: 'feature showcase',
  finalCta: 'final call-to-action',
  footer: 'footer',
  gallery: 'gallery',
  hero: 'hero',
  knownIssues: 'known-issues section',
  latestUpdate: 'latest-update section',
  nav: 'navigation',
  schemaVersion: 'schema version',
  template: 'template',
  theme: 'theme',
  trailer: 'trailer section',
}

export const summarizeSiteChanges = (
  previous: SiteConfigV1,
  next: SiteConfigV1,
): string[] => {
  const changed = (Object.keys(SECTION_LABELS) as Array<keyof SiteConfigV1>).filter(
    (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]),
  )
  if (changed.length === 0) return ['No configuration changes were needed.']
  return changed.map((key) => `Updated ${SECTION_LABELS[key]}.`).slice(0, 10)
}
