import { orderTotal, licensed, type HossoPlugin, type PluginManifest, withLicense } from '@hosso/studio-blocks'
import type { CollectionConfig, Config, Endpoint, GlobalConfig, Payload } from 'payload'
import manifest from '../hosso.json'
import { withCommerceEvents } from '@hosso/studio-blocks/durable-events'
import { sameSecret } from './security'
import { allocateUnmatched, receiptOrderNo, recordReceipt, recordRefund, Refunds, Transactions } from './ledger'
import { inTransaction } from '@hosso/studio-blocks/transactions'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as Roled)?.roles?.includes('admin'))
const manager = ({ req }: { req: { user?: unknown } }) => {
  const r = (req.user as Roled)?.roles
  return Boolean(r?.includes('admin') || r?.includes('publisher'))
}
const bi = (vi: string, en: string) => ({ vi, en })
const GROUP = bi('Thanh toán', 'Payments')
const SETTINGS = 'payment-settings'

const Settings: GlobalConfig = {
  slug: SETTINGS,
  label: bi('Tài khoản nhận tiền', 'Receiving account'),
  admin: { group: GROUP },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    { name: 'bank', type: 'text', label: bi('Mã ngân hàng VietQR', 'VietQR bank code'), admin: { description: bi('Tên viết tắt hoặc mã BIN theo VietQR, ví dụ MB, VCB, TCB, ACB, 970422.', 'Short name or BIN as used by VietQR, for example MB, VCB, TCB, ACB, 970422.') } },
    { name: 'accountNumber', type: 'text', label: bi('Số tài khoản', 'Account number') },
    { name: 'accountName', type: 'text', label: bi('Tên chủ tài khoản', 'Account holder') },
    { name: 'note', type: 'textarea', label: bi('Ghi chú hiện cho khách', 'Note shown to customers'), admin: { description: bi('Ví dụ: đơn được xác nhận trong vài phút sau khi tiền về.', 'For example: the order is confirmed a few minutes after the money arrives.') } },
  ],
}

const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: bi('Khoản thanh toán', 'Payment'), plural: bi('Khoản thanh toán', 'Payments') },
  admin: { group: GROUP, useAsTitle: 'orderNo', defaultColumns: ['orderNo', 'amount', 'status', 'paidAmount', 'paidAt'] },
  defaultSort: '-createdAt',
  access: { read: isAdmin, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'version', type: 'number', defaultValue: 0, admin: { hidden: true } },
    { name: 'openingPaidAmount', type: 'number', defaultValue: 0, admin: { hidden: true } },
    { name: 'refundedAmount', type: 'number', defaultValue: 0, min: 0, admin: { readOnly: true }, label: bi('Đã hoàn cho khách (đ)', 'Customer refunds (VND)') },
    { name: 'orderNo', type: 'text', required: true, unique: true, index: true, label: bi('Mã đơn', 'Order number'), admin: { readOnly: true } },
    { name: 'amount', type: 'number', required: true, label: bi('Số tiền cần thu (đ)', 'Amount due (VND)'), admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      label: bi('Trạng thái', 'Status'),
      options: [
        { value: 'pending', label: bi('Chờ tiền về', 'Waiting for payment') },
        { value: 'paid', label: bi('Đã nhận', 'Received') },
        { value: 'underpaid', label: bi('Chuyển thiếu', 'Underpaid') },
      ],
    },
    { name: 'paidAmount', type: 'number', label: bi('Số tiền đã nhận (đ)', 'Amount received (VND)') },
    { name: 'transactionId', type: 'text', unique: true, index: true, label: bi('Mã giao dịch ngân hàng', 'Bank transaction ID') },
    { name: 'paidAt', type: 'date', label: bi('Thời điểm nhận', 'Received at') },
  ],
}

type Cfg = { bank?: string; accountNumber?: string; accountName?: string; note?: string }
const getCfg = async (payload: Payload) => (await payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) as Cfg | null
const configured = (c: Cfg | null): c is Required<Pick<Cfg, 'bank' | 'accountNumber'>> & Cfg => Boolean(c?.bank && c?.accountNumber)

async function ensurePayment(payload: Payload, order: { id: string; total: number }, payment?: string, req?: import('payload').PayloadRequest) {
  const existing = (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: order.id } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any
  if (existing) {
    if (existing.amount !== order.total) throw new Error('Payment amount differs; reconcile the order')
    return
  }
  try { await payload.create({ collection: 'payments' as any, data: { orderNo: order.id, amount: order.total }, overrideAccess: true, req }) }
  catch (error) {
    if (req?.transactionID) throw error
    const duplicate = (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: order.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
    if (!duplicate || duplicate.amount !== order.total) throw error
  }
}

const endpoints: Endpoint[] = [
  {
    // Webhook SePay: header "Authorization: Apikey <HOSSO_SEPAY_KEY>". Đăng ký URL /api/plugins/payment/sepay/webhook với SePay.
    path: '/plugins/payment/sepay/webhook',
    method: 'post',
    handler: async (req) => {
      const key = process.env.HOSSO_SEPAY_KEY?.trim()
      if (!key) return Response.json({ success: false }, { status: 503 })
      if (!await sameSecret(req.headers.get('authorization') || '', `Apikey ${key}`)) return Response.json({ success: false }, { status: 401 })
      const b = ((await req.json?.().catch(() => null)) ?? {}) as { id?: number | string; transferType?: string; transferAmount?: number; content?: string; code?: string; referenceCode?: string; accountNumber?: string; currency?: string }
      if (b.transferType === 'out') return Response.json({ success: true })
      const cfg = await getCfg(req.payload)
      if (!configured(cfg)) return Response.json({ success: false }, { status: 503 })
      if (b.transferType !== 'in' || !Number.isSafeInteger(b.transferAmount) || Number(b.transferAmount) <= 0 || !b.id || b.accountNumber !== cfg.accountNumber || (b.currency && b.currency !== 'VND')) return Response.json({ success: false }, { status: 400 })
      try {
        await recordReceipt(req, { provider: 'sepay', reference: String(b.id), amount: Number(b.transferAmount), accountNumber: b.accountNumber, currency: 'VND', orderNo: receiptOrderNo(b.code, b.content) })
        return Response.json({ success: true })
      } catch {
        req.payload.logger.error('[payment] Receipt could not commit; provider must retry')
        return Response.json({ success: false }, { status: 503 })
      }
    },
  },
]

/** Plugin thanh toán chuyển khoản: QR VietQR cho khách và tự xác nhận khi tiền về. Dùng `onOrderPaid` để plugin bán hàng đánh dấu đơn đã thanh toán. */
const plugin: HossoPlugin = {
  id: 'payment',
  commerce: {
    recordRefund,
    revisePayment: async (req, orderNo, total) => inTransaction(req, async () => {
      const payment = (await req.payload.find({ collection: 'payments' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0] as any
      if (!payment || !Number.isSafeInteger(total) || total < 0 || total > payment.amount) throw new Error('Invalid payment revision')
      const version = payment.version || 0
      const claimed = await req.payload.db.updateOne({ collection: 'payments', req, where: { and: [{ id: { equals: payment.id } }, { version: { equals: version } }] }, data: { version: version + 1 }, options: { atomic: true } })
      if (!claimed) throw new Error('Payment changed; retry revision')
      const paidAmount = Number(payment.paidAmount || 0)
      await req.payload.update({ collection: 'payments' as any, id: payment.id, req, overrideAccess: true, data: { amount: total, status: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'underpaid' : 'pending' } })
      const net = paidAmount - Number(payment.refundedAmount || 0)
      return { paidAmount, refundDue: Math.max(0, net - total), paymentStatus: net >= total ? 'paid' as const : 'unpaid' as const }
    }),
    confirmPayment: async (payload, order) => { if (order.payment === 'bank' && !await licensed('payment')) throw new Error('Payment license required'); await ensurePayment(payload, { id: order.id, total: orderTotal(order) }, order.payment) },
    recordPayment: async (payload, input, req) => {
      await ensurePayment(payload, { id: input.orderNo, total: input.total }, undefined, req)
      const payment = (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: input.orderNo } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0] as any
      const amount = input.total - (payment?.paidAmount || 0)
      if (amount > 0) await recordReceipt(req, { provider: 'manual', reference: input.reference, amount, orderNo: input.orderNo, actor: String(req.user?.id || ''), reason: input.reason })
    },
  },
  manifest: manifest as PluginManifest,
  adminEn: { 'Thanh toán': 'Payments' },
  adminNav: [
    { label: 'Khoản thanh toán', href: '/admin/collections/payments', roles: ['admin', 'publisher'] },
    { label: 'Tài khoản nhận tiền', href: '/admin/globals/payment-settings', roles: ['admin'] },
  ],
  portable: { globals: [{ slug: SETTINGS, secretFields: [] }] },
  checklist: async (payload) => [{ label: 'Tài khoản nhận tiền chuyển khoản', done: configured(await getCfg(payload)), href: '/admin/globals/payment-settings' }],
  payload: (config: Config): Config => withCommerceEvents({
    ...config,
    collections: [...(config.collections ?? []), Payments, Transactions, Refunds],
    globals: [...(config.globals ?? []), Settings],
    endpoints: [...(config.endpoints ?? []), ...endpoints],
  }),
  hooks: {
    onOrderReceived: async ({ payload, order, payment, request }) => { await ensurePayment(payload, order, payment, request); if (request) await allocateUnmatched(request, order.id) },
    // Đơn chọn chuyển khoản: mở một khoản chờ tiền về để webhook đối chiếu.
    onOrderPlaced: async ({ payload, order, payment, request }) => ensurePayment(payload, order, payment, request),
    // Trang tra cứu đơn: QR đúng số tiền và nội dung cho đơn chuyển khoản chưa thanh toán.
    describeOrder: async ({ payload, order }) => {
      const c = await getCfg(payload)
      if (order.payment !== 'bank' || order.paymentStatus === 'paid' || order.status === 'cancelled' || !configured(c)) return
      const payment = (await payload.find({ collection: 'payments' as any, where: { orderNo: { equals: order.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
      const remaining = Math.max(0, order.total - Number(payment?.paidAmount || 0))
      if (!remaining) return
      const q = new URLSearchParams({ amount: String(remaining), addInfo: order.id })
      if (c.accountName) q.set('accountName', c.accountName)
      const info = `${c.bank} · ${c.accountNumber}${c.accountName ? ` · ${c.accountName}` : ''}\n${order.id}`
      return { payment: { qrUrl: `https://img.vietqr.io/image/${encodeURIComponent(c.bank)}-${encodeURIComponent(c.accountNumber)}-compact2.png?${q}`, note: `${info}${c.note ? `\n${c.note}` : ''}` } }
    },
  },
}

export default withLicense(plugin)
