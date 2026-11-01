import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
process.env.HOSSO_LICENSE_ENFORCE = '0'
process.env.HOSSO_GHN_TOKEN = 'synthetic-test-token'
const { default: plugin } = await tsImport('../packages/plugin-shipping/src/index.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const rows = [], keys = [], order = { orderNo: 'TEST', status: 'confirmed', workflowVersion: 1, workflowState: 'ready' }
const payload = {
  config: { collections: [{ slug: 'commerce-rate-buckets' }] },
  db: { beginTransaction: async () => 'fixture', commitTransaction: async () => {}, rollbackTransaction: async () => {} },
  find: async ({ collection, where }) => ({ docs: collection === 'commerce-rate-buckets' ? [] : collection === 'shop-orders' ? [order] : where?.or ? rows.filter(r => r.shipmentKey === where.or[0].shipmentKey.equals) : rows }),
  findGlobal: async () => ({ ghnEnabled: true, ghnShopId: 1 }),
  create: async ({ collection, data }) => { if (collection === 'commerce-rate-buckets') return data; const row = { id: rows.length + 1, status: 'pending', districtId: 1, wardCode: '1', ...data }; rows.push(row); return row },
  update: async ({ id, data }) => Object.assign(rows.find(r => r.id === id), data),
}
const originalFetch = globalThis.fetch
let fail = true
globalThis.fetch = async (_url, options) => {
  keys.push(JSON.parse(options.body).client_order_code)
  assert.equal(options.redirect, 'error')
  if (fail) throw new Error('Synthetic carrier outage')
  return Response.json({ code: 200, data: { order_code: 'FIXTURE' } })
}
try {
  const event = { payload, order: { id: 'TEST', total: 100000 }, customer: { name: 'Fixture', phone: '0901234567', address: 'Fixture address' }, fulfillment: { type: 'delivery' }, payment: 'cod', shipments: [{ key: 'store', label: 'Store', deliveryBy: 'store', codCollector: 'store', codAmount: 100000 }, { key: 'supplier', label: 'Supplier', deliveryBy: 'partner', codCollector: 'partner', codAmount: 100000 }] }
  await plugin.hooks.onOrderPlaced(event)
  await plugin.hooks.onOrderPlaced(event)
  assert.equal(rows.length, 2); assert.equal(keys.length, 0, 'Readiness only creates local shipments')
  await plugin.hooks.onOrderStatusChanged({ ...event, to: 'shipping' })
  assert.equal(keys.length, 0, 'Stale dispatch event cannot create a carrier order')
  order.status = 'shipping'
  await assert.rejects(plugin.hooks.onOrderStatusChanged({ ...event, to: 'shipping' }), /pending/)
  assert.ok(rows[0].ghnError)
  fail = false
  await plugin.hooks.onOrderStatusChanged({ ...event, to: 'shipping' })
  await plugin.hooks.onOrderStatusChanged({ ...event, to: 'shipping' })
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1], 'Retries use the same carrier command key')
  assert.equal(rows[0].trackingCode, 'FIXTURE'); assert.equal(rows[1].trackingCode, undefined, 'Direct supplier shipments never go to the store carrier')
  const track = plugin.payload({}).endpoints.find(e => e.path.endsWith('/shipping/track'))
  const invalid = await track.handler({ url: 'http://localhost/?orderId=TEST&token=wrong', headers: new Headers(), payload, context: {} })
  assert.equal(invalid.status, 404)
  console.log('PASS carrier dispatch gate, replay, stable retry key, direct supplier exclusion and invalid lookup token')
} finally { globalThis.fetch = originalFetch }
