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
const remoteOrders = new Map(), purchases = new Map()
let wimPrice = 300000, wimStock = 10, dropWimResponse = false
const send = (res, body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
const bodyOf = async (req) => { let raw = ''; for await (const part of req) raw += part; return JSON.parse(raw) }
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), path = url.pathname
    if (path === '/api/plugins/cross-sell/catalog') return send(res, { item: { id: 'filter', name: 'Partner filter', price: 50000, stock: 10, commissionPct: 10 } })
    if (path === '/api/plugins/cross-sell/orders') {
      if (req.method === 'POST') {
        const purchase = await bodyOf(req)
        if (!purchases.has(purchase.key)) purchases.set(purchase.key, { id: 'SUP-' + (purchases.size + 1), status: 'new', total: purchase.items.reduce((s, i) => s + i.quantity * i.price, 0), commission: purchase.items.reduce((s, i) => s + i.quantity * i.price * i.commissionPct / 100, 0), purchase })
        return send(res, { order: purchases.get(purchase.key) })
      }
      return send(res, { order: purchases.get(url.searchParams.get('key')) ?? null })
    }
    assert.equal(req.headers['x-api-key'], 'product-pool-test-key')
    if (path === '/v1/categories') return send(res, { items: [{ id: 'tyres', name: 'Tyres' }] })
    if (path === '/v1/branches') return send(res, { items: [{ id: 'hn', name: 'Hanoi' }] })
    if (path === '/v1/products') return send(res, { items: [{ id: '1', name: 'WIM tyre', code: 'TYRE', brand: 'WIM brand', price: wimPrice, categoryId: 'tyres', compatibility: [{ make: 'toyota', model: 'camry', yearFrom: 2020, yearTo: 2026 }] }], page: 1, pageSize: 100, total: 1 })
    if (path === '/v1/products/1/availability') return send(res, { productId: '1', price: wimPrice, branches: [{ branchId: 'hn', available: wimStock, inStock: wimStock > 0 }] })
    if (path === '/v1/orders') {
      const input = await bodyOf(req), key = req.headers['idempotency-key']
      if (!remoteOrders.has(key)) remoteOrders.set(key, { id: 'WIM-' + (remoteOrders.size + 1), status: 'new', items: input.items.map((i) => ({ ...i, unitPrice: wimPrice })), total: input.items.reduce((s, i) => s + i.quantity * wimPrice, 0), customer: input.customer, fulfillment: input.fulfillment })
      if (dropWimResponse) return res.destroy()
      return send(res, remoteOrders.get(key))
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
try {
  const [{ default: shop }, { default: wim }, { default: crossSell }, { placeOrder, endpoints }, { loadGrid, loadDetail }, service, { syncWimCatalog }, shared] = await Promise.all([
    load('../packages/plugin-shop/src/index.ts'), load('../packages/plugin-wim/src/index.ts'), load('../packages/plugin-cross-sell/src/index.ts'),
    load('../packages/plugin-shop/src/endpoints.ts'), load('../packages/plugin-shop/src/loaders.ts'), load('../packages/plugin-cross-sell/src/service.ts'), load('../packages/plugin-wim/src/catalog.ts'),
    load('../packages/plugin-wim/src/shared-loaders.ts'),
  ])
  const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
  const { sqliteAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-sqlite')).href)
  let notices = 0
  const plugins = [shop, wim, crossSell, { id: 'test-observer', hooks: { onOrderPlaced: async () => { notices++ } } }]
  let config = { secret: 'isolated-product-pool-test-secret', db: sqliteAdapter({ client: { url: 'file:' + join(directory, 'test.db') }, transactionOptions: {} }),
    collections: [{ slug: 'users', auth: true, fields: [] }, { slug: 'media', upload: { staticDir: join(directory, 'media') }, fields: [] }], globals: [],
    custom: { hossoPlugins: plugins }, jobs: { autoRun: [] }, admin: { user: 'users' } }
  for (const plugin of plugins) if (plugin.payload) config = plugin.payload(config)
  config.jobs.autoRun = []
  payload = await getPayload({ config: buildConfig(config), disableOnInit: true, key: 'product-pool-' + crypto.randomUUID() })
  const native = await payload.create({ collection: 'shop-products', data: { name: 'Shop oil', code: 'OIL', price: 100000, stock: 10, active: true }, overrideAccess: true })
  await syncWimCatalog(payload)
  const wimProduct = (await payload.find({ collection: 'shop-products', where: { wimId: { equals: '1' } } })).docs[0]
  assert.notEqual(String(native.id), String(wimProduct.id), 'Upstream numeric IDs must not collide with internal Product IDs')
  const listings = []
  const localId = (listing) => typeof listing.product === 'object' ? listing.product.id : listing.product
  for (const name of ['Supplier A', 'Supplier B']) {
    const partner = await payload.create({ collection: service.PARTNERS, overrideAccess: true, data: { name, kind: 'hosso', apiUrl, authMethod: 'direct', token: 'product-pool-supplier-token-at-least-32-characters', buyerName: 'Retail business', buyerPhone: '0901234567', active: true } })
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
  assert.equal((await checkout()).status, 503)
  assert.equal(notices, 0, 'No success or payment hooks while WIM confirmation is unknown')
  assert.equal((await payload.count({ collection: 'shop-orders' })).totalDocs, 1)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 9)
  const transfers = (await payload.find({ collection: service.TRANSFERS })).docs
  assert.equal(transfers.length, 2)
  await assert.rejects(service.processTransfer(payload, transfers[0].id, 'send'), /awaiting another/)
  dropWimResponse = false
  wimStock = 0
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
  for (const transfer of transfers) await service.processTransfer(payload, transfer.id, 'send')
  assert.equal(purchases.size, 2)
  assert.ok([...purchases.values()].every((p) => !JSON.stringify(p.purchase).includes(input.customer.address)))
  await service.recoverTransfers(await createLocalReq({}, payload))
  assert.equal((await payload.count({ collection: service.TRANSFERS })).totalDocs, 2)
  console.log('PASS mixed checkout: authoritative prices, two supplier purchases, lost WIM response, safe retry, no duplicate stock/orders/events, customer isolation')

  const lookup = endpoints.find((e) => e.path.endsWith('/order'))
  const request = async (token) => lookup.handler(await createLocalReq({ req: { url: `http://localhost/api/plugins/shop/order?id=${result.order.id}&token=${token}` } }, payload))
  assert.equal((await request(result.lookupToken)).status, 200)
  assert.equal((await request('5678')).status, 404)
  assert.equal((await request('0'.repeat(64))).status, 404)
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID() })).status, 409, 'New checkout must see current zero WIM stock')
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 0.5 }] })).status, 400)
  assert.equal((await checkout({ ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 6 }, { productId: String(native.id), quantity: 6 }] })).status, 409)
  const order = (await payload.find({ collection: 'shop-orders' })).docs[0]
  await payload.update({ collection: 'shop-orders', id: order.id, data: { status: 'cancelled' } })
  assert.equal([...remoteOrders.values()][0].status, 'cancelled')
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 10)
  await payload.update({ collection: 'shop-orders', id: order.id, data: { status: 'cancelled' } })
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, 10)
  console.log('PASS lookup, zero stock, fractional/duplicate quantities, WIM cancellation and one-time local restock')

  wimStock = 2
  const pickup = { ...input, cartId: crypto.randomUUID(), items: [{ productId: 'wim:1', quantity: 1 }], fulfillment: { type: 'pickup', branchId: 'hn' } }
  assert.equal((await checkout({ ...pickup, fulfillment: { type: 'pickup', branchId: 'missing' } })).status, 503)
  const picked = await checkout(pickup)
  assert.equal(picked.status, 200)
  assert.equal([...remoteOrders.values()].at(-1).fulfillment.branchId, 'hn')
  assert.equal((await payload.find({ collection: 'shop-orders', where: { cartId: { equals: pickup.cartId } } })).docs[0].items[0].productId, String(wimProduct.id))
  console.log('PASS pickup: branch validation, legacy WIM cart IDs and canonical Product mapping')

  const managerReq = (extra) => createLocalReq({ req: { user: { id: 1, collection: 'users', roles: ['admin'] }, ...extra } }, payload)
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
  assert.equal(remoteOrders.size, upstreamCount + 1)
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
  console.log('Disposable test database: ' + join(directory, 'test.db'))
} finally {
  if (payload) await payload.destroy()
  await new Promise((resolve) => server.close(resolve))
}
