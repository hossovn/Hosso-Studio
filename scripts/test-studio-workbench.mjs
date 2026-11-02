import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { chromium } = require(process.env.HOSSO_PLAYWRIGHT_MODULE || 'playwright')
const repo = fileURLToPath(new URL('../', import.meta.url))
const output = join(repo, 'output/studio-workbench-2026-11-02')
await mkdir(output, { recursive: true })
const directory = await mkdtemp(join(tmpdir(), 'hosso-studio-browser-'))
const origin = 'http://localhost:3111'
const env = { ...process.env, HOSSO_DATABASE_URL: 'file:' + join(directory, 'studio.db').replaceAll('\\', '/'), HOSSO_SECRET: 'studio-workbench-disposable-secret', HOSSO_SEED: 'false', HOSSO_SCRIPT: '1', HOSSO_ADMIN_EMAIL: 'browser@studio.test', HOSSO_ADMIN_PASSWORD: 'studio-browser-test-password', HOSSO_SMTP_URL: '', HOSSO_DB_PUSH: 'true', HOSSO_PUBLIC_URL: origin, NODE_ENV: 'development', HOSSO_ADMIN_PREVIEW: '1' }
env.HOSSO_MEDIA_DIR = join(directory, 'media')
const root = join(repo, 'apps/studio')
const seed = spawn(process.execPath, [join(dirname(require.resolve('payload')), '..', 'bin.js'), 'run', 'scripts/seed-studio-upgrades.ts'], { cwd: root, stdio: 'inherit', env })
await new Promise((resolve, reject) => seed.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Fixture failed'))))
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', '3111'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env })
let log = ''
server.stdout.on('data', (chunk) => { log += chunk })
server.stderr.on('data', (chunk) => { log += chunk })
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(origin + '/api/health', { signal: AbortSignal.timeout(3000) })).ok) { ready = true; break } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  assert.ok(ready, log.slice(-4000))
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort())
  const login = await context.request.post(origin + '/api/users/login', { data: { email: env.HOSSO_ADMIN_EMAIL, password: env.HOSSO_ADMIN_PASSWORD } })
  assert.ok(login.ok(), await login.text())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' && /hydration|cannot be a descendant|cannot contain a nested/i.test(message.text())) errors.push(message.text()) })
  const json = async (path, options) => {
    const response = await context.request.fetch(origin + path, { ...options, headers: { Origin: origin, ...options?.headers } })
    assert.ok(response.ok(), await response.text())
    return response.json()
  }
  const savePage = async () => {
    const [response] = await Promise.all([page.waitForResponse((response) => response.url().includes('/api/pages/') && response.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()])
    assert.ok(response.ok(), await response.text())
  }
  await page.goto(origin + '/editor/1?block=hero', { timeout: 120000 })
  await page.getByRole('toolbar', { name: 'Công cụ canvas' }).waitFor({ timeout: 90000 })
  await page.locator('iframe').first().contentFrame().locator('[data-block="hero"]').waitFor()
  const rail = page.getByRole('navigation', { name: 'Công cụ', exact: true })
  await rail.getByRole('button', { name: 'Phần', exact: true }).hover()
  assert.equal(await page.locator('.cv-panel').count(), 0, 'Hover must not open tools')
  await page.screenshot({ path: join(output, 'editor-desktop.png') })
  await rail.getByRole('button', { name: 'Phần', exact: true }).click()
  await page.mouse.move(1300, 140)
  assert.ok(await page.locator('.cv-panel[data-module=sections]').isVisible(), 'Panel remains open after pointer leaves')
  await page.getByRole('button', { name: 'Hình ảnh & chuyển động', exact: true }).click()
  assert.ok(await page.locator('.cv-section-card').count() >= 3)
  await page.screenshot({ path: join(output, 'sections-desktop.png') })
  await page.getByRole('button', { name: 'Tất cả mẫu', exact: true }).click()
  await page.getByRole('button', { name: 'Phần trống Tự thiết kế theo ý bạn' }).click()
  await savePage()
  assert.equal((await json('/api/pages/1?draft=true')).content.content.length, 2)
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click()
  await savePage()
  assert.equal((await json('/api/pages/1?draft=true')).content.content.length, 1)
  await rail.getByRole('button', { name: 'Kho mẫu', exact: true }).click()
  assert.equal(await page.locator('.cv-template-card').count(), 8)
  await page.locator('.cv-template-thumb').first().click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Đóng xem mẫu', exact: true }).click()
  await page.locator('.cv-template-actions').first().getByRole('button', { name: 'Chèn mẫu', exact: true }).click()
  await savePage()
  const inserted = (await json('/api/pages/1?draft=true')).content.content
  assert.equal(inserted.length, 4)
  assert.equal(new Set(inserted.map((block) => block.props.id)).size, 4)
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click()
  await savePage()
  assert.equal((await json('/api/pages/1?draft=true')).content.content.length, 1)
  console.log('PASS deliberate panels, section insertion, page templates and one-step undo')

  const publishedBrand = await json('/api/globals/site-settings')
  await rail.getByRole('button', { name: 'Thương hiệu', exact: true }).click()
  await page.getByRole('textbox', { name: 'Mã màu Màu chính', exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Mã màu Màu chính', exact: true }).fill('#123')
  assert.ok(await page.getByRole('button', { name: 'Lưu thương hiệu', exact: true }).isDisabled())
  await page.getByRole('textbox', { name: 'Mã màu Màu chính', exact: true }).fill('#234abc')
  await page.waitForFunction(() => getComputedStyle(document.querySelector('iframe').contentDocument.documentElement).getPropertyValue('--hs-primary').trim() === '#234abc')
  await rail.getByRole('button', { name: 'Phần', exact: true }).click()
  await rail.getByRole('button', { name: 'Thương hiệu', exact: true }).click()
  assert.equal(await page.getByRole('textbox', { name: 'Mã màu Màu chính', exact: true }).inputValue(), '#234abc')
  const brandRoute = '**/api/globals/site-settings?draft=true&locale=vi'
  await page.route(brandRoute, (route) => route.request().method() === 'POST' ? route.fulfill({ status: 503, body: '{}' }) : route.continue())
  await page.getByRole('button', { name: 'Lưu thương hiệu', exact: true }).click()
  await page.getByText('Chưa lưu được thương hiệu. Các thay đổi vẫn được giữ để bạn thử lại.', { exact: false }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Mã màu Màu chính', exact: true }).inputValue(), '#234abc')
  await page.unroute(brandRoute)
  await page.getByRole('button', { name: 'Lưu thương hiệu', exact: true }).click()
  await page.getByText('Đã lưu bản nháp thương hiệu.', { exact: true }).waitFor()
  assert.equal((await json('/api/globals/site-settings?draft=true')).tokens_default.color_primary, '#234abc')
  assert.deepEqual((await json('/api/globals/site-settings')).tokens_default, publishedBrand.tokens_default, 'Brand edits must remain a draft')
  await page.screenshot({ path: join(output, 'brand-desktop.png') })
  await page.setViewportSize({ width: 375, height: 900 })
  assert.ok(await page.getByRole('button', { name: 'Lưu nháp', exact: true }).isHidden())
  await page.getByRole('button', { name: 'Tác vụ trang', exact: true }).click()
  assert.ok(await page.getByRole('button', { name: 'Lưu nháp', exact: true }).isVisible())
  await page.getByRole('button', { name: 'Tác vụ trang', exact: true }).click()
  await rail.getByRole('button', { name: 'Kho mẫu', exact: true }).click()
  await page.screenshot({ path: join(output, 'library-mobile.png') })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No document overflow at 375px')
  const panelBox = await page.locator('.cv-panel').boundingBox()
  assert.ok(panelBox.x + panelBox.width <= 376, 'Gallery must fit within mobile viewport')
  console.log('PASS live brand preview, retained edits, draft save/isolation and 375px library')

  const media = (await json('/api/media', { method: 'POST', multipart: { _payload: JSON.stringify({ alt: 'Workbench product photo' }), file: { name: 'workbench.jpg', mimeType: 'image/jpeg', buffer: await readFile(join(repo, 'apps/studio/public/editor-templates/workspace.jpg')) } } })).doc
  const first = (await json('/api/shop-products', { method: 'POST', data: { name: 'Workbench Alpha', code: 'WB-ALPHA', price: 1000, stock: 10, active: true, images: [{ image: media.id }] } })).doc
  const second = (await json('/api/shop-products', { method: 'POST', data: { name: 'Workbench Beta', code: 'WB-BETA', price: 2000, stock: 10, active: true } })).doc
  const productPage = (await json('/api/pages', { method: 'POST', data: { title: 'Workbench products', slug: 'workbench-products', _status: 'published', content: { root: { props: {} }, content: [{ type: 'ShopProductGrid', props: { id: 'curated-products', heading: 'Selected products', pageSize: 12, pager: 'no' } }] } } })).doc
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${origin}/editor/${productPage.id}?block=curated-products`, { timeout: 120000 })
  await page.getByRole('combobox', { name: 'Nguồn sản phẩm', exact: true }).waitFor({ timeout: 90000 })
  await page.getByRole('combobox', { name: 'Nguồn sản phẩm', exact: true }).selectOption('manual')
  await page.locator('.cv-product-option img').waitFor()
  assert.ok((await page.locator('.cv-product-option img').getAttribute('src')).includes(media.filename), 'Picker uses the real product media model')
  assert.equal(await page.locator('.cv-product-option .cv-product-placeholder').count(), 1, 'Only the genuinely missing image uses a placeholder')
  await page.getByRole('checkbox', { name: /Workbench Alpha/ }).check()
  await page.getByRole('searchbox', { name: 'Tìm sản phẩm để hiển thị', exact: true }).fill('WB-BETA')
  await page.getByRole('checkbox', { name: /Workbench Beta/ }).waitFor()
  assert.ok(await page.getByRole('button', { name: 'Bỏ chọn Workbench Alpha', exact: true }).isVisible(), 'Search preserves existing selections')
  await savePage()
  assert.deepEqual((await json(`/api/pages/${productPage.id}?draft=true`)).content.content[0].props.productIds, [first.id])
  await page.reload({ timeout: 120000 })
  await page.getByRole('button', { name: 'Bỏ chọn Workbench Alpha', exact: true }).waitFor({ timeout: 90000 })
  const frame = page.locator('iframe').first().contentFrame()
  await frame.getByText('Workbench Alpha', { exact: true }).first().waitFor({ timeout: 30000 })
  assert.equal(await frame.getByText('Workbench Beta', { exact: true }).count(), 0)
  await page.screenshot({ path: join(output, 'products-desktop.png') })
  await page.getByRole('button', { name: 'Bỏ chọn tất cả', exact: true }).click()
  await savePage()
  assert.deepEqual((await json(`/api/pages/${productPage.id}?draft=true`)).content.content[0].props.productIds, [])
  await frame.getByText('Workbench Alpha', { exact: true }).first().waitFor({ state: 'hidden' })
  await page.getByRole('combobox', { name: 'Nguồn sản phẩm', exact: true }).selectOption('auto')
  await savePage()
  assert.equal((await json(`/api/pages/${productPage.id}?draft=true`)).content.content[0].props.productIds, null)
  await frame.getByText('Workbench Beta', { exact: true }).first().waitFor({ timeout: 30000 })
  assert.equal(second.active, true)
  console.log('PASS manual product selection, persistence, actual loader filtering, empty selection and automatic mode')
  assert.deepEqual(errors, [], 'No browser errors')
  await writeFile(join(output, 'result.json'), JSON.stringify({ passed: true, screenshots: ['editor-desktop.png', 'sections-desktop.png', 'brand-desktop.png', 'library-mobile.png', 'products-desktop.png'] }, null, 2))
} finally {
  if (browser) await browser.close()
  server.kill()
  await writeFile(join(output, 'server.log'), log)
}
