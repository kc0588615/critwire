/** One date format across the portal: "Sep 26, 2026". Null for a missing or unparseable date. */
export const formatDate = (iso: null | string | undefined): null | string => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}
