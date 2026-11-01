import { collectOrderExtras, emitOrderPaid, type HossoPlugin } from '@hosso/studio-blocks'
import type { PayloadRequest } from 'payload'
import { inTransaction } from './stock'
import { orderLookupPath } from './order-path'
import { recoverOrder } from './endpoints'

const plugins = (req: PayloadRequest) => (req.payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]
const read = (req: PayloadRequest, id: string) => req.payload.findByID({ collection: 'shop-orders' as any, id, depth: 0, overrideAccess: true, req }) as Promise<any>
const error = (message: string, status = 409) => Response.json({ ok: false, message }, { status })

export async function readManagedOrder(req: PayloadRequest) {
  const o = await read(req, new URL(req.url!).searchParams.get('id') || '').catch(() => null)
  if (!o) return error('order_not_found', 404)
  const path = await orderLookupPath(req.payload)
  const en = o.checkoutDraft?.meta?.locale === 'en'
  const tracking = `${en ? '/en' : ''}${path}?${new URLSearchParams({ id: o.orderNo, token: o.lookupToken || '' })}`
  const extras = await collectOrderExtras(req.payload, { id: o.orderNo, total: o.total, status: o.status, payment: o.paymentMethod, paymentStatus: o.paymentStatus })
  const mail = await req.payload.find({ collection: 'payload-jobs', where: { and: [{ taskSlug: { equals: 'notify-order-email' } }, { 'input.orderNo': { equals: o.orderNo } }] }, limit: 20, depth: 0, sort: '-createdAt', overrideAccess: true, req }).catch(() => null)
  const notifications = (mail?.docs ?? []).map((j: any) => ({ kind: j.input?.kind, audience: j.input?.audience, state: j.completedAt ? 'sent' : j.hasError ? 'failed' : j.totalTried ? 'retrying' : 'queued', at: j.completedAt || j.updatedAt, attempts: j.totalTried || 0 }))
  return Response.json({ ok: true, order: { id: o.id, orderNo: o.orderNo, status: o.status, paymentStatus: o.paymentStatus, total: o.total, customerName: o.customerName, email: o.email, phone: o.phone, address: o.address, fulfillment: o.fulfillmentType, cancellationReason: o.cancellationReason, processing: Boolean(o.checkoutDraft && !o.checkoutComplete && o.status !== 'cancelled'), processingIssue: o.processingIssue, version: o.operationsVersion || 0, history: Array.isArray(o.operationHistory) ? o.operationHistory : [], items: o.items, tracking: o.lookupToken ? tracking : null, canEmail: Boolean(o.email && plugins(req).some((p) => p.commerce?.resendOrderEmail)) }, extras, notifications }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}

const transitions: Record<string, { from: string[]; to?: string }> = {
  confirm: { from: ['new'], to: 'confirmed' },
  prepare: { from: ['confirmed'] },
  ship: { from: ['confirmed'], to: 'shipping' },
  complete: { from: ['confirmed', 'shipping'], to: 'completed' },
  cancel: { from: ['new', 'confirmed', 'shipping'], to: 'cancelled' },
  paid: { from: ['new', 'confirmed', 'shipping', 'completed'] },
  resend: { from: ['new', 'confirmed', 'shipping', 'completed', 'cancelled'] },
  retry: { from: ['new', 'confirmed', 'shipping', 'completed'] },
}

export async function operateOrder(req: PayloadRequest) {
  const b = await req.json?.().catch(() => null) as any
  const action = String(b?.action || '')
  const transition = transitions[action]
  if (!transition) return error('invalid_action', 400)
  let o = await read(req, String(b?.id || '')).catch(() => null)
  if (!o) return error('order_not_found', 404)
  if (!transition.from.includes(o.status)) return error('invalid_transition')
  if (Number(b.version) !== (o.operationsVersion || 0)) return error('order_changed')
  if (o.processingUntil && new Date(o.processingUntil).getTime() > Date.now()) return error('processing_busy')
  if (o.checkoutDraft && !o.checkoutComplete && !['resend', 'retry', 'cancel'].includes(action)) return error('source_pending')
  const reason = String(b?.reason || '').trim().slice(0, 500)
  if (action === 'cancel' && !reason) return error('cancellation_reason_required', 400)
  if (action === 'paid' && o.paymentStatus === 'paid') return error('already_paid')
  if (action === 'prepare' && o.operationHistory?.at(-1)?.action === 'prepare') return error('already_preparing')
  if (action === 'resend' && (!o.email || !plugins(req).some((p) => p.commerce?.resendOrderEmail))) return error('email_unavailable')
  try {
    await inTransaction(req, async () => {
      const version = o.operationsVersion || 0
      const claim = await req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: o.id } }, { status: { equals: o.status } }, { paymentStatus: { equals: o.paymentStatus } }, { or: [{ operationsVersion: { equals: version } }, ...(version === 0 ? [{ operationsVersion: { exists: false } }] : [])] }, { or: [{ processingUntil: { exists: false } }, { processingUntil: { less_than: new Date().toISOString() } }] }] }, data: { operationsVersion: version + 1 }, options: { atomic: true } })
      if (!claim) throw new Error('order_changed')
      if (action === 'resend') for (const p of plugins(req)) await p.commerce?.resendOrderEmail?.(req.payload, o.orderNo, req)
      if (action === 'paid') {
        await emitOrderPaid(req.payload, { request: req, orderNo: o.orderNo, amount: o.total, reference: `manual:${o.id}:${version + 1}`, source: 'shop-admin' })
        if ((await read(req, String(o.id))).paymentStatus !== 'paid') throw new Error('Payment recording failed')
      }
      const history = [...(Array.isArray(o.operationHistory) ? o.operationHistory : []), { action, at: new Date().toISOString(), actor: String(req.user?.id || ''), ...(reason && { reason }) }].slice(-200)
      await req.payload.update({ collection: 'shop-orders' as any, id: o.id, req, data: { ...(transition.to && { status: transition.to }), ...(action === 'cancel' && { cancellationReason: reason }), operationHistory: history }, overrideAccess: true })
    })
    if (action === 'retry') {
      o = await read(req, String(o.id))
      await recoverOrder(req, o)
    }
    return Response.json({ ok: true })
  } catch (e) {
    req.payload.logger.error(e, '[shop] Order action failed')
    return error(action === 'cancel' ? 'cancellation_pending' : 'action_failed')
  }
}
