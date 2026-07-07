// Phase 2 tenant-isolation verification. Drives the REST API on
// localhost:3000 with a super admin + three tenant users and asserts
// access boundaries. Prints PASS/FAIL per check; exits 1 on any FAIL.
const BASE = 'http://127.0.0.1:3000/api'
let failures = 0

const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`)
  if (!cond) failures++
}

const api = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
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

const login = async (email, password) => {
  const { json, status } = await api('POST', '/users/login', { body: { email, password } })
  if (status !== 200) throw new Error(`login failed for ${email}: ${status}`)
  return json.token
}

const lexical = (text) => ({
  root: {
    type: 'root',
    children: [
      { type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

// --- setup -------------------------------------------------------------
const admin = await login('dev@critwire.local', 'dev-password-123')

// Tenant A exists from Phase 1 (demo-studio); create tenant B.
const tenantsRes = await api('GET', '/tenants?limit=100', { token: admin })
let tenantA = tenantsRes.json.docs.find((t) => t.slug === 'demo-studio')
if (!tenantA) {
  tenantA = (
    await api('POST', '/tenants', { token: admin, body: { name: 'Demo Studio', slug: 'demo-studio' } })
  ).json.doc
}
let tenantB = tenantsRes.json.docs.find((t) => t.slug === 'rival-games')
if (!tenantB) {
  tenantB = (
    await api('POST', '/tenants', { token: admin, body: { name: 'Rival Games', slug: 'rival-games' } })
  ).json.doc
}

const mkUser = async (email, tenant, roles) => {
  const existing = await api('GET', `/users?where[email][equals]=${encodeURIComponent(email)}`, {
    token: admin,
  })
  if (existing.json.docs.length) return existing.json.docs[0]
  const res = await api('POST', '/users', {
    token: admin,
    body: {
      email,
      password: 'test-password-123',
      name: email.split('@')[0],
      roles: ['user'],
      tenants: [{ tenant: tenant.id, roles }],
    },
  })
  if (!res.json?.doc) throw new Error(`user create failed: ${JSON.stringify(res.json)}`)
  return res.json.doc
}

await mkUser('alice@a.test', tenantA, ['owner'])
await mkUser('carol@a.test', tenantA, ['member'])
await mkUser('bob@b.test', tenantB, ['member'])

const alice = await login('alice@a.test', 'test-password-123')
const carol = await login('carol@a.test', 'test-password-123')
const bob = await login('bob@b.test', 'test-password-123')

// --- fixtures (created by alice in tenant A) ----------------------------
const findOrCreate = async (path, where, body, token) => {
  const found = await api('GET', `${path}?${where}`, { token })
  if (found.json?.docs?.length) return found.json.docs[0]
  const res = await api('POST', path, { token, body })
  if (!res.json?.doc) throw new Error(`create ${path} failed: ${JSON.stringify(res.json)}`)
  return res.json.doc
}

const projectA = await findOrCreate(
  '/game-projects',
  'where[slug][equals]=alpha-quest',
  {
    name: 'Alpha Quest',
    slug: 'alpha-quest',
    tenant: tenantA.id,
    contact: { target: 'EMAIL', email: 'support@alpha.test' },
  },
  alice,
)
const projectA2 = await findOrCreate(
  '/game-projects',
  'where[slug][equals]=beta-blast',
  { name: 'Beta Blast', slug: 'beta-blast', tenant: tenantA.id },
  alice,
)

const publicIssue = await findOrCreate(
  '/issues',
  'where[slug][equals]=crash-on-start',
  {
    gameProject: projectA.id,
    title: 'Crash on start',
    slug: 'crash-on-start',
    category: 'CRASHES',
    tenant: tenantA.id,
    isPublic: true,
  },
  alice,
)
await findOrCreate(
  '/issues',
  'where[slug][equals]=internal-note',
  {
    gameProject: projectA.id,
    title: 'Internal note',
    slug: 'internal-note',
    tenant: tenantA.id,
    category: 'OTHER',
    isPublic: false,
  },
  alice,
)

// Draft patch note (never published).
const draftNote = await findOrCreate(
  '/patch-notes?draft=true',
  'where[slug][equals]=v0-1-0',
  {
    gameProject: projectA.id,
    title: 'v0.1.0 preview',
    slug: 'v0-1-0',
    tenant: tenantA.id,
    content: lexical('Draft content'),
    _status: 'draft',
  },
  alice,
)

// --- assertions ---------------------------------------------------------

// 1. Cross-tenant reads
const bobIssues = await api('GET', '/issues?limit=100', { token: bob })
check(
  'bob (tenant B) cannot list tenant A issues',
  bobIssues.json.docs.every((d) => {
    const t = typeof d.tenant === 'object' ? d.tenant?.id : d.tenant
    return t === tenantB.id
  }) && !bobIssues.json.docs.some((d) => d.id === publicIssue.id),
  JSON.stringify(bobIssues.json.docs?.map((d) => d.id)),
)

const bobNotes = await api('GET', '/patch-notes?limit=100&draft=true', { token: bob })
check(
  'bob cannot read tenant A draft patch notes',
  !bobNotes.json.docs?.some((d) => d.id === draftNote.id),
)

// 2. Anonymous visibility
const anonIssues = await api('GET', '/issues?limit=100')
check(
  'anonymous sees only isPublic issues',
  anonIssues.json.docs.some((d) => d.slug === 'crash-on-start') &&
    !anonIssues.json.docs.some((d) => d.slug === 'internal-note'),
  JSON.stringify(anonIssues.json.docs?.map((d) => d.slug)),
)

const anonNotes = await api('GET', '/patch-notes?limit=100')
check(
  'anonymous cannot see draft patch notes',
  !anonNotes.json.docs?.some((d) => d.slug === 'v0-1-0'),
  JSON.stringify(anonNotes.json.docs?.map((d) => d.slug)),
)

// 3. Sensitive field gating
const anonProject = await api('GET', `/game-projects/${projectA.id}`)
check(
  'anonymous cannot read contact email on public project',
  anonProject.status === 200 && anonProject.json?.contact?.email === undefined,
  JSON.stringify(anonProject.json?.contact),
)
const aliceProject = await api('GET', `/game-projects/${projectA.id}`, { token: alice })
check(
  'tenant member can read contact email',
  aliceProject.json?.contact?.email === 'support@alpha.test',
  JSON.stringify(aliceProject.json?.contact),
)

// 4. Cross-tenant writes
const bobUpdate = await api('PATCH', `/game-projects/${projectA.id}`, {
  token: bob,
  body: { description: 'hacked' },
})
check(
  'bob cannot update tenant A project',
  bobUpdate.status === 403 || bobUpdate.status === 404 || bobUpdate.status === 400,
  `status=${bobUpdate.status}`,
)

const bobIssueCreate = await api('POST', '/issues', {
  token: bob,
  body: {
    gameProject: projectA.id,
    title: 'Cross-tenant plant',
    slug: 'cross-tenant-plant',
    category: 'OTHER',
    tenant: tenantB.id,
  },
})
check(
  'bob cannot create an issue against tenant A project',
  bobIssueCreate.status >= 400,
  `status=${bobIssueCreate.status} ${JSON.stringify(bobIssueCreate.json?.errors?.[0]?.message)}`,
)

// 5. Role-based delete (member no, owner yes)
const tempIssue = await api('POST', '/issues', {
  token: alice,
  body: {
    gameProject: projectA.id,
    title: 'Temp for delete',
    slug: 'temp-for-delete',
    tenant: tenantA.id,
    category: 'OTHER',
  },
})
const carolDelete = await api('DELETE', `/issues/${tempIssue.json.doc.id}`, { token: carol })
check(
  'carol (member) cannot delete issues',
  carolDelete.status >= 400,
  `status=${carolDelete.status}`,
)
const aliceDelete = await api('DELETE', `/issues/${tempIssue.json.doc.id}`, { token: alice })
check('alice (owner) can delete issues', aliceDelete.status === 200, `status=${aliceDelete.status}`)

// 6. Votes are endpoint-only
const voteCreate = await api('POST', '/issue-votes', {
  token: admin,
  body: { issue: publicIssue.id, browserTokenHash: 'abc', tenant: tenantA.id },
})
check(
  'issue-votes cannot be created via REST (even as admin)',
  voteCreate.status >= 400,
  `status=${voteCreate.status}`,
)

// 7. Per-project slug uniqueness
const dupSlug = await api('POST', '/issues', {
  token: alice,
  body: {
    gameProject: projectA.id,
    title: 'Duplicate slug',
    slug: 'crash-on-start',
    tenant: tenantA.id,
    category: 'OTHER',
  },
})
check(
  'duplicate issue slug within a project is rejected',
  dupSlug.status >= 400,
  `status=${dupSlug.status}`,
)
const sameSlugOtherProject = await api('POST', '/issues', {
  token: alice,
  body: {
    gameProject: projectA2.id,
    title: 'Crash on start (other project)',
    slug: 'crash-on-start',
    tenant: tenantA.id,
    category: 'OTHER',
  },
})
check(
  'same slug allowed in a different project',
  sameSlugOtherProject.status === 201 || sameSlugOtherProject.status === 200,
  `status=${sameSlugOtherProject.status} ${JSON.stringify(sameSlugOtherProject.json?.errors)}`,
)

// 8. Reports are never public
const anonReports = await api('GET', '/issue-reports')
check(
  'anonymous cannot list issue reports',
  anonReports.status >= 400 || anonReports.json?.docs === undefined,
  `status=${anonReports.status}`,
)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
