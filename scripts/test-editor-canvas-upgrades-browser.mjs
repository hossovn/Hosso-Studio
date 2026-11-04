import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { chromium } = require(process.env.HOSSO_PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.HOSSO_EDITOR_ORIGIN || 'http://localhost:3111'
assert.match(origin, /^http:\/\/localhost:\d+$/)
const browser = await chromium.launch({ headless: true })
let page
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'], extraHTTPHeaders: { Origin: origin } })
  await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort())
  await context.addInitScript(() => localStorage.setItem('hosso-editor-intro:v2', 'done'))
  const login = await context.request.post(origin + '/api/users/login', { timeout: 120000, data: { email: 'browser@studio.test', password: 'studio-browser-test-password' } }); assert.ok(login.ok())
  assert.equal((await (await context.request.get(origin + '/api/pages/1?draft=true')).json()).title, 'Studio test')
  const stamp = Date.now(), slug = 'canvas-upgrades-' + stamp
  const source = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'template-section', height: 400, _bgHex: '#ffffff', _els: [{ id: 'template-text', type: 'text', x: 100, y: 100, w: 400, h: 80, props: { text: 'Original template', size: 36, color: '#222222' } }] } }] }
  const templateResponse = await context.request.post(origin + '/api/reusable-blocks', { data: { title: 'Canvas upgrade template', slug, content: source, _status: 'published' } }); assert.ok(templateResponse.ok(), await templateResponse.text()); const template = (await templateResponse.json()).doc
  const content = { root: { props: {} }, content: [
    { type: 'FreeCanvas', props: { id: 'main', height: 900, _els: [
      { id: 'alpha', type: 'text', x: 100, y: 100, w: 250, h: 70, props: { text: 'Alpha', size: 30 } },
      { id: 'beta', type: 'text', x: 450, y: 100, w: 250, h: 70, props: { text: 'Beta', size: 24 } },
    ] } },
    { type: 'FreeCanvas', props: { id: 'destination', height: 1600, _els: [] } },
    { type: 'Reusable', props: { id: 'linked', slug } },
    { type: 'Popup', props: { id: 'offer', triggerKey: 'offer', title: 'Upgrade offer', body: 'Offer content', trigger: 'click' } },
  ] }
  const response = await context.request.post(origin + '/api/pages', { data: { title: 'Canvas upgrades fixture', slug, content, _status: 'draft' } }); assert.ok(response.ok(), await response.text()); const doc = (await response.json()).doc
  page = await context.newPage(); page.setDefaultTimeout(20000); const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin + '/editor/' + doc.id + '?block=main', { timeout: 120000 }); await page.locator('.cv-editor').waitFor({ timeout: 120000 })
  const frame = page.locator('iframe[title="Trang"]').contentFrame(), alpha = frame.locator('[data-element="alpha"]')
  await alpha.waitFor(); const section = frame.locator('[data-block="main"]'), rect = await section.boundingBox(), factor = rect.width / 1200
  await page.mouse.move(rect.x + 70 * factor, rect.y + 70 * factor); await page.mouse.down(); await page.mouse.move(rect.x + 750 * factor, rect.y + 220 * factor, { steps: 10 }); await page.mouse.up()
  await frame.locator('[data-multi-bounds]').waitFor()
  await frame.locator('body').press('ArrowRight')
  await page.getByRole('button', { name: 'Nhân đôi phần tử', exact: true }).click(); assert.equal(await frame.locator('[data-element]').count(), 4)
  await frame.locator('body').press('Control+z'); assert.equal(await frame.locator('[data-element]').count(), 2)
  // Re-select after undo and exercise keyboard resize plus clipboard on the actual canvas.
  await alpha.click(); await frame.locator('[data-element="beta"]').click({ modifiers: ['Shift'] }); await frame.getByRole('button', { name: 'Resize tập chọn se', exact: true }).focus(); await frame.getByRole('button', { name: 'Resize tập chọn se', exact: true }).press('ArrowRight')
  await frame.locator('body').press('Control+c'); await frame.locator('body').press('Control+v'); await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('[data-element]').length === 4)
  await frame.locator('body').press('Delete'); assert.equal(await frame.locator('[data-element]').count(), 2)
  console.log('PASS browser marquee, multi nudge/resize/duplicate/copy/paste/delete and undo')
  // Pan from blank space; zoom with wheel and navigate through the map.
  await page.keyboard.down('Space'); await page.mouse.move(rect.x + 850 * factor, rect.y + 450 * factor); await page.mouse.down(); await page.mouse.move(rect.x + 850 * factor, rect.y + 150 * factor, { steps: 10 }); await page.mouse.up(); await page.keyboard.up('Space')
  assert.ok(await frame.locator('body').evaluate((body) => body.ownerDocument.defaultView.scrollY) > 100)
  await page.mouse.move(rect.x + 600 * factor, rect.y + 300 * factor); await page.keyboard.down('Control'); await page.mouse.wheel(0, -100); await page.keyboard.up('Control')
  await page.getByRole('button', { name: 'Bản đồ', exact: true }).click(); await page.waitForFunction(() => Number(document.querySelector('[aria-label="Bản đồ trang"]').getAttribute('aria-valuemax')) > 1000); await page.getByRole('slider', { name: 'Bản đồ trang', exact: true }).press('End'); await page.waitForFunction(() => document.querySelector('iframe').contentWindow.scrollY > 500)
  await page.getByRole('slider', { name: 'Bản đồ trang', exact: true }).press('Home')
  await page.getByRole('button', { name: 'Vừa vùng chọn', exact: true }).click()
  console.log('PASS browser Space pan, wheel zoom, fit selection and keyboard minimap')
  const rail = page.getByRole('navigation', { name: 'Công cụ', exact: true })
  await rail.getByRole('button', { name: 'Thiết bị', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Chiều rộng breakpoint mới', exact: true }).fill('900'); await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  assert.equal(await page.getByRole('spinbutton', { name: 'Chiều rộng canvas', exact: true }).inputValue(), '900')
  await page.getByRole('spinbutton', { name: 'Chiều rộng canvas', exact: true }).fill('850')
  await page.getByTitle('Vừa khung', { exact: true }).click()
  await alpha.click(); await frame.locator('body').press('ArrowRight')
  const save = async () => { const [saved] = await Promise.all([page.waitForResponse((res) => res.url().includes(`/api/pages/${doc.id}?`) && res.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()]); assert.ok(saved.ok(), await saved.text()); return (await saved.json()).doc }
  let saved = await save(); assert.equal(saved.content.root.props._breakpoints[0].width, 900); assert.ok(saved.content.content[0].props._els[0].responsive['bp-900'])
  await page.getByRole('button', { name: 'Điện thoại', exact: true }).click(); await page.getByRole('spinbutton', { name: 'Chiều rộng canvas', exact: true }).fill('390')
  await page.getByRole('button', { name: 'Máy tính', exact: true }).click()
  await page.getByTitle('Đóng bảng công cụ', { exact: true }).click()
  await page.getByRole('button', { name: 'Bảng phần tử', exact: true }).count().then(async (count) => { if (count && await page.getByRole('button', { name: 'Bảng phần tử', exact: true }).isVisible()) await page.getByRole('button', { name: 'Bảng phần tử', exact: true }).click() })
  console.log('PASS browser continuous width, custom breakpoint editing and saved independent override')
  // Inspect link actions and choose a section visually.
  await alpha.click(); await page.getByRole('button', { name: 'Bảng thuộc tính', exact: true }).click(); await page.getByRole('tab', { name: 'Nội dung', exact: true }).click()
  const action = page.getByRole('combobox', { name: 'Hành động khi bấm', exact: true })
  const grip = page.getByRole('button', { name: 'Kéo bảng thuộc tính', exact: true }), beforePanel = await page.locator('.cv-right-slot').boundingBox(), gripRect = await grip.boundingBox()
  await page.mouse.move(gripRect.x + 12, gripRect.y + 12); await page.mouse.down(); await page.mouse.move(gripRect.x - 180, gripRect.y + 65, { steps: 8 }); await page.mouse.up()
  const movedPanel = await page.locator('.cv-right-slot').boundingBox(); assert.ok(movedPanel.x < beforePanel.x - 100); assert.ok(movedPanel.y >= beforePanel.y)
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('hosso-inspector-position:v1')).x > 0))
  await grip.press('ArrowLeft'); await grip.press('Home'); assert.equal(await page.locator('.cv-right-slot').getAttribute('data-detached'), 'false')
  console.log('PASS browser inspector pointer drag, keyboard movement, saved position and reset')
  await action.selectOption('phone'); await page.getByRole('textbox', { name: 'Giá trị hành động', exact: true }).fill('+84 912 345 678'); assert.equal(await action.inputValue(), 'phone')
  await action.selectOption('popup'); await page.getByRole('combobox', { name: 'Đích hành động', exact: true }).selectOption('offer')
  await action.selectOption('section'); await page.getByRole('button', { name: 'Chọn đích trên canvas', exact: true }).click(); await frame.locator('[data-block="destination"]').click({ position: { x: 700, y: 100 } })
  saved = await save(); assert.equal(saved.content.content[0].props._els[0].props.href, '#hs-section-destination'); assert.equal(saved.content.content[1].props._anchor, true)
  console.log('PASS browser phone/popup/section action UI, empty draft state and canvas target selection')
  // Linked instance keeps its content override while a source layout edit arrives.
  await frame.locator('[data-block="linked"]').click({ position: { x: 600, y: 30 } }); await page.getByRole('tab', { name: 'Nội dung', exact: true }).click()
  await page.getByRole('textbox', { name: 'template-section::template-text text', exact: true }).fill('Instance content')
  await frame.locator('[data-reusable-preview="linked"]').getByText('Instance content', { exact: true }).first().waitFor()
  const nextSource = structuredClone(source); nextSource.content[0].props.height = 500; nextSource.content[0].props._els[0].x = 160
  const templateUpdate = await context.request.patch(origin + '/api/reusable-blocks/' + template.id, { data: { content: nextSource, _status: 'published' } }); assert.ok(templateUpdate.ok(), await templateUpdate.text())
  await page.getByRole('button', { name: 'Cập nhật từ mẫu gốc', exact: true }).click(); await frame.locator('[data-reusable-preview="linked"]').getByText('Instance content', { exact: true }).first().waitFor()
  saved = await save(); assert.equal(saved.content.content[2].props.overrides['template-section::template-text'].text, 'Instance content')
  console.log('PASS browser linked template live preview, per-instance copy and source refresh')
  await page.close(); page = null
  // Publish fixture through the API and verify actual public rendering at the custom breakpoint.
  const published = await context.request.patch(origin + '/api/pages/' + doc.id, { data: { content: saved.content, _status: 'published' } }); assert.ok(published.ok(), await published.text())
  const draftSource = structuredClone(nextSource); draftSource.content[0].props.height = 700
  const draftTemplate = await context.request.patch(origin + '/api/reusable-blocks/' + template.id + '?draft=true', { data: { content: draftSource, _status: 'draft' } }); assert.ok(draftTemplate.ok(), await draftTemplate.text())
  page = await context.newPage(); await page.setViewportSize({ width: 850, height: 900 }); await page.goto(origin + '/' + slug, { timeout: 120000 })
  const visibleText = page.getByText('Instance content', { exact: true }); assert.ok(await visibleText.count() >= 1)
  assert.equal(await visibleText.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().height > 0).length), 1)
  const publicAlpha = page.getByText('Alpha', { exact: true })
  assert.deepEqual(await publicAlpha.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().height > 0).map((n) => n.closest('[data-hs-variant]').dataset.hsVariant)), ['bp-900'])
  assert.equal(Math.round(await page.locator('[data-hs-variants="linked__template-section-height"] > [data-hs-variant="bp-900"]').evaluate((node) => node.getBoundingClientRect().height * 1200 / 850)), 500, 'public page inherits published source layout, excluding draft source edits')
  assert.ok(await page.locator('#hs-section-destination').count())
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log('PASS browser published custom breakpoint variants, scoped template overrides and native section anchor')
} catch (error) {
  if (page) { console.error('URL', page.url()); console.error((await page.locator('body').innerText().catch(() => '')).slice(-3500)); await page.screenshot({ path: 'output/editor-canvas-upgrades-failure.png' }).catch(() => {}) }
  throw error
} finally { await browser.close() }
