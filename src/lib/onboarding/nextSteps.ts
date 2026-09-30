import { portalPaths } from '@/lib/game-portal/paths'

export interface NextStep {
  key: 'ideas' | 'share' | 'update'
  label: string
  description: string
  href: string
}

/**
 * What a new studio does after onboarding, in order. The hub's welcome
 * panel and the admin dashboard both show these. `share`'s href is the
 * hub's path; callers that show it prefix the site's URL.
 */
export const nextSteps = (project: { id: number; slug: string }): NextStep[] => [
  {
    key: 'share',
    label: 'Share this link',
    description: 'Put it on your site, your store page and your Discord, so players know where to send feedback.',
    href: portalPaths(project.slug).hub,
  },
  {
    key: 'update',
    label: 'Add your first update',
    description: 'Post patch notes or news. Players can follow them by RSS.',
    href: '/admin/collections/patch-notes/create',
  },
  {
    key: 'ideas',
    label: 'Turn on ideas',
    description: 'Bug reports are open. Let players suggest ideas too, under Player feedback.',
    href: `/admin/collections/game-projects/${project.id}`,
  },
]
