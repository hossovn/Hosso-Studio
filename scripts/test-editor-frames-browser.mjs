import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createFrameLayout } from '../packages/blocks/src/frame-layout.ts'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { chromium } = require(process.env.HOSSO_PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.HOSSO_EDITOR_ORIGIN || 'http://localhost:3111'
assert.match(origin, /^http:\/\/localhost:\d+$/)
const browser = await chromium.launch({ headless: true })
let page
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, extraHTTPHeaders: { Origin: origin } })
  await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort())
  await context.addInitScript(() => localStorage.setItem('hosso-editor-intro:v2', 'done'))
  assert.ok((await context.request.post(origin + '/api/users/login', { timeout: 120000, data: { email: 'browser@studio.test', password: 'studio-browser-test-password' } })).ok())
  assert.equal((await (await context.request.get(origin + '/api/pages/1?draft=true')).json()).title, 'Studio test')
  const slug = 'frames-' + Date.now()
  const fields = [{ label: 'Nhu cầu', name: 'kind', type: 'select', options: 'Cá nhân,Doanh nghiệp', required: true }, { label: 'Tên công ty', name: 'company', type: 'text', required: true }, { label: 'Email', name: 'email', type: 'email', required: true }]
  const rules = { steps: ['Nhu cầu', 'Liên hệ'], fields: { company: { step: 1, when: { field: 'kind', operator: 'equals', value: 'Doanh nghiệp' }, minLength: 3 }, email: { step: 1 } } }
  const formResponse = await context.request.post(origin + '/api/forms', { data: { title: 'Form nhiều bước ' + slug, slug, fields, rules, submitLabel: 'Gửi đăng ký', successMessage: 'Đã nhận đăng ký kiểm tra.' } }); assert.ok(formResponse.ok(), await formResponse.text())
  const layout = createFrameLayout('halves'), [root, left, right] = layout
  const content = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'main', height: 820, _bgHex: '#f3f6f4', _els: layout } }, { type: 'FreeCanvas', props: { id: 'other', height: 420, _els: [{ id: 'beta', type: 'text', x: 100, y: 40, w: 300, h: 80, props: { text: 'Khối thứ hai', size: 28 } }] } }] }
  const response = await context.request.post(origin + '/api/pages', { data: { title: 'Bố cục tự do · kiểm tra', slug, content, _status: 'draft' } }); assert.ok(response.ok(), await response.text()); const fixture = (await response.json()).doc
  page = await context.newPage(); page.setDefaultTimeout(25000); const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin + '/editor/' + fixture.id + '?block=main', { timeout: 120000 }); await page.locator('.cv-editor').waitFor()
  for (const width of [1600, 1280]) {
    await page.setViewportSize({ width, height: 1000 })
    const publish = await page.getByRole('button', { name: 'Kiểm tra và xuất bản', exact: true }).boundingBox()
    assert.ok(publish && publish.x >= 0 && publish.x + publish.width <= width, 'publish action remains entirely visible')
  }
  await page.setViewportSize({ width: 1600, height: 1000 })
  const frame = page.locator('iframe[title="Trang"]').contentFrame(), rail = page.getByRole('navigation', { name: 'Công cụ', exact: true })
  await frame.locator(`[data-element="${right.id}"]`).click({ position: { x: 20, y: 20 } })
  await page.keyboard.press('Control+k'); await page.getByRole('combobox', { name: 'Tìm lệnh' }).fill('Thêm văn bản'); await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('[data-element]').length === 5)
  const save = async () => { const [res] = await Promise.all([page.waitForResponse((res) => res.url().includes(`/api/pages/${fixture.id}?`) && res.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()]); assert.ok(res.ok(), await res.text()); return (await res.json()).doc }
  let saved = await save(), added = saved.content.content[0].props._els.find((el) => el.type === 'text')
  assert.equal(added.parentId, right.id)
  await page.keyboard.press('Control+h'); await page.getByRole('textbox', { name: 'Giá trị cần tìm', exact: true }).fill(added.props.text); await page.getByRole('textbox', { name: 'Giá trị thay thế', exact: true }).fill('Nội dung trong ô'); await page.getByRole('button', { name: /Áp dụng 1 thay đổi/ }).click(); await page.getByRole('button', { name: 'Đóng tìm và thay thế', exact: true }).click()
  saved = await save(); assert.equal(saved.content.content[0].props._els.find((el) => el.id === added.id).props.text, 'Nội dung trong ô')
  console.log('PASS browser command palette, real frame insertion, find/replace and persisted hierarchy')
  await rail.getByRole('button', { name: 'Chia ô', exact: true }).click(); assert.equal(await page.locator('.cv-layout-preview').count(), 8); await page.screenshot({ path: 'output/editor-frames-layout-library.png' }); await page.getByRole('button', { name: 'Thu gọn bảng công cụ', exact: true }).click()
  await frame.locator(`[data-element="${left.id}"]`).click({ position: { x: 20, y: 20 } }); await rail.getByRole('button', { name: 'Nhập liệu', exact: true }).click(); assert.equal(await page.locator('.cv-input-preview').count(), 6); await page.screenshot({ path: 'output/editor-frames-input-library.png' })
  await page.locator('.cv-saved-row').filter({ hasText: 'Form nhiều bước ' + slug }).getByTitle('Chèn biểu mẫu', { exact: true }).click(); await page.getByRole('button', { name: 'Thu gọn bảng công cụ', exact: true }).click()
  saved = await save(); const widget = saved.content.content[0].props._els.find((el) => el.type === 'widget'); assert.equal(widget.parentId, left.id); assert.equal(widget.props.widget.props.form, slug)
  await frame.getByRole('combobox', { name: 'Nhu cầu', exact: false }).waitFor()
  console.log('PASS browser visible layout/input thumbnails and arbitrary form widget inside a cell')
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80; canvas.getContext('2d').fillRect(0, 0, 120, 80); return [...Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0))] })
  await frame.locator(`[data-element="${right.id}"]`).evaluate((node, bytes) => { const rect = node.getBoundingClientRect(), transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(bytes)], 'canvas-drop.png', { type: 'image/png' })); node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 })) }, png)
  await page.getByRole('status').filter({ hasText: 'Đã thêm 1 ảnh' }).waitFor(); saved = await save(); const image = saved.content.content[0].props._els.find((el) => el.type === 'image'); assert.equal(image.parentId, right.id); assert.equal(image.w / image.h, 1.5)
  await frame.locator(`[data-element="${image.id}"]`).dblclick(); await page.getByText('Cắt ảnh', { exact: true }).count().then(async (count) => { assert.ok(await page.locator('canvas').count() || count) }); await page.getByRole('button', { name: 'Đóng', exact: true }).last().click()
  console.log('PASS browser image-file drop, automatic upload, aspect ratio, cell ownership and direct image editor')
  await frame.locator(`[data-element="${added.id}"]`).click(); await frame.locator('[data-element="beta"]').click({ modifiers: ['Shift'] }); await frame.locator('body').press('ArrowRight'); saved = await save(); assert.equal(saved.content.content[1].props._els[0].x, 101)
  await frame.locator(`[data-element="${added.id}"]`).scrollIntoViewIfNeeded()
  let dragBox = await frame.locator(`[data-element="${added.id}"]`).boundingBox()
  await page.mouse.move(dragBox.x + 10, dragBox.y + 10); await page.mouse.down(); await page.mouse.move(dragBox.x + 28, dragBox.y + 10, { steps: 4 }); await page.keyboard.press('Escape'); await page.mouse.up()
  saved = await save(); assert.equal(saved.content.content[1].props._els[0].x, 101, 'Escape restores a cancelled cross-section drag')
  dragBox = await frame.locator(`[data-element="${added.id}"]`).boundingBox()
  await page.mouse.move(dragBox.x + 10, dragBox.y + 10); await page.mouse.down(); await page.mouse.move(dragBox.x + 28, dragBox.y + 10, { steps: 4 }); await page.mouse.up()
  saved = await save(); assert.ok(saved.content.content[1].props._els[0].x >= 115, 'Pointer dragging moves the selection in both sections')
  await rail.getByRole('button', { name: 'Cấu trúc', exact: true }).click(); await page.getByLabel('Hàng loạt: Màu chữ', { exact: true }).fill('#2d7b57'); saved = await save(); assert.equal(saved.content.content[0].props._els.find((el) => el.id === added.id).props.color, '#2d7b57'); assert.equal(saved.content.content[1].props._els[0].props.color, '#2d7b57'); await page.getByRole('combobox', { name: 'Phần nhận tập chọn', exact: true }).selectOption('main'); await page.getByRole('button', { name: 'Chuyển 2 lớp', exact: true }).click(); saved = await save(); assert.equal(saved.content.content[1].props._els.length, 0)
  await page.getByRole('button', { name: 'Thu gọn bảng công cụ', exact: true }).click()
  console.log('PASS browser cross-section shift selection, keyboard move and transfer to another section')
  await page.getByRole('button', { name: 'Xem trước trang', exact: true }).click(); const form = frame.locator('form.ss-form'); await form.getByRole('combobox').selectOption('Doanh nghiệp'); await form.getByRole('button', { name: 'Tiếp tục', exact: true }).click(); await form.getByRole('textbox', { name: 'Tên công ty', exact: false }).fill('Công ty kiểm tra'); await form.getByRole('textbox', { name: 'Email', exact: false }).fill('fixture@example.test'); await form.getByRole('button', { name: 'Gửi đăng ký', exact: true }).click(); await frame.getByText('Đã nhận đăng ký kiểm tra.', { exact: true }).waitFor()
  const invalid = await context.request.post(origin + '/api/site/forms/' + slug, { data: { values: { kind: 'Doanh nghiệp', company: 'ab', email: 'invalid' } } }); assert.equal(invalid.status(), 400)
  const valid = await context.request.post(origin + '/api/site/forms/' + slug, { data: { values: { kind: 'Cá nhân', company: 'Hidden forged', email: 'fixture@example.test' } } }); assert.ok(valid.ok(), await valid.text())
  const formDocs = (await (await context.request.get(origin + '/api/form-submissions?limit=1&sort=-createdAt')).json()).docs; assert.equal(formDocs[0].data.company, undefined)
  console.log('PASS browser multistep/conditional form preview and identical server validation excluding hidden fields')
  await page.getByRole('button', { name: 'Góp ý', exact: true }).click(); await page.getByRole('button', { name: 'Ghim góp ý', exact: true }).click(); await frame.locator(`[data-element="${added.id}"]`).click(); await page.getByRole('textbox', { name: 'Góp ý mới', exact: true }).fill('Căn chỉnh khoảng cách trong ô'); await page.getByRole('button', { name: 'Lưu góp ý', exact: true }).click(); await page.locator('.cv-review-thread').filter({ hasText: 'Căn chỉnh khoảng cách' }).waitFor()
  await page.getByRole('textbox', { name: 'Trả lời', exact: true }).fill('Đã kiểm tra trên điện thoại'); await page.getByRole('button', { name: 'Gửi trả lời', exact: true }).click(); await page.locator('.cv-review-conversation').getByText('Đã kiểm tra trên điện thoại', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Đánh dấu đã xử lý', exact: true }).click(); await page.getByRole('checkbox', { name: 'Hiện cả góp ý đã xử lý', exact: true }).check(); await page.getByRole('button', { name: 'Mở lại góp ý', exact: true }).click()
  const scope = `pages:${fixture.id}:vi`, notes = (await (await context.request.get(origin + '/api/editor-reviews?' + new URLSearchParams({ 'where[scope][equals]': scope }))).json()).docs; assert.equal(notes.length, 2); assert.equal(notes.find((note) => !note.parentId).resolved, false)
  const originalNote = notes.find((note) => !note.parentId), forged = await context.request.patch(origin + '/api/editor-reviews/' + originalNote.id, { data: { body: 'Tampered', authorId: 'forged', scope: 'other', resolved: false } }); assert.ok(forged.ok(), await forged.text()); const immutable = (await forged.json()).doc; assert.equal(immutable.body, originalNote.body); assert.equal(immutable.authorId, originalNote.authorId); assert.equal(immutable.scope, originalNote.scope)
  const anonymous = await browser.newContext(); assert.equal((await anonymous.request.get(origin + '/api/editor-reviews')).status(), 403); await anonymous.close()
  console.log('PASS browser shared pinned comments, replies, resolve/reopen and authenticated-only API')
  assert.ok((await context.request.patch(origin + '/api/pages/' + fixture.id, { data: { content: saved.content, _status: 'published' } })).ok())
  await page.getByRole('button', { name: 'Đóng góp ý', exact: true }).click(); await page.getByRole('button', { name: 'Chế độ sửa', exact: true }).click(); await page.screenshot({ path: 'output/editor-frames-desktop.png' })
  const publicPage = await context.newPage(); await publicPage.setViewportSize({ width: 390, height: 900 }); await publicPage.goto(origin + '/' + slug, { timeout: 120000 }); assert.equal(await publicPage.getByRole('combobox', { name: 'Nhu cầu', exact: false }).evaluateAll((nodes) => nodes.filter((node) => node.getBoundingClientRect().height > 0).length), 1); assert.ok(!(await publicPage.content()).includes('Căn chỉnh khoảng cách trong ô')); await publicPage.screenshot({ path: 'output/editor-frames-public-mobile.png', fullPage: true }); await publicPage.close()
  assert.deepEqual(errors, []); console.log('PASS published mobile frame/form rendering and no private review content in public HTML')
  console.log('Fixture editor:', origin + '/editor/' + fixture.id)
} catch (error) { if (page) { console.error((await page.locator('body').innerText()).slice(-4000)); await page.screenshot({ path: 'output/editor-frames-failure.png' }) } throw error }
finally { await browser.close() }
