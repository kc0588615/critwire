import Link from 'next/link'
import type { Payload } from 'payload'
import React from 'react'

import { countPlatformQueues } from '@/lib/admin/dashboard'

import { baseClass } from './baseClass'

/** The super admin's queues across every studio, each linking to its filtered list. */
export async function PlatformDashboard({ payload }: { payload: Payload }) {
  const queues = await countPlatformQueues(payload)

  return (
    <div className={baseClass}>
      <h2 className={`${baseClass}__title`}>Across all studios</h2>
      <ul className={`${baseClass}__queues`}>
        {queues.map(({ count, href, label }) => (
          <li key={label}>
            <Link href={href}>
              <span className={`${baseClass}__count`}>{count}</span> {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
