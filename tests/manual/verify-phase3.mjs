// Phase 3 verification: landing page blocks, publish flow, on-demand
// revalidation, 404s, media upload. Run against a booted server.
const BASE = 'http://127.0.0.1:3000'
let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`)
  if (!cond) failures++
}

const api = async (method, path, { body, token, raw } = {}) => {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, json }
}

const login = async (email, password) => {
  const { json } = await api('POST', '/users/login', { body: { email, password } })
  return json.token
}

const page = async (path) => {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-verify': '1' } })
  return { status: res.status, html: await res.text() }
}

const alice = await login('alice@a.test', 'test-password-123')
const admin = await login('dev@critwire.local', 'dev-password-123')

const tenants = await api('GET', '/tenants?where[slug][equals]=demo-studio', { token: admin })
const tenantA = tenants.json.docs[0]
const projects = await api('GET', '/game-projects?where[slug][equals]=alpha-quest', {
  token: alice,
})
const project = projects.json.docs[0]

// Give the project an accent color (also exercises project revalidation).
await api('PATCH', `/game-projects/${project.id}`, {
  token: alice,
  body: { accentColor: '#7c3aed' },
})

// --- 1. Default landing (no published page yet) --------------------------
const existingPages = await api(
  'GET',
  `/game-pages?where[gameProject][equals]=${project.id}&draft=true`,
  { token: alice },
)
for (const doc of existingPages.json.docs) {
  await api('DELETE', `/game-pages/${doc.id}`, { token: admin })
}

const defaultView = await page('/g/alpha-quest')
check(
  'default landing renders from project data',
  defaultView.status === 200 && defaultView.html.includes('Alpha Quest'),
  `status=${defaultView.status}`,
)

// --- 2. Create + publish a landing page with all five blocks -------------
const content = [
  {
    blockType: 'gameHero',
    heading: 'Alpha Quest Rises',
    tagline: 'A tiny roguelike about big feelings.',
    showLogo: false,
    buttons: [{ label: 'Wishlist on Steam', url: 'https://store.steampowered.com/x', variant: 'primary' }],
  },
  {
    blockType: 'gameFeatures',
    heading: 'Why you will love it',
    items: [
      { title: 'Procedural dungeons', description: 'Never the same run twice.' },
      { title: 'Chunky pixels', description: 'Lovingly hand-placed.' },
    ],
  },
  {
    blockType: 'trailerEmbed',
    heading: 'Watch the trailer',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    blockType: 'mediaGallery',
    heading: 'Screenshots',
    items: [],
  },
  {
    blockType: 'gameCTA',
    heading: 'Join the community',
    text: 'Bugs, builds, and banter.',
    buttons: [{ label: 'Join Discord', url: 'https://discord.gg/x', variant: 'secondary' }],
  },
]
// mediaGallery requires minRows 1 — expect a validation error, then drop it.
const invalidCreate = await api('POST', '/game-pages', {
  token: alice,
  body: {
    gameProject: project.id,
    tenant: tenantA.id,
    title: 'Landing',
    kind: 'landing',
    content,
    _status: 'published',
  },
})
check(
  'empty media gallery rejected by validation',
  invalidCreate.status >= 400,
  `status=${invalidCreate.status}`,
)

const validContent = content.filter((b) => b.blockType !== 'mediaGallery')
const created = await api('POST', '/game-pages', {
  token: alice,
  body: {
    gameProject: project.id,
    tenant: tenantA.id,
    title: 'Landing',
    kind: 'landing',
    content: validContent,
    _status: 'published',
  },
})
check('landing page created + published', created.status === 201, JSON.stringify(created.json?.errors))
const pageID = created.json?.doc?.id

// --- 3. Rendered output (revalidated on publish) --------------------------
const rendered = await page('/g/alpha-quest')
check('hero block renders', rendered.html.includes('Alpha Quest Rises'))
check('features block renders', rendered.html.includes('Procedural dungeons'))
check(
  'trailer embeds privacy-friendly youtube',
  rendered.html.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'),
)
check('CTA block renders', rendered.html.includes('Join the community'))
check('accent color applied', rendered.html.includes('#7c3aed'))
check('portal footer present', rendered.html.includes('Powered by'))

// --- 4. On-demand revalidation on edit ------------------------------------
await api('PATCH', `/game-pages/${pageID}`, {
  token: alice,
  body: {
    content: validContent.map((b) =>
      b.blockType === 'gameHero' ? { ...b, heading: 'Alpha Quest Ascends' } : b,
    ),
    _status: 'published',
  },
})
const afterEdit = await page('/g/alpha-quest')
check(
  'edit revalidates the portal (new heading visible)',
  afterEdit.html.includes('Alpha Quest Ascends') && !afterEdit.html.includes('Alpha Quest Rises'),
)

// --- 5. Unpublish falls back to default landing ---------------------------
await api('PATCH', `/game-pages/${pageID}`, {
  token: alice,
  body: { _status: 'draft' },
})
const afterUnpublish = await page('/g/alpha-quest')
check(
  'unpublished page falls back to default landing',
  !afterUnpublish.html.includes('Alpha Quest Ascends') && afterUnpublish.html.includes('Alpha Quest'),
)

// Re-publish for subsequent phases.
await api('PATCH', `/game-pages/${pageID}`, {
  token: alice,
  body: { _status: 'published' },
})

// --- 6. Unknown slug 404 ---------------------------------------------------
const unknown = await page('/g/definitely-not-a-game')
check('unknown game slug returns 404', unknown.status === 404, `status=${unknown.status}`)

// --- 7. Media upload through the API (R2 adapter path, local disk in dev) --
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const form = new FormData()
form.append('file', new Blob([Buffer.from(pngBase64, 'base64')], { type: 'image/png' }), 'pixel.png')
form.append('_payload', JSON.stringify({ alt: 'test pixel', tenant: tenantA.id }))
const upload = await api('POST', '/media', { token: alice, body: form, raw: true })
check('media upload succeeds', upload.status === 201, JSON.stringify(upload.json?.errors))
const fileUrl = upload.json?.doc?.url
if (fileUrl) {
  const served = await fetch(`${BASE}${fileUrl}`)
  check('uploaded file is served', served.status === 200, `status=${served.status}`)
} else {
  check('uploaded file is served', false, 'no url on doc')
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
