import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// The app owns its framing policy (`headers()` in next.config.ts sends
// `frame-ancestors`). E2E serves `next start` without nginx, so only this
// static check stops nginx from setting a second policy again. One test per
// failure mode N1–N8 in the reach mission plan, plus the committed file.

/** Headers nginx keeps adding: the app doesn't send them. */
const KEPT_HEADERS = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'Permissions-Policy',
  'Referrer-Policy',
  'Cross-Origin-Opener-Policy',
] as const

/** `directive header` pairs that must never appear, in any case, and why. */
const FORBIDDEN: Record<string, string> = {
  'add_header X-Frame-Options': 'the app sets frame-ancestors, and X-Frame-Options would block the embed routes',
  'add_header Content-Security-Policy': 'a second policy intersects with the app’s and blocks the embed routes',
  'proxy_hide_header Content-Security-Policy': 'it strips the app’s framing policy',
}

/**
 * Each simple directive as its first two words, lower-cased:
 * `add_header x-frame-options`. A `#` outside quotes starts a comment, and
 * `;`, `{` or `}` outside quotes ends a statement.
 */
const directives = (conf: string): string[] => {
  const statements: string[] = []
  let current = ''
  let quote: string | null = null
  for (let i = 0; i < conf.length; i++) {
    const char = conf[i]
    if (quote) {
      current += char
      if (char === '\\') current += conf[++i] ?? ''
      else if (char === quote) quote = null
    } else if (char === '#') {
      while (i + 1 < conf.length && conf[i + 1] !== '\n') i++
    } else if (';{}'.includes(char)) {
      statements.push(current)
      current = ''
    } else {
      if (char === '"' || char === "'") quote = char
      current += char
    }
  }
  statements.push(current)
  return statements
    .map((statement) => statement.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase())
    .filter(Boolean)
}

/** Every way `conf` breaks the framing rules; empty when it's fine. */
const nginxHeaderProblems = (conf: string): string[] => {
  const found = directives(conf)
  if (found.length === 0) return ['nginx.conf has no directives']
  const problems = Object.entries(FORBIDDEN)
    .filter(([directive]) => found.includes(directive.toLowerCase()))
    .map(([directive, why]) => `Forbidden: ${directive} (${why})`)
  for (const header of KEPT_HEADERS) {
    if (!found.includes(`add_header ${header.toLowerCase()}`)) problems.push(`Missing: add_header ${header}`)
  }
  return problems
}

const nginxFileProblems = (file: string): string[] => {
  let conf: string
  try {
    conf = readFileSync(file, 'utf8')
  } catch {
    return [`${file} not found`]
  }
  return nginxHeaderProblems(conf)
}

const KEPT_LINES = `
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options nosniff always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header Cross-Origin-Opener-Policy same-origin-allow-popups always;`

/** A config shaped like ours, with `serverExtra` at server level and `locationExtra` in `location /`. */
const conf = ({
  kept = KEPT_LINES,
  serverExtra = '',
  locationExtra = '',
}: { kept?: string; serverExtra?: string; locationExtra?: string } = {}): string => `
server_tokens off;

server {
  listen 443 ssl;
  # Security headers (Cloudflare adds some; these cover direct access).
${kept}
${serverExtra}

  location / {
    proxy_pass http://critwire_app;
    proxy_set_header X-Real-IP $remote_addr;
${locationExtra}
  }
}
`

const xFrameProblem = expect.stringMatching(/^Forbidden: add_header X-Frame-Options /)

describe('nginx-headers', () => {
  it('passes a config with the five kept headers and nothing forbidden', () => {
    expect(nginxHeaderProblems(conf())).toEqual([])
  })

  it('N1. fails on add_header X-Frame-Options at server level', () => {
    expect(nginxHeaderProblems(conf({ serverExtra: '  add_header X-Frame-Options SAMEORIGIN always;' }))).toEqual([
      xFrameProblem,
    ])
  })

  it('N2. fails on it in a location block, in any case, with or without always, with any spacing', () => {
    for (const line of [
      'add_header X-Frame-Options SAMEORIGIN always;',
      'ADD_HEADER x-frame-options DENY;',
      'Add_Header X-FRAME-OPTIONS SAMEORIGIN;',
      'add_header\tX-Frame-Options\t\tSAMEORIGIN always;',
      'add_header     X-Frame-Options    SAMEORIGIN;',
      'add_header X-Frame-Options SAMEORIGIN; proxy_buffering off;',
    ]) {
      expect(nginxHeaderProblems(conf({ locationExtra: `    ${line}` })), line).toEqual([xFrameProblem])
    }
  })

  it('N3. fails on add_header Content-Security-Policy anywhere', () => {
    const line = `add_header Content-Security-Policy "frame-ancestors 'self'" always;`
    for (const extra of [{ serverExtra: line }, { locationExtra: line }, { serverExtra: line.toUpperCase() }]) {
      expect(nginxHeaderProblems(conf(extra)), JSON.stringify(extra)).toEqual([
        expect.stringMatching(/^Forbidden: add_header Content-Security-Policy /),
      ])
    }
  })

  it('N4. fails on proxy_hide_header Content-Security-Policy, in any case', () => {
    for (const line of ['proxy_hide_header Content-Security-Policy;', 'PROXY_HIDE_HEADER content-security-policy;']) {
      expect(nginxHeaderProblems(conf({ locationExtra: line })), line).toEqual([
        expect.stringMatching(/^Forbidden: proxy_hide_header Content-Security-Policy /),
      ])
    }
  })

  it('N5. fails when a kept header is missing, and names it', () => {
    for (const header of KEPT_HEADERS) {
      const kept = KEPT_LINES.split('\n')
        .filter((line) => !line.includes(header))
        .join('\n')
      expect(nginxHeaderProblems(conf({ kept })), header).toEqual([`Missing: add_header ${header}`])
    }
  })

  it('N6. counts a kept header that appears only in a comment as missing', () => {
    const kept = KEPT_LINES.replace(
      'add_header Referrer-Policy',
      '# add_header Referrer-Policy',
    ).replace('add_header X-Content-Type-Options nosniff always;', 'listen 443; # add_header X-Content-Type-Options nosniff;')
    expect(nginxHeaderProblems(conf({ kept }))).toEqual([
      'Missing: add_header X-Content-Type-Options',
      'Missing: add_header Referrer-Policy',
    ])
  })

  it('N7. passes a forbidden directive that appears only in a comment', () => {
    for (const extra of [
      { serverExtra: '  # add_header X-Frame-Options SAMEORIGIN always;' },
      { serverExtra: '#add_header Content-Security-Policy "default-src *";' },
      { locationExtra: '    proxy_buffering off; # proxy_hide_header Content-Security-Policy;' },
      { locationExtra: '    proxy_buffering off; #add_header X-Frame-Options DENY;' },
    ]) {
      expect(nginxHeaderProblems(conf(extra)), JSON.stringify(extra)).toEqual([])
    }
  })

  it('N8. fails on a missing or empty file, never passing vacuously', () => {
    expect(nginxFileProblems(path.join(process.cwd(), 'no-such-nginx.conf'))).toEqual([
      expect.stringMatching(/not found$/),
    ])
    for (const empty of ['', '   \n\n', '# only a comment\n']) {
      expect(nginxHeaderProblems(empty), JSON.stringify(empty)).toEqual(['nginx.conf has no directives'])
    }
  })

  it('the committed nginx.conf passes', () => {
    expect(nginxFileProblems(path.join(process.cwd(), 'nginx.conf'))).toEqual([])
  })
})
