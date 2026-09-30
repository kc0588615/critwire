import type { ServerProps } from 'payload'
import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getTenantIDsByRole } from '@/access/tenantRoles'

import { NoStudioDashboard } from './NoStudioDashboard'
import { PlatformDashboard } from './PlatformDashboard'
import { StudioDashboard } from './StudioDashboard'
import './index.scss'

/** The top of the admin dashboard, by role (§13). */
export default function BeforeDashboard({ payload, user }: ServerProps) {
  if (!user) return null
  if (isSuperAdmin(user)) return <PlatformDashboard payload={payload} />
  if (getTenantIDsByRole(user).length === 0) return <NoStudioDashboard />
  return <StudioDashboard payload={payload} user={user} />
}
