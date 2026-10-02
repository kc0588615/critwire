/*
 * The Discord tab's state, shared by the server views that build it and
 * the client kit that shows it. A plain module: a value imported from a
 * 'use client' file is only a reference on the server.
 */

/** Where the callback sent the studio back with `?discord=`. */
export type DiscordOutcome = 'cancelled' | 'failed' | 'linked'

export const DISCORD_OUTCOMES: readonly DiscordOutcome[] = ['cancelled', 'failed', 'linked']

/**
 * The game's link, as the Share tab knows it: `'unknown'` where the kit
 * can't read it (the hub's welcome panel), or `null` when not linked.
 * Only what the tab shows: the webhook URL stays in the admin's own fields.
 */
export type DiscordLinkState = 'unknown' | null | { channelId: null | string; guildId: string }

export interface DiscordTab {
  gameID: number
  link: DiscordLinkState
  outcome?: DiscordOutcome
}
