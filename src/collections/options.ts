// Canonical enums (docs/features.md). Values are stable API identifiers;
// labels are for the admin UI.

export const ISSUE_CATEGORY_OPTIONS = [
  { label: 'Information', value: 'INFORMATION' },
  { label: 'Patch Notes', value: 'PATCH_NOTES' },
  { label: 'Gameplay', value: 'GAMEPLAY' },
  { label: 'Crashes', value: 'CRASHES' },
  { label: 'User Interface', value: 'USER_INTERFACE' },
  { label: 'Audio', value: 'AUDIO' },
  { label: 'Visual', value: 'VISUAL' },
  { label: 'Quests', value: 'QUESTS' },
  { label: 'Performance', value: 'PERFORMANCE' },
  { label: 'Feature Request', value: 'FEATURE_REQUEST' },
  { label: 'Other', value: 'OTHER' },
] as const

export const ISSUE_STATUS_OPTIONS = [
  { label: 'Reported', value: 'REPORTED' },
  { label: 'Investigating', value: 'INVESTIGATING' },
  { label: 'Needs More Info', value: 'NEEDS_MORE_INFO' },
  { label: 'Workaround Available', value: 'WORKAROUND_AVAILABLE' },
  { label: 'Planned', value: 'PLANNED' },
  { label: 'Fixed', value: 'FIXED' },
  { label: 'Closed', value: 'CLOSED' },
] as const

export const ISSUE_REPORT_STATUS_OPTIONS = [
  { label: 'New', value: 'NEW' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Linked', value: 'LINKED' },
  { label: 'Dismissed', value: 'DISMISSED' },
] as const

export const CONTACT_FORM_TARGET_OPTIONS = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'Discord Webhook', value: 'DISCORD_WEBHOOK' },
  { label: 'External URL', value: 'EXTERNAL_URL' },
  { label: 'Tally form', value: 'TALLY' },
] as const

export const TALLY_DISPLAY_OPTIONS = [
  { label: 'Embed on page', value: 'embed' },
  { label: 'Button (open Tally)', value: 'button' },
] as const

export const REPORT_FORM_PROVIDER_OPTIONS = [
  { label: 'Native Critwire form', value: 'native' },
  { label: 'Tally form', value: 'tally' },
  { label: 'External URL', value: 'external' },
] as const
