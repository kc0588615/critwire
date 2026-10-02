import canUseDOM from './canUseDOM'

export const getServerSideURL = () => {
  return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
}

/** A root-relative path on this site (or on `base`) as an absolute URL. */
export const absoluteURL = (path: string, base: string = getServerSideURL()): string => `${base}${path}`

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || ''
}
