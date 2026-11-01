// Real PostgreSQL + Payload endpoints. No production settings or upstream calls.
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
assert.ok(process.env.AFFILIATE_TEST_DATABASE_URL, 'Set a disposable PostgreSQL connection')
process.env.HOSSO_LICENSE_ENFORCE = '0'; process.env.NODE_ENV = 'test'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = (p) => tsImport(p, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const [{ default: shop }, { default: affiliate }, { default: accounts }, { default: shipping }, auth, pricing, accountAuth, service, withdrawals, blocks] = await Promise.all([
  load('../packages/plugin-shop/src/index.ts'), load('../packages/plugin-affiliate/src/index.ts'), load('../packages/plugin-accounts/src/index.ts'), load('../packages/plugin-shipping/src/index.ts'),
  load('../packages/plugin-affiliate/src/auth.ts'), load('../packages/plugin-accounts/src/pricing.ts'), load('../packages/plugin-accounts/src/endpoints.ts'), load('../packages/plugin-affiliate/src/service.ts'), load('../packages/plugin-affiliate/src/withdrawals.ts'), load('../packages/blocks/src/session.ts'),
])
const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
const { postgresAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const schemaName = 'commerce_workflows_' + Date.now(), dir = await mkdtemp(join(tmpdir(), 'hosso-workflows-'))
let partnerProduct
const fixture = { id: 'fixture', commerce: {
  resolveProduct: async (_, p) => p.source === 'wim' ? { source: 'wim', remoteId: p.wimId, price: 2000000, stock: 100 } : undefined,
  fulfillmentGroups: async (_, draft) => draft.fulfillment.type === 'delivery' && draft.items.some((l) => l.productId === String(partnerProduct?.id)) ? [{ key: 'partner-demo', label: 'Đối tác minh họa', lineKeys: [String(partnerProduct.id)], deliveryBy: 'partner', codCollector: 'partner', fee: 25000 }] : [],
} }
const plugins = [shop, affiliate, accounts, shipping, fixture]
let config = { telemetry: false, secret: 'commerce-test-only-secret-32-characters', admin: { user: 'users' }, db: postgresAdapter({ pool: { connectionString: process.env.AFFILIATE_TEST_DATABASE_URL }, schemaName, push: true, migrationDir: dir }), collections: [{ slug: 'users', auth: true, fields: [] }, { slug: 'media', fields: [{ name: 'filename', type: 'text' }] }], jobs: { autoRun: [] }, custom: { hossoPlugins: plugins } }
for (const plugin of plugins) if (plugin.payload) config = plugin.payload(config)
config.jobs.autoRun = []
const payload = await getPayload({ config: buildConfig(config), key: schemaName })
const create = (collection, data) => payload.create({ collection, data, overrideAccess: true })
const rows = async (collection, where = {}) => (await payload.find({ collection, where, limit: 1000, depth: 0, overrideAccess: true })).docs
const request = (cookie = '', input) => createLocalReq({ req: { url: 'http://commerce.test/api/plugins/affiliate/manage', headers: new Headers({ cookie, origin: 'http://commerce.test' }), json: async () => input } }, payload)
const call = async (path, data, cookie = '') => {
  const req = await request(cookie, data); req.url = 'http://commerce.test/api' + path
  const route = payload.config.endpoints.find((e) => e.path === path.split('?')[0])
  const response = await route.handler(req)
  return { status: response.status, data: await response.json() }
}
let checks = 0
const pass = (s) => { checks++; console.log('PASS', s) }
try {
  const aff = await create('affiliates', { name: 'Partner test', code: 'WORKFLOW', email: 'partner@workflow.invalid', approval: 'approved', active: true, holdDays: 0, bankInfo: 'TEST BANK 000' })
  const other = await create('affiliates', { name: 'Other partner', code: 'OTHER', email: 'other@workflow.invalid', approval: 'approved', active: true })
  const affCookie = 'hs_aff=' + await auth.makeSession(payload.secret, aff.id)
  const otherCookie = 'hs_aff=' + await auth.makeSession(payload.secret, other.id)
  const group = await create('garage-price-groups', { name: 'Verified group' })
  const customer = await create('customers', { name: 'Verified buyer', email: 'buyer@workflow.invalid', phone: '0900000001', garageStatus: 'approved', priceGroup: group.id, addresses: [{ address: 'Test address' }] })
  const customerCookie = accountAuth.COOKIE + '=' + await accountAuth.session.make(payload.secret, customer.id)
  const product = await create('shop-products', { name: 'Real schema test product', code: 'TEST-PART', price: 2000000, stock: 100, affiliateRate: 20, garagePrices: [{ group: group.id, overrideEnabled: true, price: 1500000 }] })
  partnerProduct = await create('shop-products', { name: 'Partner group test product', code: 'TEST-PARTNER', price: 500000, stock: 100 })
  await payload.updateGlobal({ slug: 'shipping-settings', data: { flatFee: 35000, feeMode: 'shipment' }, overrideAccess: true })
  const base = { cartId: crypto.randomUUID(), items: [{ productId: String(product.id), quantity: 1 }], customer: { name: customer.name, phone: customer.phone, email: customer.email, address: 'Test address' }, payment: 'cod', fulfillment: { type: 'delivery' }, meta: {} }
  const regular = await call('/plugins/shop/quote', { ...base, items: [{ ...base.items[0], price: 1 }], meta: { customerAccountId: '999' } }, customerCookie)
  assert.equal(regular.data.items[0].price, 1500000)
  const pending = await create('customers', { name: 'Pending buyer', email: 'pending@workflow.invalid', garageStatus: 'pending', priceGroup: group.id })
  const pendingQuote = await call('/plugins/shop/quote', base, accountAuth.COOKIE + '=' + await accountAuth.session.make(payload.secret, pending.id))
  assert.equal(pendingQuote.data.items[0].price, 2000000)
  pass('only a server-approved recipient receives garage overrides; browser prices and account IDs are ignored')
  const { token } = await pricing.makeConsent(payload, customer, aff.code)
  assert.equal((await call('/plugins/affiliate/assisted-customer', { token }, affCookie)).status, 200)
  assert.equal((await call('/plugins/affiliate/assisted-customer', { token }, otherCookie)).status, 400)
  const expired = await blocks.sessionOf('hs_assisted_consent').make(payload.secret, `${customer.id}:${aff.id}:1`)
  assert.equal((await call('/plugins/affiliate/assisted-customer', { token: expired }, affCookie)).status, 400)
  pass('recipient consent is signed, expires and cannot be reused by another affiliate')
  const retail = await call('/plugins/affiliate/assisted-quote', base, affCookie + '; ' + customerCookie)
  assert.equal(retail.data.items[0].price, 2000000)
  const input = { ...base, meta: { assistedCustomerToken: token } }
  const quoted = await call('/plugins/affiliate/assisted-quote', input, affCookie)
  assert.equal(quoted.status, 200, JSON.stringify(quoted.data))
  assert.equal(quoted.data.items[0].price, 1500000)
  assert.equal(quoted.data.commissionPreview.amount, 300000)
  assert.equal((await call('/plugins/affiliate/assisted-quote', { ...input, customer: { ...base.customer, phone: '0900000099' } }, affCookie)).status, 400)
  pass('assisted retail never borrows the creator price; verified recipient and per-product commission are previewed')
  const placed = await call('/plugins/affiliate/assisted-checkout', { ...input, quoteKey: quoted.data.quoteKey }, affCookie)
  assert.equal(placed.status, 200, JSON.stringify(placed.data))
  const retry = await call('/plugins/affiliate/assisted-checkout', { ...input, quoteKey: quoted.data.quoteKey }, affCookie)
  assert.equal(retry.data.order.id, placed.data.order.id)
  assert.equal((await rows('customer-orders'))[0].customer, customer.id)
  assert.equal((await rows('customer-orders')).length, 1)
  assert.equal((await call('/plugins/affiliate/assisted-checkout', { ...input, quoteKey: quoted.data.quoteKey }, otherCookie)).status, 409)
  const order = (await rows('shop-orders', { orderNo: { equals: placed.data.order.id } }))[0]
  assert.equal(order.affiliateSnapshot.affiliate, aff.id)
  assert.equal(order.affiliateSnapshot.attribution, 'assisted')
  assert.equal(order.affiliateSnapshot.rate, 15)
  pass('assisted checkout is idempotent, attributed once and linked only to the verified buyer history')
  const mixed = { ...base, cartId: crypto.randomUUID(), items: [...base.items, { productId: String(partnerProduct.id), quantity: 1 }] }
  const mixedQuote = await call('/plugins/shop/quote', mixed)
  assert.equal(mixedQuote.data.shipments.length, 2)
  assert.equal(mixedQuote.data.adjustments.reduce((s, a) => s + a.amount, 0), 60000)
  assert.equal(mixedQuote.data.shipments.reduce((s, g) => s + g.codAmount, 0), mixedQuote.data.total)
  const mixedPlaced = await call('/plugins/shop/checkout', { ...mixed, quoteKey: mixedQuote.data.quoteKey })
  assert.equal(mixedPlaced.status, 200, JSON.stringify(mixedPlaced.data))
  assert.equal((await rows('shipments', { orderId: { equals: mixedPlaced.data.order.id } })).length, 2)
  const lookup = await call('/plugins/shop/order?id=' + mixedPlaced.data.order.id, undefined)
  assert.equal(lookup.status, 404)
  const lookupEndpoint = payload.config.endpoints.find((e) => e.path === '/plugins/shop/order')
  const req = await request(); req.url = `http://commerce.test/api/plugins/shop/order?id=${mixedPlaced.data.order.id}&token=${mixedPlaced.data.lookupToken}`
  const looked = await (await lookupEndpoint.handler(req)).json()
  assert.equal(looked.order.shipments.length, 2); assert.equal(looked.extras.shipments.length, 2)
  assert.ok(!JSON.stringify(looked).includes('checkoutKey'))
  const tracking = await call(`/plugins/shipping/track?orderId=${mixedPlaced.data.order.id}&phone4=0001`)
  assert.equal(tracking.data.shipments.length, 2)
  assert.equal((await call(`/plugins/shipping/track?orderId=${mixedPlaced.data.order.id}&phone4=9999`)).status, 404)
  await payload.updateGlobal({ slug: 'shipping-settings', data: { feeMode: 'order' }, overrideAccess: true })
  assert.equal((await call('/plugins/shop/quote', mixed)).data.adjustments.reduce((s, a) => s + a.amount, 0), 35000)
  pass('shipment fee scopes, COD and private order projection preserve one total across two delivery groups')
  await payload.update({ collection: 'shop-orders', id: order.id, data: { status: 'completed', paymentStatus: 'paid' }, overrideAccess: true })
  const reqFor = () => request(affCookie)
  const requests = await Promise.allSettled([1, 2].map(async () => withdrawals.requestWithdrawal(await reqFor(), aff)))
  assert.equal(requests.filter((r) => r.status === 'fulfilled').length, 1)
  const withdrawal = requests.find((r) => r.status === 'fulfilled').value
  assert.equal(withdrawal.amount, 300000)
  await withdrawals.reviewWithdrawal(await request(), withdrawal.id, true)
  const payoutInput = { affiliate: aff.id, withdrawalId: withdrawal.id, ids: withdrawal.commissions.map((r) => r.id), reference: 'TRANSFER-TEST', evidence: 'Synthetic test receipt' }
  const payouts = await Promise.allSettled(['A', 'B'].map(async (suffix) => service.settle(await request(), { ...payoutInput, reference: payoutInput.reference + suffix })))
  assert.equal(payouts.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal((await rows('affiliate-payouts')).length, 1)
  assert.equal((await rows('affiliate-withdrawals'))[0].status, 'paid')
  pass('concurrent withdrawals and settlement share one balance and pay each commission once')
  await payload.update({ collection: 'shop-orders', id: order.id, data: { affiliateRefundedAmount: 500000, affiliateRefundedLines: { [product.id]: 500000 } }, overrideAccess: true })
  const negative = (await rows('affiliate-referrals')).filter((r) => r.commission < 0)
  assert.equal(negative.length, 1); assert.equal(negative[0].commission, -100000)
  await assert.rejects(async () => withdrawals.requestWithdrawal(await reqFor(), aff))
  pass('paid per-line refunds create one debt and a below-minimum balance cannot be withdrawn')
  await Promise.allSettled([600000, 700000].map((amount) => payload.update({ collection: 'shop-orders', id: order.id, data: { affiliateRefundedAmount: amount, affiliateRefundedLines: { [product.id]: amount } }, overrideAccess: true })))
  assert.equal((await rows('shop-orders', { id: { equals: order.id } }))[0].affiliateRefundedAmount, 700000)
  assert.equal((await rows('affiliate-referrals')).filter((r) => r.commission < 0).reduce((s, r) => s + r.commission, 0), -140000)
  pass('concurrent cumulative line refunds cannot decrease the recorded refund or duplicate its debt')
  console.log(`PASS ${checks} commerce workflow scenarios on disposable PostgreSQL`)
} finally {
  await payload.db.pool.query('DROP SCHEMA "' + schemaName + '" CASCADE')
  const db = payload.db
  assert.equal(Object.keys(db.sessions).length, 0)
  for (const client of db.pool._clients) if (!db.pool._idle.some((idle) => idle.client === client)) client.release()
  await db.pool.end(); await payload.destroy()
}
