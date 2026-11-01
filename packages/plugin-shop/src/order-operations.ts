import { collectOrderExtras, emitOrderPaid, type HossoPlugin } from '@hosso/studio-blocks'
import type { PayloadRequest } from 'payload'
import { inTransaction } from './stock'
import { orderLookupPath } from './order-path'
import { recoverOrder } from './endpoints'
import { approveOrder, groupsFor, requestCancellation, requestFulfillment, retryOrderGroups } from './order-workflow'
import { retryOrderEvents } from '@hosso/studio-blocks/durable-events'

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
  const mail = await req.payload.find({ collection: 'payload-jobs', where: { and: [{ taskSlug: { equals: 'notify-order-email' } }, { notifyOrderNo: { equals: o.orderNo } }] }, limit: 20, depth: 0, sort: '-createdAt', overrideAccess: true, req }).catch(() => null)
  const notifications = (mail?.docs ?? []).map((j: any) => ({ kind: j.input?.kind, audience: j.input?.audience, state: j.completedAt ? 'sent' : j.hasError ? 'failed' : j.totalTried ? 'retrying' : 'queued', at: j.completedAt || j.updatedAt, attempts: j.totalTried || 0 }))
  const groups = o.workflowVersion === 1 ? (await groupsFor(req.payload, o.id)).map(group => ({ key: group.key, label: group.label, source: group.source, state: group.state, issue: group.issue, attempts: group.attempts, nextAttemptAt: group.nextAttemptAt, result: group.result })) : []
  const processing = Boolean((o.workflowVersion === 1 && ['fulfilling', 'cancelling'].includes(o.workflowState)) || (o.checkoutDraft && !o.checkoutComplete && o.status !== 'cancelled' && o.approvalState !== 'awaiting'))
  return Response.json({ ok: true, order: { id: o.id, orderNo: o.orderNo, workflowVersion: o.workflowVersion, approvalState: o.approvalState, workflowState: o.workflowState, reservationExpiresAt: o.reservationExpiresAt, refundDue: o.refundDue || 0, status: o.status, paymentStatus: o.paymentStatus, total: o.total, customerName: o.customerName, email: o.email, phone: o.phone, address: o.address, fulfillment: o.fulfillmentType, cancellationReason: o.cancellationReason, processing, processingIssue: o.processingIssue, version: o.operationsVersion || 0, history: Array.isArray(o.operationHistory) ? o.operationHistory : [], items: o.items, tracking: o.lookupToken ? tracking : null, canEmail: Boolean(o.email && plugins(req).some((p) => p.commerce?.resendOrderEmail)) }, extras, groups, notifications }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
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
  refund: { from: ['new', 'confirmed', 'shipping', 'completed', 'cancelled'] },
}

export async function operateOrder(req: PayloadRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url!).origin) return error('invalid_origin', 403)
  const b = await req.json?.().catch(() => null) as any
  const action = String(b?.action || '')
  const transition = transitions[action]
  if (!transition) return error('invalid_action', 400)
  let o = await read(req, String(b?.id || '')).catch(() => null)
  if (!o) return error('order_not_found', 404)
  if (!transition.from.includes(o.status)) return error('invalid_transition')
  if (Number(b.version) !== (o.operationsVersion || 0)) return error('order_changed')
  if (o.processingUntil && new Date(o.processingUntil).getTime() > Date.now()) return error('processing_busy')
  if (o.workflowVersion === 1 && ['fulfilling', 'cancelling'].includes(o.workflowState) && !['paid', 'resend', 'retry'].includes(action)) return error('source_pending')
  if (o.checkoutDraft && !o.checkoutComplete && !['resend', 'retry', 'cancel', 'refund', ...(o.workflowVersion === 1 ? ['confirm', 'paid'] : [])].includes(action)) return error('source_pending')
  const reason = String(b?.reason || '').trim().slice(0, 500)
  if (action === 'cancel' && !reason) return error('cancellation_reason_required', 400)
  if (action === 'paid' && !reason) return error('payment_reference_required', 400)
  if (action === 'paid' && o.paymentStatus === 'paid') return error('already_paid')
  if (action === 'prepare' && o.operationHistory?.at(-1)?.action === 'prepare') return error('already_preparing')
  if (action === 'resend' && (!o.email || !plugins(req).some((p) => p.commerce?.resendOrderEmail))) return error('email_unavailable')
  try {
    if (action === 'confirm' && o.workflowVersion === 1) {
      await approveOrder(req, o, Number(b.version))
      await req.payload.jobs.queue({ task: 'shop-order-recovery', input: {}, queue: 'default' }).catch(() => undefined)
      return Response.json({ ok: true, queued: true })
    }
    await inTransaction(req, async () => {
      const version = o.operationsVersion || 0
      const claim = await req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: o.id } }, { status: { equals: o.status } }, { paymentStatus: { equals: o.paymentStatus } }, { or: [{ operationsVersion: { equals: version } }, ...(version === 0 ? [{ operationsVersion: { exists: false } }] : [])] }, { or: [{ processingUntil: { exists: false } }, { processingUntil: { less_than: new Date().toISOString() } }] }] }, data: { operationsVersion: version + 1 }, options: { atomic: true } })
      if (!claim) throw new Error('order_changed')
      if (action === 'refund') {
        const record = plugins(req).find(plugin => plugin.commerce?.recordRefund)?.commerce?.recordRefund
        if (!record) throw new Error('Refund ledger is unavailable')
        const balance = await record(req, { orderNo: o.orderNo, amount: Number(b.amount), reference: String(b.reference || '').trim(), reason })
        await req.payload.update({ collection: 'shop-orders' as any, id: o.id, req, overrideAccess: true, data: { refundDue: balance.refundDue, ...(o.status === 'cancelled' && !balance.refundDue && { paymentStatus: 'refunded' }) } })
      }
      if (action === 'resend') for (const p of plugins(req)) await p.commerce?.resendOrderEmail?.(req.payload, o.orderNo, req)
      if (action === 'paid') {
        const recorder = plugins(req).find(plugin => plugin.commerce?.recordPayment)?.commerce?.recordPayment
        if (recorder) await recorder(req.payload, { orderNo: o.orderNo, total: o.total, reference: `manual:${o.id}:${version + 1}`, reason }, req)
        else await emitOrderPaid(req.payload, { request: req, orderNo: o.orderNo, amount: o.total, reference: `manual:${o.id}:${version + 1}`, source: 'shop-admin' })
        await req.payload.update({ collection: 'shop-orders' as any, id: o.id, req, overrideAccess: true, data: { paymentStatus: 'paid' } })
      }
      const history = [...(Array.isArray(o.operationHistory) ? o.operationHistory : []), { action, at: new Date().toISOString(), actor: String(req.user?.id || ''), ...(reason && { reason }) }].slice(-200)
      if (action === 'cancel' && o.workflowVersion === 1) await requestCancellation(req, o, reason)
      const fulfillment = o.workflowVersion === 1 && ['ship', 'complete'].includes(action)
      if (fulfillment) await requestFulfillment(req, o, action === 'ship' ? 'shipping' : 'completed')
      await req.payload.update({ collection: 'shop-orders' as any, id: o.id, req, data: { ...(transition.to && !fulfillment && !(action === 'cancel' && o.workflowVersion === 1) && { status: transition.to }), ...(action === 'cancel' && { cancellationReason: reason }), operationHistory: history }, overrideAccess: true })
    })
    if (o.workflowVersion === 1 && ['ship', 'complete', 'cancel'].includes(action)) await req.payload.jobs.queue({ task: 'shop-order-recovery', input: {}, queue: 'default' }).catch(() => undefined)
    if (action === 'retry') {
      o = await read(req, String(o.id))
      if (o.workflowVersion === 1) await retryOrderGroups(req, o)
      await retryOrderEvents(req, o.orderNo)
      await recoverOrder(req, o)
    }
    return Response.json({ ok: true })
  } catch (e) {
    req.payload.logger.error(e, '[shop] Order action failed')
    return error(action === 'cancel' ? 'cancellation_pending' : 'action_failed')
  }
}
