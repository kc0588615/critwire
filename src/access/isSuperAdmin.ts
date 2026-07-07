import type { User } from '@/payload-types'

export const isSuperAdmin = (user: null | undefined | User): boolean => {
  return Boolean(user?.roles?.includes('admin'))
}
