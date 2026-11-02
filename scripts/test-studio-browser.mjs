import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { chromium } = require(process.env.HOSSO_PLAYWRIGHT_MODULE || 'playwright')
const repo = fileURLToPath(new URL('../', import.meta.url))
await mkdir(join(repo, 'output'), { recursive: true })
const directory = await mkdtemp(join(tmpdir(), 'hosso-studio-browser-'))
const root = join(repo, 'apps/studio')
const env = { ...process.env, HOSSO_DATABASE_URL: 'file:' + join(directory, 'studio.db').replaceAll('\\', '/'), HOSSO_SECRET: 'studio-browser-tests-disposable-secret', HOSSO_SEED: 'false', HOSSO_SCRIPT: '1', HOSSO_ADMIN_EMAIL: 'browser@studio.test', HOSSO_ADMIN_PASSWORD: 'studio-browser-test-password', HOSSO_SMTP_URL: '', HOSSO_DB_PUSH: 'true', HOSSO_PUBLIC_URL: 'http://localhost:3107', NODE_ENV: 'development', HOSSO_ADMIN_PREVIEW: '1' }
const seed = spawn(process.execPath, [join(dirname(require.resolve('payload')), '..', 'bin.js'), 'run', 'scripts/seed-studio-upgrades.ts'], { cwd: root, stdio: 'inherit', env })
await new Promise((resolve, reject) => { seed.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Fixture failed'))) })
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', '3107'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env })
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk }); server.stderr.on('data', (chunk) => { serverLog += chunk })
const logPath = join(repo, 'output/studio-upgrades-browser-server.log')
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const res = await fetch('http://localhost:3107/api/health', { signal: AbortSignal.timeout(3000) }); if (res.ok) { ready = true; break } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  if (!ready) throw new Error('Server did not start: ' + serverLog.slice(-6000))
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort())
  const response = await context.request.post('http://localhost:3107/api/users/login', { data: { email: env.HOSSO_ADMIN_EMAIL, password: env.HOSSO_ADMIN_PASSWORD } })
  if (!response.ok()) throw new Error('Login failed: ' + await response.text())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://localhost:3107/editor/1?block=hero', { timeout: 120000 })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  await page.getByRole('toolbar', { name: 'Công cụ canvas' }).getByRole('button', { name: 'Điện thoại', exact: true }).waitFor({ timeout: 60000 })
  console.log('EDITOR', (await page.locator('body').innerText()).slice(0, 1600))
  await page.screenshot({ path: join(repo, 'output/studio-upgrades-editor-desktop.png') })
  await page.getByRole('toolbar', { name: 'Công cụ canvas' }).getByRole('button', { name: 'Điện thoại', exact: true }).click()
  await page.getByRole('button', { name: 'Tự xếp dọc', exact: true }).click()
  const [saved] = await Promise.all([page.waitForResponse((response) => response.url().includes('/api/pages/1?draft=true') && response.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()])
  if (!saved.ok()) throw new Error('Draft save failed: ' + await saved.text())
  await page.screenshot({ path: join(repo, 'output/studio-upgrades-editor-mobile.png') })
  const draftResponse = await context.request.get('http://localhost:3107/api/pages/1?draft=true&locale=vi', { headers: { Origin: 'http://localhost:3107' } })
  const draft = await draftResponse.json()
  if (!draftResponse.ok()) throw new Error('Draft fetch failed: ' + JSON.stringify(draft))
  if (!draft.content.content[0].props._els[0].responsive?.mobile) throw new Error('Mobile overrides were not saved')
  const published = await (await context.request.get('http://localhost:3107/api/pages/1?locale=vi')).json()
  if (published.content.content[0].props._els[0].responsive?.mobile) throw new Error('Draft layout leaked into the published page')
  const header = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'draft-header', height: 100, _els: [{ id: 'draft-header-label', type: 'text', x: 80, y: 20, w: 800, h: 50, props: { text: 'Draft header preview', size: 28 } }] } }] }
  const headerSave = await context.request.post('http://localhost:3107/api/globals/site-areas?draft=true&locale=vi', { headers: { Origin: 'http://localhost:3107' }, data: { siteHeader: header, _status: 'draft' } })
  if (!headerSave.ok()) throw new Error('Header draft failed: ' + await headerSave.text())
  await page.goto('http://localhost:3107/?preview=1', { timeout: 120000 })
  await page.getByText('Draft header preview', { exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 900 })
  const previewHeading = page.getByRole('heading', { name: 'Studio responsive preview', exact: true }).filter({ visible: true })
  if (Math.abs(parseFloat(await previewHeading.evaluate((node) => getComputedStyle(node).fontSize)) - 36) > 1) throw new Error('Preview did not use draft layout')
  if (!(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex')) throw new Error('Preview must be noindex')
  const guest = await browser.newContext({ viewport: { width: 390, height: 900 } })
  await guest.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort())
  const guestPage = await guest.newPage()
  await guestPage.goto('http://localhost:3107/?preview=1', { timeout: 90000 })
  await guestPage.getByText('Published header', { exact: true }).waitFor()
  if (await guestPage.getByText('Draft header preview', { exact: true }).count()) throw new Error('Anonymous preview leaked draft header')
  const guestHeading = guestPage.getByRole('heading', { name: 'Studio responsive preview', exact: true })
  if (Math.abs(parseFloat(await guestHeading.evaluate((node) => getComputedStyle(node).fontSize)) - 19.5) > 1) throw new Error('Anonymous preview leaked draft page')
  await guest.close()
  await page.setViewportSize({ width: 1440, height: 1100 })
  console.log('PASS authenticated full-site preview, noindex and anonymous draft isolation')
  await page.goto('http://localhost:3107/admin/releases', { timeout: 120000 })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  await page.getByRole('heading', { name: 'Thay đổi chờ xuất bản', exact: false }).waitFor()
  console.log('RELEASE', (await page.locator('body').innerText()).slice(-2200))
  await page.screenshot({ path: join(repo, 'output/studio-upgrades-release-review.png'), fullPage: true })
  const warnings = page.getByRole('checkbox', { name: 'Tôi đã xem các cảnh báo và muốn xuất bản các mục đã chọn.' })
  if (await warnings.count()) await warnings.check()
  await page.getByRole('button', { name: /^Xuất bản \d+ mục$/ }).click()
  await page.getByText('Đã xuất bản các thay đổi đã chọn.', { exact: true }).waitFor()
  await page.goto('http://localhost:3107', { timeout: 90000 })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const heading = page.getByRole('heading', { name: 'Studio responsive preview', exact: true })
    await heading.waitFor()
    const count = await heading.count()
    const visible = []
    for (const node of await heading.all()) if (await node.isVisible()) visible.push(node)
    if (visible.length !== 1) throw new Error(`Expected one heading at ${width}px; total=${count}, visible=${visible.length}`)
    const box = await visible[0].boundingBox()
    if (box.x < 0 || box.x + box.width > width + 1) throw new Error(`Overflow at ${width}px`)
    const font = await visible[0].evaluate((node) => getComputedStyle(node).fontSize)
    if (width === 390 && Math.abs(parseFloat(font) - 36) > 1) throw new Error('Mobile font mismatch: ' + font)
    await page.screenshot({ path: join(repo, `output/studio-upgrades-public-${width}.png`), fullPage: true })
    console.log('PASS public rendering', width, 'font', font)
  }
  if (errors.length) throw new Error('Browser errors: ' + JSON.stringify(errors))
  console.log('PASS editor stack/save, draft isolation, review/publish UI, public responsive rendering and browser console')
} finally {
  if (browser) await browser.close()
  server.kill()
  await writeFile(logPath, serverLog)
}
