import { createLocalReq, type PayloadRequest } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { check, eligibleAmount, money } from './core'
import { atomic, find, snapshot, sync } from './service'

export const beforeWimOrder: NonNullable<HossoPlugin['hooks']>['beforeOrder'] = async ({ payload, headers, draft, source }) => {
  if (source !== 'wim') return
  const key = draft.meta.affiliateOrderKey
  check(typeof key === 'string' && /^hs-[a-f0-9]{40}$/.test(key), 'Missing trusted WIM checkout key')
  const req = await createLocalReq({ context: {}, req: { headers } as any }, payload)
  if ((await find(req, 'affiliate-orders', { key: { equals: 'wim:' + key } })).length) return
  const policy = await snapshot(req, eligibleAmount(draft.subtotal), draft.customer.email)
  await payload.create({ collection: 'affiliate-orders' as any, data: { key: 'wim:' + key, source: 'wim', policy, items: draft.items, customerPhone: draft.customer.phone, orderStatus: 'pending', paymentStatus: 'unpaid', refundedAmount: 0 }, overrideAccess: true, req })
}

export const placedWimOrder: NonNullable<HossoPlugin['hooks']>['onOrderPlaced'] = async ({ payload, headers, source, order, meta }) => {
  if (source !== 'wim' || !meta?.affiliateOrderKey) return
  const req = await createLocalReq({ context: {}, req: { headers } as any }, payload)
  await atomic(req, async () => {
    const receipt = (await find(req, 'affiliate-orders', { key: { equals: 'wim:' + meta.affiliateOrderKey } }))[0]
    check(receipt && (!receipt.orderId || receipt.orderId === order.id), 'WIM receipt does not match order')
    await payload.update({ collection: 'affiliate-orders' as any, id: receipt.id, data: { orderId: order.id, total: money(order.total), orderStatus: order.status }, overrideAccess: true, req })
    if (receipt.policy) await refreshWim(req, { ...receipt, orderId: order.id, total: order.total, orderStatus: order.status }, false)
  })
}

export const changedWimOrder: NonNullable<HossoPlugin['hooks']>['onOrderStatusChanged'] = async ({ payload, source, order }) => {
  if (source !== 'wim') return
  const req = await createLocalReq({}, payload)
  await atomic(req, async () => {
    const receipt = (await find(req, 'affiliate-orders', { source: { equals: source }, orderId: { equals: order.id } }))[0]
    if (receipt?.policy) await refreshWim(req, receipt)
  })
}

export async function refreshWim(req: PayloadRequest, receipt: any, fetchState = true) {
  // Lock and reload before merging manual payment facts with a webhook refresh.
  receipt = await req.payload.update({ collection: 'affiliate-orders' as any, id: receipt.id, data: {}, overrideAccess: true, req })
  let order: any
  if (fetchState) {
    const source = (req.payload.config.custom?.hossoPlugins as HossoPlugin[] | undefined)?.find((p) => p.id === receipt.source)
    check(source?.readOrder, 'Order source cannot be reconciled')
    order = await source.readOrder(req.payload, receipt.orderId)
    check(order && order.id === receipt.orderId && order.total === receipt.total, 'External order total changed; reconcile with the shop')
  } else order = { id: receipt.orderId, total: receipt.total, status: receipt.orderStatus }
  const completedAt = receipt.completedAt || (order.status === 'completed' ? new Date().toISOString() : null)
  const paymentStatus = order.paymentStatus ?? receipt.paymentStatus
  const refundedAmount = order.refundedAmount ?? receipt.refundedAmount ?? 0
  check(money(refundedAmount) >= (receipt.refundedAmount ?? 0), 'External refund amount cannot decrease')
  await req.payload.update({ collection: 'affiliate-orders' as any, id: receipt.id, data: { orderStatus: order.status, completedAt, paymentStatus, refundedAmount }, overrideAccess: true, req })
  const policy = { ...receipt.policy, base: Math.min(receipt.policy.base, money(order.total)) }
  return sync(req, receipt.source, { id: receipt.orderId, total: order.total, status: order.status, paymentStatus, refundedAmount, completedAt }, policy)
}
