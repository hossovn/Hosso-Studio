import type { Endpoint, PayloadRequest } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { AffiliateError, check, idOf, money, sameOrigin } from './core'
import { admin, atomic, audit, find, refresh, settle, sync } from './service'
import { refreshWim } from './wim'

export const displayStatus = (r: any) => !r.policy && ['pending', 'approved'].includes(r.status) ? 'review' : r.status === 'holding' && r.eligibleAt && Date.parse(r.eligibleAt) <= Date.now() ? 'eligible' : r.status
const rowFor = async (req: PayloadRequest, id: unknown) => {
  check(typeof id === 'string' || typeof id === 'number', 'Select a commission')
  const row = (await find(req, 'affiliate-referrals', { id: { equals: id } }))[0]
  check(row, 'Commission not found')
  return row
}

export const adminEndpoints: Endpoint[] = [
  { path: '/plugins/affiliate/dashboard', method: 'get', handler: async (req) => {
    if (!admin(req.user)) return Response.json({ ok: false }, { status: 403 })
    const page = Math.max(1, Math.min(100000, Number(new URL(req.url!).searchParams.get('page')) || 1))
    const [affiliates, referrals, payouts, orders] = await Promise.all([
      req.payload.find({ collection: 'affiliates' as any, limit: 50, sort: '-createdAt', page, depth: 0, overrideAccess: true, req }),
      req.payload.find({ collection: 'affiliate-referrals' as any, limit: 50, sort: '-createdAt', page, depth: 1, overrideAccess: true, req }),
      req.payload.find({ collection: 'affiliate-payouts' as any, limit: 50, sort: '-createdAt', page, depth: 1, overrideAccess: true, req }),
      req.payload.find({ collection: 'affiliate-orders' as any, where: { policy: { exists: true } }, limit: 50, sort: '-createdAt', page, depth: 0, overrideAccess: true, req }),
    ])
    return Response.json({ ok: true, canPayout: req.payload.db.name !== 'sqlite', affiliates: affiliates.docs.map((a: any) => ({ id: a.id, name: a.name, code: a.code, approval: a.approval, active: a.active })), referrals: referrals.docs.map((r: any) => ({ ...r, status: displayStatus(r) })), payouts: payouts.docs, orders: orders.docs, page, hasNextPage: [affiliates, referrals, payouts, orders].some((r) => r.hasNextPage) }, { headers: { 'Cache-Control': 'no-store' } })
  } },
  { path: '/plugins/affiliate/manage', method: 'post', handler: async (req) => {
    if (!admin(req.user)) return Response.json({ ok: false }, { status: 403 })
    try {
      sameOrigin(req.headers, req.url!)
      const b = await req.json?.()
      check(b && typeof b === 'object', 'Invalid action')
      if (b.action === 'payout') return Response.json({ ok: true, payout: await settle(req, b) })
      return Response.json(await atomic(req, async () => {
        if (b.action === 'approve-affiliate' || b.action === 'reject-affiliate') {
          const aff = (await find(req, 'affiliates', { id: { equals: b.id } }))[0]
          check(aff, 'Affiliate not found')
          await req.payload.update({ collection: 'affiliates' as any, id: aff.id, data: { approval: b.action === 'approve-affiliate' ? 'approved' : 'rejected' }, overrideAccess: true, req })
        } else if (b.action === 'approve' || b.action === 'reject' || b.action === 'refresh') {
          const row = await rowFor(req, b.id)
          if (b.action === 'refresh') await refresh(req, row)
          else if (b.action === 'approve') {
            const fresh: any = await refresh(req, row)
            check(fresh.status === 'eligible', 'Only eligible commissions can be approved; review payment, returns and self-referral')
            const claimed = await req.payload.update({ collection: 'affiliate-referrals' as any, where: { id: { equals: fresh.id }, status: { equals: 'eligible' }, commission: { equals: fresh.commission } }, data: { status: 'approved' }, overrideAccess: true, req })
            check(claimed.docs.length === 1, 'Commission changed; refresh and retry')
            await audit(req, 'commission-approved', row.sourceKey, { commission: fresh.commission })
          } else {
            check(!row.parent && row.status !== 'paid', 'Paid commissions and refund adjustments cannot be rejected')
            check(typeof b.reason === 'string' && b.reason.trim().length >= 3 && b.reason.length <= 500, 'Rejection reason is required')
            const changed = await req.payload.update({ collection: 'affiliate-referrals' as any, where: { id: { equals: row.id }, status: { not_equals: 'paid' } }, data: { status: 'cancelled', rejectionReason: b.reason.trim() }, overrideAccess: true, req })
            check(changed.docs.length === 1, 'Commission changed; refresh and retry')
            await audit(req, 'commission-rejected', row.sourceKey ?? String(row.id), { reason: b.reason.trim() })
          }
        } else if (b.action === 'reconcile') {
          const page = Number(b.page ?? 1)
          check(Number.isInteger(page) && page >= 1, 'Invalid page')
          const result = await req.payload.find({ collection: 'shop-orders' as any, where: { affiliateSnapshot: { exists: true } }, limit: 100, page, depth: 0, overrideAccess: true, req })
          for (const order of result.docs as any[]) await sync(req, 'shop', { id: order.orderNo || `SO-${String(order.id).padStart(6, '0')}`, total: order.total, status: order.status, paymentStatus: order.paymentStatus, refundedAmount: order.affiliateRefundedAmount, completedAt: order.affiliateCompletedAt }, order.affiliateSnapshot)
          return { ok: true, hasNextPage: result.hasNextPage }
        } else if (['external-refresh', 'external-payment', 'external-refund', 'external-link'].includes(b.action)) {
          let receipt = (await find(req, 'affiliate-orders', { id: { equals: b.id } }))[0]
          check(receipt?.policy, 'Attributed external receipt not found')
          receipt = await req.payload.update({ collection: 'affiliate-orders' as any, id: receipt.id, data: {}, overrideAccess: true, req })
          if (b.action === 'external-link') {
            check(!receipt.orderId && typeof b.orderId === 'string' && b.orderId.length <= 120, 'Receipt is already linked or order ID is invalid')
            const source = (req.payload.config.custom?.hossoPlugins as HossoPlugin[] | undefined)?.find((p) => p.id === receipt.source)
            check(source?.readOrder, 'External source is unavailable')
            const order = await source.readOrder(req.payload, b.orderId)
            const fingerprint = (items: any[]) => JSON.stringify(items.map((i) => [i.productId, i.quantity]).sort((a, c) => String(a[0]).localeCompare(String(c[0]))))
            check(order.customer?.phone === receipt.customerPhone && fingerprint(order.items ?? []) === fingerprint(receipt.items), 'External order does not match the original checkout')
            check(!(await find(req, 'affiliate-orders', { source: { equals: receipt.source }, orderId: { equals: order.id } })).length, 'External order is already linked')
            receipt.orderId = order.id
            receipt.total = money(order.total)
          } else check(receipt.orderId, 'Link the existing WIM order before reconciliation')
          if (b.action === 'external-payment' || b.action === 'external-refund') {
            check(typeof b.reference === 'string' && b.reference.trim().length >= 3 && b.reference.length <= 120, 'Payment or refund evidence reference is required')
            if (b.action === 'external-payment') {
              check(money(b.amount) >= receipt.total, 'Confirm the full order payment, including COD')
              check(receipt.paymentStatus !== 'refunded', 'Refunded payment cannot be reconfirmed')
              receipt.paymentStatus = 'paid'
            } else {
              const amount = money(b.amount)
              check(amount >= (receipt.refundedAmount ?? 0) && amount <= Math.min(receipt.policy.base, receipt.total), 'Invalid cumulative refunded goods')
              receipt.refundedAmount = amount
              if (b.fullRefund === true) receipt.paymentStatus = 'refunded'
            }
            receipt.paymentReference = b.reference.trim()
          }
          await req.payload.update({ collection: 'affiliate-orders' as any, id: receipt.id, data: { orderId: receipt.orderId, total: receipt.total, paymentStatus: receipt.paymentStatus, refundedAmount: receipt.refundedAmount, paymentReference: receipt.paymentReference }, overrideAccess: true, req })
          await refreshWim(req, receipt)
          await audit(req, b.action, receipt.key, { orderId: receipt.orderId, amount: b.amount, reference: b.reference })
        } else check(false, 'Unknown action')
        return { ok: true }
      }))
    } catch (error) {
      if (error instanceof AffiliateError) return Response.json({ ok: false, message: error.message }, { status: 400 })
      req.payload.logger.error(error, '[affiliate] management failed')
      return Response.json({ ok: false, message: 'Operation failed; refresh before retrying.' }, { status: 500 })
    }
  } },
]
