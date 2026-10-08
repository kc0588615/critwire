import type { GameProject } from '@/payload-types'

import { getGameProject } from '@/lib/game-portal/getGameProject'
import { countPublicIssuesByStage } from '@/lib/game-portal/issues'
import { getLatestVersionLabel } from '@/lib/game-portal/patchNotes'
import { resolveProjectTheme } from '@/lib/game-portal/projectTheme'
import { SHAPE_RADIUS, type SiteThemeV1 } from '@/lib/game-portal/theme'
import { TOKENS } from '@/lib/theme/tokens'

import type { ImageFormat } from './buttons'
import { type BadgeModel, type ImageBody, badgeSVG, constantImage, encodeImage, imageResponse } from './images'

/**
 * The live badge at /g/<game>/badge.svg and badge.png: the game's public
 * stage counts and latest version, in its theme. Nothing is cached on the
 * server; the HTTP cache bounds staleness to 5 minutes, so a hold, a
 * suspension or an edit reaches every viewer within that.
 */

const BADGE_LABEL = 'feedback'
const FIVE_MINUTES_SECONDS = 300
const ONE_DAY_SECONDS = 86_400

/** The badge is a control-sized chip, so it takes the shape's control radius. */
const badgeRadius = (shape: SiteThemeV1['shape']): number => TOKENS.radius[SHAPE_RADIUS[shape].control]

/**
 * What a held game, a suspended studio's game and an unknown slug all
 * show, byte for byte, so a host page never shows a broken image and the
 * badge never reveals whether the game exists.
 */
const NEUTRAL_BADGE: BadgeModel = {
  label: BADGE_LABEL,
  value: 'unavailable',
  // The theme's light mode.
  colors: {
    label: TOKENS.light.neutral[8],
    labelText: TOKENS.light.neutral[1],
    value: TOKENS.light.neutral[3],
    valueText: TOKENS.light.neutral[10],
    border: TOKENS.light.neutral[4],
  },
  radius: badgeRadius('balanced'),
}

const neutralBadgeImage = (format: ImageFormat): Promise<ImageBody> =>
  constantImage(`badge:neutral.${format}`, () => encodeImage(badgeSVG(NEUTRAL_BADGE), format))

/** E.g. `12 under review · 3 planned · v1.4`: public stage names only, never internal statuses. */
const badgeValue = (counts: Awaited<ReturnType<typeof countPublicIssuesByStage>>, version: null | string): string => {
  const stages = counts
    .filter(({ count }) => count > 0)
    .map(({ stage, count }) => `${count} ${stage.label.toLowerCase()}`)
  const parts = stages.length > 0 ? stages : ['no feedback yet']
  return [...parts, ...(version ? [version] : [])].join(' · ')
}

const gameBadgeModel = async (project: GameProject): Promise<BadgeModel> => {
  const [counts, version] = await Promise.all([
    countPublicIssuesByStage(project.id),
    getLatestVersionLabel(project.id),
  ])
  const { colors, shape } = resolveProjectTheme(project)
  return {
    label: BADGE_LABEL,
    value: badgeValue(counts, version),
    // The theme schema guarantees 4.5:1 for both text pairs.
    colors: {
      label: colors.accent,
      labelText: colors.accentForeground,
      value: colors.surface,
      valueText: colors.foreground,
      border: colors.border,
    },
    radius: badgeRadius(shape),
  }
}

/** The badge for `slug` in `format`, or the neutral badge when the game isn't public. */
const gameBadgeImage = async (slug: string, format: ImageFormat): Promise<ImageBody> => {
  const project = await getGameProject(slug)
  if (!project) return neutralBadgeImage(format)
  return encodeImage(badgeSVG(await gameBadgeModel(project)), format)
}

/**
 * The badge response. Any query string (a `?v=2` cache-buster, or a
 * flood of random ones) gets a 308 to the bare URL before any read, so
 * each game and format has one cache key at Cloudflare.
 */
export const badgeResponse = async (req: Request, slug: string, format: ImageFormat): Promise<Response> => {
  const url = new URL(req.url)
  if (url.search) {
    return new Response(null, {
      status: 308,
      headers: { 'Cache-Control': `public, max-age=${ONE_DAY_SECONDS}`, Location: url.pathname },
    })
  }
  return imageResponse(await gameBadgeImage(slug, format), format, FIVE_MINUTES_SECONDS)
}
