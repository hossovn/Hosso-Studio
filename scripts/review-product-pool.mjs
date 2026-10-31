// Regression tests for the Product pool review, using the isolated Payload + HTTP fixture.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const fixtureUrl = new URL('./test-product-pool.mjs', import.meta.url)
let fixture = await readFile(fixtureUrl, 'utf8')
const replace = (before, after) => {
  assert.ok(fixture.includes(before), 'Fixture changed: ' + before.slice(0, 80))
  fixture = fixture.replace(before, after)
}
replace('let wimPrice = 300000, wimStock = 10, dropWimResponse = false', 'let wimPrice = 300000, wimStock = 10, dropWimResponse = false, rejectWimOrder = false')
replace("const input = await bodyOf(req), key = req.headers['idempotency-key']", "if (rejectWimOrder) { res.statusCode = 409; return send(res, { error: { code: 'out_of_stock', productId: '1', message: 'No remaining stock' } }) }\n      const input = await bodyOf(req), key = req.headers['idempotency-key']")
replace('const plugins = [shop, wim, crossSell,', "const { default: payment } = await load('../packages/plugin-payment/src/index.ts')\n  const plugins = [shop, wim, crossSell, payment,")
replace("  console.log('Disposable test database: ' + join(directory, 'test.db'))", String.raw`
  const findings = []
  const record = (id, evidence) => { findings.push({ id, ...evidence }); console.log('PASS ' + id + ': ' + JSON.stringify(evidence)) }
  const { recoverOrders } = await load('../packages/plugin-shop/src/endpoints.ts')

  // A hard upstream refusal releases the reservation once.
  wimStock = 2
  rejectWimOrder = true
  const beforeRejected = (await payload.findByID({ collection: 'shop-products', id: native.id })).stock
  const refusedInput = { ...input, cartId: crypto.randomUUID(), items: [native.id, wimProduct.id].map((id) => ({ productId: String(id), quantity: 1 })) }
  assert.equal((await checkout(refusedInput)).status, 409)
  assert.equal((await checkout(refusedInput)).status, 409)
  const refused = (await payload.find({ collection: 'shop-orders', where: { cartId: { equals: refusedInput.cartId } } })).docs[0]
  assert.equal(refused.checkoutComplete, false)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, beforeRejected)
  assert.equal(refused.status, 'cancelled')
  assert.equal(refused.restocked, true)
  await payload.update({ collection: 'shop-orders', id: refused.id, data: { status: 'cancelled' } })
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, beforeRejected)
  record('R1', { upstream: 409, checkout: 409, reservedNativeStock: 0, cancelled: true, restockedOnce: true })
  rejectWimOrder = false

  // Simulate one transient payment write failure, then retry after the database has recovered.
  await payload.updateGlobal({ slug: 'payment-settings', data: { bank: 'MB', accountNumber: '123456789', accountName: 'Test account' }, overrideAccess: true })
  const bankInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 1 }], payment: 'bank' }
  const savedCreate = payload.create.bind(payload)
  let failedPaymentWrites = 0
  payload.create = async (args) => { if (args.collection === 'payments') { failedPaymentWrites++; throw new Error('Injected transient payment database failure') } return savedCreate(args) }
  let bankResponse
  try { bankResponse = await checkout(bankInput) } finally { payload.create = savedCreate }
  assert.equal(bankResponse.status, 503)
  assert.equal((await bankResponse.json()).code, 'payment_pending')
  assert.equal(failedPaymentWrites, 1)
  const bankRetry = await checkout(bankInput)
  assert.equal(bankRetry.status, 200)
  const bankOrder = await bankRetry.json()
  assert.equal((await payload.count({ collection: 'payments', where: { orderNo: { equals: bankOrder.order.id } } })).totalDocs, 1)
  await checkout(bankInput)
  assert.equal((await payload.count({ collection: 'payments', where: { orderNo: { equals: bankOrder.order.id } } })).totalDocs, 1)
  record('R2', { checkout: 503, failedPaymentWrites, retry: 200, paymentsAfterRetry: 1 })

  // Pending source orders cannot expose payment instructions.
  dropWimResponse = true
  const pendingBankInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(wimProduct.id), quantity: 1 }], payment: 'bank' }
  assert.equal((await checkout(pendingBankInput)).status, 503)
  const pendingBank = (await payload.find({ collection: 'shop-orders', where: { cartId: { equals: pendingBankInput.cartId } } })).docs[0]
  const pendingLookup = await lookup.handler(await createLocalReq({ req: { url: 'http://localhost/api/plugins/shop/order?id=' + pendingBank.orderNo + '&token=' + pendingBank.lookupToken } }, payload))
  const pendingPublic = await pendingLookup.json()
  assert.equal(pendingBank.checkoutComplete, false)
  assert.equal(pendingPublic.extras.payment, undefined)
  assert.equal(pendingPublic.order.status, 'pending')
  assert.equal((await payload.count({ collection: 'payments', where: { orderNo: { equals: pendingBank.orderNo } } })).totalDocs, 0)
  record('R3', { checkoutComplete: false, publicStatus: pendingPublic.order.status, paymentQrExposed: false, paymentTrackingRecords: 0 })
  dropWimResponse = false
  await recoverOrders(await createLocalReq({ req: { headers: new Headers() } }, payload))
  assert.equal((await payload.findByID({ collection: 'shop-orders', id: pendingBank.id })).checkoutComplete, true)
  assert.equal((await payload.count({ collection: 'payments', where: { orderNo: { equals: pendingBank.orderNo } } })).totalDocs, 1)

  // An inventory failure rolls back the order and its reservation.
  assert.ok(payload.db.transactionOptions, 'The fixture enables real SQLite transactions')
  const savedUpdate = payload.update.bind(payload)
  const stockInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 1 }] }
  const stockBeforeFailure = (await payload.findByID({ collection: 'shop-products', id: native.id })).stock
  payload.update = async (args) => {
    if (args.collection === 'shop-products' && String(args.id) === String(native.id) && args.data.stock !== undefined) throw new Error('Injected inventory write failure')
    return savedUpdate(args)
  }
  let stockResponse
  try { stockResponse = await checkout(stockInput) } finally { payload.update = savedUpdate }
  assert.equal(stockResponse.status, 503)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, stockBeforeFailure)
  assert.equal((await payload.count({ collection: 'shop-orders', where: { cartId: { equals: stockInput.cartId } } })).totalDocs, 0)
  assert.equal((await checkout(stockInput)).status, 200)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: native.id })).stock, stockBeforeFailure - 1)
  record('R4', { transactions: true, stockWriteFailed: true, checkout: 503, partialOrders: 0, retryStockDecrement: 1 })

  // Two unrelated carts have both validated the last unit before either adjusts the inventory.
  const scarce = await payload.create({ collection: 'shop-products', data: { name: 'Last unit', code: 'LAST-REVIEW', price: 10000, stock: 1, active: true }, overrideAccess: true })
  let arrivals = 0, release
  const gate = new Promise((resolve) => { release = resolve })
  const barrier = { id: 'review-barrier', hooks: { beforeOrder: async ({ draft }) => { if (draft.items.some((i) => i.productId === String(scarce.id))) { if (++arrivals === 2) release(); await gate } } } }
  payload.config.custom.hossoPlugins = [...plugins, barrier]
  const scarceInput = { ...input, items: [{ productId: String(scarce.id), quantity: 1 }] }
  let competitors
  try { competitors = await Promise.all([checkout({ ...scarceInput, cartId: crypto.randomUUID() }), checkout({ ...scarceInput, cartId: crypto.randomUUID() })]) }
  finally { payload.config.custom.hossoPlugins = plugins }
  assert.equal(competitors.filter((r) => r.status === 200).length, 1)
  assert.ok(competitors.every((r) => [200, 409, 503].includes(r.status)))
  assert.equal((await payload.findByID({ collection: 'shop-products', id: scarce.id })).stock, 0)
  record('R5', { initialStock: 1, successfulOrders: 1, statuses: competitors.map((r) => r.status), finalStock: 0 })

  // Two sites sharing a WIM credential can have the same local SO number and identical customer/items.
  const { commerce } = await load('../packages/plugin-wim/src/catalog.ts')
  const wimDraft = { ...pendingBank.checkoutDraft, id: 'SO-999999' }
  const remoteBeforeCollision = remoteOrders.size
  const siteAKey = crypto.randomUUID(), siteBKey = crypto.randomUUID()
  const siteA = await commerce.submitOrder(payload, { ...wimDraft, checkoutKey: siteAKey })
  const siteB = await commerce.submitOrder(payload, { ...wimDraft, checkoutKey: siteBKey })
  assert.notEqual(siteA.id, siteB.id)
  assert.equal((await commerce.submitOrder(payload, { ...wimDraft, checkoutKey: siteAKey })).id, siteA.id)
  assert.equal(remoteOrders.size - remoteBeforeCollision, 2)
  record('R6', { sameWimCredential: true, sameLocalOrderNo: true, separateSites: 2, upstreamOrders: 2, retryReusesSourceOrder: true })

  // Replaying a cancelled cart never reports purchase success.
  const cancelledReplay = await checkout()
  assert.equal(cancelledReplay.status, 409)
  assert.equal((await cancelledReplay.json()).resetCart, true)
  record('R7', { cancelledOrderCheckout: 409, ok: false })

  const access = async (query) => lookup.handler(await createLocalReq({ req: { url: 'http://localhost/api/plugins/shop/order?id=' + bankOrder.order.id + '&' + query } }, payload))
  assert.equal((await access('phone=5678')).status, 404)
  assert.equal((await access('token=' + '0'.repeat(64))).status, 404)
  assert.equal((await access('token=' + pendingBank.lookupToken)).status, 404)
  const authorized = await access('token=' + bankOrder.lookupToken)
  assert.equal(authorized.status, 200)
  assert.equal(authorized.headers.get('cache-control'), 'no-store')
  assert.ok((await authorized.json()).extras.payment.qrUrl)
  record('R8', { missingToken: 404, guessedPhone: 404, wrongToken: 404, anotherOrderToken: 404, correctToken: 200 })

  let deliveries = 0
  const flaky = { id: 'flaky-delivery', hooks: { onOrderPlaced: async () => { if (++deliveries === 1) throw new Error('Injected notification outage') } } }
  payload.config.custom.hossoPlugins = [...plugins, flaky]
  const noticesBefore = notices
  const eventInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 1 }] }
  const eventResponse = await checkout(eventInput)
  assert.equal(eventResponse.status, 200)
  const eventOrderNo = (await eventResponse.json()).order.id
  let eventOrder = (await payload.find({ collection: 'shop-orders', where: { orderNo: { equals: eventOrderNo } } })).docs[0]
  assert.equal(eventOrder.hooksComplete, false)
  await recoverOrders(await createLocalReq({ req: { headers: new Headers() } }, payload))
  eventOrder = await payload.findByID({ collection: 'shop-orders', id: eventOrder.id })
  assert.equal(eventOrder.hooksComplete, true)
  assert.equal(deliveries, 2)
  assert.equal(notices, noticesBefore + 1, 'Already committed hook receipts must not be replayed')
  await recoverOrders(await createLocalReq({}, payload))
  assert.equal(deliveries, 2)
  payload.config.custom.hossoPlugins = plugins
  record('R9', { recoveredFailedHook: true, successfulHooksNotRepeated: true })

  const variantProduct = await payload.create({ collection: 'shop-products', data: { name: 'Variant stock', code: 'VAR-REVIEW', price: 10000, stock: 0, active: true, variants: [{ name: 'Small', sku: 'VAR-S', stock: 1 }, { name: 'Large', sku: 'VAR-L', stock: 2 }] } })
  const variantInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(variantProduct.id), variantId: variantProduct.variants[0].id, quantity: 1 }] }
  assert.equal((await checkout(variantInput)).status, 200)
  assert.equal((await checkout({ ...variantInput, cartId: crypto.randomUUID() })).status, 409)
  const variantOrder = (await payload.find({ collection: 'shop-orders', where: { cartId: { equals: variantInput.cartId } } })).docs[0]
  await payload.update({ collection: 'shop-orders', id: variantOrder.id, data: { status: 'cancelled' } })
  await payload.update({ collection: 'shop-orders', id: variantOrder.id, data: { status: 'cancelled' } })
  assert.deepEqual((await payload.findByID({ collection: 'shop-products', id: variantProduct.id })).variants.map((v) => v.stock), [1, 2])
  const multiInput = { ...variantInput, cartId: crypto.randomUUID(), items: [{ productId: String(variantProduct.id), variantId: variantProduct.variants[1].id, quantity: 1 }, { productId: String(native.id), quantity: 1 }] }
  payload.update = async (args) => {
    if (args.collection === 'shop-products' && String(args.id) === String(native.id) && args.data.stock !== undefined) throw new Error('Injected second-line stock failure')
    return savedUpdate(args)
  }
  try { assert.equal((await checkout(multiInput)).status, 503) } finally { payload.update = savedUpdate }
  assert.deepEqual((await payload.findByID({ collection: 'shop-products', id: variantProduct.id })).variants.map((v) => v.stock), [1, 2])
  assert.equal((await payload.count({ collection: 'shop-orders', where: { cartId: { equals: multiInput.cartId } } })).totalDocs, 0)
  record('R10', { variantStock: true, cancellationRestocksOnce: true, secondLineFailureRollsBackAll: true })

  const redirectPlugin = { id: 'test-redirect', hooks: { onOrderPlaced: async () => ({ redirectUrl: 'https://checkout.example.test/pay' }) } }
  payload.config.custom.hossoPlugins = [...plugins, redirectPlugin]
  const redirectInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(variantProduct.id), variantId: variantProduct.variants[1].id, quantity: 1 }] }
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await (await checkout(redirectInput)).json()).redirectUrl, 'https://checkout.example.test/pay')
  payload.config.custom.hossoPlugins = plugins
  await payload.update({ collection: 'shop-orders', id: eventOrder.id, data: { hooksComplete: false, hookLeaseUntil: new Date(Date.now() - 60000).toISOString() } })
  await recoverOrders(await createLocalReq({}, payload))
  assert.equal((await payload.findByID({ collection: 'shop-orders', id: eventOrder.id })).hooksComplete, true)
  assert.equal(deliveries, 2)
  record('R11', { redirectSurvivesRetry: true, expiredWorkerLeaseRecovered: true })

  const listing = listings[0]
  const supplier = await service.partnerById(payload, typeof listing.partner === 'object' ? listing.partner.id : listing.partner)
  const savedFind = payload.find.bind(payload)
  let syncReady, resumeSync
  const syncing = new Promise((resolve) => { syncReady = resolve })
  const pauseSync = new Promise((resolve) => { resumeSync = resolve })
  let paused = false
  payload.find = async (args) => {
    const found = await savedFind(args)
    if (!paused && args.collection === service.TRANSFERS && args.req?.transactionID) { paused = true; syncReady(); await pauseSync }
    return found
  }
  const sync = service.importProduct(payload, supplier, 'filter')
  await syncing
  const supplierInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(localId(listing)), quantity: 1 }] }
  const concurrentCheckout = checkout(supplierInput)
  await new Promise((resolve) => setTimeout(resolve, 50))
  resumeSync()
  try { await sync; assert.equal((await concurrentCheckout).status, 200) } finally { payload.find = savedFind }
  assert.equal((await payload.findByID({ collection: 'shop-products', id: localId(listing) })).stock, 9)
  await service.importProduct(payload, supplier, 'filter')
  assert.equal((await payload.findByID({ collection: 'shop-products', id: localId(listing) })).stock, 9)
  record('R12', { supplierSyncConcurrentWithCheckout: true, reservationPreserved: true })
  console.log('RELIABILITY REGRESSIONS: ' + findings.length)
  console.log('Disposable review database: ' + join(directory, 'test.db'))
`)
fixture = fixture.replaceAll('import.meta.url', JSON.stringify(fixtureUrl.href))
const generated = join(await mkdtemp(join(tmpdir(), 'hosso-pool-review-fixture-')), 'review.mjs')
await writeFile(generated, fixture)
await import(pathToFileURL(generated).href)
