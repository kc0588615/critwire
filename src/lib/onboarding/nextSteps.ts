import { gameEditHref, gameShareHref } from '@/lib/admin/paths'

export interface NextStep {
  key: 'ideas' | 'share' | 'update'
  label: string
  description: string
  href: string
}

/**
 * What a new studio does after onboarding, in order. The hub's welcome
 * panel and the admin dashboard both show these. Each `href` is an admin
 * URL; the welcome panel shows the share kit inline instead of its link.
 */
export const nextSteps = (project: { id: number }): NextStep[] => [
  {
    key: 'share',
    label: 'Put critwire on your site',
    description: 'Links, buttons and a live badge for Steam, itch.io, your site or README.',
    href: gameShareHref(project.id),
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
    href: gameEditHref(project.id),
  },
]
