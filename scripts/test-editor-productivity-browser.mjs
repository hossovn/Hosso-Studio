import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { chromium } = require(process.env.HOSSO_PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.HOSSO_EDITOR_ORIGIN || 'http://localhost:3111'
assert.ok(/^http:\/\/localhost:\d+$/.test(origin), 'Only use the disposable local fixture')
const browser = await chromium.launch({ headless: true })
let diagnosticPage
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, extraHTTPHeaders: { Origin: origin } })
  await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort())
  const login = await context.request.post(origin + '/api/users/login', { timeout: 120000, data: { email: 'browser@studio.test', password: 'studio-browser-test-password' } })
  assert.ok(login.ok(), await login.text())
  const fixture = await context.request.get(origin + '/api/pages/1?draft=true')
  assert.equal((await fixture.json()).title, 'Studio test', 'Refuse edits outside the disposable fixture')
  const content = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'productivity', height: 600, _els: [
    { id: 'alpha', type: 'text', x: 100, y: 100, w: 250, h: 70, props: { text: 'Alpha', size: 30 } },
    { id: 'beta', type: 'text', x: 450, y: 100, w: 250, h: 70, props: { text: 'Beta', size: 24 } },
  ] } }] }
  const created = await context.request.post(origin + '/api/pages', { data: { title: 'Studio productivity test', slug: 'productivity-' + Date.now(), content, _status: 'draft' } })
  assert.ok(created.ok(), await created.text())
  const doc = (await created.json()).doc
  const api = origin + '/api/pages/' + doc.id + '?draft=true'
  const page = await context.newPage(), errors = []
  diagnosticPage = page
  page.setDefaultTimeout(15000)
  let blockSaves = false
  await page.route('**/api/pages/' + doc.id + '?*', (route) => blockSaves && route.request().method() === 'PATCH' ? route.abort() : route.continue())
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto(origin + '/editor/' + doc.id + '?block=productivity', { timeout: 120000 })
  await page.locator('.cv-editor').waitFor({ timeout: 120000 })
  await page.getByRole('button', { name: 'Bỏ qua hướng dẫn', exact: true }).click()
  await page.getByRole('button', { name: 'Trợ giúp Studio', exact: true }).click()
  await page.getByRole('dialog', { name: 'Trợ giúp Studio', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  const frame = page.locator('iframe[title="Trang"]').contentFrame()
  await frame.locator('[data-element="alpha"]').waitFor()
  const rail = page.getByRole('navigation', { name: 'Công cụ', exact: true })
  await rail.getByRole('button', { name: 'Căn chỉnh', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Hiện thước và guide', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Hiện lưới', exact: true }).check()
  const ruler = frame.getByRole('button', { name: 'Thước ngang: kéo để thêm guide ngang', exact: true })
  const rect = await ruler.boundingBox()
  await page.mouse.move(rect.x + 800, rect.y + 8)
  await page.mouse.down(); await page.mouse.move(rect.x + 800, rect.y + 260, { steps: 8 }); await page.mouse.up()
  const guide = frame.getByRole('slider', { name: 'Guide ngang', exact: true })
  await guide.waitFor()
  assert.ok(Number(await guide.getAttribute('aria-valuenow')) > 100)
  await guide.focus(); await guide.press('ArrowDown')
  await rail.getByRole('button', { name: 'Cấu trúc', exact: true }).click()
  await page.locator('.cv-layer-row input[type=checkbox]').nth(0).check()
  await page.locator('.cv-layer-row input[type=checkbox]').nth(1).check()
  await page.getByRole('spinbutton', { name: 'Hàng loạt: Cỡ chữ', exact: true }).fill('36')
  const save = async () => {
    const [res] = await Promise.all([page.waitForResponse((res) => res.url().includes('/api/pages/' + doc.id + '?') && res.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()])
    assert.ok(res.ok(), await res.text())
    return (await res.json()).doc
  }
  let saved = await save()
  assert.deepEqual(saved.content.content[0].props._els.map((el) => el.props.size), [36, 36])
  assert.equal(saved.content.content[0].props._guides.length, 1)
  console.log('PASS browser onboarding/help, ruler pointer drag, guide keyboard nudge, grid and persisted bulk style')

  // Disable network before editing, then reload from the server and restore the tab-local record.
  blockSaves = true
  await context.setOffline(true)
  await page.getByRole('spinbutton', { name: 'Hàng loạt: Cỡ chữ', exact: true }).fill('42')
  await page.waitForFunction(() => Object.keys(localStorage).some((key) => key.startsWith('hosso-recovery:v1:') && JSON.parse(localStorage[key]).data.content[0].props._els[0].props.size === 42))
  await context.setOffline(false)
  await page.reload({ timeout: 120000 })
  await page.getByRole('button', { name: 'Khôi phục', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Khôi phục', exact: true }).click()
  blockSaves = false
  saved = await save()
  assert.deepEqual(saved.content.content[0].props._els.map((el) => el.props.size), [42, 42])
  console.log('PASS browser offline recovery survives reload and saves the restored document')

  // A server update after editor load must not be overwritten by the existing tab.
  const external = await context.request.patch(api, { data: { description: 'Changed outside this editor', _status: 'draft' } })
  assert.ok(external.ok(), await external.text())
  const [stale] = await Promise.all([page.waitForResponse((res) => res.url().includes('/api/pages/' + doc.id + '?') && res.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()])
  assert.equal(stale.status(), 409, await stale.text())
  await page.getByRole('button', { name: 'Dùng bản của tôi', exact: true }).click()
  await page.getByText(/Đã chọn bản của bạn/).waitFor()
  await save()
  console.log('PASS real server stale revision rejection and explicit conflict resolution')
  await page.close()

  const sessionA = 'productivity-session-a', sessionB = 'productivity-session-b', key = `pages:${doc.id}:vi`
  const lock = async (session, extra = {}) => (await context.request.post(origin + '/api/site/lock', { data: { key, session, ...extra } })).json()
  assert.equal((await lock(sessionA, { takeover: true })).ok, true)
  assert.equal((await lock(sessionB)).ok, false, 'Tabs using the same account have independent lock sessions')
  const latest = await (await context.request.get(api)).json()
  assert.equal((await lock(sessionB, { takeover: true })).ok, true)
  const revoked = await context.request.patch(api, { headers: { 'x-hosso-editor-base': latest.updatedAt, 'x-hosso-editor-session': sessionA, 'x-hosso-editor-key': key }, data: { content: latest.content, _status: 'draft' } })
  assert.equal(revoked.status(), 409)
  await lock(sessionB, { release: true })
  console.log('PASS real server same-account tab locks and revoked session rejection')
  const popupContent = (mode, extra = {}) => ({ root: { props: {} }, content: [
    { type: 'FreeCanvas', props: { id: 'public-hero', height: 2400, _els: [{ id: 'open-offer', type: 'button', x: 800, y: 80, w: 240, h: 60, props: { text: 'Open offer', href: '#popup:offer', size: 20 } }] } },
    { type: 'Popup', props: { id: 'public-offer', title: 'Productivity offer', body: 'Popup fixture', ctaLabel: 'Continue', ctaHref: '#done', trigger: mode, triggerKey: 'offer', every: 'session', delay: 0, scrollAt: 50, ...extra } },
  ] })
  const publicPage = await context.newPage()
  diagnosticPage = publicPage
  publicPage.setDefaultTimeout(15000)
  publicPage.on('pageerror', (error) => errors.push(error.message))
  const showFixture = async (mode, extra = {}) => {
    const res = await context.request.patch(api, { data: { content: popupContent(mode, extra), _status: 'draft' } })
    assert.ok(res.ok(), await res.text())
    await publicPage.goto(origin + '/' + doc.slug + '?preview=1', { timeout: 120000 })
    await publicPage.waitForLoadState('networkidle')
  }
  await showFixture('click')
  const modal = publicPage.getByRole('dialog', { name: 'Productivity offer', exact: true })
  await publicPage.getByRole('link', { name: 'Open offer', exact: true }).click()
  await modal.waitFor()
  assert.equal(await publicPage.evaluate(() => document.body.style.overflow), 'hidden')
  await publicPage.keyboard.press('Escape')
  await modal.waitFor({ state: 'hidden' })
  assert.notEqual(await publicPage.evaluate(() => document.body.style.overflow), 'hidden')
  await publicPage.getByRole('link', { name: 'Open offer', exact: true }).click()
  await modal.waitFor()
  await modal.getByRole('button', { name: 'Đóng popup', exact: true }).click()
  await showFixture('scroll', { every: 'always' })
  assert.equal(await modal.isVisible(), false)
  await publicPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await modal.waitFor()
  await showFixture('delay', { every: 'always' })
  await modal.waitFor()
  await showFixture('delay', { every: 'once' })
  await modal.waitFor()
  await publicPage.reload()
  await publicPage.waitForLoadState('networkidle')
  assert.equal(await modal.isVisible(), false, 'Once popup stays dismissed after reload')
  await showFixture('delay', { every: 'always', device: 'mobile' })
  await publicPage.waitForLoadState('networkidle')
  assert.equal(await modal.isVisible(), false, 'Mobile-only popup is suppressed on desktop')
  await publicPage.setViewportSize({ width: 390, height: 844 })
  await publicPage.reload()
  await modal.waitFor()
  console.log('PASS real browser popup click/reopen, Escape, scroll lock, scroll/delay triggers, once frequency and mobile targeting')
  const queued = popupContent('delay', { every: 'always' })
  queued.content.push({ type: 'Popup', props: { id: 'second-offer', title: 'Second offer', trigger: 'delay', every: 'always', delay: 0 } })
  const queueSave = await context.request.patch(api, { data: { content: queued, _status: 'draft' } })
  assert.ok(queueSave.ok(), await queueSave.text())
  await publicPage.reload()
  await modal.waitFor()
  assert.equal(await publicPage.locator('dialog[open]').count(), 1)
  await modal.getByRole('button', { name: 'Đóng popup', exact: true }).click()
  const second = publicPage.getByRole('dialog', { name: 'Second offer', exact: true })
  await second.waitFor()
  await second.getByRole('button', { name: 'Đóng popup', exact: true }).click()
  assert.notEqual(await publicPage.evaluate(() => document.body.style.overflow), 'hidden')
  console.log('PASS simultaneous popups wait their turn and restore body scrolling')
  assert.deepEqual(errors, [])
  await context.close()
} catch (error) {
  if (diagnosticPage && !diagnosticPage.isClosed()) console.error((await diagnosticPage.locator('body').innerText()).slice(0, 16000))
  throw error
} finally { await browser.close() }
