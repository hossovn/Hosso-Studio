import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { buildConfig, createLocalReq, getPayload, type CollectionConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import affiliate from '../src/index'
import { atomic, settle } from '../src/service'
import { makeSession } from '../src/auth'

assert.ok(process.env.AFFILIATE_TEST_DATABASE_URL, 'Set AFFILIATE_TEST_DATABASE_URL to a disposable PostgreSQL database')
const schemaName = 'affiliate_test_' + Date.now()
const dir = await mkdtemp(path.join(os.tmpdir(), 'hosso-affiliate-cps-'))
const Orders: CollectionConfig = { slug: 'shop-orders', fields: [
  { name: 'orderNo', type: 'text', unique: true }, { name: 'status', type: 'text', defaultValue: 'new' },
  { name: 'paymentStatus', type: 'text', defaultValue: 'unpaid' }, { name: 'total', type: 'number' }, { name: 'subtotal', type: 'number' },
  { name: 'email', type: 'text' }, { name: 'items', type: 'json' }, { name: 'adjustments', type: 'json' },
] }
const externalOrders = new Map<string, any>()
const config = await buildConfig(affiliate.payload!({ telemetry: false, secret: 'affiliate-cps-test-secret-32-characters', admin: { user: 'users' },
  db: postgresAdapter({ pool: { connectionString: process.env.AFFILIATE_TEST_DATABASE_URL }, schemaName, push: true, migrationDir: dir }),
  collections: [{ slug: 'users', auth: true, fields: [{ name: 'roles', type: 'select', hasMany: true, options: ['admin'] }] }, Orders],
  custom: { hossoPlugins: [affiliate, { id: 'wim', readOrder: async (_: unknown, id: string) => externalOrders.get(id) }] },
}))
const payload = await getPayload({ config })
const administrator = { id: 1, collection: 'users', roles: ['admin'] } as any
const request = (cookie = '', data?: any, admin = false) => createLocalReq({ user: admin ? administrator : undefined, req: { headers: new Headers({ cookie, origin: 'http://affiliate.test' }), url: 'http://affiliate.test/api/plugins/affiliate/manage', json: async () => data } as any }, payload)
const call = async (route: string, data?: any, cookie = '', admin = false) => {
  const req = await request(cookie, data, admin)
  req.url = 'http://affiliate.test/api/plugins/affiliate/' + route
  const endpoint = (payload.config.endpoints as any[]).find((e) => e.path === '/plugins/affiliate/' + route.split('?')[0])!
  const response = await endpoint.handler(req)
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie') }
}
const rows = async (collection: string, where: any = {}) => (await payload.find({ collection: collection as any, where, depth: 0, limit: 1000, overrideAccess: true })).docs as any[]
const manage = async (data: any) => { const response = await call('manage', data, '', true); assert.equal(response.status, 200, JSON.stringify(response.data)); return response.data }
let checks = 0
const pass = (label: string) => { checks++; console.log('PASS', label) }
try {
  const registered = await call('register', { name: 'New affiliate', email: 'new@test.example', password: 'safe-test-password' })
  assert.equal(registered.status, 200)
  const pending = (await rows('affiliates', { email: { equals: 'new@test.example' } }))[0]
  assert.equal(pending.approval, 'pending')
  assert.equal((await call('click', { code: pending.code, path: '/' })).cookie, null)
  await manage({ action: 'approve-affiliate', id: pending.id })
  assert.equal((await call('manage', { action: 'approve-affiliate', id: pending.id })).status, 403)
  pass('registration requires approval and management requires admin')

  const aff: any = await payload.create({ collection: 'affiliates' as any, data: { name: 'Partner', email: 'partner@test.example', code: 'AFF001', approval: 'approved', active: true, commissionPct: 10, holdDays: 0, bankInfo: 'Test Bank 123 Partner' }, overrideAccess: true })
  const click = await call('click', { code: 'AFF001', path: '/product' })
  assert.match(click.cookie!, /HttpOnly/)
  const cookie = click.cookie!.split(';')[0]
  assert.equal((await call('click', { code: 'INVALID', path: '/' }, cookie)).cookie, null)
  const makeOrder = async (number: string, base = 2_000_000, email = 'buyer@test.example') => payload.create({ collection: 'shop-orders' as any, data: { orderNo: number, subtotal: base, total: base + 50_000, adjustments: [{ amount: 50_000, source: 'shipping' }], email, affiliateSnapshot: { affiliate: 999, base: 99_999_999 } }, overrideAccess: true, req: await request(cookie) }) as Promise<any>
  const order = await makeOrder('SO-1')
  let ref = (await rows('affiliate-referrals'))[0]
  assert.equal(ref.commission, 200_000); assert.equal(ref.status, 'pending'); assert.equal(ref.policy.affiliate, aff.id)
  await payload.update({ collection: 'affiliates' as any, id: aff.id, data: { commissionPct: 90 }, overrideAccess: true })
  await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { paymentStatus: 'paid' }, overrideAccess: true })
  ref = (await rows('affiliate-referrals'))[0]
  assert.equal(ref.status, 'holding'); assert.equal(ref.commission, 200_000)
  await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { status: 'completed' }, overrideAccess: true })
  await manage({ action: 'approve', id: ref.id })
  pass('server attribution is immutable, excludes shipping and waits for both payment and completion')

  const paid = await manage({ action: 'payout', affiliate: aff.id, ids: [ref.id], reference: 'BANK-001', evidence: 'test transfer receipt' })
  assert.equal(paid.payout.amount, 200_000)
  assert.equal((await call('manage', { action: 'payout', affiliate: aff.id, ids: [ref.id], reference: 'BANK-002', evidence: 'duplicate' }, '', true)).status, 400)
  await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { affiliateRefundedAmount: 500_000 }, overrideAccess: true })
  await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { affiliateRefundedAmount: 500_000 }, overrideAccess: true })
  let adjustments = await rows('affiliate-referrals', { parent: { equals: ref.id } })
  assert.equal(adjustments.length, 1); assert.equal(adjustments[0].commission, -50_000)
  assert.equal((await rows('affiliate-referrals', { id: { equals: ref.id } }))[0].commission, 200_000)
  assert.equal((await rows('affiliate-referrals', { id: { equals: ref.id } }))[0].status, 'paid')
  await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { affiliateRefundedAmount: 1_000_000 }, overrideAccess: true })
  adjustments = await rows('affiliate-referrals', { parent: { equals: ref.id } })
  assert.equal(adjustments.reduce((s, r) => s + r.commission, 0), -100_000)
  pass('paid history is immutable and repeated partial refunds create only the outstanding reversal')

  await payload.update({ collection: 'affiliates' as any, id: aff.id, data: { commissionPct: 10 }, overrideAccess: true })
  const ready = async (no: string) => {
    const order = await makeOrder(no)
    await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { status: 'completed', paymentStatus: 'paid' }, overrideAccess: true })
    const ref = (await rows('affiliate-referrals', { orderId: { equals: no }, parent: { exists: false } }))[0]
    await manage({ action: 'approve', id: ref.id })
    return ref
  }
  const second = await ready('SO-2')
  assert.equal((await call('manage', { action: 'payout', affiliate: aff.id, ids: [second.id], reference: 'BANK-003', evidence: 'missing debt' }, '', true)).status, 400)
  const net = await manage({ action: 'payout', affiliate: aff.id, ids: [second.id, ...adjustments.map((r) => r.id)], reference: 'BANK-003', evidence: 'net settlement receipt' })
  assert.equal(net.payout.amount, 100_000)
  pass('settlement must include refund debts and records the correct net amount')

  const third = await ready('SO-3')
  const create = payload.create.bind(payload)
  payload.create = (async (args: any) => { if (args.collection === 'affiliate-payout-items') throw new Error('injected receipt failure'); return create(args) }) as any
  await assert.rejects(() => request('', undefined, true).then((req) => settle(req, { affiliate: aff.id, ids: [third.id], reference: 'ROLLBACK', evidence: 'test rollback' })))
  payload.create = create as any
  assert.equal((await rows('affiliate-payouts', { reference: { equals: 'ROLLBACK' } })).length, 0)
  assert.equal((await rows('affiliate-referrals', { id: { equals: third.id } }))[0].status, 'approved')
  const attempts = await Promise.allSettled(['RACE-A', 'RACE-B'].map(async (reference) => settle(await request('', undefined, true), { affiliate: aff.id, ids: [third.id], reference, evidence: 'concurrent settlement test' })))
  assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal((await rows('affiliate-payout-items', { referral: { equals: third.id } })).length, 1)
  pass('failed settlement rolls back and concurrent settlement pays each commission once')

  const self = await makeOrder('SELF', 2_000_000, aff.email)
  await payload.update({ collection: 'shop-orders' as any, id: self.id, data: { status: 'completed', paymentStatus: 'paid' }, overrideAccess: true })
  assert.equal((await rows('affiliate-referrals', { orderId: { equals: 'SELF' } }))[0].status, 'review')
  const legacy: any = await payload.create({ collection: 'affiliate-referrals' as any, data: { affiliate: aff.id, orderId: 'OLD', commission: 100, status: 'approved' }, overrideAccess: true })
  assert.equal((await call('manage', { action: 'payout', affiliate: aff.id, ids: [legacy.id], reference: 'LEGACY', evidence: 'legacy blocked' }, '', true)).status, 400)
  pass('self-referral and unverified legacy commissions cannot be paid')

  await payload.update({ collection: 'affiliates' as any, id: aff.id, data: { active: false }, overrideAccess: true })
  await makeOrder('SUSPENDED')
  assert.equal((await rows('affiliate-referrals', { orderId: { equals: 'SUSPENDED' } })).length, 0)
  await payload.update({ collection: 'affiliates' as any, id: aff.id, data: { active: true }, overrideAccess: true })
  pass('suspended affiliates cannot reuse previously valid tracking cookies')

  const req = await request(cookie)
  const key = 'hs-' + 'a'.repeat(40)
  const draft = { items: [{ productId: 'P1', name: 'Product', price: 100_000, quantity: 2 }], subtotal: 200_000, adjustments: [], customer: { name: 'Buyer', phone: '0901234567' }, fulfillment: { type: 'pickup' as const }, payment: 'cod', meta: { affiliateOrderKey: key } }
  await affiliate.hooks!.beforeOrder!({ payload, headers: req.headers, draft, source: 'wim' })
  await affiliate.hooks!.beforeOrder!({ payload, headers: new Headers(), draft, source: 'wim' })
  externalOrders.set('WIM-1', { id: 'WIM-1', total: 200_000, status: 'completed', customer: draft.customer, items: draft.items })
  await affiliate.hooks!.onOrderPlaced!({ payload, headers: req.headers, order: externalOrders.get('WIM-1'), customer: draft.customer, fulfillment: draft.fulfillment, source: 'wim', meta: draft.meta })
  const receipt = (await rows('affiliate-orders'))[0]
  assert.equal((await rows('affiliate-orders')).length, 1)
  await manage({ action: 'external-refresh', id: receipt.id })
  let wimRef = (await rows('affiliate-referrals', { source: { equals: 'wim' } }))[0]
  assert.equal(wimRef.status, 'pending')
  await manage({ action: 'external-payment', id: receipt.id, amount: 200_000, reference: 'COD-RECEIPT' })
  wimRef = (await rows('affiliate-referrals', { source: { equals: 'wim' } }))[0]
  assert.equal(wimRef.status, 'eligible')
  assert.equal(wimRef.commission, 20_000)
  pass('WIM retries preserve the first attribution and COD needs documented payment confirmation')

  await manage({ action: 'external-refund', id: receipt.id, amount: 50_000, reference: 'REFUND-WIM' })
  await Promise.all([manage({ action: 'external-refresh', id: receipt.id }), manage({ action: 'external-payment', id: receipt.id, amount: 200_000, reference: 'COD-RECONFIRM' })])
  const retained = (await rows('affiliate-orders', { id: { equals: receipt.id } }))[0]
  assert.equal(retained.refundedAmount, 50_000); assert.equal(retained.paymentStatus, 'paid')
  externalOrders.get('WIM-1').status = 'cancelled'
  await affiliate.hooks!.onOrderStatusChanged!({ payload, source: 'wim', order: externalOrders.get('WIM-1') })
  assert.equal((await rows('affiliate-referrals', { source: { equals: 'wim' } }))[0].status, 'cancelled')
  pass('WIM concurrent refresh preserves manual refunds and authoritative cancellation cancels commission')

  const beforeTotals = await call('me', undefined, 'hs_aff=' + await makeSession(payload.secret, aff.id))
  await (payload.db as any).pool.query('INSERT INTO "' + schemaName + '".affiliate_referrals (affiliate_id, order_id, commission, status, policy) SELECT $1, \'BULK-\' || n, 100, \'pending\', $2::jsonb FROM generate_series(1, 501) n', [aff.id, JSON.stringify(ref.policy)])
  const report = await call('me?page=26&status=pending', undefined, 'hs_aff=' + await makeSession(payload.secret, aff.id))
  assert.equal(report.status, 200); assert.equal(report.data.totals.pending, beforeTotals.data.totals.pending + 50_100)
  assert.equal(report.data.orderCount, beforeTotals.data.orderCount + 501)
  assert.ok(report.data.referrals.length > 0 && report.data.referrals.length <= 20)
  assert.ok(report.data.referrals.every((r: any) => !('policy' in r) && !('affiliate' in r)))
  assert.ok(!('passwordHash' in report.data.profile))
  pass('portal totals include more than 500 commissions while pages expose only permitted fields')

  const recoveryDraft = { ...draft, meta: { affiliateOrderKey: 'hs-' + 'b'.repeat(40) } }
  await affiliate.hooks!.beforeOrder!({ payload, headers: req.headers, draft: recoveryDraft, source: 'wim' })
  const recoveryReceipt = (await rows('affiliate-orders', { key: { equals: 'wim:' + recoveryDraft.meta.affiliateOrderKey } }))[0]
  externalOrders.set('WIM-RECOVERY', { id: 'WIM-RECOVERY', total: 200_000, status: 'new', customer: { phone: 'wrong' }, items: draft.items })
  assert.equal((await call('manage', { action: 'external-link', id: recoveryReceipt.id, orderId: 'WIM-RECOVERY' }, '', true)).status, 400)
  externalOrders.get('WIM-RECOVERY').customer = draft.customer
  await manage({ action: 'external-link', id: recoveryReceipt.id, orderId: 'WIM-RECOVERY' })
  assert.equal((await rows('affiliate-orders', { id: { equals: recoveryReceipt.id } }))[0].orderId, 'WIM-RECOVERY')
  assert.equal((await rows('affiliate-referrals', { orderId: { equals: 'WIM-RECOVERY' } })).length, 1)
  pass('WIM recovery verifies customer and lines before linking an existing order')

  await atomic(await request('', undefined, true), async () => {})
  const clickDoc = (await rows('affiliate-clicks'))[0]
  await payload.update({ collection: 'affiliate-clicks' as any, id: clickDoc.id, data: { expiresAt: new Date(0).toISOString() }, overrideAccess: true })
  await makeOrder('EXPIRED')
  assert.equal((await rows('affiliate-referrals', { orderId: { equals: 'EXPIRED' } })).length, 0)
  pass('server expiry prevents reuse of expired attribution')
  console.log(`PASS ${checks} PostgreSQL integration scenarios; test database: ${dir}`)
} finally {
  await (payload.db as any).pool.query('DROP SCHEMA "' + schemaName + '" CASCADE')
  const db = payload.db as any
  assert.equal(Object.keys(db.sessions).length, 0, 'All financial transactions must be closed')
  // Payload 3.91 retains a monitoring client that its destroy hook does not release.
  for (const client of db.pool._clients) if (!db.pool._idle.some((idle: any) => idle.client === client)) client.release()
  await db.pool.end(); await payload.destroy()
}
