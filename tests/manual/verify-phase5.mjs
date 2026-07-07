// Phase 5 verification: issue list filters/sort/search, board view,
// detail asides, voting (toggle, per-token uniqueness, cookies).
const BASE = 'http://127.0.0.1:3000'
let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`)
  if (!cond) failures++
}

const api = async (method, path, { body, token, cookie } = {}) => {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') }
}
const login = async (email, password) =>
  (await api('POST', '/users/login', { body: { email, password } })).json.token
const page = async (path) => {
  const res = await fetch(`${BASE}${path}`)
  const raw = await res.text()
  return { status: res.status, html: raw.replace(/<!--.*?-->/g, '') }
}

const alice = await login('alice@a.test', 'test-password-123')
const admin = await login('dev@critwire.local', 'dev-password-123')
const tenantA = (await api('GET', '/tenants?where[slug][equals]=demo-studio', { token: admin }))
  .json.docs[0]
const project = (
  await api('GET', '/game-projects?where[slug][equals]=alpha-quest', { token: alice })
).json.docs[0]
const note1 = (
  await api('GET', '/patch-notes?where[slug][equals]=update-1&limit=1', { token: alice })
).json.docs[0]

// --- fixtures -------------------------------------------------------------
const upsertIssue = async (slug, body) => {
  const found = await api('GET', `/issues?where[slug][equals]=${slug}&where[gameProject][equals]=${project.id}&limit=1`, { token: alice })
  if (found.json.docs.length) {
    const id = found.json.docs[0].id
    await api('PATCH', `/issues/${id}`, { token: alice, body })
    return { ...found.json.docs[0], ...body, id }
  }
  const res = await api('POST', '/issues', {
    token: alice,
    body: { gameProject: project.id, tenant: tenantA.id, slug, ...body },
  })
  if (!res.json?.doc) {
    console.log('FIXTURE FAIL', slug, JSON.stringify(res.json?.errors))
    process.exit(1)
  }
  return res.json.doc
}

const pinned = await upsertIssue('crash-on-start', {
  title: 'Crash on start',
  category: 'CRASHES',
  status: 'WORKAROUND_AVAILABLE',
  workaroundText: 'Verify game files, then restart with --safe-mode.',
  isPinned: true,
  isPublic: true,
})
const audio = await upsertIssue('audio-crackle', {
  title: 'Audio crackles in caves',
  summary: 'Static noise when reverb kicks in.',
  category: 'AUDIO',
  status: 'INVESTIGATING',
  isPublic: true,
})
const quest = await upsertIssue('quest-blocked', {
  title: 'Quest giver disappears',
  category: 'QUESTS',
  status: 'FIXED',
  fixedInPatchNote: note1.id,
  isPublic: true,
})

// --- 1. Voting -------------------------------------------------------------
// Browser 1: first vote issues a cookie.
const vote1 = await api('POST', '/vote', { body: { issueId: audio.id } })
check('first vote succeeds and issues token cookie', vote1.status === 200 && vote1.json.voted === true && Boolean(vote1.setCookie?.includes('cw_vote_token')))
const cookie1 = vote1.setCookie?.split(';')[0]

// Same browser voting again toggles off.
const voteOff = await api('POST', '/vote', { body: { issueId: audio.id }, cookie: cookie1 })
check('same token toggles vote off', voteOff.json.voted === false && voteOff.json.upvoteCount === vote1.json.upvoteCount - 1)
// Toggle back on for ordering tests.
const voteOn = await api('POST', '/vote', { body: { issueId: audio.id }, cookie: cookie1 })
check('same token re-votes (still max one)', voteOn.json.voted === true)
const dupCheck = await api('POST', '/vote', { body: { issueId: audio.id }, cookie: cookie1 })
check(
  'vote per token per issue never exceeds one (repeat toggles off, never stacks)',
  dupCheck.json.voted === false && dupCheck.json.upvoteCount === voteOn.json.upvoteCount - 1,
  JSON.stringify(dupCheck.json),
)
await api('POST', '/vote', { body: { issueId: audio.id }, cookie: cookie1 }) // back on

// Browser 2: independent token.
const vote2 = await api('POST', '/vote', { body: { issueId: audio.id } })
check('second browser adds an independent vote', vote2.json.voted === true && vote2.json.upvoteCount >= 2)

// Tampered cookie is rejected and replaced.
const tampered = cookie1?.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
const voteTampered = await api('POST', '/vote', { body: { issueId: pinned.id }, cookie: tampered })
check('tampered cookie treated as new browser (fresh token issued)', voteTampered.status === 200 && Boolean(voteTampered.setCookie))

// Validation and 404s.
const badBody = await api('POST', '/vote', { body: { nope: 1 } })
check('invalid vote body rejected 400', badBody.status === 400)
const ghost = await api('POST', '/vote', { body: { issueId: 999999 } })
check('vote on unknown issue 404s', ghost.status === 404)
const internalIssue = (
  await api('GET', `/issues?where[slug][equals]=internal-note&limit=1`, { token: alice })
).json.docs[0]
const privateVote = await api('POST', '/vote', { body: { issueId: internalIssue.id } })
check('vote on non-public issue 404s', privateVote.status === 404)

// --- 2. List view ------------------------------------------------------------
const list = await page('/g/alpha-quest/issues')
check('list renders public issues', list.status === 200 && list.html.includes('Audio crackles in caves'))
check('list hides non-public issues', !list.html.includes('Internal note'))
check('status badge rendered', list.html.includes('Investigating'))
check(
  'pinned issue sorts first',
  list.html.indexOf('Crash on start') < list.html.indexOf('Audio crackles in caves'),
)
const audioBeforeQuest = list.html.indexOf('Audio crackles') < list.html.indexOf('Quest giver')
check('top sort places voted issue above unvoted', audioBeforeQuest)

const filtered = await page('/g/alpha-quest/issues?category=QUESTS')
check(
  'category filter narrows results',
  filtered.html.includes('Quest giver disappears') && !filtered.html.includes('Audio crackles'),
)
const searched = await page('/g/alpha-quest/issues?q=crackle')
check(
  'search matches title/summary',
  searched.html.includes('Audio crackles') && !searched.html.includes('Quest giver'),
)
const latest = await page('/g/alpha-quest/issues?sort=latest')
check('latest sort still pins pinned first', latest.html.indexOf('Crash on start') < latest.html.indexOf('Quest giver'))

// --- 3. Board view ------------------------------------------------------------
const board = await page('/g/alpha-quest/issues?view=board')
check('board renders status columns', board.html.includes('Investigating') && board.html.includes('Workaround Available'))
check('board places issues in their column', board.html.indexOf('Audio crackles') > board.html.indexOf('Investigating'))
check('board is read-only (no drag handles)', !board.html.includes('draggable'))

// --- 4. Detail page ------------------------------------------------------------
const detail = await page('/g/alpha-quest/issues/crash-on-start')
check('detail renders workaround aside', detail.html.includes('Workaround') && detail.html.includes('--safe-mode'))
check('detail has vote button', detail.html.includes('Upvote'))
const fixedDetail = await page('/g/alpha-quest/issues/quest-blocked')
check(
  'fixed issue links its patch note',
  fixedDetail.html.includes('fixed in') && fixedDetail.html.includes('/g/alpha-quest/patch-notes/update-1'),
)
const privateDetail = await page('/g/alpha-quest/issues/internal-note')
check('non-public issue detail 404s', privateDetail.status === 404, `status=${privateDetail.status}`)

// Vote state round-trip: detail with browser-1 cookie shows Upvoted.
const detailRes = await fetch(`${BASE}/g/alpha-quest/issues/audio-crackle`, {
  headers: { Cookie: cookie1 },
})
const detailHtml = (await detailRes.text()).replace(/<!--.*?-->/g, '')
check('detail reflects existing vote for returning browser', detailHtml.includes('Upvoted'))

// --- 5. Nav -------------------------------------------------------------------
const home = await page('/g/alpha-quest')
check('portal nav links to issues', home.html.includes('/g/alpha-quest/issues'))

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
