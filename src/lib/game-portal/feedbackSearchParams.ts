import { createSerializer, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { PUBLIC_STAGES } from '@/lib/game-portal/stages'

/** URLs carry the type in lower case; the stored values are upper case. */
export const FEEDBACK_TYPE_PARAMS = ['bug', 'idea'] as const

export type FeedbackTypeParam = (typeof FEEDBACK_TYPE_PARAMS)[number]

export const feedbackTypeOf = (param: FeedbackTypeParam) =>
  param.toUpperCase() as Uppercase<FeedbackTypeParam>

/**
 * The feedback page's URL state, shared by the page's loader and the
 * filter bar. `nuqs/server` has no server-only guard, so client code
 * imports this too. A value outside a literal list (a stale
 * `FEATURE_REQUEST` category, say) parses as unset.
 */
export const feedbackSearchParams = {
  category: parseAsStringLiteral(ISSUE_CATEGORY_OPTIONS.map((option) => option.value)),
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['top', 'latest'] as const).withDefault('top'),
  stage: parseAsStringLiteral(PUBLIC_STAGES.map((stage) => stage.id)),
  type: parseAsStringLiteral(FEEDBACK_TYPE_PARAMS),
  view: parseAsStringLiteral(['list', 'board'] as const).withDefault('list'),
}

/** A feedback URL with the given state; defaults are left out. */
export const feedbackHref = createSerializer(feedbackSearchParams)
