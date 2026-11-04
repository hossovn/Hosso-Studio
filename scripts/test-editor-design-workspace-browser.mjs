import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { chromium } = require(process.env.HOSSO_PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.HOSSO_EDITOR_ORIGIN || 'http://localhost:3111'
assert.match(origin, /^http:\/\/localhost:\d+$/)
const browser = await chromium.launch({ headless: true })
let page, employee
try {
  const context = await browser.newContext({ viewport: { width: 1700, height: 1050 }, extraHTTPHeaders: { Origin: origin } })
  await context.addInitScript(() => localStorage.setItem('hosso-editor-intro:v2', 'done'))
  assert.ok((await context.request.post(origin + '/api/users/login', { data: { email: 'browser@studio.test', password: 'studio-browser-test-password' } })).ok())
  assert.equal((await (await context.request.get(origin + '/api/pages/1?draft=true')).json()).title, 'Studio test')
  const stamp = Date.now(), slug = 'workspace-' + stamp
  const content = { root: { props: {} }, content: [
    { type: 'FreeCanvas', props: { id: 'main', height: 600, _els: [
      { id: 'frame', type: 'container', x: 40, y: 40, w: 480, h: 300, props: { _frame: true, bg: '#ffffff', _layout: { direction: 'column', gap: 20, padding: 24 }, _name: 'Khung sản phẩm' } },
      { id: 'a', parentId: 'frame', type: 'text', x: 64, y: 64, w: 400, h: 60, props: { text: 'Tiêu đề một', size: 24, color: '#222222', _sizing: { height: 'hug' } } },
      { id: 'b', parentId: 'frame', type: 'text', x: 64, y: 144, w: 400, h: 60, props: { text: 'Tiêu đề hai', size: 24, color: '#222222', _sizing: { height: 'hug' } } },
      { id: 'low', type: 'text', x: 600, y: 80, w: 420, h: 50, props: { text: 'Chữ cần kiểm tra', size: 24, color: '#eeeeee', bg: '#ffffff' } },
      { id: 'clipped', type: 'text', x: 600, y: 280, w: 120, h: 24, props: { text: 'Một đoạn nội dung dài cần kiểm tra phần bị cắt trong khung', size: 24, color: '#222222', overflow: 'hidden' } },
      { id: 'tiny', type: 'button', x: 600, y: 200, w: 18, h: 18, props: { text: '+', size: 12, color: '#ffffff', bg: '#126c40' } },
    ] } },
    { type: 'DataRepeater', props: { id: 'list', source: 'manual', count: 2, columns: 2, search: 'yes', filter: 'yes', sorting: 'yes', paginate: 'yes', items: Array.from({ length: 5 }, (_, i) => ({ title: 'Mục ' + (i + 1), category: i < 3 ? 'Nhóm A' : 'Nhóm B', price: i * 100, excerpt: 'Nội dung danh sách' })) } },
  ] }
  const response = await context.request.post(origin + '/api/pages', { data: { title: 'Kiểm tra không gian thiết kế', slug, content, _status: 'draft' } })
  assert.ok(response.ok(), await response.text()); const fixture = (await response.json()).doc
  console.log('FIXTURE ' + fixture.id + ' ' + slug)
  page = await context.newPage(); page.setDefaultTimeout(25000)
  const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin + '/editor/' + fixture.id, { timeout: 120000 })
  await page.locator('.cv-editor').waitFor()
  const activeFrame = () => page.locator('section[aria-label="Canvas đang sửa"] iframe[title="Trang"]').contentFrame()
  const choose = async (id, position = { x: 8, y: 8 }) => { await activeFrame().locator(`[data-element="${id}"]`).click({ position }); }
  const openTools = async () => { if (!await page.locator('.cv-design-panel').isVisible()) await page.getByRole('button', { name: 'Công cụ thiết kế', exact: true }).click() }
  const save = async () => {
    const [res] = await Promise.all([page.waitForResponse((res) => res.url().includes('/api/pages/' + fixture.id + '?') && res.request().method() === 'PATCH'), page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()])
    assert.ok(res.ok(), await res.text()); return (await res.json()).doc
  }
  const drag = async (node, dx, dy) => { const rect = await node.boundingBox(); assert.ok(rect); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + dx, rect.y + rect.height / 2 + dy, { steps: 10 }); await page.mouse.up() }

  await page.getByRole('button', { name: 'Desktop và mobile cạnh nhau', exact: true }).click()
  assert.equal(await page.locator('main.cv-canvas iframe[title="Trang"]').count(), 2)
  await page.getByRole('button', { name: 'Chỉnh bên này', exact: true }).click()
  assert.ok(await page.locator('.cv-live-pane-heading').first().innerText().then((text) => text.includes('Mobile')))
  await page.getByRole('button', { name: 'Chỉnh bên này', exact: true }).click()
  await page.getByRole('button', { name: 'Desktop và mobile cạnh nhau', exact: true }).click()
  await choose('frame')
  await drag(activeFrame().getByRole('button', { name: 'Kéo lề trong khung', exact: true }), 0, 12)
  await drag(activeFrame().getByRole('button', { name: 'Kéo khoảng cách giữa các ô', exact: true }), 0, 10)
  let saved = await save()
  assert.ok(saved.content.content[0].props._els[0].props._layout.padding > 24)
  assert.ok(saved.content.content[0].props._els[0].props._layout.gap > 20)
  console.log('PASS split desktop/mobile canvases switch editing and spacing handles persist changes')

  await choose('a'); await openTools()
  await page.getByLabel('Tên kiểu chung', { exact: true }).fill('Tiêu đề thương hiệu')
  await page.getByRole('button', { name: 'Tạo kiểu chung', exact: true }).click()
  saved = await save(); const style = saved.content.root.props._styles[0]
  await choose('b'); await page.getByLabel('Áp dụng kiểu chung', { exact: true }).selectOption(style.id)
  await page.getByLabel('Màu chữ kiểu chung', { exact: true }).fill('#174c37')
  saved = await save()
  assert.ok(saved.content.content[0].props._els.filter((el) => ['a','b'].includes(el.id)).every((el) => el.props.color === '#174c37' && el.props._styleLink === style.id))
  assert.equal(await activeFrame().locator('[data-element="a"]').innerText(), 'Tiêu đề một')
  console.log('PASS linked style UI updates multiple elements and preserves their content')

  await choose('frame'); await page.getByRole('button', { name: 'Biến thể', exact: true }).click()
  await page.getByLabel('Tên biến thể', { exact: true }).fill('Sáng')
  await page.getByRole('button', { name: 'Lưu thiết kế thành biến thể', exact: true }).click()
  await page.getByLabel('Tên biến thể', { exact: true }).fill('Dự phòng')
  await page.getByRole('button', { name: 'Lưu thiết kế thành biến thể', exact: true }).click()
  await page.getByRole('button', { name: 'Sáng', exact: true }).click()
  saved = await save()
  let root = saved.content.content[0].props._els.find((el) => el.id === 'frame')
  assert.equal(root.props._variants.length, 2)
  assert.equal(root.props._variant, root.props._variants.find((v) => v.name === 'Sáng').id)
  assert.equal(saved.content.content[0].props._els.filter((el) => el.parentId === 'frame').length, 2)
  await page.locator('.cv-design-panel').getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await page.getByRole('button', { name: 'Quét giao diện', exact: true }).click()
  await page.locator('.cv-design-panel').getByText(/độ tương phản/).first().waitFor()
  await page.locator('.cv-design-panel').getByText(/Vùng bấm nhỏ/).first().waitFor()
  await page.locator('.cv-design-panel').getByText(/Nội dung có thể bị cắt/).first().waitFor()
  await page.locator('.cv-design-panel').getByRole('button').filter({ hasText: /độ tương phản/ }).first().click()
  await page.screenshot({ path: 'output/editor-design-workspace-audit.png' })
  console.log('PASS variants UI stores/applies frames, audit detects contrast and small targets and selects their location')

  await page.getByRole('button', { name: 'Đóng công cụ thiết kế', exact: true }).click()
  await page.getByRole('navigation', { name: 'Công cụ', exact: true }).getByRole('button', { name: 'Lịch sử', exact: true }).click()
  await page.getByRole('button', { name: 'So sánh bước 1', exact: true }).click()
  await page.getByRole('dialog', { name: 'So sánh phiên bản', exact: true }).waitFor()
  assert.equal(await page.locator('.cv-compare-dialog iframe').count(), 2)
  await page.locator('.cv-compare-change').filter({ hasText: 'Khung sản phẩm' }).getByRole('button', { name: 'Khôi phục mục này', exact: true }).click()
  await page.getByRole('button', { name: 'Đóng so sánh', exact: true }).click()
  saved = await save()
  assert.equal(saved.content.content[0].props._els.find((el) => el.id === 'frame').props._layout.padding, 24)
  console.log('PASS visual history comparison restores one frame with its descendants')
  await page.getByRole('navigation', { name: 'Công cụ', exact: true }).getByRole('button', { name: 'Lịch sử', exact: true }).click()
  await page.getByRole('button', { name: 'Tải phiên bản để so sánh', exact: true }).click()
  await page.getByRole('button', { name: /^So sánh ·/ }).first().click()
  await page.getByRole('dialog', { name: 'So sánh phiên bản', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Đóng so sánh', exact: true }).click()
  console.log('PASS persisted server versions load into visual comparison')

  const published = await context.request.patch(origin + '/api/pages/' + fixture.id + '?draft=true', { data: { content: saved.content, _status: 'published' } })
  assert.ok(published.ok(), await published.text())
  const publicPage = await context.newPage()
  await publicPage.goto(origin + '/' + slug, { timeout: 120000 })
  assert.equal(await publicPage.locator('[data-repeat-item]').count(), 2)
  await publicPage.getByRole('link', { name: 'Trang sau', exact: true }).click()
  await publicPage.getByRole('heading', { name: 'Mục 3', exact: true }).waitFor()
  await publicPage.getByRole('combobox', { name: 'Danh mục', exact: true }).selectOption('Nhóm B')
  await publicPage.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await publicPage.getByRole('heading', { name: 'Mục 4', exact: true }).waitFor()
  assert.equal(await publicPage.locator('[data-repeat-item]').count(), 2)
  await publicPage.getByRole('searchbox', { name: 'Tìm kiếm', exact: true }).fill('Mục 5')
  await publicPage.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await publicPage.getByRole('heading', { name: 'Mục 5', exact: true }).waitFor()
  assert.equal(await publicPage.locator('[data-repeat-item]').count(), 1)
  console.log('PASS public repeater pagination, category and search work through real server requests')

  await page.reload({ timeout: 120000 }); await page.locator('.cv-editor').waitFor()
  await page.getByRole('button', { name: 'Công cụ thiết kế', exact: true }).click()
  await page.getByRole('button', { name: 'Nội dung', exact: true }).click()
  await page.getByLabel('Khóa thiết kế cho biên tập viên', { exact: true }).check()
  saved = await save()
  // Closing the admin editor releases its collaboration lease before the employee enters.
  await page.goto(origin + '/' + slug, { timeout: 120000 })
  const email = 'content-' + stamp + '@studio.test'
  const user = await context.request.post(origin + '/api/users', { data: { email, password: 'studio-content-test-password', roles: ['editor'] } })
  assert.ok(user.ok(), await user.text())
  const editorContext = await browser.newContext({ viewport: { width: 1500, height: 950 }, extraHTTPHeaders: { Origin: origin } })
  assert.ok((await editorContext.request.post(origin + '/api/users/login', { data: { email, password: 'studio-content-test-password' } })).ok())
  employee = await editorContext.newPage()
  employee.on('pageerror', (error) => errors.push(error.message))
  await employee.goto(origin + '/editor/' + fixture.id, { timeout: 120000 })
  await employee.getByLabel('Chế độ chỉ sửa nội dung', { exact: true }).waitFor()
  assert.ok(await employee.getByLabel('Chế độ chỉ sửa nội dung', { exact: true }).isChecked())
  assert.ok(await employee.getByLabel('Chế độ chỉ sửa nội dung', { exact: true }).isDisabled())
  const employeeFrame = employee.locator('section[aria-label="Canvas đang sửa"] iframe[title="Trang"]').contentFrame()
  await employeeFrame.locator('[data-element="a"]').click({ position: { x: 10, y: 10 } })
  assert.equal(await employeeFrame.locator('[data-handle]').count(), 0)
  await employee.getByLabel('Nội dung text', { exact: true }).fill('Nhân viên cập nhật nội dung')
  const [employeeSave] = await Promise.all([employee.waitForResponse((res) => res.url().includes('/api/pages/' + fixture.id + '?') && res.request().method() === 'PATCH'), employee.getByRole('button', { name: 'Lưu nháp', exact: true }).click()])
  assert.ok(employeeSave.ok(), await employeeSave.text())
  const employeeDoc = (await employeeSave.json()).doc
  const forged = structuredClone(employeeDoc.content); forged.content[0].props._els[0].x += 50
  const rejected = await editorContext.request.patch(origin + '/api/pages/' + fixture.id + '?draft=true', { data: { content: forged, _status: 'draft' } })
  assert.equal(rejected.status(), 403, await rejected.text())
  const unlock = structuredClone(employeeDoc.content); unlock.root.props._contentOnly = false
  assert.equal((await editorContext.request.patch(origin + '/api/pages/' + fixture.id + '?draft=true', { data: { content: unlock, _status: 'draft' } })).status(), 403)
  await employee.getByRole('button', { name: 'Desktop và mobile cạnh nhau', exact: true }).click()
  assert.equal(await employee.locator('main.cv-canvas iframe[title="Trang"]').count(), 2)
  await employee.locator('section[aria-label="Canvas thiết bị đối chiếu"] iframe').contentFrame().getByText('Nhân viên cập nhật nội dung', { exact: true }).waitFor()
  await employee.screenshot({ path: 'output/editor-design-workspace-content.png' })
  assert.deepEqual(errors, [])
  console.log('PASS employee content-only UI saves text while API rejects geometry changes and unlocking; no runtime errors')
} catch (error) { if (employee) await employee.screenshot({ path: 'output/editor-design-workspace-employee-failure.png' }).catch(() => {}); if (page) await page.screenshot({ path: 'output/editor-design-workspace-failure.png' }).catch(() => {}); throw error }
finally { await browser.close() }
