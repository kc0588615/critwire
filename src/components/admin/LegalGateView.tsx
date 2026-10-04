import type { AdminViewServerProps } from 'payload'

import { Button } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { needsLegalAcceptance } from '@/lib/legal/acceptance'
import { acceptHref } from '@/lib/legal/paths'

/**
 * Replaces Payload's `/admin/unauthorized`, where its admin guard
 * (`adminPanelAccess`) sends a signed-in account it turns away. An account
 * that still has to accept the Terms of Service and Privacy Policy goes to
 * `/legal/accept`, then back to the page it asked for. Anyone else sees
 * Payload's own "no access" message and Log out.
 */
export default async function LegalGateView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { permissions, req } = initPageResult
  const { i18n, payload, user } = req

  if (user && (await needsLegalAcceptance({ payload, req, user }))) redirect(acceptHref(searchParams?.redirect))

  return (
    <>
      {/* Payload's form header markup, so the admin's own styles apply. */}
      <div className="form-header">
        <h1>{i18n.t(user && !permissions.canAccessAdmin ? 'error:unauthorizedAdmin' : 'error:unauthorized')}</h1>
        <p>{i18n.t('error:notAllowedToAccessPage')}</p>
      </div>
      <Button buttonStyle="primary" el="link" size="large" to="/admin/logout">
        {i18n.t('authentication:logOut')}
      </Button>
    </>
  )
}
