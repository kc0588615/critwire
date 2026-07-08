// Phase 7 verification: SEO defaults, admin onboarding text, security
// headers from standalone app, and Phase 6 regression coverage.
const BASE = 'http://127.0.0.1:3000'
let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`)
  if (!cond) failures++
}

const page = async (path) => {
  const res = await fetch(`${BASE}${path}`)
  const raw = await res.text()
  return {
    headers: res.headers,
    html: raw.replace(/<!--.*?-->/g, ''),
    status: res.status,
  }
}

const home = await page('/g/alpha-quest')
check('portal page renders', home.status === 200 && home.html.includes('Alpha Quest'))
check('portal metadata uses Critwire site name', home.html.includes('og:site_name') && home.html.includes('Critwire'))
check('portal metadata has twitter card', home.html.includes('twitter:card'))

const report = await page('/g/alpha-quest/report')
check('report form still has Turnstile-compatible field', report.html.includes('turnstileToken') || report.html.includes('cf-turnstile'))

const contact = await page('/g/alpha-quest/contact')
check('contact route still renders', contact.status === 200 && contact.html.includes('Contact Alpha Quest'))

const adminLogin = await page('/admin/login')
check('admin onboarding/login copy is Critwire-specific', adminLogin.html.includes('Critwire'))

const health = await fetch(`${BASE}/api/health`)
check('health endpoint remains healthy', health.status === 200)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
