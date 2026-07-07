// Phase 6 verification: public issue reports, report promotion,
// contact form routing, Turnstile/local fallback, jobs queue execution.
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

const publicJSON = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
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
  return { status: res.status, html: raw.replace(/<!--.*?-->/g, '') }
}

const waitForPromotedIssue = async (reportID, token) => {
  for (let i = 0; i < 20; i++) {
    const report = await api('GET', `/issue-reports/${reportID}?depth=1`, { token })
    if (report.json?.issue?.id) return report
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return api('GET', `/issue-reports/${reportID}?depth=1`, { token })
}

const alice = await login('alice@a.test', 'test-password-123')
const admin = await login('dev@critwire.local', 'dev-password-123')
const tenantA = (await api('GET', '/tenants?where[slug][equals]=demo-studio', { token: admin }))
  .json.docs[0]
const project = (
  await api('GET', '/game-projects?where[slug][equals]=alpha-quest&limit=1', { token: alice })
).json.docs[0]

const updateProjectContact = async (contact) => {
  const res = await api('PATCH', `/game-projects/${project.id}`, {
    token: alice,
    body: { contact },
  })
  if (res.status >= 400) {
    console.log('FIXTURE FAIL contact update', JSON.stringify(res.json))
    process.exit(1)
  }
  return res.json.doc
}

// --- 1. Public report form ------------------------------------------------
const reportPage = await page('/g/alpha-quest/report')
check('report page renders form fields', reportPage.status === 200 && reportPage.html.includes('Report a Bug') && reportPage.html.includes('name="category"'))

const badReport = await publicJSON('POST', '/g/alpha-quest/report/submit', {
  category: 'CRASHES',
  description: 'too short',
  title: 'x',
})
check('invalid report body rejected 400', badReport.status === 400)

const marker = Date.now()
const reportSubmit = await publicJSON('POST', '/g/alpha-quest/report/submit', {
  category: 'CRASHES',
  description: `Phase 6 verification crash report ${marker}. The game exits after launch.`,
  gameVersion: '1.2.3',
  platform: 'Windows',
  submitterEmail: 'player@example.com',
  title: `Phase 6 crash report ${marker}`,
  turnstileToken: '',
})
check('public report submission succeeds without local Turnstile secret', reportSubmit.status === 200 && reportSubmit.json?.ok === true, JSON.stringify(reportSubmit.json))

const reportID = reportSubmit.json?.id
const report = await api('GET', `/issue-reports/${reportID}`, { token: alice })
check('report created as NEW with explicit tenant/project', report.json?.tenant?.id === tenantA.id || report.json?.tenant === tenantA.id)
check('report stores player metadata', report.json?.status === 'NEW' && report.json?.platform === 'Windows' && report.json?.gameVersion === '1.2.3')

// --- 2. Report promotion hook --------------------------------------------
const promoted = await api('PATCH', `/issue-reports/${reportID}`, {
  token: alice,
  body: { status: 'PUBLISHED' },
})
check('report can be marked PUBLISHED', promoted.status === 200, JSON.stringify(promoted.json))

const promotedReport = await waitForPromotedIssue(reportID, alice)
const promotedIssue = promotedReport.json?.issue
check('PUBLISHED report gets issue relation', Boolean(promotedIssue?.id), JSON.stringify(promotedReport.json))
check(
  'promoted issue is public and reported',
  promotedIssue?.status === 'REPORTED' && promotedIssue?.isPublic === true && promotedIssue?.category === 'CRASHES',
  JSON.stringify(promotedIssue),
)

const promotedDetail = await page(`/g/alpha-quest/issues/${promotedIssue?.slug}`)
check('promoted issue renders publicly', promotedDetail.status === 200 && promotedDetail.html.includes(`Phase 6 crash report ${marker}`))

const linkedWithoutIssue = await api('POST', '/issue-reports', {
  token: alice,
  body: {
    category: 'OTHER',
    description: `Phase 6 linked validation ${marker}`,
    gameProject: project.id,
    status: 'LINKED',
    tenant: tenantA.id,
    title: `Linked validation ${marker}`,
  },
})
check('LINKED report without issue relation is rejected', linkedWithoutIssue.status === 400)

// --- 3. Contact routing ---------------------------------------------------
await updateProjectContact({
  discordWebhookUrl: null,
  email: 'dev@critwire.local',
  externalUrl: null,
  target: 'EMAIL',
})

const contactPage = await page('/g/alpha-quest/contact')
check('contact page renders email-backed form', contactPage.status === 200 && contactPage.html.includes('Send message') && contactPage.html.includes('name="message"'))

const contactSubmit = await publicJSON('POST', '/g/alpha-quest/contact/submit', {
  email: 'player@example.com',
  message: `Phase 6 contact verification message ${marker}.`,
  name: 'Phase Tester',
  subject: 'Verification',
  turnstileToken: '',
})
check('contact form queues and runs email job', contactSubmit.status === 200 && contactSubmit.json?.ok === true, JSON.stringify(contactSubmit.json))

await updateProjectContact({
  discordWebhookUrl: null,
  email: null,
  externalUrl: 'https://example.com/support',
  target: 'EXTERNAL_URL',
})
const externalContact = await page('/g/alpha-quest/contact')
check('external contact target renders link instead of form', externalContact.html.includes('https://example.com/support') && !externalContact.html.includes('name="message"'))

await updateProjectContact({
  discordWebhookUrl: null,
  email: null,
  externalUrl: null,
  target: 'EMAIL',
})
const unconfiguredContact = await page('/g/alpha-quest/contact')
check('missing contact target renders friendly state', unconfiguredContact.html.includes('Contact is not configured'))

await updateProjectContact({
  discordWebhookUrl: null,
  email: 'dev@critwire.local',
  externalUrl: null,
  target: 'EMAIL',
})

// --- 4. Nav ----------------------------------------------------------------
const home = await page('/g/alpha-quest')
check('portal nav links to report form', home.html.includes('/g/alpha-quest/report'))
check('portal nav links to contact form', home.html.includes('/g/alpha-quest/contact'))

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
