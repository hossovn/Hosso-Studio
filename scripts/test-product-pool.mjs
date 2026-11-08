// Real Payload + disposable SQLite + HTTP suppliers; never uses the site's database or credentials.
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = (path) => tsImport(path, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
process.env.NODE_ENV = 'test'
process.env.HOSSO_LICENSE_ENFORCE = '0'
process.env.HOSSO_WIM_API_KEY = 'product-pool-test-key'
process.env.HOSSO_ENCRYPTION_KEY = 'a'.repeat(64)
const remoteOrders = new Map(), purchases = new Map()
let wimPrice = 300000, wimStock = 10, dropWimResponse = false
let dropFulfillmentResponse = false
const dispatched = new Set()
const send = (res, body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
const bodyOf = async (req) => { let raw = ''; for await (const part of req) raw += part; return JSON.parse(raw) }
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), path = url.pathname.replace(/^\/supplier-[ab](?=\/)/, '')
    if (path.endsWith('/capabilities')) return send(res, { version: 1, atomicReservation: true, idempotentEnsure: true, lookupByKey: true, cancelByKey: true, commit: true, fulfillment: true, reservationExpiry: true, holdMinutes: 1440 })
    if (path === '/api/plugins/cross-sell/catalog') return send(res, { item: { id: 'filter', name: 'Partner filter', price: 50000, stock: 10, commissionPct: 10 } })
    if (path === '/api/plugins/cross-sell/orders') {
      if (req.method === 'POST') {
        const purchase = await bodyOf(req)
        if (!purchases.has(purchase.key)) purchases.set(purchase.key, { id: 'SUP-' + (purchases.size + 1), status: 'new', reservationConfirmed: true, total: purchase.items.reduce((s, i) => s + i.quantity * i.price, 0), commission: purchase.items.reduce((s, i) => s + i.quantity * i.price * i.commissionPct / 100, 0), purchase })
        return send(res, { order: purchases.get(purchase.key) })
      }
      return send(res, { order: purchases.get(url.searchParams.get('key')) ?? null })
    }
    if (path === '/api/plugins/cross-sell/cancel') { const input = await bodyOf(req); const order = purchases.get(input.key); if (order) order.status = 'cancelled'; return send(res, { cancelled: true, order: order || null }) }
    if (path === '/api/plugins/cross-sell/commit') { const input = await bodyOf(req); return send(res, { order: purchases.get(input.key) }) }
    if (path === '/api/plugins/cross-sell/fulfill') {
      const input = await bodyOf(req), order = purchases.get(input.key)
      dispatched.add('supplier:' + input.key + ':' + input.stage)
      order.fulfillmentStage = input.stage; order.status = input.stage
      if (dropFulfillmentResponse) return res.destroy()
      return send(res, { order })
    }
    assert.equal(req.headers['x-api-key'], 'product-pool-test-key')
    if (path === '/v1/categories') return send(res, { items: [{ id: 'tyres', name: 'Tyres' }] })
    if (path === '/v1/partner-products' && req.method === 'POST') return send(res, await bodyOf(req))
    if (path === '/v1/branches') return send(res, { items: [{ id: 'hn', name: 'Hanoi' }] })
    if (path === '/v1/products') return send(res, { items: [{ id: '1', name: 'WIM tyre', code: 'TYRE', brand: 'WIM brand', price: wimPrice, categoryId: 'tyres', compatibility: [{ make: 'toyota', model: 'camry', yearFrom: 2020, yearTo: 2026 }] }], page: 1, pageSize: 100, total: 1 })
    if (path === '/v1/products/1/availability') return send(res, { productId: '1', price: wimPrice, branches: [{ branchId: 'hn', available: wimStock, inStock: wimStock > 0 }] })
    if (path === '/v1/orders') {
      const input = await bodyOf(req), key = req.headers['idempotency-key']
      if (!remoteOrders.has(key)) remoteOrders.set(key, { id: 'WIM-' + (remoteOrders.size + 1), status: 'new', items: input.items.map((i) => ({ ...i, unitPrice: wimPrice })), total: input.items.reduce((s, i) => s + i.quantity * wimPrice, 0), customer: input.customer, fulfillment: input.fulfillment })
      if (dropWimResponse) return res.destroy()
      return send(res, remoteOrders.get(key))
    }
    if (path === '/v1/orders/by-key/cancel') { const input = await bodyOf(req); const order = remoteOrders.get(input.key); if (order) order.status = 'cancelled'; return send(res, { cancelled: true, order: order || null }) }
    if (path === '/v1/orders/by-key/commit') { const input = await bodyOf(req); const order = remoteOrders.get(input.key); return send(res, { ...order, reservationCommitted: true }) }
    if (path === '/v1/orders/by-key/fulfill') {
      const input = await bodyOf(req), order = remoteOrders.get(input.key)
      dispatched.add('wim:' + input.key + ':' + input.stage)
      order.fulfillmentStage = input.stage; order.status = input.stage
      if (dropFulfillmentResponse) return res.destroy()
      return send(res, order)
    }
    if (/^\/v1\/orders\/WIM-\d+\/cancel$/.test(path)) {
      const order = [...remoteOrders.values()].find((o) => path.includes('/' + o.id + '/'))
      order.status = 'cancelled'; return send(res, order)
    }
    res.writeHead(404).end()
  } catch (error) { res.writeHead(500).end(String(error)) }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const apiUrl = `http://127.0.0.1:${server.address().port}`
process.env.HOSSO_WIM_API_URL = apiUrl
const directory = await mkdtemp(join(tmpdir(), 'hosso-product-pool-'))
await mkdir(join(directory, 'media'))
let payload
let pgAdmin, pgDatabase, pgUrl
try {
  if (process.env.COMMERCE_TEST_DATABASE_URL) {
    const { Pool } = createRequire(require.resolve('@payloadcms/db-postgres'))('pg')
    pgAdmin = new Pool({ connectionString: process.env.COMMERCE_TEST_DATABASE_URL })
    pgDatabase = 'product_pool_' + Date.now()
    await pgAdmin.query('CREATE DATABASE "' + pgDatabase + '"')
    const url = new URL(process.env.COMMERCE_TEST_DATABASE_URL); url.pathname = '/' + pgDatabase; pgUrl = url.href
  }
  const [{ default: shop }, { default: wim }, { default: crossSell }, { placeOrder, endpoints, recoverOrder }, { loadGrid, loadDetail }, service, { syncWimCatalog }, shared] = await Promise.all([
    load('../packages/plugin-shop/src/index.ts'), load('../packages/plugin-wim/src/index.ts'), load('../packages/plugin-cross-sell/src/index.ts'),
    load('../packages/plugin-shop/src/endpoints.ts'), load('../packages/plugin-shop/src/loaders.ts'), load('../packages/plugin-cross-sell/src/service.ts'), load('../packages/plugin-wim/src/catalog.ts'),
    load('../packages/plugin-wim/src/shared-loaders.ts'),
  ])
  const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
  const { sqliteAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-sqlite')).href)
  const { postgresAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
  let notices = 0, paidCalls = 0, flakyCalls = 0
  const { default: payment } = await load('../packages/plugin-payment/src/index.ts')
  const plugins = [shop, wim, crossSell, payment, { id: 'test-observer', hooks: { onOrderPlaced: async () => { notices++ }, onOrderPaid: async () => { paidCalls++ } } }, { id: 'test-flaky', hooks: { onOrderPaid: async () => { if (++flakyCalls === 1) throw new Error('Simulated consumer outage') } } }]
  let config = { secret: 'isolated-product-pool-test-secret', db: pgUrl ? postgresAdapter({ pool: { connectionString: pgUrl }, push: true }) : sqliteAdapter({ client: { url: 'file:' + join(directory, 'test.db') }, transactionOptions: {} }),
    collections: [{ slug: 'users', auth: true, fields: [] }, { slug: 'media', upload: { staticDir: join(directory, 'media') }, fields: [] }], globals: [],
    custom: { hossoPlugins: plugins }, jobs: { autoRun: [] }, admin: { user: 'users' } }
  for (const plugin of plugins) if (plugin.payload) config = plugin.payload(config)
  config.jobs.autoRun = []
  payload = await getPayload({ config: buildConfig(config), disableOnInit: true, key: 'product-pool-' + crypto.randomUUID() })
  const native = await payload.create({ collection: 'shop-products', data: { name: 'Shop oil', code: 'OIL', price: 100000, stock: 10, active: true }, overrideAccess: true })
  const legacyWim = await payload.create({ collection: 'shop-products', data: { name: 'WIM tyre', code: 'WIM-1', price: 300000, stock: 0, source: 'shop', active: true, displayName: 'Tyre display name', description: 'Keep editorial content', additionalInformation: [{ name: 'Local spec', value: 'Keep me' }] }, overrideAccess: true })
  await syncWimCatalog(payload)
  const wimProduct = (await payload.find({ collection: 'shop-products', where: { wimId: { equals: '1' } } })).docs[0]
  assert.equal(wimProduct.id, legacyWim.id, 'Recover the existing WIM-prefixed product instead of colliding with its unique code')
  assert.equal(wimProduct.stock, 10)
  assert.equal(wimProduct.description, 'Keep editorial content')
  assert.equal(wimProduct.displayName, 'Tyre display name')
  assert.equal(wimProduct.additionalInformation[0].value, 'Keep me')
  assert.notEqual(String(native.id), String(wimProduct.id), 'Upstream numeric IDs must not collide with internal Product IDs')
  const listings = []
  const localId = (listing) => typeof listing.product === 'object' ? listing.product.id : listing.product
  for (const name of ['Supplier A', 'Supplier B']) {
    const partner = await payload.create({ collection: service.PARTNERS, overrideAccess: true, data: { name, kind: 'hosso', apiUrl: apiUrl + (name === 'Supplier A' ? '/supplier-a' : '/supplier-b'), authMethod: 'direct', token: 'product-pool-supplier-token-at-least-32-characters', buyerName: 'Retail business', buyerPhone: '0901234567', active: true } })
    assert.equal(partner.token, '••••••••', 'Admin reads never expose the connection credential')
    const rawPartner = await payload.findByID({ collection: service.PARTNERS, id: partner.id, context: { crossSellCredentials: true }, overrideAccess: true })
    assert.match(rawPartner.token, /^enc:v1:/, 'Connection credential is encrypted at rest')
    await payload.update({ collection: service.PARTNERS, id: partner.id, data: { token: partner.token, name }, overrideAccess: true })
    assert.equal((await payload.findByID({ collection: service.PARTNERS, id: partner.id, context: { crossSellCredentials: true } })).token, rawPartner.token, 'Saving the masked field retains the original encrypted credential')
    listings.push(await service.importProduct(payload, partner, 'filter'))
  }
  const context = { payload, searchParams: {}, cookies: {}, locale: 'vi' }
  const grid = await loadGrid({ pager: 'yes' }, context)
  assert.equal(grid.total, 4)
  assert.deepEqual(new Set(grid.items.map((i) => i.id)), new Set([native.id, wimProduct.id, ...listings.map(localId)].map(String)))
  const detail = await loadDetail({}, { ...context, searchParams: { p: wimProduct.slug } })
  assert.equal(detail.product.id, String(wimProduct.id))
  await syncWimCatalog(payload, true)
  assert.equal((await payload.count({ collection: 'shop-products' })).totalDocs, 4, 'Repeated sync must not duplicate products')
  assert.equal((await shared.loadSharedGrid({ pager: 'yes' }, context)).total, 4, 'Legacy WIM grids use the common pool')
  const filtered = await shared.loadSharedGrid({ pager: 'yes' }, { ...context, searchParams: { category: 'tyres', make: 'toyota', model: 'camry', year: '2024' } })
  assert.equal(filtered.total, 1)
  assert.equal(filtered.items[0].id, String(wimProduct.id))
  assert.ok(filtered.query.includes('year=2024'))
  assert.equal((await shared.loadSharedDetail({}, { ...context, searchParams: { p: '1' } })).product.id, String(wimProduct.id), 'Legacy numeric WIM URLs cannot resolve the colliding Shop ID')
  console.log('PASS shared catalog: four products across Shop, WIM and two suppliers; stable IDs, detail and repeated sync')

  const input = { cartId: 'pool-' + crypto.randomUUID(), items: [native.id, wimProduct.id, ...listings.map(localId)].map((productId) => ({ productId: String(productId), quantity: 1, price: 1 })), customer: { name: 'Retail customer', phone: '0912345678', address: 'Private customer address' }, fulfillment: { type: 'delivery' }, payment: 'cod', meta: {} }
  const checkout = async (body = input) => placeOrder(await createLocalReq({ req: { headers: new Headers() } }, payload), body)
  const quoteEndpoint = endpoints.find((e) => e.path.endsWith('/quote'))
  const quote = await quoteEndpoint.handler(await createLocalReq({ req: { headers: new Headers(), json: async () => input } }, payload))
  assert.equal((await quote.json()).total, 500000, 'Never trust browser prices')
  dropWimResponse = true
  assert.equal((await checkout()).status, 200)
  assert.equal(notices, 0, 'No success or payment hooks before admin approval')
  assert.equal((await payload.count({ collection: 'shop-orders' })).totalDocs, 1)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 10)
  assert.equal(remoteOrders.size, 0)
  assert.equal(purchases.size, 0)
  const managerReq = (extra) => createLocalReq({ req: { user: { id: 1, collection: 'users', roles: ['admin'] }, headers: new Headers(), ...extra } }, payload)
  const orderFor = async (cartId) => (await payload.find({ collection: 'shop-orders', where: { cartId: { equals: cartId } }, depth: 0 })).docs[0]
  const operations = endpoints.find(e => e.path === '/plugins/shop/manage-order' && e.method === 'post')
  const operate = async (order, action, reason = '') => operations.handler(await managerReq({ json: async () => ({ id: order.id, action, version: order.operationsVersion || 0, reason }) }))
  const initial = await orderFor(input.cartId)
  assert.equal(initial.approvalState, 'awaiting')
  assert.equal((await operate(initial, 'confirm')).status, 200)
  assert.equal((await operate(initial, 'confirm')).status, 409, 'Stale double click cannot create another processing plan')
  const work = async cartId => recoverOrder(await createLocalReq({ req: { headers: new Headers() } }, payload), await orderFor(cartId))
  await work(input.cartId)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 9)
  assert.equal(remoteOrders.size, 1, 'Lost WIM response can still mean a committed source order')
  assert.equal(purchases.size, 2, 'The other suppliers continue independently')
  assert.equal(notices, 0, 'Unknown source outcome is not success')
  dropWimResponse = false
  wimStock = 0
  for (const group of (await payload.find({ collection: 'shop-order-groups' })).docs) await payload.update({ collection: 'shop-order-groups', id: group.id, data: { nextAttemptAt: new Date(0).toISOString() } })
  await work(input.cartId)
  const retries = await Promise.all([checkout(), checkout(), checkout()])
  assert.ok(retries.every((r) => r.status === 200), 'Concurrent retries must all finish the original order')
  const completed = retries[0]
  assert.equal(completed.status, 200)
  const result = await completed.json()
  assert.equal(result.order.total, 500000)
  assert.equal(remoteOrders.size, 1)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 9)
  assert.equal(notices, 1)
  assert.equal((await checkout()).status, 200)
  assert.equal(notices, 1)
  assert.equal((await checkout({ ...input, customer: { ...input.customer, phone: '0900000000' } })).status, 409)
  assert.equal(purchases.size, 2)
  assert.ok([...purchases.values()].every((p) => !JSON.stringify(p.purchase).includes(input.customer.address)))
  await service.recoverTransfers(await createLocalReq({}, payload))
  assert.equal((await payload.count({ collection: 'shop-order-groups' })).totalDocs, 4)
  console.log('PASS admin approval: no effects before approval, one command per group, mixed-source processing, lost response recovery and customer isolation')

  const lookup = endpoints.find((e) => e.path.endsWith('/order'))
  const request = async (token) => lookup.handler(await createLocalReq({ req: { url: `http://localhost/api/plugins/shop/order?id=${result.order.id}&token=${token}` } }, payload))
  assert.equal((await request(result.lookupToken)).status, 200)
  assert.equal((await request('5678')).status, 404)
  assert.equal((await request('0'.repeat(64))).status, 404)
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID() })).status, 409, 'New checkout must see current zero WIM stock')
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 0.5 }] })).status, 400)
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 6 }, { productId: String(native.id), quantity: 6 }] })).status, 409)
  const order = (await payload.find({ collection: 'shop-orders' })).docs[0]
  await assert.rejects(payload.update({ collection: 'shop-orders', id: order.id, overrideAccess: false, user: { id: 999, collection: 'users', roles: ['publisher'] }, data: { total: 1, status: 'completed' } }))
  await assert.rejects(payload.delete({ collection: 'shop-orders', id: order.id, overrideAccess: false, user: { id: 999, collection: 'users', roles: ['publisher'] } }))
  assert.equal((await operate(order, 'cancel', 'Customer requested cancellation')).status, 200)
  await work(input.cartId)
  assert.equal([...remoteOrders.values()][0].status, 'cancelled')
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 10)
  await work(input.cartId)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 10)
  console.log('PASS lookup, zero stock, fractional/duplicate quantities, WIM cancellation and one-time local restock')

  wimStock = 2
  const pickup = { ...input, cartId: crypto.randomUUID(), items: [{ productId: 'wim:1', quantity: 1 }], fulfillment: { type: 'pickup', branchId: 'hn' } }
  assert.equal((await checkout({ ...pickup, fulfillment: { type: 'pickup', branchId: 'missing' } })).status, 503)
  const picked = await checkout(pickup)
  assert.equal(picked.status, 200)
  assert.equal((await operate(await orderFor(pickup.cartId), 'confirm')).status, 200)
  await work(pickup.cartId)
  assert.equal([...remoteOrders.values()].at(-1).fulfillment.branchId, 'hn')
  assert.equal((await payload.find({ collection: 'shop-orders', where: { cartId: { equals: pickup.cartId } } })).docs[0].items[0].productId, String(wimProduct.id))
  console.log('PASS pickup: branch validation, legacy WIM cart IDs and canonical Product mapping')

  const exported = await endpoints.find((e) => e.path.endsWith('/export')).handler(await managerReq({}))
  assert.equal(exported.status, 200)
  const csv = await exported.text()
  assert.ok(csv.split('\r\n')[0].endsWith('source,wimId'))
  const imported = await endpoints.find((e) => e.path.endsWith('/import')).handler(await managerReq({ text: async () => csv }))
  assert.deepEqual((await imported.json()).errors, [])
  assert.equal((await payload.findByID({ collection: 'shop-products', id: wimProduct.id })).source, 'wim')
  const detached = 'code,name,price,stock,active,source\r\nDETACHED,Detached supplier product,50000,10,1,cross-sell'
  const detachedResult = await endpoints.find((e) => e.path.endsWith('/import')).handler(await managerReq({ text: async () => detached }))
  assert.equal((await detachedResult.json()).created, 1)
  const detachedProduct = (await payload.find({ collection: 'shop-products', where: { code: { equals: 'DETACHED' } } })).docs[0]
  assert.equal(detachedProduct.active, false)
  assert.equal(detachedProduct.stock, 0)
  console.log('PASS CSV: source identities survive export/import; unlinked supplier imports cannot be sold')

  const legacyEndpoint = payload.config.endpoints.find((endpoint) => endpoint.path === '/plugins/wim/checkout')
  const legacyInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: '1', quantity: 1 }], locale: 'en' }
  const legacyRequest = async (body) => legacyEndpoint.handler(await createLocalReq({ req: { headers: new Headers(), json: async () => body } }, payload))
  const upstreamCount = remoteOrders.size
  const legacyResult = await legacyRequest(legacyInput)
  assert.equal(legacyResult.status, 200)
  const legacyBody = await legacyResult.json()
  assert.match(legacyBody.order.id, /^SO-/)
  assert.match(legacyBody.lookupToken, /^[a-f0-9]{64}$/)
  assert.equal(legacyBody.phone4, undefined)
  const legacyOrder = (await payload.find({ collection: 'shop-orders', where: { orderNo: { equals: legacyBody.order.id } } })).docs[0]
  assert.equal(legacyOrder.items[0].productId, String(wimProduct.id), 'Legacy numeric IDs must resolve WIM, not the colliding native product')
  assert.equal(legacyOrder.checkoutDraft.meta.locale, 'en')
  assert.equal((await (await legacyRequest(legacyInput)).json()).order.id, legacyBody.order.id)
  assert.equal(remoteOrders.size, upstreamCount, 'Legacy checkout endpoint also waits for admin approval')
  assert.equal((await legacyRequest({ ...legacyInput, cartId: crypto.randomUUID(), items: [{ productId: '1', quantity: 1.5 }] })).status, 400)
  assert.equal((await legacyRequest({ ...legacyInput, website: 'bot' })).status, 400)
  assert.equal((await legacyRequest(null)).status, 400)
  console.log('PASS legacy WIM API: canonical Product/order, private lookup token, idempotent retry and shared input validation')

  const unmapped = await payload.create({ collection: 'shop-products', data: { name: 'Unmapped WIM product', source: 'wim', price: 100000, stock: 10, active: true }, overrideAccess: true })
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(unmapped.id), quantity: 1 }] })).status, 503)
  payload.config.custom.hossoPlugins = plugins.filter((p) => p.id !== 'cross-sell')
  try {
    assert.equal((await checkout({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(localId(listings[0])), quantity: 1 }] })).status, 503)
  } finally { payload.config.custom.hossoPlugins = plugins }
  console.log('PASS missing adapters/mappings cannot silently sell external products as native Shop goods')

  const missing = await payload.create({ collection: 'shop-products', data: { name: 'Stock changes after checkout', price: 200000, stock: 2, active: true } })
  const partialInput = { ...input, cartId: crypto.randomUUID(), payment: 'bank', items: [{ productId: String(native.id), quantity: 1 }, { productId: String(missing.id), quantity: 1 }] }
  const partialReceipt = await (await checkout(partialInput)).json()
  await work(partialInput.cartId)
  const { recordReceipt } = await load('../packages/plugin-payment/src/ledger.ts')
  const { drainCommerceEvents } = await load('../packages/blocks/src/durable-events.ts')
  const receive = receipt => recordReceipt({ payload, headers: new Headers(), context: {} }, { provider: 'fixture', currency: 'VND', orderNo: partialReceipt.order.id, ...receipt })
  await receive({ reference: 'split-1', amount: 123456 })
  await receive({ reference: 'split-2', amount: 176544 })
  await receive({ reference: 'split-2', amount: 176544 })
  await assert.rejects(receive({ reference: 'split-2', amount: 1 }), /different data/)
  const paymentFor = async () => (await payload.find({ collection: 'payments', where: { orderNo: { equals: partialReceipt.order.id } } })).docs[0]
  assert.equal((await paymentFor()).paidAmount, 300000)
  await drainCommerceEvents(payload)
  assert.equal(paidCalls, 1, 'A failed consumer cannot prevent another consumer from receiving payment')
  assert.equal((await orderFor(partialInput.cartId)).approvalState, 'awaiting', 'Receiving money cannot approve an order')
  const pendingEvents = await payload.find({ collection: 'commerce-events', where: { state: { equals: 'pending' } } })
  for (const event of pendingEvents.docs) await payload.update({ collection: 'commerce-events', id: event.id, data: { nextAttemptAt: new Date(0).toISOString() } })
  await drainCommerceEvents(payload)
  assert.equal(paidCalls, 1, 'A successful consumer is not repeated when another consumer retries')
  assert.equal(flakyCalls, 2)
  await payload.update({ collection: 'shop-products', id: missing.id, data: { stock: 0 } })
  assert.equal((await operate(await orderFor(partialInput.cartId), 'confirm')).status, 200)
  await work(partialInput.cartId)
  const partial = await orderFor(partialInput.cartId)
  assert.equal(partial.workflowState, 'awaiting_customer')
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 9)
  const choose = endpoints.find(e => e.path.endsWith('/order-decision'))
  const choice = token => choose.handler({ payload, headers: new Headers(), context: {}, json: async () => ({ id: partial.orderNo, token, revision: 0, decision: 'accept_available' }) })
  assert.equal((await choice('0'.repeat(64))).status, 404)
  assert.equal((await choice(partial.lookupToken)).status, 200)
  await work(partialInput.cartId)
  assert.equal((await orderFor(partialInput.cartId)).total, 100000)
  assert.equal((await orderFor(partialInput.cartId)).refundDue, 200000)
  assert.equal((await paymentFor()).amount, 100000)
  assert.equal((await paymentFor()).paidAmount, 300000, 'Repricing preserves all original receipt amounts')
  assert.equal((await orderFor(partialInput.cartId)).workflowState, 'ready')
  assert.equal((await choice(partial.lookupToken)).status, 200, 'The same customer choice can be safely replayed')
  console.log('PASS split payments, duplicate webhook, per-consumer retry, no payment autoapproval, partial reservation, private customer choice and overpayment preservation')
  const refund = async (amount, reference) => { const o = await orderFor(partialInput.cartId); return operations.handler(await managerReq({ json: async () => ({ id: o.id, version: o.operationsVersion, action: 'refund', amount, reference, reason: 'Verified fixture outgoing transfer' }) })) }
  assert.equal((await refund(200001, 'fixture-refund-too-much')).status, 409)
  assert.equal((await refund(150000, 'fixture-refund-first')).status, 200)
  assert.equal((await refund(150000, 'fixture-refund-first')).status, 200, 'Replay cannot issue a second refund')
  assert.equal((await orderFor(partialInput.cartId)).refundDue, 50000)
  assert.equal((await refund(50000, 'fixture-refund-final')).status, 200)
  assert.equal((await orderFor(partialInput.cartId)).refundDue, 0)
  assert.equal((await paymentFor()).paidAmount, 300000)
  assert.equal((await payload.count({ collection: 'payment-refunds' })).totalDocs, 2)
  console.log('PASS refund evidence ledger: two verified outgoing transfers, replay safe, over-refund denied and original receipts preserved')

  const expiryInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 1 }] }
  await checkout(expiryInput)
  await operate(await orderFor(expiryInput.cartId), 'confirm')
  const expiring = await orderFor(expiryInput.cartId)
  assert.ok(Date.parse(expiring.reservationExpiresAt) > Date.now(), 'Approval starts a bounded provisional hold')
  await payload.update({ collection: 'shop-orders', id: expiring.id, data: { reservationExpiresAt: new Date(0).toISOString() } })
  const stockBeforeExpiry = (await payload.findByID({ collection: 'shop-products', id: native.id })).stock
  await work(expiryInput.cartId)
  assert.equal((await orderFor(expiryInput.cartId)).status, 'cancelled')
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, stockBeforeExpiry, 'An expired unstarted command cannot consume stock')
  const publisher = { id: 9981, collection: 'users', roles: ['publisher'] }
  await assert.rejects(payload.update({ collection: 'shop-orders', id: expiring.id, overrideAccess: false, user: publisher, data: { status: 'completed', paymentStatus: 'paid', total: 1 } }), /not allowed|forbidden|permission/i)
  await assert.rejects(payload.delete({ collection: 'shop-orders', id: expiring.id, overrideAccess: false, user: publisher }), /not allowed|forbidden|permission/i)
  console.log('PASS bounded precommit expiry, no stock mutation after expiry and denied publisher raw order mutations')

  const dispatchInput = { ...input, cartId: crypto.randomUUID() }
  await checkout(dispatchInput)
  assert.equal((await operate(await orderFor(dispatchInput.cartId), 'confirm')).status, 200)
  await work(dispatchInput.cartId)
  assert.equal((await orderFor(dispatchInput.cartId)).workflowState, 'ready')
  dropFulfillmentResponse = true
  assert.equal((await operate(await orderFor(dispatchInput.cartId), 'ship')).status, 200)
  await work(dispatchInput.cartId)
  assert.equal((await orderFor(dispatchInput.cartId)).workflowState, 'fulfilling', 'Response loss keeps physical outcome pending')
  assert.equal((await operate(await orderFor(dispatchInput.cartId), 'cancel', 'Cannot cancel dispatched goods')).status, 409)
  dropFulfillmentResponse = false
  assert.equal((await operate(await orderFor(dispatchInput.cartId), 'retry')).status, 200)
  assert.equal((await orderFor(dispatchInput.cartId)).status, 'shipping')
  assert.equal(dispatched.size, 3, 'Same source commands are reused after response loss')
  assert.equal((await operate(await orderFor(dispatchInput.cartId), 'complete')).status, 200)
  await work(dispatchInput.cartId)
  assert.equal((await orderFor(dispatchInput.cartId)).status, 'completed')
  assert.equal((await orderFor(dispatchInput.cartId)).paymentStatus, 'unpaid', 'Delivery cannot fabricate a customer receipt')
  console.log('PASS mixed-source durable fulfillment, lost response recovery, cancellation guard and independent payment facts')
  assert.equal((await operate(await orderFor(dispatchInput.cartId), 'paid', 'Verified fixture customer receipt')).status, 200)
  const dispatchedOrder = await orderFor(dispatchInput.cartId)
  for (const transfer of (await payload.find({ collection: service.TRANSFERS, where: { localOrder: { equals: dispatchedOrder.id } } })).docs) await service.processTransfer(payload, transfer.id, 'refresh')

  if (pgUrl) {
    const last = await payload.create({ collection: 'shop-products', data: { name: 'Last concurrent unit', price: 100000, stock: 1, active: true } })
    const contenders = [0, 1].map(() => ({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(last.id), quantity: 1 }] }))
    await Promise.all(contenders.map(body => checkout(body)))
    const beforeApproval = await orderFor(contenders[0].cartId)
    const doubleApprove = await Promise.all([operate(beforeApproval, 'confirm'), operate(beforeApproval, 'confirm')])
    assert.ok(doubleApprove.some(response => response.status === 200))
    assert.equal((await payload.count({ collection: 'shop-order-groups', where: { order: { equals: beforeApproval.id } } })).totalDocs, 1)
    await operate(await orderFor(contenders[1].cartId), 'confirm')
    await Promise.all(contenders.map(body => work(body.cartId)))
    for (const body of contenders) await operate(await orderFor(body.cartId), 'retry')
    const contendersOrders = await Promise.all(contenders.map(body => orderFor(body.cartId)))
    assert.equal((await payload.findByID({ collection: 'shop-products', id: last.id })).stock, 0)
    assert.equal(contendersOrders.filter(o => o.workflowState === 'ready').length, 1)
    assert.equal(contendersOrders.filter(o => o.workflowState === 'awaiting_customer').length, 1)

    const paidInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 1 }] }
    const paidBody = await (await checkout(paidInput)).json(); await work(paidInput.cartId)
    let deliveries = 0
    payload.config.custom.hossoPlugins.push({ id: 'concurrent-observer', hooks: { onOrderPaid: async ({ orderNo }) => { if (orderNo === paidBody.order.id) deliveries++ } } })
    const parts = [40000, 60000].map((amount, i) => ({ provider: 'concurrency', reference: 'part-' + i, orderNo: paidBody.order.id, amount, currency: 'VND' }))
    const receipts = await Promise.allSettled(parts.map(receipt => recordReceipt({ payload, headers: new Headers(), context: {} }, receipt)))
    for (let i = 0; i < receipts.length; i++) if (receipts[i].status === 'rejected') await recordReceipt({ payload, headers: new Headers(), context: {} }, parts[i])
    const paid = (await payload.find({ collection: 'payments', where: { orderNo: { equals: paidBody.order.id } } })).docs[0]
    assert.equal(paid.paidAmount, 100000)
    await Promise.all([drainCommerceEvents(payload), drainCommerceEvents(payload)])
    assert.equal(deliveries, 1)
    console.log('PASS PostgreSQL concurrency: double approval, last-unit stock race, split receipts and competing outbox workers')
  }

  const oldListing = listings[0]
  const oldProduct = await payload.findByID({ collection: 'shop-products', id: localId(oldListing) })
  const migrationPartner = await payload.findByID({ collection: service.PARTNERS, id: typeof oldListing.partner === 'object' ? oldListing.partner.id : oldListing.partner })
  for (const listing of listings) await payload.update({ collection: service.LISTINGS, id: listing.id, data: { active: false } })
  await payload.updateGlobal({ slug: 'cross-sell-settings', data: { backend: 'wim', wimBranchId: 'hn' } })
  await payload.update({ collection: service.LISTINGS, id: oldListing.id, data: { active: true } })
  await assert.rejects(service.importProduct(payload, migrationPartner, 'filter'), /Disable the Shop listing/, 'Never migrate an active Shop listing implicitly')
  await payload.update({ collection: service.LISTINGS, id: oldListing.id, data: { active: false } })
  await payload.update({ collection: 'shop-products', id: oldProduct.id, data: { description: 'Preserve supplier editorial content', stock: 0 } })
  const migrationKey = 'wim:' + migrationPartner.id + ':filter'
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(migrationKey)))
  const migrationWimId = 'xs-' + Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
  const failedListing = await payload.create({ collection: service.LISTINGS, data: { partner: migrationPartner.id, backend: 'wim', remoteId: 'filter', remoteKey: migrationKey, wimProductId: migrationWimId, supplierPrice: 50000, commissionPct: 10, active: true, syncError: 'Previous import failed' } })
  const migratedListing = await service.importProduct(payload, migrationPartner, 'filter')
  assert.equal(migratedListing.id, failedListing.id, 'Recover a failed WIM listing without creating another listing')
  assert.equal(migratedListing.syncError, null)
  assert.equal(localId(migratedListing), oldProduct.id, 'Shop to WIM migration must preserve the product ID and URL')
  const migratedProduct = await payload.findByID({ collection: 'shop-products', id: oldProduct.id })
  assert.equal(migratedProduct.slug, oldProduct.slug)
  assert.equal(migratedProduct.stock, 10)
  assert.equal(migratedProduct.description, 'Preserve supplier editorial content')
  assert.equal(migratedProduct.wimId, migratedListing.wimProductId)
  assert.equal((await payload.findByID({ collection: service.LISTINGS, id: oldListing.id })).product, null, 'Release the unique mapping on the inactive legacy listing')
  assert.equal(localId(await service.importProduct(payload, migrationPartner, 'filter')), oldProduct.id, 'Migration retries must reuse the same product')
  const { upsertWimProduct } = await load('../packages/plugin-wim/src/catalog.ts')
  const unrelated = await payload.create({ collection: 'shop-products', data: { code: 'WIM-unrelated', name: 'Native part with a similar code', price: 123, stock: 2, source: 'shop', active: false } })
  await assert.rejects(upsertWimProduct(payload, { id: 'unrelated', name: 'Different upstream product' }), /already owned/, 'Do not claim a native product based on its code prefix alone')
  assert.equal((await payload.findByID({ collection: 'shop-products', id: unrelated.id })).stock, 2)
  await payload.update({ collection: 'shop-products', id: wimProduct.id, data: { active: false } })
  await syncWimCatalog(payload, true)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: wimProduct.id })).active, false, 'Catalog refresh preserves explicit disabled state')
  console.log('PASS legacy supplier migration: stable Product ID/slug/content, authoritative stock, inactive old mapping released, retry safe')
  console.log('Disposable test database: ' + join(directory, 'test.db'))
} catch (error) {
  console.error('Product pool fixture failed:', error)
  throw error
} finally {
  if (pgUrl && payload?.db.pool && !payload.db.pool.ended) {
    const db = payload.db
    assert.equal(Object.keys(db.sessions).length, 0, 'All workflow transactions must be closed')
    // Payload's schema monitor holds a checked-out client until explicitly released.
    for (const client of db.pool._clients) if (!db.pool._idle.some(idle => idle.client === client)) client.release()
    await db.pool.end()
  }
  if (payload) await payload.destroy()
  if (pgAdmin) { try { await pgAdmin.query('DROP DATABASE "' + pgDatabase + '" WITH (FORCE)') } finally { await pgAdmin.end() } }
  await new Promise((resolve) => server.close(resolve))
}
