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
  const slug = 'design-tools-' + Date.now(), layout = createFrameLayout('halves'), [grid, left] = layout
  const quoteFields = [{ name: 'service', label: 'Dịch vụ', type: 'select', options: 'Cơ bản,Nâng cao', required: true }, { name: 'qty', label: 'Số lượng', type: 'number', required: true }, { name: 'extra', label: 'Bổ sung', type: 'checkbox' }]
  const rules = { fields: { qty: { min: 1, max: 100 }, extra: { when: { field: 'service', operator: 'equals', value: 'Nâng cao' } } }, quote: { label: 'Tổng dự kiến', currency: 'VND', base: 100, lines: [{ field: 'service', price: 500, options: { 'Nâng cao': 1200 }, quantityField: 'qty' }, { field: 'extra', price: 300 }] } }
  const formResponse = await context.request.post(origin + '/api/forms', { data: { title: slug, slug, fields: quoteFields, rules, submitLabel: 'Gửi báo giá' } }); assert.ok(formResponse.ok(), await formResponse.text()); const form = (await formResponse.json()).doc
  const els = [{ id: 'flow', type: 'container', x: 60, y: 50, w: 420, h: 380, props: { _frame: true, _name: 'Khung tự động', bg: '#ffffff', _layout: { direction: 'column', gap: 20, padding: 24 }, _sizing: { height: 'hug' } } }, ...['a', 'b', 'c'].map((id, index) => ({ id, parentId: 'flow', type: 'text', x: 84, y: 74 + index * 80, w: 372, h: 60, props: { text: 'Nội dung ' + id.toUpperCase(), size: 24, _sizing: { width: 'fill', height: 'hug' }, _motion: { entrance: { preset: 'fade', delay: index * 200, duration: 600 } } } })), { id: 'photo', type: 'image', x: 550, y: 50, w: 480, h: 300, props: { src: '/editor-demo/mountain.jpg', fit: 'cover', radius: 12 } }]
  const content = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'main', height: 520, _els: layout } }, { type: 'FreeCanvas', props: { id: 'flow-section', height: 540, _els: els } }, { type: 'Form', props: { id: 'quote', form: slug, heading: 'Báo giá' } }, { type: 'DataRepeater', props: { id: 'repeat', source: 'manual', count: 6, columns: 3, gap: 24, items: [{ title: 'Bộ sưu tập A', excerpt: 'Mô tả A', cover: '/editor-demo/mountain.jpg', href: '/a' }, { title: 'Bộ sưu tập B', excerpt: 'Mô tả B', cover: '/editor-demo/mountain.jpg', href: '/b' }] } }] }
  const response = await context.request.post(origin + '/api/pages', { data: { title: 'Công cụ thiết kế · kiểm tra', slug, content, _status: 'draft' } }); assert.ok(response.ok(), await response.text()); const fixture = (await response.json()).doc
  console.log('FIXTURE ' + fixture.id + ' ' + slug)
  page = await context.newPage(); page.setDefaultTimeout(25000); const errors = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(origin + '/editor/' + fixture.id + '?block=main', { timeout: 120000 }); await page.locator('.cv-editor').waitFor()
  const frame = page.locator('iframe[title="Trang"]').contentFrame(), rail = page.getByRole('navigation', { name: 'Công cụ', exact: true })
  const save = async () => { const [res] = await Promise.all([page.waitForResponse((res) => res.url().includes(`/api/pages/${fixture.id}?`) && res.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()]); assert.ok(res.ok(), await res.text()); return (await res.json()).doc }
  const drag = async (node, dx, dy) => { const box = await node.boundingBox(); assert.ok(box); await page.mouse.move(box.x + box.width / 2, box.y + Math.min(20, box.height / 2)); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + dx, box.y + Math.min(20, box.height / 2) + dy, { steps: 12 }); await page.mouse.up() }
  await frame.locator(`[data-element="${grid.id}"]`).click({ position: { x: 540, y: 15 } })
  await frame.getByRole('button', { name: 'Đổi tỷ lệ cột 1', exact: true }).waitFor()
  await drag(frame.locator('[data-frame-divider="0"]'), 70, 0)
  let saved = await save(); assert.ok(saved.content.content[0].props._els[0].props._layout.columns[0] > 1)
  await frame.locator(`[data-element="${left.id}"]`).click({ position: { x: 5, y: 5 } })
  await frame.getByRole('button', { name: 'Chia ngang', exact: true }).click(); saved = await save(); assert.equal(saved.content.content[0].props._els.filter((el) => el.parentId === left.id).length, 2)
  await frame.getByRole('button', { name: 'Gộp các ô con', exact: true }).click(); saved = await save(); assert.equal(saved.content.content[0].props._els.filter((el) => el.parentId === left.id).length, 0)
  console.log('PASS browser divider dragging, split and merge persist')
  await frame.locator('[data-element="flow"]').click({ position: { x: 5, y: 5 } }); await frame.getByRole('button', { name: 'Chỉ chỉnh khung này', exact: true }).click(); await page.getByRole('button', { name: 'Thoát · Esc', exact: true }).waitFor(); assert.ok(await frame.locator('[data-isolation-dim]').count()); await page.getByRole('button', { name: 'Thoát · Esc', exact: true }).click(); assert.equal(await frame.locator('[data-isolation-dim]').count(), 0)
  await drag(frame.locator('[data-element="a"]'), 0, 100)
  saved = await save(); const ordered = saved.content.content[1].props._els.filter((el) => el.parentId === 'flow').map((el) => el.id); assert.equal(ordered.at(-1), 'a')
  console.log('PASS browser isolated frame and automatic flow reorder')
  await frame.locator('[data-element="photo"]').dblclick(); await frame.locator('[data-image-framing]').waitFor(); await drag(frame.locator('[data-image-framing]'), 40, 20); await frame.locator('[data-image-framing]').hover(); await page.mouse.wheel(0, -100); await frame.getByRole('button', { name: 'Xong', exact: true }).click(); await frame.locator('[data-image-framing]').waitFor({ state: 'detached' })
  saved = await save(); const photo = saved.content.content[1].props._els.find((el) => el.id === 'photo'); assert.ok(photo.props.focalX < 50 && photo.props.imageZoom > 1)
  await page.getByRole('button', { name: 'Timeline', exact: true }).click(); await page.locator('.cv-timeline').waitFor(); await drag(page.getByRole('slider', { name: 'Thời điểm a', exact: true }), 30, 0); assert.ok(Number(await page.getByLabel('Độ trễ a', { exact: true }).inputValue()) > 0); await drag(page.locator('.cv-timeline-row').filter({ has: page.getByLabel('Độ trễ a', { exact: true }) }).locator('[data-timeline-resize]'), 30, 0); assert.ok(Number(await page.getByLabel('Thời lượng a', { exact: true }).inputValue()) > 600); await page.getByLabel('Thời lượng a', { exact: true }).fill('600'); await page.getByLabel('Độ trễ a', { exact: true }).fill('800'); await page.getByLabel('Tua timeline', { exact: true }).fill('400'); assert.ok(await frame.locator('[data-element="a"]').evaluate((node) => node.getAnimations({ subtree: true }).some((a) => a.playState === 'paused'))); await page.screenshot({ path: 'output/editor-design-tools-timeline.png' }); await page.getByRole('button', { name: 'Đóng timeline', exact: true }).click(); assert.equal(await frame.locator('[data-element="a"]').evaluate((node) => node.getAnimations({ subtree: true }).length), 0)
  saved = await save(); assert.equal(saved.content.content[1].props._els.find((el) => el.id === 'a').props._motion.entrance.delay, 800)
  console.log('PASS browser image pan/zoom and timeline scrub/cleanup/persistence')
  await page.goto(origin + '/editor/' + fixture.id + '?block=repeat', { timeout: 120000 }); await page.locator('.cv-editor').waitFor(); await rail.getByRole('button', { name: 'Chia ô', exact: true }).click(); await page.getByRole('button', { name: 'Mở ô mẫu trên canvas', exact: true }).click(); await page.getByRole('button', { name: 'Áp dụng ô mẫu cho danh sách', exact: true }).waitFor(); await page.getByRole('button', { name: 'Áp dụng ô mẫu cho danh sách', exact: true }).click(); saved = await save(); assert.equal(saved.content.content.length, 4); assert.ok(saved.content.content[3].props._template.length >= 4)
  await frame.locator('[data-repeat-item]').first().waitFor(); assert.equal(await frame.locator('[data-repeat-item]').count(), 2)
  console.log('PASS browser editable repeater template round-trip and actual data cards')
  await page.screenshot({ path: 'output/editor-design-tools-desktop.png' })
  await rail.getByRole('button', { name: 'Nhập liệu', exact: true }).click(); await page.locator('.cv-saved-row').filter({ hasText: slug }).getByRole('button', { name: 'Sửa', exact: true }).click(); await page.locator('.cv-tool-details').filter({ has: page.getByText('Báo giá tự động', { exact: true }) }).locator('summary').click(); await page.getByLabel('Phí cơ bản', { exact: true }).fill('200'); await page.getByRole('button', { name: 'Lưu biểu mẫu', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Đã lưu định nghĩa biểu mẫu.' }).waitFor(); console.log('PASS visual quote builder updates saved pricing');
  const publish = await context.request.patch(origin + '/api/pages/' + fixture.id + '?draft=true', { data: { ...saved, _status: 'published' } }); assert.ok(publish.ok(), await publish.text())
  const publicPage = await context.newPage(); await publicPage.goto(origin + '/' + slug, { timeout: 120000 }); await publicPage.getByRole('combobox', { name: /Dịch vụ/ }).selectOption('Nâng cao'); await publicPage.getByRole('spinbutton', { name: /Số lượng/ }).fill('2'); await publicPage.getByRole('checkbox', { name: /Bổ sung/ }).check(); assert.equal(await publicPage.locator('[data-quote-total]').getAttribute('data-quote-total'), '2900')
  const submitted = await context.request.post(origin + '/api/site/forms/' + slug, { data: { values: { service: 'Cơ bản', qty: 2, extra: true, _quoteTotal: 1 }, locale: 'vi' } }); assert.ok(submitted.ok(), await submitted.text())
  const submissions = await (await context.request.get(origin + `/api/form-submissions?where[form][equals]=${form.id}&depth=0`)).json(); assert.equal(submissions.docs[0].data._quoteTotal, 1200); assert.equal(submissions.docs[0].data.extra, undefined)
  assert.equal(await publicPage.locator('[data-repeat-item]').count(), 2); await publicPage.setViewportSize({ width: 390, height: 844 }); assert.equal(await publicPage.locator('.hs-repeater-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length), 1); assert.ok(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await publicPage.screenshot({ path: 'output/editor-design-tools-mobile.png' })
  const postTitle = 'Bài viết nối dữ liệu ' + slug
  const post = await context.request.post(origin + '/api/posts', { data: { title: postTitle, slug, excerpt: 'Nội dung nạp từ máy chủ', _status: 'published', publishedAt: new Date().toISOString() } }); assert.ok(post.ok(), await post.text())
  const remote = structuredClone(saved.content); remote.content[3].props.source = 'posts'; remote.content[3].props.count = 1
  const remoteSave = await context.request.patch(origin + '/api/pages/' + fixture.id + '?draft=true', { data: { content: remote, _status: 'published' } }); assert.ok(remoteSave.ok(), await remoteSave.text())
  await publicPage.reload(); await publicPage.getByRole('heading', { name: postTitle, exact: true }).waitFor(); assert.equal(await publicPage.locator('[data-repeat-item]').count(), 1)
  await page.goto(origin + '/editor/' + fixture.id + '?block=repeat', { timeout: 120000 }); await page.locator('.cv-editor').waitFor(); await frame.getByRole('heading', { name: postTitle, exact: true }).waitFor()
  console.log('PASS server-loaded posts render in both public and live editor repeaters')
  assert.deepEqual(errors, []); console.log('PASS public quote interaction/server recomputation, repeater/mobile and no runtime errors')
} catch (error) { if (page) await page.screenshot({ path: 'output/editor-design-tools-failure.png' }).catch(() => {}); throw error }
finally { await browser.close() }
