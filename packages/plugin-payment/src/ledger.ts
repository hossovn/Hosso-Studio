import type { CollectionConfig, Payload, PayloadRequest } from 'payload'
import { emitOrderPaid } from '@hosso/studio-blocks'
import { inTransaction } from '@hosso/studio-blocks/transactions'

export const TRANSACTIONS = 'payment-transactions'
export const Refunds: CollectionConfig = {
  slug: 'payment-refunds',
  admin: { group: { vi: 'Thanh toán', en: 'Payments' }, useAsTitle: 'reference', defaultColumns: ['orderNo', 'amount', 'reference', 'actor', 'paidAt'] },
  access: { read: ({ req }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin')), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'reference', type: 'text', unique: true, required: true },
    { name: 'orderNo', type: 'text', index: true, required: true },
    { name: 'amount', type: 'number', min: 1, required: true },
    { name: 'reason', type: 'textarea', required: true },
    { name: 'actor', type: 'text', required: true },
    { name: 'paidAt', type: 'date', required: true },
  ],
}

/** A verified outgoing transfer is recorded separately from immutable incoming receipts. */
export async function recordRefund(req: PayloadRequest, input: { orderNo: string; amount: number; reference: string; reason: string }) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.reference.trim().length < 3 || input.reference.length > 160 || input.reason.trim().length < 3 || input.reason.length > 1000) throw new Error('Invalid refund evidence')
  return inTransaction(req, async () => {
    const payment = (await req.payload.find({ collection: 'payments' as any, where: { orderNo: { equals: input.orderNo } }, limit: 1, req, depth: 0, overrideAccess: true })).docs[0] as any
    if (!payment) throw new Error('Payment not found')
    const version = payment.version || 0
    const claim = await req.payload.db.updateOne({ collection: 'payments', req, where: { and: [{ id: { equals: payment.id } }, { version: { equals: version } }] }, data: { version: version + 1 }, options: { atomic: true } })
    if (!claim) throw new Error('Payment changed; retry refund')
    const previous = (await req.payload.find({ collection: 'payment-refunds' as any, where: { reference: { equals: input.reference.trim() } }, limit: 1, req, depth: 0, overrideAccess: true })).docs[0] as any
    if (previous && (previous.orderNo !== input.orderNo || previous.amount !== input.amount || previous.reason !== input.reason.trim())) throw new Error('Refund reference reused')
    const refundedAmount = Number(payment.refundedAmount || 0) + (previous ? 0 : input.amount)
    if (refundedAmount > Math.max(0, Number(payment.paidAmount || 0) - payment.amount)) throw new Error('Refund exceeds the outstanding customer balance')
    if (!previous) await req.payload.create({ collection: 'payment-refunds' as any, data: { ...input, reference: input.reference.trim(), reason: input.reason.trim(), actor: String(req.user?.id || ''), paidAt: new Date().toISOString() }, req, overrideAccess: true })
    await req.payload.update({ collection: 'payments' as any, id: payment.id, data: { refundedAmount }, req, overrideAccess: true })
    return { refundedAmount, refundDue: Math.max(0, Number(payment.paidAmount || 0) - refundedAmount - payment.amount) }
  })
}
export const Transactions: CollectionConfig = {
  slug: TRANSACTIONS,
  admin: { group: { vi: 'Thanh toán', en: 'Payments' }, useAsTitle: 'key', defaultColumns: ['provider', 'reference', 'orderNo', 'amount', 'state', 'receivedAt'] },
  access: { read: ({ req }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin')), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', unique: true, required: true },
    { name: 'provider', type: 'text', required: true },
    { name: 'reference', type: 'text', required: true },
    { name: 'bodyHash', type: 'text', required: true },
    { name: 'orderNo', type: 'text', index: true },
    { name: 'amount', type: 'number', required: true, min: 1 },
    { name: 'currency', type: 'text', defaultValue: 'VND', required: true },
    { name: 'accountNumber', type: 'text', admin: { hidden: true } },
    { name: 'state', type: 'select', required: true, options: ['unmatched', 'allocated'], defaultValue: 'unmatched' },
    { name: 'receivedAt', type: 'date', required: true },
    { name: 'actor', type: 'text' },
    { name: 'reason', type: 'textarea' },
  ],
}

type Receipt = { provider: string; reference: string; amount: number; currency?: string; accountNumber?: string; orderNo?: string; actor?: string; reason?: string }
export async function recordReceipt(req: PayloadRequest, receipt: Receipt) {
  if (!Number.isSafeInteger(receipt.amount) || receipt.amount <= 0 || (receipt.currency && receipt.currency !== 'VND') || !receipt.reference || receipt.reference.length > 160) throw new Error('Invalid payment receipt')
  const { payload } = req
  const key = `${receipt.provider}:${receipt.reference}`
  // The parsed destination is immutable even when its payment row has not arrived yet.
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([receipt.provider, receipt.reference, receipt.amount, receipt.currency || 'VND', receipt.accountNumber || '', receipt.orderNo || '']))))
  const bodyHash = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  await inTransaction(req, async () => {
    const order = receipt.orderNo ? (await payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: receipt.orderNo } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any : undefined
    if (order) {
      const version = order.operationsVersion || 0
      const locked = await payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { operationsVersion: { equals: version } }] }, data: { operationsVersion: version + 1 }, options: { atomic: true } })
      if (!locked) throw new Error('Order changed; retry receipt')
    }
    const previous = (await payload.find({ collection: TRANSACTIONS as any, where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any
    if (previous) {
      if (previous.bodyHash !== bodyHash) throw new Error('Payment reference reused with different data')
      if (previous.orderNo && receipt.orderNo && previous.orderNo !== receipt.orderNo) throw new Error('Receipt belongs to another order')
      if (previous.state === 'allocated') return
    }
    const payment = receipt.orderNo ? (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: receipt.orderNo } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any : undefined
    if (payment) {
      const version = payment.version || 0
      const locked = await payload.db.updateOne({ collection: 'payments', req, where: { and: [{ id: { equals: payment.id } }, { or: [{ version: { equals: version } }, ...(version === 0 ? [{ version: { exists: false } }] : [])] }] }, data: { version: version + 1 }, options: { atomic: true } })
      if (!locked) throw new Error('Payment changed; retry receipt')
    }
    if (previous) {
      if (!payment) return
      await payload.update({ collection: TRANSACTIONS as any, id: previous.id, data: { orderNo: receipt.orderNo, state: 'allocated' }, req, overrideAccess: true })
    } else await payload.create({ collection: TRANSACTIONS as any, data: { ...receipt, key, bodyHash, currency: 'VND', state: payment ? 'allocated' : 'unmatched', receivedAt: new Date().toISOString() }, req, overrideAccess: true })
    if (!payment) return
    const rows = await payload.find({ collection: TRANSACTIONS as any, where: { and: [{ orderNo: { equals: payment.orderNo } }, { state: { equals: 'allocated' } }] }, limit: 0, pagination: false, depth: 0, overrideAccess: true, req })
    const total = (rows.docs as any[]).reduce((sum, row) => sum + row.amount, Number(payment.openingPaidAmount || 0))
    if (!Number.isSafeInteger(total)) throw new Error('Payment amount overflow')
    await payload.update({ collection: 'payments' as any, id: payment.id, data: { paidAmount: total, status: total >= payment.amount ? 'paid' : 'underpaid', paidAt: new Date().toISOString() }, req, overrideAccess: true })
    const net = total - Number(payment.refundedAmount || 0)
    if (order) await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { refundDue: Math.max(0, net - payment.amount) }, req, overrideAccess: true })
    if (net >= payment.amount) await emitOrderPaid(payload, { request: req, orderNo: payment.orderNo, amount: net, reference: key, source: 'payment' })
  })
}

/** Exact token matching; no 500-row scan and no substring overlap with another order number. */
export function receiptOrderNo(code: unknown, content: unknown) {
  const candidates = new Set<string>()
  for (const raw of [code, content]) {
    if (typeof raw !== 'string' || raw.length > 4000) continue
    for (const match of raw.toUpperCase().matchAll(/(?:^|[^A-Z0-9])(SO[- ]?\d{6,})(?=$|[^A-Z0-9])/g)) candidates.add(match[1].replace(/^SO[- ]?/, 'SO-'))
  }
  if (candidates.size !== 1) return undefined
  return [...candidates][0]
}

export async function matchPayment(payload: Payload, code: unknown, content: unknown) {
  const orderNo = receiptOrderNo(code, content)
  if (!orderNo) return undefined
  return (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
}

export async function allocateUnmatched(req: PayloadRequest, orderNo: string) {
  const rows = await req.payload.find({ collection: TRANSACTIONS as any, where: { and: [{ orderNo: { equals: orderNo } }, { state: { equals: 'unmatched' } }] }, limit: 100, depth: 0, req, overrideAccess: true })
  for (const row of rows.docs as any[]) await recordReceipt(req, row)
}
