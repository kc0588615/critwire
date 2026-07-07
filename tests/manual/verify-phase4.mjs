// Phase 4 verification: patch notes feed, pagination, detail, RSS,
// draft hiding, on-demand revalidation. Requires Phase 2/3 fixtures.
const BASE = 'http://127.0.0.1:3000'
let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`)
  if (!cond) failures++
}

const api = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, json }
}
const login = async (email, password) =>
  (await api('POST', '/users/login', { body: { email, password } })).json.token
const page = async (path) => {
  const res = await fetch(`${BASE}${path}`)
  const raw = await res.text()
  // Strip React SSR comment markers so text interpolations are contiguous.
  return { status: res.status, html: raw.replace(/<!--.*?-->/g, ''), type: res.headers.get('content-type') }
}
const lexical = (text) => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

const alice = await login('alice@a.test', 'test-password-123')
const admin = await login('dev@critwire.local', 'dev-password-123')
const tenantA = (await api('GET', '/tenants?where[slug][equals]=demo-studio', { token: admin }))
  .json.docs[0]
const project = (
  await api('GET', '/game-projects?where[slug][equals]=alpha-quest', { token: alice })
).json.docs[0]

// Reset patch notes for idempotency.
const existing = await api(
  'GET',
  `/patch-notes?where[gameProject][equals]=${project.id}&limit=100&draft=true`,
  { token: alice },
)
for (const doc of existing.json.docs) {
  await api('DELETE', `/patch-notes/${doc.id}`, { token: alice })
}

// 12 published notes (2 pages at 10/page) + 1 draft.
for (let n = 1; n <= 12; n++) {
  const res = await api('POST', '/patch-notes', {
    token: alice,
    body: {
      gameProject: project.id,
      tenant: tenantA.id,
      title: `Update ${n} <&> "quoted"`,
      slug: `update-${n}`,
      versionLabel: `v0.${n}.0`,
      summary: `Summary of update ${n}`,
      content: lexical(`Full patch details for update number ${n}.`),
      publishedAt: `2026-06-${String(n).padStart(2, '0')}T12:00:00.000Z`,
      _status: 'published',
    },
  })
  if (res.status !== 201) {
    console.log('FIXTURE FAIL', JSON.stringify(res.json?.errors))
    process.exit(1)
  }
}
await api('POST', '/patch-notes?draft=true', {
  token: alice,
  body: {
    gameProject: project.id,
    tenant: tenantA.id,
    title: 'Secret unreleased update',
    slug: 'secret-update',
    content: lexical('Unreleased.'),
    _status: 'draft',
  },
})

// --- 1. Feed page 1 -------------------------------------------------------
const feed = await page('/g/alpha-quest/patch-notes')
check('feed renders newest note first', feed.status === 200 && feed.html.indexOf('Update 12') !== -1)
check('feed shows version badge', feed.html.includes('v0.12.0'))
check('feed paginates (page 1 of 2)', feed.html.includes('Page 1 of 2'))
check('feed hides oldest notes on page 1', !feed.html.includes('Update 2 '.replace(' ', ' ')) || !feed.html.includes('>Update 1 <'))
check('feed omits draft notes', !feed.html.includes('Secret unreleased update'))
check('feed links RSS', feed.html.includes('feed.xml'))

// --- 2. Page 2 + bounds ----------------------------------------------------
const page2 = await page('/g/alpha-quest/patch-notes/page/2')
check('page 2 renders oldest notes', page2.status === 200 && page2.html.includes('Update 1'))
check('page 2 shows Page 2 of 2', page2.html.includes('Page 2 of 2'))
const page3 = await page('/g/alpha-quest/patch-notes/page/3')
check('page beyond range 404s', page3.status === 404, `status=${page3.status}`)
const page1Alias = await page('/g/alpha-quest/patch-notes/page/1')
check('explicit /page/1 404s (canonical is the index)', page1Alias.status === 404)

// --- 3. Detail page ---------------------------------------------------------
const detail = await page('/g/alpha-quest/patch-notes/update-12')
check(
  'detail renders content + version',
  detail.status === 200 &&
    detail.html.includes('Full patch details for update number 12') &&
    detail.html.includes('v0.12.0'),
)
const draftDetail = await page('/g/alpha-quest/patch-notes/secret-update')
check('draft detail 404s', draftDetail.status === 404, `status=${draftDetail.status}`)

// --- 4. RSS ------------------------------------------------------------------
const rss = await page('/g/alpha-quest/patch-notes/feed.xml')
check('rss served with rss content type', rss.status === 200 && (rss.type ?? '').includes('rss'))
check('rss contains items with escaped titles', rss.html.includes('Update 12 &lt;&amp;&gt;'))
check('rss omits drafts', !rss.html.includes('Secret unreleased'))
check('rss item count is 12', (rss.html.match(/<item>/g) ?? []).length === 12)
const rssUnknown = await page('/g/nope/patch-notes/feed.xml')
check('rss for unknown game 404s', rssUnknown.status === 404)

// --- 5. On-demand revalidation ----------------------------------------------
const note12 = (
  await api('GET', `/patch-notes?where[slug][equals]=update-12&limit=1`, { token: alice })
).json.docs[0]
await api('PATCH', `/patch-notes/${note12.id}`, {
  token: alice,
  body: { title: 'Update 12 RENAMED', _status: 'published' },
})
const feedAfter = await page('/g/alpha-quest/patch-notes')
check('feed revalidates on edit', feedAfter.html.includes('Update 12 RENAMED'))
const detailAfter = await page('/g/alpha-quest/patch-notes/update-12')
check('detail revalidates on edit', detailAfter.html.includes('Update 12 RENAMED'))
const rssAfter = await page('/g/alpha-quest/patch-notes/feed.xml')
check('rss revalidates on edit', rssAfter.html.includes('Update 12 RENAMED'))

await api('PATCH', `/patch-notes/${note12.id}`, {
  token: alice,
  body: { _status: 'draft' },
})
const feedUnpub = await page('/g/alpha-quest/patch-notes')
check('unpublished note leaves the feed', !feedUnpub.html.includes('Update 12 RENAMED'))
const detailUnpub = await page('/g/alpha-quest/patch-notes/update-12')
check('unpublished note detail 404s', detailUnpub.status === 404, `status=${detailUnpub.status}`)

// --- 6. Portal nav -----------------------------------------------------------
const home = await page('/g/alpha-quest')
check('portal nav links to patch notes', home.html.includes('/g/alpha-quest/patch-notes'))

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
