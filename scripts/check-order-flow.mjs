// Kiểm tra luồng đặt đơn qua site + mock WIM đang chạy (pnpm dev, pnpm --filter @hosso/mock-wim start).
// Chạy: node scripts/check-order-flow.mjs   (đọc tài khoản admin từ apps/studio/.env để chỉnh timeout tạm thời)
import { say } from './lib/say.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SITE = process.env.SITE_URL || 'http://localhost:3000'
const MOCK = process.env.MOCK_URL || 'http://localhost:4010'
const env = Object.fromEntries(readFileSync(new URL('../apps/studio/.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))

const mock = (...args) => execFileSync('pnpm', ['--filter', '@hosso/mock-wim', 'mock', ...args], { stdio: 'pipe', shell: true }).toString()
const wim = (path) => fetch(MOCK + path, { headers: { 'X-API-Key': 'mock-wim-key' } }).then((r) => r.json())
const checkout = (body) => fetch(`${SITE}/api/plugins/wim/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }))
const orders = () => JSON.parse(mock('orders').split('\n').filter((l) => !l.startsWith('>') && l.trim()).join('\n')).length

const login = await fetch(`${SITE}/api/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.HOSSO_ADMIN_EMAIL, password: env.HOSSO_ADMIN_PASSWORD }) }).then((r) => r.json())
const auth = { Authorization: `JWT ${login.token}`, 'Content-Type': 'application/json' }
const setSettings = (data) => fetch(`${SITE}/api/globals/wim-settings`, { method: 'POST', headers: auth, body: JSON.stringify(data) })

const base = {
  cartId: `check-${Date.now()}`,
  items: [{ productId: 'P001', quantity: 1 }],
  customer: { name: 'Nguyễn Văn A', phone: '0901234567', note: 'kiểm thử' },
  fulfillment: { type: 'pickup', branchId: 'hn' },
}
let n = 0
const ok = (m, vars) => console.log(`  ✓ ${say(m, vars)}`, ++n && '')

mock('reset'); mock('chaos', 'off')
await new Promise((r) => setTimeout(r, 1200))
const before = orders()

// 1. Nhận tại chi nhánh -> tạo đơn
const first = await checkout(base)
assert.equal(first.status, 200, JSON.stringify(first)); assert.equal(first.order.status, 'new'); ok('nhận tại chi nhánh: đơn {id}', { id: first.order.id })
assert.equal((await wim(`/v1/orders/${first.order.id}`)).fulfillment.branchId, 'hn'); ok('đơn xuất hiện trong mock WIM (đúng chi nhánh)')

// 2. Gửi lại cùng giỏ -> cùng đơn, không tạo đơn thứ hai (Idempotency-Key)
const again = await checkout(base)
assert.equal(again.order.id, first.order.id); assert.equal(orders(), before + 1); ok('gửi lại cùng giỏ: cùng mã đơn, WIM vẫn chỉ có 1 đơn')

// 3. Dữ liệu sai
assert.equal((await checkout({ ...base, cartId: 'x'.repeat(10), fulfillment: { type: 'delivery' }, customer: { ...base.customer } })).status, 400); ok('giao tận nơi thiếu địa chỉ -> 400')
assert.equal((await checkout({ ...base, customer: { ...base.customer, phone: '123' } })).status, 400); ok('số điện thoại sai -> 400')
assert.equal((await checkout({ ...base, website: 'spam' })).status, 400); ok('ô bẫy bot -> 400')

// 4. Hết hàng (kiểm tra lại tồn kho trước khi tạo đơn)
const oos = await checkout({ ...base, cartId: `oos-${Date.now()}`, items: [{ productId: 'P900', quantity: 1 }] })
assert.equal(oos.status, 409); assert.equal(oos.code, 'out_of_stock'); assert.equal(oos.productId, 'P900'); assert.equal(orders(), before + 1); ok('hết hàng -> 409 out_of_stock, không tạo đơn')
mock('stock', 'P002', 'hcm', '2')
const wrongBranch = await checkout({ ...base, cartId: `wb-${Date.now()}`, items: [{ productId: 'P002', quantity: 5 }], fulfillment: { type: 'pickup', branchId: 'hcm' } })
assert.equal(wrongBranch.status, 409); ok('không đủ tồn tại chi nhánh đã chọn -> 409')

// 5. WIM báo hết hàng
mock('chaos', 'out_of_stock'); await new Promise((r) => setTimeout(r, 1200))
assert.equal((await checkout({ ...base, cartId: `chaos-${Date.now()}` })).status, 409); mock('chaos', 'off'); ok('WIM hết hàng toàn bộ -> 409')

// 6. WIM đã tạo đơn nhưng phản hồi quá chậm: site thử lại cùng khóa, không được tạo đơn thứ hai
await setSettings({ timeoutMs: 1500 })
await new Promise((r) => setTimeout(r, 5500)) // chờ site đọc lại cấu hình
const key = { ...base, cartId: `timeout-${Date.now()}`, items: [{ productId: 'P003', quantity: 1 }] }
const count = orders()
mock('chaos', 'order-timeout'); await new Promise((r) => setTimeout(r, 1200))
const t0 = Date.now()
const lost = await checkout(key)
assert.equal(lost.status, 504); assert.equal(lost.code, 'wim_unavailable'); ok('timeout: báo lỗi hợp lý sau {s}s, giữ giỏ để thử lại', { s: Math.round((Date.now() - t0) / 1000) })
assert.equal(orders(), count + 1); ok('dù thử lại 3 lần, WIM chỉ có đúng 1 đơn mới')
mock('chaos', 'off'); await new Promise((r) => setTimeout(r, 1200))
const retry = await checkout(key)
assert.equal(retry.status, 200); assert.equal(orders(), count + 1); ok('khách bấm đặt lại: nhận đơn {id}, vẫn chỉ 1 đơn', { id: retry.order.id })
await setSettings({ timeoutMs: 5000 })

// 7. Theo dõi đơn (luồng E) + webhook order.status_changed
const page = (id, phone) => fetch(`${SITE}/trang-thai-don?id=${id}&phone=${phone}`).then((r) => r.text())
assert.match(await page(first.order.id, '4567'), /Mới tạo/); ok('trang trạng thái đơn: Mới tạo')
assert.match(await page(first.order.id, '0000'), /Không tìm thấy đơn hàng/); ok('sai 4 số cuối điện thoại: không lộ đơn')
mock('order-status', first.order.id, 'confirmed')
assert.match(await page(first.order.id, '4567'), /Mới tạo/); ok('chưa có webhook: còn cache TTL (hiển thị cũ)')
const hook = mock('webhook', 'order.status_changed', first.order.id)
assert.match(hook, /-> 200/)
assert.match(await page(first.order.id, '4567'), /Đã xác nhận/); ok('webhook order.status_changed: làm mới ngay -> Đã xác nhận')

console.log(say('\nLuồng đặt đơn OK ({n} kiểm tra).', { n }))
