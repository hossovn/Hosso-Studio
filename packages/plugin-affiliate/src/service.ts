import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest, Where } from 'payload'
import { check, commission, cookie, DAY, eligibleAmount, evaluate, idOf, money, normalizeEmail, REF_COOKIE, type OrderState, type Snapshot } from './core'

export const admin = (user: unknown) => Boolean((user as { roles?: string[] } | null)?.roles?.includes('admin'))
export const find = async (req: PayloadRequest, collection: string, where: Where, limit = 1) => (await req.payload.find({ collection: collection as any, where, limit, depth: 0, overrideAccess: true, req })).docs as any[]
export async function all(req: PayloadRequest, collection: string, where: Where) {
  const docs: any[] = []
  for (let page = 1; ; page++) {
    const result = await req.payload.find({ collection: collection as any, where, limit: 500, page, depth: 0, overrideAccess: true, req })
    docs.push(...result.docs)
    if (!result.hasNextPage) return docs
  }
}
export async function audit(req: PayloadRequest, action: string, subject: string, detail: unknown) {
  await req.payload.create({ collection: 'affiliate-audit-logs' as any, data: { action, subject, actor: req.user ? String(req.user.id) : 'system', detail }, overrideAccess: true, req })
}
export async function atomic<T>(req: PayloadRequest, fn: () => Promise<T>) {
  if (req.transactionID) return fn()
  const transactionID = await req.payload.db.beginTransaction()
  if (!transactionID) return fn()
  req.transactionID = transactionID
  try {
    const result = await fn()
    await req.payload.db.commitTransaction(transactionID)
    return result
  } catch (error) {
    await req.payload.db.rollbackTransaction(transactionID)
    throw error
  } finally { delete req.transactionID }
}

export async function snapshot(req: PayloadRequest, base: number, email?: string): Promise<Snapshot | null> {
  const token = cookie(req.headers, REF_COOKIE)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const click = (await find(req, 'affiliate-clicks', { token: { equals: token }, expiresAt: { greater_than: new Date().toISOString() } }))[0]
  if (!click) return null
  const aff = (await find(req, 'affiliates', { id: { equals: idOf(click.affiliate) }, active: { equals: true }, approval: { equals: 'approved' } }))[0]
  if (!aff) return null
  const holdDays = aff.holdDays ?? 14
  check(Number.isInteger(holdDays) && holdDays >= 0 && holdDays <= 365, 'Invalid holding period')
  const selfSession = cookie(req.headers, 'hs_aff')
  const { readSession } = await import('./auth')
  const loggedIn = selfSession ? await readSession(req.payload.secret, req.headers) : null
  const result: Snapshot = { affiliate: aff.id, click: click.id, type: aff.commissionType ?? 'percent', rate: aff.commissionType === 'fixed' ? money(aff.commissionFixed ?? 0) : aff.commissionPct ?? 0, base: money(base), holdDays, selfReferral: Boolean(loggedIn && String(loggedIn) === String(aff.id)) || Boolean(email && normalizeEmail(email) === normalizeEmail(aff.email)) }
  commission(result)
  return result
}

export const prepareShopOrder: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation === 'create') {
    data.affiliateSnapshot = cookie(req.headers, REF_COOKIE) ? await snapshot(req, eligibleAmount(data.subtotal ?? data.items?.reduce((sum: number, l: any) => sum + l.price * l.quantity, 0), data.adjustments), data.email) : null
    data.affiliateRefundedAmount = 0
    data.affiliateCompletedAt = data.status === 'completed' ? new Date().toISOString() : null
  } else {
    data.affiliateSnapshot = originalDoc.affiliateSnapshot
    data.affiliateCompletedAt = originalDoc.affiliateCompletedAt || ((data.status ?? originalDoc.status) === 'completed' ? new Date().toISOString() : null)
    const refunded = money(data.affiliateRefundedAmount ?? originalDoc.affiliateRefundedAmount ?? 0)
    check(refunded >= (originalDoc.affiliateRefundedAmount ?? 0), 'Refunded goods cannot decrease; record a separate correction')
    check(!originalDoc.affiliateSnapshot || refunded <= originalDoc.affiliateSnapshot.base, 'Refund exceeds eligible goods')
  }
  return data
}

export async function sync(req: PayloadRequest, source: string, order: OrderState, policy: Snapshot) {
  const key = source + ':' + order.id
  const next = evaluate(policy, order)
  const existing = (await find(req, 'affiliate-referrals', { sourceKey: { equals: key } }))[0]
  if (existing?.status === 'paid') {
    // Serialize refund reversals for this paid commission, including concurrent reconciliation.
    await req.payload.update({ collection: 'affiliate-referrals' as any, id: existing.id, data: { status: 'paid' }, overrideAccess: true, req })
    const adjustments = await all(req, 'affiliate-referrals', { parent: { equals: existing.id } })
    const booked = existing.commission + adjustments.reduce((sum, r) => sum + r.commission, 0)
    const difference = next.commission - booked
    if (!difference) return existing
    check(difference < 0, 'Paid commissions only accept refund reversals')
    const adjustmentKey = key + ':refund:' + next.commission
    await req.payload.create({ collection: 'affiliate-referrals' as any, data: { sourceKey: adjustmentKey, source, orderId: order.id, affiliate: idOf(existing.affiliate), parent: existing.id, orderTotal: order.total, commission: difference, status: 'approved', policy, eligibleAt: new Date().toISOString() }, overrideAccess: true, req })
    await audit(req, 'refund-adjustment', adjustmentKey, { commission: difference })
    return existing
  }
  const status = existing?.rejectionReason ? 'cancelled' : existing?.status === 'approved' && next.status === 'eligible' && next.commission === existing.commission ? 'approved' : next.status
  if (existing && existing.commission === next.commission && existing.status === status && existing.eligibleAt === next.eligibleAt) return existing
  const data = { sourceKey: key, source, orderId: order.id, affiliate: policy.affiliate, orderTotal: order.total, policy, ...next, status }
  const row = existing
    ? await req.payload.update({ collection: 'affiliate-referrals' as any, where: { id: { equals: existing.id }, status: { equals: existing.status }, commission: { equals: existing.commission } }, data, overrideAccess: true, req }).then((result) => { check(result.docs.length === 1, 'Commission changed concurrently; retry reconciliation'); return result.docs[0] })
    : await req.payload.create({ collection: 'affiliate-referrals' as any, data, overrideAccess: true, req })
  await audit(req, existing ? 'commission-updated' : 'commission-created', key, { before: existing && { status: existing.status, commission: existing.commission }, after: { status, commission: next.commission } })
  return row
}
export const saveShopOrder: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (doc.affiliateSnapshot) await sync(req, 'shop', { id: doc.orderNo || `SO-${String(doc.id).padStart(6, '0')}`, total: doc.total, status: doc.status, paymentStatus: doc.paymentStatus, refundedAmount: doc.affiliateRefundedAmount, completedAt: doc.affiliateCompletedAt }, doc.affiliateSnapshot)
  return doc
}

export async function refresh(req: PayloadRequest, row: any) {
  if (row.parent) return row
  check(row.policy && row.sourceKey, 'Legacy commission requires manual reconciliation; it cannot be paid through CPS')
  if (row.source === 'shop') {
    const order = (await find(req, 'shop-orders', { orderNo: { equals: row.orderId } }))[0]
    check(order?.affiliateSnapshot, 'Order attribution is missing')
    return sync(req, 'shop', { id: order.orderNo, total: order.total, status: order.status, paymentStatus: order.paymentStatus, refundedAmount: order.affiliateRefundedAmount, completedAt: order.affiliateCompletedAt }, order.affiliateSnapshot)
  }
  const receipt = (await find(req, 'affiliate-orders', { orderId: { equals: row.orderId }, source: { equals: row.source } }))[0]
  check(receipt, 'External order receipt is missing')
  const { refreshWim } = await import('./wim')
  return refreshWim(req, receipt)
}

export async function settle(req: PayloadRequest, input: { affiliate: string | number; ids: (string | number)[]; reference: string; evidence: string }) {
  check(req.payload.db.name !== 'sqlite', 'Payouts require PostgreSQL; SQLite is for preview and tracking only')
  check(Array.isArray(input.ids) && input.ids.length > 0 && input.ids.length <= 100 && new Set(input.ids.map(String)).size === input.ids.length, 'Select 1–100 distinct commissions')
  check(typeof input.reference === 'string' && input.reference.trim().length >= 3 && input.reference.length <= 120, 'Transfer reference is required')
  check(typeof input.evidence === 'string' && input.evidence.trim().length >= 3 && input.evidence.length <= 1000, 'Transfer evidence or receipt URL is required')
  return atomic(req, async () => {
    check(req.transactionID, 'Payouts require an active database transaction')
    const aff = (await find(req, 'affiliates', { id: { equals: input.affiliate }, active: { equals: true }, approval: { equals: 'approved' } }))[0]
    check(aff?.bankInfo?.trim(), 'Approved affiliate with payout details is required')
    const rows = []
    for (const id of input.ids) {
      const row = (await find(req, 'affiliate-referrals', { id: { equals: id }, affiliate: { equals: aff.id } }))[0]
      check(row, 'Commission does not belong to this affiliate')
      const fresh: any = await refresh(req, row)
      check(fresh.status === 'approved', 'Commission is no longer approved')
      rows.push(fresh)
    }
    const debts = await all(req, 'affiliate-referrals', { affiliate: { equals: aff.id }, status: { equals: 'approved' }, commission: { less_than: 0 } })
    check(debts.every((r) => input.ids.map(String).includes(String(r.id))), 'Include all outstanding refund adjustments')
    const amount = rows.reduce((sum, r) => sum + r.commission, 0)
    check(Number.isSafeInteger(amount) && amount > 0, 'Net payout must be positive')
    const payout: any = await req.payload.create({ collection: 'affiliate-payouts' as any, data: { affiliate: aff.id, amount, reference: input.reference.trim(), evidence: input.evidence.trim(), bankInfo: aff.bankInfo, paidAt: new Date().toISOString() }, overrideAccess: true, req })
    for (const row of rows) {
      const claimed = await req.payload.update({ collection: 'affiliate-referrals' as any, where: { id: { equals: row.id }, status: { equals: 'approved' }, commission: { equals: row.commission } }, data: { status: 'paid' }, overrideAccess: true, req })
      check(claimed.docs.length === 1, 'Commission changed during settlement; retry after reconciliation')
      await req.payload.create({ collection: 'affiliate-payout-items' as any, data: { payout: payout.id, referral: row.id, amount: row.commission }, overrideAccess: true, req })
    }
    await audit(req, 'payout-recorded', String(payout.id), { amount, reference: input.reference.trim(), commissions: input.ids })
    return payout
  })
}

export async function rateLimit(req: PayloadRequest, identity: string, slots = 10, minutes = 10) {
  await req.payload.delete({ collection: 'affiliate-rate-limits' as any, where: { expiresAt: { less_than: new Date().toISOString() } }, overrideAccess: true })
  const window = Math.floor(Date.now() / (minutes * 60_000))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(req.payload.secret + ':' + identity)))
  const prefix = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('') + ':' + window
  for (let slot = 0; slot < slots; slot++) {
    const key = prefix + ':' + slot
    if ((await find(req, 'affiliate-rate-limits', { key: { equals: key } })).length) continue
    try {
      await req.payload.create({ collection: 'affiliate-rate-limits' as any, data: { key, expiresAt: new Date((window + 1) * minutes * 60_000).toISOString() }, overrideAccess: true })
      return true
    } catch (error) {
      if (!(await find(req, 'affiliate-rate-limits', { key: { equals: key } })).length) throw error
    }
  }
  return false
}
