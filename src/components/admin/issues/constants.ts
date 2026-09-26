import { ISSUE_STATUS_OPTIONS } from '@/collections/options'

// Shared by the server list view and the client kanban. Kept out of the
// 'use client' module: a Server Component importing a value from there
// gets a client reference, not the value.

export type IssueStatus = (typeof ISSUE_STATUS_OPTIONS)[number]['value']

export const ISSUE_KANBAN_STATUSES: IssueStatus[] = ISSUE_STATUS_OPTIONS.map((s) => s.value)

export const ISSUE_KANBAN_PAGE_SIZE = 20
