// Kiểm tra hợp đồng: gọi từng endpoint của mock và đối chiếu phản hồi với schema trong openapi.yaml.
import Ajv2020 from 'ajv/dist/2020'
import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

process.env.MOCK_WIM_STATE = join(tmpdir(), `mock-wim-contract-${process.pid}.json`)

import { createApp } from './main'

const doc = parse(readFileSync(resolve(__dirname, '../openapi.yaml'), 'utf8'))
const ajv = new Ajv2020({ strict: false, formats: { 'date-time': true } })
const validator = (name: string) => ajv.compile({ components: doc.components, $ref: `#/components/schemas/${name}` })
const check = (name: string, value: unknown, label: string) => {
  const v = validator(name)
  assert.ok(v(value), `${label}: không khớp schema ${name}: ${JSON.stringify(v.errors)}`)
}

async function main() {
  const app = await createApp()
  await app.listen(0)
  const base = `http://localhost:${app.getHttpServer().address().port}`
  const KEY = { 'X-API-Key': process.env.MOCK_WIM_API_KEY || 'mock-wim-key' }
  const get = (path: string, headers = KEY) => fetch(base + path, { headers })
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + path, { method: 'POST', headers: { ...KEY, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

  let n = 0
  const ok = (msg: string) => console.log(`  ✓ ${msg}`, ++n && '')

  assert.equal((await get('/v1/branches', {} as any)).status, 401); ok('thiếu khóa API -> 401')

  const makes = await (await get('/v1/vehicles/makes')).json(); check('NamedList', makes, 'makes'); ok('GET /vehicles/makes')
  const models = await (await get('/v1/vehicles/makes/toyota/models')).json(); check('NamedList', models, 'models'); ok('GET models')
  const years = await (await get('/v1/vehicles/models/toyota-vios/years')).json(); check('YearList', years, 'years'); ok('GET years')
  assert.equal((await get('/v1/vehicles/makes/xxx/models')).status, 404); ok('hãng không có -> 404')

  const list = await (await get('/v1/products?pageSize=100')).json(); check('ProductPage', list, 'products'); ok(`GET /products (${list.total} sản phẩm)`)
  assert.ok(list.items.every((p: any) => Number.isInteger(p.price))); ok('giá là số nguyên VND')
  const byVehicle = await (await get('/v1/products?make=toyota&model=toyota-vios&year=2015&pageSize=100')).json()
  assert.ok(byVehicle.total > 0 && byVehicle.items.every((p: any) => p.compatibility.some((c: any) => c.model === 'toyota-vios' && c.yearFrom <= 2015 && 2015 <= c.yearTo))); ok('lọc theo xe chỉ trả phụ tùng tương thích')
  const oem = list.items[0].oemCodes[0]
  assert.ok((await (await get(`/v1/products?q=${encodeURIComponent(oem)}`)).json()).items.some((p: any) => p.id === list.items[0].id)); ok('tìm theo mã OEM')
  const alt = list.items[1].altCodes[0].toLowerCase().replace('-', '')
  assert.ok((await (await get(`/v1/products?q=${alt}`)).json()).items.some((p: any) => p.id === list.items[1].id)); ok('tìm theo mã thay thế (bỏ dấu gạch, không phân biệt hoa/thường)')
  assert.ok((await (await get('/v1/products?q=phanh')).json()).total > 0); ok('tìm theo tên')
  assert.ok((await (await get('/v1/products?condition=aftermarket&pageSize=100')).json()).items.every((p: any) => p.condition === 'aftermarket')); ok('lọc tình trạng')

  const one = await (await get('/v1/products/P001')).json(); check('Product', one, 'product'); ok('GET /products/{id}')
  assert.equal((await get('/v1/products/NOPE')).status, 404); ok('sản phẩm không có -> 404')
  const av = await (await get('/v1/products/P001/availability')).json(); check('Availability', av, 'availability'); ok('GET availability')
  check('CategoryList', await (await get('/v1/categories')).json(), 'categories'); ok('GET /categories')
  check('BranchList', await (await get('/v1/branches')).json(), 'branches'); ok('GET /branches')

  const order = { items: [{ productId: 'P001', quantity: 1 }], customer: { name: 'Nguyễn Văn A', phone: '0901234567' }, fulfillment: { type: 'pickup', branchId: 'hn' } }
  assert.equal((await post('/v1/orders', order)).status, 400); ok('thiếu Idempotency-Key -> 400')
  const r1 = await post('/v1/orders', order, { 'Idempotency-Key': 'contract-key-0001' })
  assert.equal(r1.status, 201); const o1 = await r1.json(); check('Order', o1, 'order'); ok('POST /orders -> 201')
  const r2 = await post('/v1/orders', order, { 'Idempotency-Key': 'contract-key-0001' })
  assert.equal(r2.status, 200); assert.equal((await r2.json()).id, o1.id); ok('cùng Idempotency-Key -> cùng đơn, không tạo đơn thứ hai')
  const r3 = await post('/v1/orders', { ...order, items: [{ productId: 'P002', quantity: 1 }] }, { 'Idempotency-Key': 'contract-key-0001' })
  assert.equal(r3.status, 422); ok('cùng key khác nội dung -> 422')
  assert.deepEqual(await (await get(`/v1/orders/${o1.id}`)).json(), o1); ok('GET /orders/{id}')
  const stockAfter = (await (await get('/v1/products/P001/availability')).json()).branches.find((b: any) => b.branchId === 'hn').available
  const stockBefore = av.branches.find((b: any) => b.branchId === 'hn').available
  assert.equal(stockAfter, stockBefore - 1); ok('đơn trừ tồn của chi nhánh nhận hàng')
  const oos = await post('/v1/orders', { ...order, items: [{ productId: 'P900', quantity: 1 }] }, { 'Idempotency-Key': 'contract-key-0002' })
  assert.equal(oos.status, 409); const e = await oos.json(); check('Error', e, 'error'); assert.equal(e.error.code, 'out_of_stock'); ok('hết hàng -> 409 out_of_stock')
  assert.equal((await post('/v1/orders', { ...order, fulfillment: { type: 'delivery' } }, { 'Idempotency-Key': 'contract-key-0003' })).status, 400); ok('giao tận nơi thiếu địa chỉ -> 400')

  await app.close()
  rmSync(process.env.MOCK_WIM_STATE!, { force: true })
  console.log(`\nHợp đồng OK (${n} kiểm tra).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
