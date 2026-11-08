// Actual Hosso supplier endpoints + Payload on a disposable SQLite database.
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

process.env.NODE_ENV = 'test'
process.env.HOSSO_LICENSE_ENFORCE = '0'
process.env.HOSSO_ENCRYPTION_KEY = 'a'.repeat(64)
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = p => tsImport(p, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const [{ default: shop }, { default: crossSell }, { default: payment }, remote, service, workflow] = await Promise.all([
  load('../packages/plugin-shop/src/index.ts'), load('../packages/plugin-cross-sell/src/index.ts'), load('../packages/plugin-payment/src/index.ts'),
  load('../packages/plugin-cross-sell/src/remote.ts'), load('../packages/plugin-cross-sell/src/service.ts'), load('../packages/plugin-shop/src/order-workflow.ts'),
])
const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
const { sqliteAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-sqlite')).href)
const { postgresAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const dir = await mkdtemp(join(tmpdir(), 'hosso-xs-reservations-'))
const plugins = [shop, crossSell, payment]
let config = { secret: 'disposable-cross-sell-reservations-secret', db: process.env.CROSS_SELL_TEST_DATABASE_URL ? postgresAdapter({ pool: { connectionString: process.env.CROSS_SELL_TEST_DATABASE_URL }, schemaName: 'xs_' + Date.now(), push: true }) : sqliteAdapter({ client: { url: 'file:' + join(dir, 'test.db') }, transactionOptions: {} }), collections: [{ slug: 'users', auth: true, fields: [] }, { slug: 'media', fields: [] }], globals: [], custom: { hossoPlugins: plugins }, jobs: { autoRun: [] }, admin: { user: 'users' } }
for (const plugin of plugins) if (plugin.payload) config = plugin.payload(config)
config.jobs.autoRun = []
let payload, server
const wimOrders = new Map()
let wimCreates = 0, wimCommits = 0
try {
  payload = await getPayload({ config: buildConfig(config), disableOnInit: true, key: crypto.randomUUID() })
  server = http.createServer(async (incoming, outgoing) => {
    try {
      let raw = ''; for await (const chunk of incoming) raw += chunk
      const url = 'http://127.0.0.1' + incoming.url
      if (new URL(url).pathname.startsWith('/v1/')) {
        const path = new URL(url).pathname, input = raw ? JSON.parse(raw) : undefined
        assert.equal(incoming.headers['x-api-key'], 'fixture-wim-key')
        const send = value => { outgoing.setHeader('Content-Type', 'application/json'); outgoing.end(JSON.stringify(value)) }
        if (path === '/v1/commerce/capabilities') return send({ version: 1, atomicReservation: true, idempotentEnsure: true, lookupByKey: true, cancelByKey: true, commit: true, fulfillment: true, reservationExpiry: true })
        if (path === '/v1/products/sample') return send({ id: 'sample', name: 'Fixture WIM sample', code: 'XS-WIM' })
        if (path === '/v1/products/sample/availability') return send({ productId: 'sample', price: 20000, branches: [{ branchId: 'fixture-branch', available: 6 }] })
        if (path === '/v1/orders' && incoming.method === 'POST') {
          const key = incoming.headers['idempotency-key']
          if (!wimOrders.has(key)) { wimCreates++; wimOrders.set(key, { id: 'WIM-' + wimCreates, status: 'new', total: 20000, items: input.items.map(line => ({ ...line, unitPrice: 20000 })), input }) }
          assert.equal(wimOrders.get(key).input.reservationExpiresAt, input.reservationExpiresAt)
          assert.equal(input.items[0].expectedUnitPrice, 20000)
          return send(wimOrders.get(key))
        }
        if (path === '/v1/orders/by-key') return send({ order: wimOrders.get(new URL(url).searchParams.get('key')) || null })
        if (path === '/v1/orders/by-key/commit') { wimCommits++; return send({ ...wimOrders.get(input.key), reservationCommitted: true }) }
        if (path === '/v1/orders/by-key/cancel') { const order = wimOrders.get(input.key); if (order) order.status = 'cancelled'; return send({ cancelled: true, order: order || null }) }
        throw new Error('Unexpected WIM fixture route ' + path)
      }
      const req = await createLocalReq({ req: { url, headers: new Headers(incoming.headers), text: async () => raw, json: async () => JSON.parse(raw) } }, payload)
      const endpoint = payload.config.endpoints.find(e => '/api' + e.path === new URL(url).pathname && e.method === incoming.method.toLowerCase())
      assert.ok(endpoint, incoming.url)
      const response = await endpoint.handler(req)
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text())
    } catch (error) { outgoing.writeHead(500); outgoing.end(JSON.stringify({ message: error.message })) }
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const token = 'disposable-xs-reservation-token-at-least-32-characters'
  const partner = await payload.create({ collection: service.PARTNERS, data: { name: 'Fixture retailer', kind: 'hosso', apiUrl: 'http://127.0.0.1:' + server.address().port, authMethod: 'direct', token, exportAuthMethod: 'direct', exportToken: token, importEnabled: true, exportEnabled: true, buyerName: 'Fixture retailer', buyerPhone: '0900000000', active: true }, overrideAccess: true })
  const caller = { ...partner, authMethod: 'direct', token }
  const product = await payload.create({ collection: 'shop-products', data: { name: 'Fixture native sample', price: 199000, stock: 5, active: true }, overrideAccess: true })
  await payload.create({ collection: service.OFFERS, data: { source: 'shop', product: product.id, partners: [partner.id], commissionPct: 10, active: true }, overrideAccess: true })
  const purchase = () => ({ key: crypto.randomUUID(), buyer: { name: 'Fixture retailer', phone: '0900000000' }, items: [{ id: String(product.id), quantity: 1, price: 199000, commissionPct: 10 }] })
  const request = () => createLocalReq({ req: { headers: new Headers() } }, payload)
  const docFor = async p => (await payload.find({ collection: 'shop-orders', where: { crossSellInboundKey: { equals: partner.id + ':' + p.key } }, depth: 0 })).docs[0]
  const stock = async () => (await payload.findByID({ collection: 'shop-products', id: product.id })).stock
  const p = purchase(), expiry = new Date(Date.now() + 30 * 60000).toISOString()
  const reserved = await remote.ensurePurchase(caller, p, expiry)
  assert.equal(reserved.reservationConfirmed, true)
  assert.equal((await docFor(p)).checkoutComplete, false, 'Supplier must not commit before the retailer commits')
  assert.equal(await stock(), 4)
  assert.equal((await remote.ensurePurchase(caller, p, expiry)).id, reserved.id)
  assert.equal(await stock(), 4, 'Reservation replay cannot consume stock twice')
  assert.equal((await remote.commitEnsuredPurchase(caller, p)).id, reserved.id)
  assert.equal((await docFor(p)).workflowState, 'ready')
  assert.equal((await remote.commitEnsuredPurchase(caller, p)).id, reserved.id)
  await remote.cancelEnsuredPurchase(caller, p)
  await remote.cancelEnsuredPurchase(caller, p)
  assert.equal((await docFor(p)).status, 'cancelled')
  assert.equal(await stock(), 5)
  console.log('PASS Hosso reserve, replay, commit and cancellation across real supplier endpoints')

  const expiring = purchase()
  await remote.ensurePurchase(caller, expiring, expiry)
  const held = await docFor(expiring)
  await payload.update({ collection: 'shop-orders', id: held.id, data: { reservationExpiresAt: new Date(0).toISOString() } })
  await assert.rejects(remote.commitEnsuredPurchase(caller, expiring))
  const { recoverOrder } = await load('../packages/plugin-shop/src/endpoints.ts')
  await recoverOrder(await request(), await docFor(expiring))
  assert.equal((await docFor(expiring)).status, 'cancelled')
  assert.equal(await stock(), 5)
  console.log('PASS expired provisional supplier orders reject commit and release stock')

  const missing = purchase()
  await remote.ensurePurchase(caller, missing, expiry)
  const missingDoc = await docFor(missing)
  await payload.delete({ collection: 'payments', where: { orderNo: { equals: missingDoc.orderNo } }, overrideAccess: true })
  await workflow.requestCancellation(await request(), missingDoc, 'Fixture cleanup without an initialized payment')
  await recoverOrder(await request(), await docFor(missing))
  assert.equal((await docFor(missing)).status, 'cancelled')
  assert.equal((await payload.count({ collection: 'payment-transactions' })).totalDocs, 0, 'Cleanup never invents money received')
  assert.equal(await stock(), 5)
  console.log('PASS missing unpaid payment initialization cannot block cancellation or fabricate receipts')

  process.env.HOSSO_WIM_API_URL = caller.apiUrl
  process.env.HOSSO_WIM_API_KEY = 'fixture-wim-key'
  const { clearConfigMemo } = await load('../packages/plugin-wim/src/config.ts'); clearConfigMemo()
  await payload.updateGlobal({ slug: 'cross-sell-settings', data: { backend: 'wim', wimBranchId: 'fixture-branch' } })
  const offer = await payload.create({ collection: service.OFFERS, data: { source: 'wim', wimProductId: 'sample', partners: [partner.id], commissionPct: 10, active: true }, overrideAccess: true })
  const wp = { ...purchase(), items: [{ id: 'wim-' + offer.id, quantity: 1, price: 20000, commissionPct: 10 }] }
  const wimHeld = await remote.ensurePurchase(caller, wp, expiry)
  assert.equal(wimHeld.reservationConfirmed, true)
  await remote.ensurePurchase(caller, wp, expiry)
  assert.equal(wimCreates, 1)
  assert.equal([...wimOrders.values()][0].input.reservationExpiresAt, expiry)
  await remote.commitEnsuredPurchase(caller, wp)
  assert.equal(wimCommits, 1)
  await remote.cancelEnsuredPurchase(caller, wp)
  assert.equal([...wimOrders.values()][0].status, 'cancelled')
  console.log('PASS WIM supplier forwards immutable deadline/expected price, reuses the order and commits at the source')
} finally {
  if (server) await new Promise(resolve => server.close(resolve))
  if (process.env.CROSS_SELL_TEST_DATABASE_URL && payload?.db.pool && !payload.db.pool.ended) {
    assert.equal(Object.keys(payload.db.sessions).length, 0)
    for (const client of payload.db.pool._clients) if (!payload.db.pool._idle.some(idle => idle.client === client)) client.release()
    await payload.db.pool.end()
  }
  if (payload) await payload.destroy()
}
