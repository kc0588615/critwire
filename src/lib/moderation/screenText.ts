import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from 'obscenity'

export type ScreenResult = { flagged: boolean; reasons: string[] } // reasons are shown to moderators as written

const MAX_WORD_REASONS = 5
const LINK_THRESHOLD = 3
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'rb.gy', 'cutt.ly']

const dataset = englishDataset.build()
const wordMatcher = new RegExpMatcher({
  ...dataset,
  ...englishRecommendedTransformers,
  // The only false positive game text is likely to use that the dataset doesn't whitelist.
  whitelistedTerms: [...(dataset.whitelistedTerms ?? []), 'cockpit'],
})

// One match per link: a scheme URL, a bare `www.` URL, or a bare shortener path.
// Each match consumes the whole URL, so `https://www.a.com/x` counts once. The
// lookbehind keeps `my-bit.ly/x` and `foo.bit.ly/x` from matching at `bit.ly`.
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const LINK_PATTERN = new RegExp(
  `https?://\\S+|(?<![\\w.-])www\\.\\S+|(?<![\\w.-])(?:${SHORTENERS.map(escapeRegExp).join('|')})/\\S*`,
  'gi',
)

const linkHost = (link: string) =>
  (link.replace(/^https?:\/\//i, '').match(/^[a-z0-9.-]*/i)?.[0] ?? '')
    .toLowerCase()
    .replace(/^www\./, '')

const wordReasons = (text: string): string[] => {
  const words = new Map<string, string>()
  for (const { endIndex, startIndex } of wordMatcher.getAllMatches(text, true)) {
    const word = text.slice(startIndex, endIndex + 1)
    const key = word.toLowerCase()
    if (!words.has(key)) words.set(key, `Offensive word: "${word}"`)
  }
  return [...words.values()].slice(0, MAX_WORD_REASONS)
}

const linkReasons = (text: string): string[] => {
  const links = text.match(LINK_PATTERN) ?? []
  const shorteners = new Set(links.map(linkHost).filter((host) => SHORTENERS.includes(host)))
  return [
    ...(links.length >= LINK_THRESHOLD ? [`${links.length} links`] : []),
    ...[...shorteners].map((host) => `Shortened link: ${host}`),
  ]
}

/**
 * Screens player-submitted text for offensive words and spam links.
 *
 * Contract: resolves with a verdict on all of `text`, or rejects. It never
 * resolves `flagged: false` for text it didn't screen, so callers don't catch:
 * a rejection fails the write. A hosted provider replacing this body keeps the
 * contract: on an outage it rejects or resolves `flagged: true` with the reason
 * "Screening unavailable", never clean.
 */
export const screenText = async (text: string): Promise<ScreenResult> => {
  const reasons = [...wordReasons(text), ...linkReasons(text)]
  return { flagged: reasons.length > 0, reasons }
}
