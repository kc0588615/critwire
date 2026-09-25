import type { Media } from '@/payload-types'

/**
 * Converts Payload-stored site data into canonical schema input:
 * upload relations become media ids (whatever the fetch depth), array
 * row `id`s are dropped, and only known keys are copied — so Payload
 * internals never trip the strict schemas. Collected media documents
 * (when the source was populated at depth ≥ 1) are returned alongside
 * for the renderer.
 */

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null

export type NormalizedSite = {
  input: UnknownRecord
  /** Media documents discovered while normalizing (depth ≥ 1 fetches). */
  media: Map<number, Media>
}

export const normalizeSiteInput = (source: {
  schemaVersion?: unknown
  site?: unknown
  template?: unknown
}): NormalizedSite => {
  const media = new Map<number, Media>()

  const mediaId = (value: unknown): null | number => {
    if (typeof value === 'number') return value
    const record = asRecord(value)
    if (record && typeof record.id === 'number') {
      media.set(record.id, record as unknown as Media)
      return record.id
    }
    return null
  }

  const text = (value: unknown): null | string => (typeof value === 'string' ? value : null)
  const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback

  const action = (value: unknown): null | UnknownRecord => {
    const record = asRecord(value)
    if (!record || typeof record.ref !== 'string' || record.ref === '') return null
    return { ref: record.ref, label: text(record.label) }
  }

  const actionList = (value: unknown): UnknownRecord[] =>
    Array.isArray(value) ? value.map(action).filter((row): row is UnknownRecord => row !== null) : []

  const rows = (value: unknown, map: (row: UnknownRecord) => UnknownRecord): UnknownRecord[] =>
    Array.isArray(value)
      ? value.flatMap((row) => {
          const record = asRecord(row)
          return record ? [map(record)] : []
        })
      : []

  const site = asRecord(source.site) ?? {}
  const nav = asRecord(site.nav) ?? {}
  const theme = asRecord(site.theme) ?? {}
  const colors = asRecord(theme.colors) ?? {}
  const hero = asRecord(site.hero) ?? {}
  const availability = asRecord(site.availability) ?? {}
  const features = asRecord(site.features) ?? {}
  const trailer = asRecord(site.trailer) ?? {}
  const gallery = asRecord(site.gallery) ?? {}
  const adaptive = asRecord(site.adaptive) ?? {}
  const latestUpdate = asRecord(site.latestUpdate) ?? {}
  const knownIssues = asRecord(site.knownIssues) ?? {}
  const community = asRecord(site.community) ?? {}
  const finalCTA = asRecord(site.finalCta) ?? {}
  const footer = asRecord(site.footer) ?? {}

  const themeColorKeys = [
    'background',
    'foreground',
    'mutedForeground',
    'surface',
    'accent',
    'accentForeground',
    'border',
    'success',
    'warning',
    'error',
  ] as const
  const colorInput: UnknownRecord = {}
  let hasColors = false
  for (const key of themeColorKeys) {
    const value = text(colors[key])
    if (value) {
      colorInput[key] = value
      hasColors = true
    }
  }

  const input: UnknownRecord = {
    schemaVersion: source.schemaVersion,
    template: typeof source.template === 'string' ? source.template : undefined,
    nav: {
      links: Array.isArray(nav.links) && nav.links.length > 0 ? actionList(nav.links) : undefined,
      cta: action(nav.cta),
    },
    theme: {
      // Partially-filled colors would fail as a group; treat as unset.
      colors: hasColors && Object.keys(colorInput).length === themeColorKeys.length
        ? colorInput
        : undefined,
      typography: text(theme.typography) ?? undefined,
      shape: text(theme.shape) ?? undefined,
      density: text(theme.density) ?? undefined,
      motion: text(theme.motion) ?? undefined,
    },
    hero: {
      variant: text(hero.variant) ?? undefined,
      eyebrow: text(hero.eyebrow),
      heading: text(hero.heading),
      tagline: text(hero.tagline),
      showLogo: bool(hero.showLogo, true),
      backgroundMedia: mediaId(hero.backgroundMedia),
      primaryAction: action(hero.primaryAction),
      secondaryAction: action(hero.secondaryAction),
    },
    availability: {
      enabled: bool(availability.enabled, true),
      heading: text(availability.heading),
      note: text(availability.note),
    },
    features: {
      variant: text(features.variant) ?? undefined,
      heading: text(features.heading),
      intro: text(features.intro),
      items: rows(features.items, (row) => ({
        title: text(row.title) ?? '',
        body: text(row.body) ?? '',
        media: mediaId(row.media),
      })),
    },
    trailer: {
      enabled: bool(trailer.enabled, true),
      heading: text(trailer.heading),
      poster: mediaId(trailer.poster),
    },
    gallery: {
      variant: text(gallery.variant) ?? undefined,
      heading: text(gallery.heading),
      items: rows(gallery.items, (row) => ({
        media: mediaId(row.media),
        alt: text(row.alt) ?? '',
        caption: text(row.caption),
      })),
    },
    adaptive: {
      kind: text(adaptive.kind) ?? undefined,
      heading: text(adaptive.heading),
      body: text(adaptive.body),
      media: mediaId(adaptive.media),
      items: rows(adaptive.items, (row) => ({
        title: text(row.title) ?? '',
        body: text(row.body) ?? '',
      })),
    },
    latestUpdate: {
      enabled: bool(latestUpdate.enabled, true),
      heading: text(latestUpdate.heading),
    },
    knownIssues: {
      enabled: bool(knownIssues.enabled, true),
      variant: text(knownIssues.variant) ?? undefined,
      heading: text(knownIssues.heading),
    },
    community: {
      enabled: bool(community.enabled, true),
      variant: text(community.variant) ?? undefined,
      heading: text(community.heading),
      body: text(community.body),
      background: mediaId(community.background),
      actions: actionList(community.actions),
    },
    finalCta: {
      enabled: bool(finalCTA.enabled, true),
      heading: text(finalCTA.heading),
      subheading: text(finalCTA.subheading),
      background: mediaId(finalCTA.background),
      primaryAction: action(finalCTA.primaryAction),
      secondaryAction: action(finalCTA.secondaryAction),
    },
    footer: {
      tagline: text(footer.tagline),
      showLegalLinks: bool(footer.showLegalLinks, true),
    },
  }

  return { input, media }
}
