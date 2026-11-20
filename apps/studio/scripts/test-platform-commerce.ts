import assert from 'node:assert/strict'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import { savedCartEndpoints } from '../../../packages/plugin-shop/src/saved-cart'
import { returnEndpoints } from '../../../packages/plugin-shop/src/returns'
import { recordEvent, analyticsReport, collectEvent } from '../../../packages/plugin-analytics/src/events'
import { recordRefund } from '../../../packages/plugin-payment/src/ledger'

const settings = await config
settings.jobs!.autoRun = []
const payload = await getPayload({ config: settings, disableOnInit: true })
const original = payload.config.custom!.hossoPlugins
try {
  const admin = await payload.create({ collection: 'users', data: { email: 'commerce-fixture@example.test', password: 'commerce-fixture-password', roles: ['admin'] }, overrideAccess: true })
  const req = async (input?: any, staff = false, query = '') => {
    const request = await createLocalReq(staff ? { user: { ...admin, collection: 'users' } } : {}, payload)
    request.headers = new Headers({ origin: 'http://localhost:3000', 'x-fixture-account': 'customer-1' }); Object.defineProperty(request, 'url', { value: `http://localhost:3000/api/plugins/shop/test${query}` })
    if (input !== undefined) request.json = async () => input
    return request
  }
  payload.config.custom!.hossoPlugins = [{ id: 'fixture-identity', commerce: { customerIdentity: async (_payload: any, headers: Headers) => headers.get('x-fixture-account') || undefined } }]
  const saved = (method: string) => savedCartEndpoints.find((endpoint) => endpoint.method === method)!.handler
  const get = await (await saved('get')(await req())).json()
  assert.equal(get.revision, 0)
  const basket = { owner: get.owner, generation: crypto.randomUUID(), revision: 0, lines: [{ productId: '1', quantity: 1 }] }
  const writes = await Promise.all([1, 2].map(async () => saved('post')(await req(basket))))
  assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409], 'Two devices cannot overwrite the same revision')
  const foreign = await req(basket); foreign.headers.set('x-fixture-account', 'customer-2')
  assert.equal((await saved('post')(foreign)).status, 400)
  const crossOrigin = await req(basket); crossOrigin.headers.set('origin', 'https://attacker.invalid')
  assert.equal((await saved('post')(crossOrigin)).status, 403)
  const anonymous = await req(); anonymous.headers.delete('x-fixture-account')
  assert.equal((await saved('get')(anonymous)).status, 401)

  payload.config.custom!.hossoPlugins = [{ id: 'fixture-payment', commerce: { recordRefund, revisePayment: async (request: any, orderNo: string, amount: number) => {
    const payment: any = (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: orderNo } }, req: request, overrideAccess: true })).docs[0]
    await payload.update({ collection: 'payments' as any, id: payment.id, data: { amount }, req: request, overrideAccess: true })
    return { paidAmount: payment.paidAmount, refundDue: payment.paidAmount - amount, paymentStatus: 'paid' }
  } } }]
  const product = await payload.create({ collection: 'shop-products' as any, data: { name: 'Fixture', slug: 'fixture-return', code: 'FIXTURE', price: 100000, stock: 5, active: true, source: 'shop' }, overrideAccess: true })
  const token = 'a'.repeat(64), orderNo = 'SO-77777777'
  const order: any = await payload.create({ collection: 'shop-orders' as any, data: { orderNo, total: 200000, subtotal: 200000, status: 'completed', paymentStatus: 'paid', lookupToken: token, items: [{ productId: String(product.id), source: 'shop', name: 'Fixture', price: 100000, quantity: 2 }] }, overrideAccess: true })
  await payload.create({ collection: 'payments' as any, data: { orderNo, amount: 200000, paidAmount: 200000, status: 'paid' }, overrideAccess: true })
  const endpoint = (path: string, method = 'post') => returnEndpoints.find((item) => item.path === `/plugins/shop/${path}` && item.method === method)!.handler
  const intent = { order: orderNo, token, requestId: crypto.randomUUID(), items: [{ productId: String(product.id), quantity: 1 }], reason: 'Fixture damaged item', resolution: 'refund' }
  assert.equal((await endpoint('returns')(await req({ ...intent, token: 'b'.repeat(64) }))).status, 404)
  const response = await endpoint('returns')(await req(intent)), result = await response.json()
  assert.equal(response.status, 200, JSON.stringify(result))
  const row = result.request
  const invalidEvidence = await endpoint('return-evidence')(await req({ id: row.id, token, revision: 0, image: 'data:image/png;base64,' + Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64') }))
  assert.equal(invalidEvidence.status, 400, 'A magic signature without decodable pixels is rejected')
  const oversized = await endpoint('returns')(await req({ ...intent, unused: 'x'.repeat(40000) }))
  assert.equal(oversized.status, 413, 'Return JSON is bounded before validation')
  assert.equal((await (await endpoint('returns')(await req(intent))).json()).request.id, row.id)
  assert.equal((await endpoint('returns')(await req({ ...intent, requestId: crypto.randomUUID(), items: [{ productId: String(product.id), quantity: 2 }] }))).status, 409)
  assert.equal((await endpoint('manage-return')(await req({ id: row.id, revision: 0, action: 'approve', reason: 'Approved' }))).status, 403)
  const approval = await Promise.all([1, 2].map(async () => endpoint('manage-return')(await req({ id: row.id, revision: 0, action: 'approve', reason: 'Approved' }, true))))
  assert.deepEqual(approval.map((r) => r.status).sort(), [200, 409])
  assert.equal((await endpoint('manage-return')(await req({ id: row.id, revision: 1, action: 'receive', refundAmount: 100001, restock: true, reason: 'Received' }, true))).status, 409)
  assert.equal((await payload.findByID({ collection: 'shop-products' as any, id: product.id, overrideAccess: true }) as any).stock, 5, 'Invalid refunds roll back stock')
  const received = await endpoint('manage-return')(await req({ id: row.id, revision: 1, action: 'receive', refundAmount: 100000, restock: true, reason: 'Received' }, true))
  assert.equal(received.status, 200, await received.text())
  assert.equal((await payload.findByID({ collection: 'shop-products' as any, id: product.id, overrideAccess: true }) as any).stock, 6)
  assert.equal((await payload.findByID({ collection: 'shop-orders' as any, id: order.id, overrideAccess: true }) as any).refundDue, 100000)
  const close = { id: row.id, revision: 2, action: 'close', reference: 'FIXTURE-REFUND-001', transferred: true, reason: 'Transferred fixture' }
  assert.equal((await endpoint('manage-return')(await req({ ...close, transferred: false }, true))).status, 409)
  const closed = await endpoint('manage-return')(await req(close, true))
  assert.equal(closed.status, 200, await closed.text())
  assert.equal((await endpoint('manage-return')(await req(close, true))).status, 409)
  assert.equal((await payload.count({ collection: 'payment-refunds' as any, overrideAccess: true })).totalDocs, 1)
  assert.equal((await payload.findByID({ collection: 'shop-orders' as any, id: order.id, overrideAccess: true }) as any).refundDue, 0)

  await recordEvent(payload, { key: 'fixture-lead', event: 'form_submit', attribution: { pagePath: '/fixture', utm_campaign: 'fixture' }, experiments: { offer_1: 'b' } })
  await recordEvent(payload, { key: 'fixture-lead', event: 'form_submit' })
  await payload.delete({ collection: 'analytics-events' as any, where: { key: { equals: 'ab:offer_1:fixture-lead' } }, overrideAccess: true })
  await Promise.all([1, 2].map(() => recordEvent(payload, { key: 'fixture-lead', event: 'form_submit' })))
  assert.equal((await payload.count({ collection: 'analytics-events' as any, where: { key: { equals: 'ab:offer_1:fixture-lead' } }, overrideAccess: true })).totalDocs, 1, 'Concurrent replay repairs a partial experiment without double counting')
  const report = await (await analyticsReport.handler(await req(undefined, true, '?experiment=offer_1&campaign=fixture'))).json()
  assert.equal(report.counts.form_submit, 1); assert.equal(report.variants.b.form_submit, 1)
  const forged = await req({ id: crypto.randomUUID(), session: crypto.randomUUID(), consent: true, event: 'purchase' })
  assert.equal((await collectEvent.handler(forged)).status, 400, 'Client cannot invent payment events')
  assert.equal((await analyticsReport.handler(await req())).status, 403)
  console.log('PASS platform commerce: saved-cart ownership/CAS, returns idempotency/quantity/access, transactional restock/refund ledger, experiment reports and forged conversions')
} finally { payload.config.custom!.hossoPlugins = original; await payload.destroy() }
process.exit(0)
