import type { HossoPlugin, OrderDraft } from '@hosso/studio-blocks'
import type { PayloadRequest } from 'payload'
import { inTransaction } from './stock'
import { orderLookupPath } from './order-path'

const redirectOf = (order: any): string | undefined => (Object.values(order.placedHooks ?? {}) as any[]).find((receipt) => receipt?.redirectUrl)?.redirectUrl

/** Receipts commit with DB effects; external mail delivery is at least once after a crash. */
export async function deliverOrderEvents(req: PayloadRequest, order: any, stage: 'received' | 'placed' = 'placed') {
  if (!order.checkoutDraft || (stage === 'placed' && (!order.checkoutComplete || order.status === 'cancelled' || order.hooksComplete))) return redirectOf(order)
  const { payload } = req
  const lease = new Date(Date.now() + 10 * 60000).toISOString()
  const claim = await inTransaction(req, () => payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { or: [{ hookLeaseUntil: { exists: false } }, { hookLeaseUntil: { less_than: new Date().toISOString() } }] }] }, data: { hookLeaseUntil: lease }, options: { atomic: true } }))
  if (!claim) return
  let complete = true
  try {
    const lookupPath = await orderLookupPath(payload)
    for (const plugin of (payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]) {
      const hook = stage === 'received' ? plugin.hooks?.onOrderReceived : plugin.hooks?.onOrderPlaced
      if (!hook) continue
      await inTransaction(req, async () => {
        const current = await payload.findByID({ collection: 'shop-orders' as any, id: order.id, depth: 0, overrideAccess: true, req }) as any
        const key = stage === 'received' ? `received:${plugin.id}` : plugin.id
        if (current.placedHooks?.[key] || (stage === 'placed' && current.status === 'cancelled')) return
        const draft = current.checkoutDraft as OrderDraft
        const result = await hook({ payload, request: req, headers: req.headers, order: { id: current.orderNo, total: current.total, status: current.status }, ...draft, meta: { ...draft.meta, lookupToken: current.lookupToken, lookupPath }, source: 'shop' })
        await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { placedHooks: { ...current.placedHooks, [key]: result?.redirectUrl ? { redirectUrl: result.redirectUrl } : true } }, overrideAccess: true, req })
      })
    }
  } catch (error) {
    complete = false
    payload.logger.error(error, '[shop] Order events pending; the recovery job will retry')
  } finally {
    await inTransaction(req, async () => {
      const current = await payload.findByID({ collection: 'shop-orders' as any, id: order.id, req, depth: 0, overrideAccess: true }) as any
      await payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { hookLeaseUntil: { equals: lease } }] }, data: { hookLeaseUntil: null, ...(stage === 'received' ? { placedHooks: { ...current.placedHooks, receivedComplete: complete } } : { hooksComplete: complete && current.placedHooks?.receivedComplete === true }) }, options: { atomic: true } })
    })
  }
  return redirectOf(await payload.findByID({ collection: 'shop-orders' as any, id: order.id, depth: 0, overrideAccess: true }))
}
