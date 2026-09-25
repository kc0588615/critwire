import type { GamePage } from '@/payload-types'
import type { SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'

/** Converts canonical nullable action groups to Payload's optional group representation. */
export const siteConfigToPayloadSite = (config: SiteConfigV1): GamePage['site'] => {
  const { schemaVersion: _schemaVersion, template: _template, ...site } = config
  return {
    ...site,
    finalCta: {
      ...site.finalCta,
      primaryAction: site.finalCta.primaryAction ?? undefined,
      secondaryAction: site.finalCta.secondaryAction ?? undefined,
    },
    hero: {
      ...site.hero,
      primaryAction: site.hero.primaryAction ?? undefined,
      secondaryAction: site.hero.secondaryAction ?? undefined,
    },
    nav: {
      ...site.nav,
      cta: site.nav.cta ?? undefined,
    },
  }
}
