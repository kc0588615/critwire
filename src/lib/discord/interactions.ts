import { z } from 'zod'

/** Discord's interaction types (https://discord.com/developers/docs/interactions/receiving-and-responding). */
export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MODAL_SUBMIT: 5,
} as const

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  MODAL: 9,
} as const

export const ApplicationCommandType = {
  CHAT_INPUT: 1,
  MESSAGE: 3,
} as const

export const ApplicationCommandOptionType = {
  STRING: 3,
} as const

/** Commands work in servers only, for apps installed to a server. */
export const GUILD_CONTEXT = 0
export const GUILD_INSTALL = 0

export const MessageFlags = {
  EPHEMERAL: 1 << 6,
} as const

/** The permission bits the message command checks. */
export const Permissions = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_MESSAGES: 1n << 13n,
} as const

/** A Discord ID. */
export const snowflake = z.string().regex(/^\d{17,20}$/)

const pingSchema = z.object({
  application_id: snowflake,
  id: snowflake,
  type: z.literal(InteractionType.PING),
})

/** Every command and form submission comes from a member of a server, in one of its channels. */
const guildFields = {
  application_id: snowflake,
  channel_id: snowflake,
  guild_id: snowflake,
  id: snowflake,
  member: z.object({
    // The member's total permissions in this channel, overwrites included.
    permissions: z.string().regex(/^\d+$/),
    user: z.object({ id: snowflake, username: z.string().min(1).max(32) }),
  }),
}

/** What `/feedback` asks for, in the command's choices' values. */
export const FEEDBACK_KINDS = ['bug', 'idea'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

const feedbackCommandSchema = z.object({
  ...guildFields,
  data: z.object({
    name: z.literal('feedback'),
    options: z.tuple([
      z.object({ name: z.literal('type'), type: z.literal(ApplicationCommandOptionType.STRING), value: z.enum(FEEDBACK_KINDS) }),
    ]),
    type: z.literal(ApplicationCommandType.CHAT_INPUT),
  }),
  type: z.literal(InteractionType.APPLICATION_COMMAND),
})

/** The message command's name, as members see it under Apps. */
export const SEND_COMMAND_NAME = 'Send to critwire'

const discordUser = z.object({ id: snowflake, username: z.string().min(1).max(32) })

/** "Send to critwire" on a message, with the message Discord resolved for it. */
const sendCommandSchema = z
  .object({
    ...guildFields,
    data: z.object({
      name: z.literal(SEND_COMMAND_NAME),
      resolved: z.object({
        messages: z.record(z.string(), z.object({ author: discordUser, content: z.string(), id: snowflake })),
      }),
      target_id: snowflake,
      type: z.literal(ApplicationCommandType.MESSAGE),
    }),
    type: z.literal(InteractionType.APPLICATION_COMMAND),
  })
  .transform((interaction, ctx) => {
    const message = interaction.data.resolved.messages[interaction.data.target_id]
    if (message?.id !== interaction.data.target_id) {
      ctx.addIssue({ code: 'custom', message: 'The target message is missing.' })
      return z.NEVER
    }
    const { application_id, channel_id, guild_id, id, member, type } = interaction
    return { application_id, channel_id, command: 'send' as const, guild_id, id, member, message, type }
  })

/** A game's ID: Payload's integer primary key. */
const GAME_ID = String.raw`\d{1,10}`

/**
 * Form `custom_id`s, at most 100 characters. `<game>` is the game the form
 * was opened for, or `-` when the form has a Game select.
 * - `/feedback`: `cw1:fb:<kind>:<game>`.
 * - Send to critwire: `cw1:send:<game>:<message>:<author>:<username>`, at
 *   most 94 characters. The username goes last, so a `:` in a legacy name
 *   can't break parsing.
 */
const FEEDBACK_FORM_ID = new RegExp(`^cw1:fb:(bug|idea):(${GAME_ID}|-)$`)
const SEND_FORM_ID = new RegExp(`^cw1:send:(${GAME_ID}|-):(\\d{17,20}):(\\d{17,20}):(.{1,32})$`)

export type FormID =
  | { gameID: null | number; kind: FeedbackKind; type: 'feedback' }
  | { author: { id: string; username: string }; gameID: null | number; messageID: string; type: 'send' }

const formGameID = (game: string): null | number => (game === '-' ? null : Number(game))

export const feedbackFormID = (kind: FeedbackKind, gameID: null | number): string =>
  `cw1:fb:${kind}:${gameID ?? '-'}`

export const sendFormID = (
  gameID: null | number,
  messageID: string,
  author: { id: string; username: string },
): string => `cw1:send:${gameID ?? '-'}:${messageID}:${author.id}:${author.username}`

/** The form a `custom_id` names, or null when it isn't one of ours. */
export const parseFormID = (customID: string): FormID | null => {
  const feedback = FEEDBACK_FORM_ID.exec(customID)
  if (feedback) return { gameID: formGameID(feedback[2]), kind: feedback[1] as FeedbackKind, type: 'feedback' }
  const send = SEND_FORM_ID.exec(customID)
  if (send) {
    return {
      author: { id: send[3], username: send[4] },
      gameID: formGameID(send[1]),
      messageID: send[2],
      type: 'send',
    }
  }
  return null
}

/** The custom IDs of a form's fields. */
export const FormField = {
  DETAILS: 'details',
  GAME: 'game',
  PLATFORM: 'platform',
  TITLE: 'title',
  TYPE: 'type',
  VERSION: 'version',
} as const

const ComponentType = {
  ACTION_ROW: 1,
  LABEL: 18,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
} as const

const submittedComponentSchema = z.object({
  custom_id: z.string(),
  type: z.union([z.literal(ComponentType.TEXT_INPUT), z.literal(ComponentType.STRING_SELECT)]),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
})

/** A submitted form, in either layout: Labels (current) or Action Rows (older). */
const submittedLayoutSchema = z.array(
  z.union([
    z.object({ component: submittedComponentSchema, type: z.literal(ComponentType.LABEL) }),
    z.object({ components: z.array(submittedComponentSchema), type: z.literal(ComponentType.ACTION_ROW) }),
  ]),
)

/**
 * Each field's value by its `custom_id`: a text input's text, or a
 * select's one chosen value. Null when a select doesn't have exactly one
 * value, so a change in how Discord shapes submissions can't silently
 * drop a field.
 */
export const submittedValues = (
  layout: z.infer<typeof submittedLayoutSchema>,
): null | Record<string, string> => {
  const values: Record<string, string> = {}
  for (const entry of layout) {
    for (const component of 'component' in entry ? [entry.component] : entry.components) {
      if (component.type === ComponentType.STRING_SELECT) {
        if (component.values?.length !== 1) return null
        values[component.custom_id] = component.values[0]
      } else {
        values[component.custom_id] = component.value ?? ''
      }
    }
  }
  return values
}

const GAME_ID_VALUE = new RegExp(`^${GAME_ID}$`)

const formSubmitSchema = z
  .object({
    ...guildFields,
    data: z.object({ components: submittedLayoutSchema, custom_id: z.string() }),
    type: z.literal(InteractionType.MODAL_SUBMIT),
  })
  .transform((interaction, ctx) => {
    const form = parseFormID(interaction.data.custom_id)
    const values = submittedValues(interaction.data.components)
    // A picker form must carry its Game select, and a game is an ID.
    const picked = values?.[FormField.GAME]
    const gameID = form?.gameID ?? (picked && GAME_ID_VALUE.test(picked) ? Number(picked) : null)
    // An import's type is picked in the form.
    const kind = form?.type === 'feedback' ? form.kind : FEEDBACK_KINDS.find((k) => k === values?.[FormField.TYPE])
    if (!form || !values || gameID === null || !kind) {
      ctx.addIssue({ code: 'custom', message: 'Not one of our forms, or a field is missing.' })
      return z.NEVER
    }
    const { application_id, channel_id, guild_id, id, member, type } = interaction
    return { application_id, channel_id, form: { ...form, gameID, kind }, guild_id, id, member, type, values }
  })

const interactionSchema = z.union([pingSchema, feedbackCommandSchema, sendCommandSchema, formSubmitSchema])

export type Interaction = z.infer<typeof interactionSchema>
export type FeedbackCommand = z.infer<typeof feedbackCommandSchema>
export type SendCommand = z.infer<typeof sendCommandSchema>
export type FormSubmit = z.infer<typeof formSubmitSchema>

/**
 * The verified request body as an interaction for this application, or
 * `null` for anything else: not JSON, an unknown type or shape, or another
 * application's ID.
 */
export function parseInteraction(body: Buffer, applicationId: string): Interaction | null {
  let json: unknown
  try {
    json = JSON.parse(body.toString('utf8'))
  } catch {
    return null
  }
  const parsed = interactionSchema.safeParse(json)
  if (!parsed.success || parsed.data.application_id !== applicationId) return null
  return parsed.data
}
export const pong = () => ({ type: InteractionResponseType.PONG })

/** A reply only the player sees, which can never mention anyone. */
export const ephemeralMessage = (content: string) => ({
  data: { allowed_mentions: { parse: [] }, content, flags: MessageFlags.EPHEMERAL },
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
})

/** Discord's limits on a form. */
const CUSTOM_ID_MAX = 100
const FORM_TITLE_MAX = 45
const LABEL_DESCRIPTION_MAX = 100
const SELECT_OPTION_LABEL_MAX = 100
export const TEXT_INPUT_MAX = 4000

const TextInputStyle = { PARAGRAPH: 2, SHORT: 1 } as const

/** Cuts `text` to `max` characters, ending in an ellipsis when it was longer. */
export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`

export type TextFieldSpec = {
  custom_id: string
  /** Shown under the field's label, at most 100 characters. */
  description?: string
  kind: 'text'
  label: string
  max_length: number
  min_length?: number
  paragraph?: boolean
  required: boolean
  value?: string
}

type FormFieldSpec =
  | {
      custom_id: string
      kind: 'select'
      label: string
      options: { label: string; value: string }[]
    }
  | TextFieldSpec

/** A form (modal) of Labels, each holding a Text Input or a String Select. At most 5 fields. */
export const formResponse = ({
  customID,
  fields,
  title,
}: {
  customID: string
  fields: FormFieldSpec[]
  title: string
}) => {
  if (fields.length > 5) throw new Error(`A Discord form holds at most 5 fields (got ${fields.length}).`)
  if (customID.length > CUSTOM_ID_MAX) throw new Error(`A form's custom_id is too long: ${customID}`)
  for (const field of fields) {
    if (field.kind === 'text' && field.description && field.description.length > LABEL_DESCRIPTION_MAX) {
      throw new Error(`A field's description is too long: ${field.description}`)
    }
  }
  return {
    data: {
      components: fields.map((field) => ({
        component:
          field.kind === 'select'
            ? {
                custom_id: field.custom_id,
                max_values: 1,
                min_values: 1,
                options: field.options.map((option) => ({
                  label: truncate(option.label, SELECT_OPTION_LABEL_MAX),
                  value: option.value,
                })),
                required: true,
                type: ComponentType.STRING_SELECT,
              }
            : {
                custom_id: field.custom_id,
                max_length: field.max_length,
                min_length: field.min_length,
                required: field.required,
                style: field.paragraph ? TextInputStyle.PARAGRAPH : TextInputStyle.SHORT,
                type: ComponentType.TEXT_INPUT,
                value: field.value,
              },
        description: field.kind === 'text' ? field.description : undefined,
        label: field.label,
        type: ComponentType.LABEL,
      })),
      custom_id: customID,
      title: truncate(title, FORM_TITLE_MAX),
    },
    type: InteractionResponseType.MODAL,
  }
}

export type InteractionResponse = ReturnType<typeof ephemeralMessage> | ReturnType<typeof formResponse>

/** Escapes Discord's markdown, so a name renders as written. */
export const escapeMarkdown = (text: string): string => text.replace(/[\\*_~`|[\]()]/g, '\\$&')
