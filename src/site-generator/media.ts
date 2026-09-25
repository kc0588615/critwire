import type { SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'

/** Every Payload media id referenced by a canonical flagship configuration. */
export const collectSiteMediaRefs = (config: SiteConfigV1): number[] => {
  const ids = new Set<number>()
  const add = (value: null | number): void => {
    if (typeof value === 'number') ids.add(value)
  }

  add(config.hero.backgroundMedia)
  add(config.trailer.poster)
  add(config.adaptive.media)
  add(config.community.background)
  add(config.finalCta.background)
  for (const item of config.features.items) add(item.media)
  for (const item of config.gallery.items) add(item.media)
  return [...ids]
}

export const assertAllowedMediaRefs = (
  config: SiteConfigV1,
  allowedMediaIDs: ReadonlySet<number>,
): void => {
  const invalid = collectSiteMediaRefs(config).filter((id) => !allowedMediaIDs.has(id))
  if (invalid.length > 0) {
    throw new Error(`Generated configuration referenced unavailable media ids: ${invalid.join(', ')}`)
  }
}
