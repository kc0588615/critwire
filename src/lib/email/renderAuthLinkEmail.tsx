import React from 'react'

import type { AuthLinkEmailProps } from './templates/AuthLinkEmail'

import { renderEmail } from './render'
import { AuthLinkEmail } from './templates/AuthLinkEmail'

export const renderAuthLinkEmail = (
  props: AuthLinkEmailProps,
): Promise<{ html: string; text: string }> => renderEmail(<AuthLinkEmail {...props} />)
