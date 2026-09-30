const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * `base` slugified (or `fallback` when nothing is left of it), suffixed
 * `-2`, `-3`, … until `isTaken` says it's free. Callers count reserved
 * slugs as taken.
 */
export const uniqueSlug = async ({
  base,
  fallback,
  isTaken,
}: {
  base: string
  fallback: string
  isTaken: (candidate: string) => Promise<boolean>
}): Promise<string> => {
  const root = slugify(base) || fallback
  let candidate = root
  let suffix = 2

  while (await isTaken(candidate)) {
    candidate = `${root}-${suffix}`
    suffix += 1
  }

  return candidate
}
