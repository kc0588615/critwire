import * as Sentry from '@sentry/nextjs'
import config from '@payload-config'
import { getPayload, ValidationError } from 'payload'

import {
  ephemeralMessage,
  escapeMarkdown,
  type FeedbackCommand,
  type FeedbackKind,
  feedbackFormID,
  FormField,
  formResponse,
  type FormSubmit,
  type InteractionResponse,
  Permissions,
  type SendCommand,
  sendFormID,
  TEXT_INPUT_MAX,
  truncate,
} from '@/lib/discord/interactions'
import { type GuildGame, guildGames } from '@/lib/discord/link'
import { portalPaths } from '@/lib/game-portal/paths'
import { createPlayerReport, type FeedbackType, reportFieldsSchema } from '@/lib/game-portal/reports'
import { getLogger } from '@/lib/logger'
import { withRef } from '@/lib/share/kit'
import { checkRateLimit, RateLimitUnavailableError } from '@/lib/upstash/rate-limit'
import { absoluteURL } from '@/utilities/getURL'

const log = getLogger('discord.feedback')

/**
 * `/feedback`, "Send to critwire" and the forms they open
 * (plans/2026-10-02-discord.md §6). Every report takes the web form's path,
 * `createPlayerReport`, so the content filter and the game's review setting
 * apply. Discord's identity goes into the report's private fields only.
 */

const KINDS: Record<
  FeedbackKind,
  { aNoun: string; details: string; formTitle: string; noun: string; plural: string; type: FeedbackType }
> = {
  bug: { aNoun: 'a bug report', details: 'What happened', formTitle: 'Report a bug', noun: 'bug report', plural: 'bugs', type: 'BUG' },
  idea: { aNoun: 'an idea', details: 'Your idea', formTitle: 'Share an idea', noun: 'idea', plural: 'ideas', type: 'IDEA' },
}

/** Per Discord user and game: 5 reports per 10 minutes. */
const REPORT_LIMIT = { key: 'discord-report', limit: 5, timeoutMs: 1000, windowSeconds: 600 }
/** Per moderator and game: 30 imports per 10 minutes, since moderators triage in batches. */
const IMPORT_LIMIT = { key: 'discord-import', limit: 30, timeoutMs: 1000, windowSeconds: 600 }

/** The title an import starts with: the message's first line. */
const TITLE_MAX = 160

const FIELD_NAMES: Record<string, string> = {
  description: 'The details',
  gameVersion: 'The game version',
  platform: 'The platform',
  title: 'The title',
}

const boardURL = (game: GuildGame): string =>
  withRef(absoluteURL(portalPaths(game.slug).board), 'discord')

const gamePicker = (games: GuildGame[]) => ({
  custom_id: FormField.GAME,
  kind: 'select' as const,
  label: 'Game',
  options: games.map((game) => ({ label: game.name, value: String(game.id) })),
})

/** `/feedback type:<bug|idea>`: the form for the server's games, or why there's none. */
export const handleFeedbackCommand = async (
  interaction: FeedbackCommand,
): Promise<InteractionResponse> => {
  const kind = interaction.data.options[0].value
  const { details, formTitle, plural, type } = KINDS[kind]
  const games = await guildGames(interaction.guild_id, type)
  // Held, suspended and unlinked games get the same answer, so nothing leaks.
  if (games.length === 0) {
    return ephemeralMessage(`This server isn’t linked to a game on critwire that takes ${plural} here.`)
  }

  const single = games.length === 1 ? games[0] : null
  return formResponse({
    customID: feedbackFormID(kind, single?.id ?? null),
    fields: [
      ...(single ? [] : [gamePicker(games)]),
      { custom_id: FormField.TITLE, kind: 'text', label: 'Title', max_length: 160, min_length: 3, required: true },
      {
        custom_id: FormField.DETAILS,
        kind: 'text',
        label: details,
        max_length: TEXT_INPUT_MAX,
        min_length: 10,
        paragraph: true,
        required: true,
      },
      // Platform and version only describe bugs.
      ...(kind === 'bug'
        ? [
            { custom_id: FormField.PLATFORM, kind: 'text' as const, label: 'Platform', max_length: 120, required: false },
            { custom_id: FormField.VERSION, kind: 'text' as const, label: 'Game version', max_length: 120, required: false },
          ]
        : []),
    ],
    title: single ? `${formTitle}: ${single.name}` : formTitle,
  })
}

/**
 * Manage Messages or Administrator, in this channel. Checked on every
 * command and submission: `default_member_permissions` only sets the
 * default, and a server admin can grant the command to anyone.
 */
const canSend = (permissions: string): boolean =>
  (BigInt(permissions) & (Permissions.MANAGE_MESSAGES | Permissions.ADMINISTRATOR)) !== 0n

const NOT_A_MODERATOR = 'Only members who can manage messages can send messages to critwire.'

/**
 * "Send to critwire" on a message: a form, prefilled from the message, for
 * the server's games. The report is credited to the message's author.
 */
export const handleSendCommand = async (interaction: SendCommand): Promise<InteractionResponse> => {
  if (!canSend(interaction.member.permissions)) return ephemeralMessage(NOT_A_MODERATOR)
  const { author, content, id: messageID } = interaction.message
  const text = content.trim()
  if (!text) return ephemeralMessage('That message has no text to send.')

  // Every native game takes bugs; the type is picked in the form and checked on submit.
  const games = await guildGames(interaction.guild_id, 'BUG')
  if (games.length === 0) return ephemeralMessage('This server isn’t linked to a game on critwire.')

  const single = games.length === 1 ? games[0] : null
  return formResponse({
    customID: sendFormID(single?.id ?? null, messageID, author),
    // No minimum lengths: Discord could refuse a form whose prefilled text is
    // shorter. The submission is checked like any other.
    fields: [
      ...(single ? [] : [gamePicker(games)]),
      {
        custom_id: FormField.TYPE,
        kind: 'select',
        label: 'Type',
        options: [
          { label: 'Bug', value: 'bug' },
          { label: 'Idea', value: 'idea' },
        ],
      },
      {
        custom_id: FormField.TITLE,
        kind: 'text',
        label: 'Title',
        max_length: TITLE_MAX,
        required: true,
        value: truncate(text.split('\n')[0].trim(), TITLE_MAX),
      },
      {
        custom_id: FormField.DETAILS,
        kind: 'text',
        label: 'Details',
        max_length: TEXT_INPUT_MAX,
        paragraph: true,
        required: true,
        value: truncate(text, TEXT_INPUT_MAX),
      },
    ],
    title: single ? `Send to critwire: ${single.name}` : 'Send to critwire',
  })
}

/** Whether a report with this interaction ID exists: the unique index refused a replay. */
const alreadySent = async (interactionId: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'issue-reports',
    overrideAccess: true,
    where: { 'discord.interactionId': { equals: interactionId } },
  })
  return totalDocs > 0
}

/**
 * A submitted form, answered after the report is saved. The form stays
 * bound to the game it was opened for (or the one picked in it): that game
 * must still be linked to this server, public, and taking this type.
 * Another game is never substituted. An import also needs the moderator to
 * still hold Manage Messages.
 */
export const handleFormSubmit = async (interaction: FormSubmit): Promise<InteractionResponse> => {
  const { channel_id, form, guild_id, member, values } = interaction
  const isImport = form.type === 'send'
  if (isImport && !canSend(member.permissions)) return ephemeralMessage(NOT_A_MODERATOR)
  const { aNoun, noun, plural, type } = KINDS[form.kind]

  const game = (await guildGames(guild_id, type)).find((candidate) => candidate.id === form.gameID)
  if (!game) {
    return ephemeralMessage(
      `That game doesn’t take ${plural} from this server now. Run the command again.`,
    )
  }
  const gameName = escapeMarkdown(game.name)

  const fields = reportFieldsSchema.safeParse({
    description: values[FormField.DETAILS],
    gameVersion: values[FormField.VERSION],
    platform: values[FormField.PLATFORM],
    title: values[FormField.TITLE],
    type,
  })
  if (!fields.success) {
    const field = FIELD_NAMES[String(fields.error.issues[0]?.path[0])] ?? 'A field'
    return ephemeralMessage(`${field} is too short or too long, so nothing was sent.`)
  }

  try {
    const { success } = await checkRateLimit({
      ...(isImport ? IMPORT_LIMIT : REPORT_LIMIT),
      identifier: `${member.user.id}:${game.id}`,
    })
    if (!success) {
      return ephemeralMessage(
        `You’ve sent several reports for **${gameName}** in the last few minutes. Try again later.`,
      )
    }
  } catch (err) {
    if (!(err instanceof RateLimitUnavailableError)) throw err
    Sentry.captureException(err)
    log.error({ err, gameID: game.id, msg: 'Discord report refused: Upstash is not configured.' })
    return ephemeralMessage('Discord feedback isn’t available right now. Try again later.')
  }

  // An import is credited to the message's author, with a link to the message.
  const sender = isImport
    ? {
        messageUrl: `https://discord.com/channels/${guild_id}/${channel_id}/${form.messageID}`,
        userId: form.author.id,
        username: form.author.username,
      }
    : { userId: member.user.id, username: member.user.username }

  let published: boolean
  try {
    const report = await createPlayerReport({
      discord: { interactionId: interaction.id, ...sender },
      fields: { ...fields.data, category: 'OTHER' },
      project: game,
    })
    // The report's hooks screened it and published it when review is off.
    published = report.status === 'PUBLISHED'
    log.info({ gameID: game.id, guildID: guild_id, imported: isImport, msg: 'Discord report created.', published, reportID: report.id })
  } catch (err) {
    // A replay: the unique interaction ID refused the insert. As /api/vote does.
    if (!(err instanceof ValidationError) || !(await alreadySent(interaction.id))) throw err
    return ephemeralMessage('That was already sent.')
  }

  if (isImport) {
    return ephemeralMessage(
      `Sent to critwire as ${aNoun} for **${gameName}**, credited to @${escapeMarkdown(sender.username)}.`,
    )
  }
  const next = published
    ? 'It’s on the board now.'
    : 'The studio reviews reports before they go on the board.'
  return ephemeralMessage(
    `Thanks, your ${noun} for **${gameName}** is in. ${next}\n<${boardURL(game)}>`,
  )
}
