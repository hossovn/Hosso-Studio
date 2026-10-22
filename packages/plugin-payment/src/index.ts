import { emitOrderPaid, type HossoPlugin, type PluginManifest, withLicense } from '@hosso/studio-blocks'
import type { CollectionConfig, Config, Endpoint, GlobalConfig, Payload } from 'payload'
import manifest from '../hosso.json'

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
  access: { read: manager, create: () => false, update: manager, delete: manager },
  hooks: {
    // Quản trị viên đổi sang "Đã nhận" thì coi như tiền đã về (xác nhận tay).
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'update' && doc.status === 'paid' && previousDoc?.status !== 'paid' && !req.context.fromWebhook)
          await emitOrderPaid(req.payload, { orderNo: doc.orderNo, amount: doc.paidAmount || doc.amount, reference: 'manual', source: 'payment' })
        return doc
      },
    ],
  },
  fields: [
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

// Ngân hàng thường bỏ dấu gạch và khoảng trắng trong nội dung chuyển khoản: so khớp theo chuỗi chỉ gồm chữ và số.
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

type PaymentDoc = { id: number | string; orderNo: string; amount: number; status: string }

const endpoints: Endpoint[] = [
  {
    // Webhook SePay: header "Authorization: Apikey <HOSSO_SEPAY_KEY>". Đăng ký URL /api/plugins/payment/sepay/webhook với SePay.
    path: '/plugins/payment/sepay/webhook',
    method: 'post',
    handler: async (req) => {
      const key = process.env.HOSSO_SEPAY_KEY?.trim()
      if (!key) return Response.json({ success: false }, { status: 503 })
      if (req.headers.get('authorization') !== `Apikey ${key}`) return Response.json({ success: false }, { status: 401 })
      const b = ((await req.json?.().catch(() => null)) ?? {}) as { id?: number | string; transferType?: string; transferAmount?: number; content?: string; code?: string; referenceCode?: string }
      if (b.transferType !== 'in' || !b.transferAmount) return Response.json({ success: true }) // tiền ra hoặc không có số tiền: bỏ qua
      const haystack = norm(`${b.code ?? ''} ${b.content ?? ''}`)
      const pending = (await req.payload.find({ collection: 'payments' as any, where: { status: { in: ['pending', 'underpaid'] } }, limit: 500, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as PaymentDoc[]
      const hit = pending.find((p) => haystack.includes(norm(p.orderNo)))
      if (!hit) return Response.json({ success: true }) // không khớp đơn nào: ghi nhận đã nhận, không làm gì
      const txn = String(b.id ?? b.referenceCode ?? '')
      if (txn) {
        const dup = await req.payload.count({ collection: 'payments' as any, where: { transactionId: { equals: txn } }, overrideAccess: true })
        if (dup.totalDocs) return Response.json({ success: true }) // SePay gọi lại cùng giao dịch
      }
      const enough = b.transferAmount >= hit.amount
      await req.payload.update({
        collection: 'payments' as any,
        id: hit.id,
        data: { status: enough ? 'paid' : 'underpaid', paidAmount: b.transferAmount, transactionId: txn || undefined, paidAt: new Date().toISOString() },
        overrideAccess: true,
        context: { fromWebhook: true },
      })
      if (enough) await emitOrderPaid(req.payload, { orderNo: hit.orderNo, amount: b.transferAmount, reference: txn, source: 'payment' })
      return Response.json({ success: true })
    },
  },
]

/** Plugin thanh toán chuyển khoản: QR VietQR cho khách và tự xác nhận khi tiền về. Dùng `onOrderPaid` để plugin bán hàng đánh dấu đơn đã thanh toán. */
const plugin: HossoPlugin = {
  id: 'payment',
  manifest: manifest as PluginManifest,
  adminEn: { 'Thanh toán': 'Payments' },
  adminNav: [
    { label: 'Khoản thanh toán', href: '/admin/collections/payments', roles: ['admin', 'publisher'] },
    { label: 'Tài khoản nhận tiền', href: '/admin/globals/payment-settings', roles: ['admin'] },
  ],
  portable: { globals: [{ slug: SETTINGS, secretFields: [] }] },
  checklist: async (payload) => [{ label: 'Tài khoản nhận tiền chuyển khoản', done: configured(await getCfg(payload)), href: '/admin/globals/payment-settings' }],
  payload: (config: Config): Config => ({
    ...config,
    collections: [...(config.collections ?? []), Payments],
    globals: [...(config.globals ?? []), Settings],
    endpoints: [...(config.endpoints ?? []), ...endpoints],
  }),
  hooks: {
    // Đơn chọn chuyển khoản: mở một khoản chờ tiền về để webhook đối chiếu.
    onOrderPlaced: async ({ payload, order, payment }) => {
      if (payment !== 'bank' || !configured(await getCfg(payload))) return
      await payload.create({ collection: 'payments' as any, data: { orderNo: order.id, amount: order.total }, overrideAccess: true }).catch(() => undefined)
    },
    // Trang tra cứu đơn: QR đúng số tiền và nội dung cho đơn chuyển khoản chưa thanh toán.
    describeOrder: async ({ payload, order }) => {
      const c = await getCfg(payload)
      if (order.payment !== 'bank' || order.paymentStatus === 'paid' || !configured(c)) return
      const q = new URLSearchParams({ amount: String(order.total), addInfo: order.id })
      if (c.accountName) q.set('accountName', c.accountName)
      const info = `${c.bank} · ${c.accountNumber}${c.accountName ? ` · ${c.accountName}` : ''}\n${order.id}`
      return { payment: { qrUrl: `https://img.vietqr.io/image/${encodeURIComponent(c.bank)}-${encodeURIComponent(c.accountNumber)}-compact2.png?${q}`, note: `${info}${c.note ? `\n${c.note}` : ''}` } }
    },
  },
}

export default withLicense(plugin)
