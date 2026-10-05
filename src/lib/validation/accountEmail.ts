import { z } from 'zod'

/**
 * An account's email address, the one rule signup and password recovery
 * share. It refuses the reserved `.invalid` top-level domain, which never
 * receives mail: a deleted account's address ends in it (`anonymizeUser`),
 * so neither route reaches one or asks Resend to send to one. Every
 * `.invalid` address gets the same 400, which says nothing about accounts.
 */
export const accountEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254))
  .refine((email) => !email.endsWith('.invalid'), { message: 'This address can’t receive email.' })
