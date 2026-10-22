import { withLicense } from '@hosso/studio-blocks'
import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { Config, GlobalConfig, Payload } from 'payload'
import manifest from '../hosso.json'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as Roled)?.roles?.includes('admin'))
const bi = (vi: string, en: string) => ({ vi, en })
const SETTINGS = 'notify-settings'

const Settings: GlobalConfig = {
  slug: SETTINGS,
  label: bi('Thông báo đơn hàng', 'Order notifications'),
  admin: { group: bi('Thông báo', 'Notifications') },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    { name: 'adminEmail', type: 'text', label: bi('Email nhận đơn mới (chủ shop)', 'Email for new orders (shop owner)'), admin: { description: bi('Có thể nhiều địa chỉ, cách nhau bằng dấu phẩy. Để trống thì không báo chủ shop.', 'Several addresses separated by commas. Leave empty to skip owner notifications.') } },
    { name: 'toCustomer', type: 'checkbox', defaultValue: true, label: bi('Gửi email cho khách (nếu khách nhập email)', 'Email customers (when they enter an email)') },
    { name: 'onStatus', type: 'checkbox', defaultValue: true, label: bi('Báo khách khi đổi trạng thái đơn', 'Tell customers when the order status changes') },
  ],
}

type Cfg = { adminEmail?: string; toCustomer?: boolean; onStatus?: boolean }
const getCfg = async (payload: Payload) => ((await payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) ?? {}) as Cfg
const shopName = async (payload: Payload) => ((await payload.findGlobal({ slug: 'site-settings' as any, depth: 0, overrideAccess: true }).catch(() => null)) as { siteName?: string } | null)?.siteName || 'Shop'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`

const T = {
  vi: {
    newOrder: (id: string) => `Đơn hàng mới ${id}`,
    placed: (id: string) => `Đã nhận đơn ${id}`,
    status: (id: string) => `Cập nhật đơn ${id}`,
    paid: (id: string) => `Đã nhận thanh toán đơn ${id}`,
    thanks: 'Cảm ơn bạn đã đặt hàng.',
    statusLine: (s: string) => `Trạng thái đơn hiện là: ${s}.`,
    paidLine: 'Chúng tôi đã nhận được thanh toán cho đơn hàng của bạn.',
    total: 'Tổng cộng',
    customer: 'Khách hàng',
    track: 'Tra cứu đơn bằng mã đơn và 4 số cuối điện thoại trên website.',
    statuses: { new: 'Mới', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' } as Record<string, string>,
  },
  en: {
    newOrder: (id: string) => `New order ${id}`,
    placed: (id: string) => `We received order ${id}`,
    status: (id: string) => `Order ${id} update`,
    paid: (id: string) => `Payment received for order ${id}`,
    thanks: 'Thank you for your order.',
    statusLine: (s: string) => `Your order status is now: ${s}.`,
    paidLine: 'We have received the payment for your order.',
    total: 'Total',
    customer: 'Customer',
    track: 'Track your order on the website with the order number and the last 4 digits of your phone.',
    statuses: { new: 'New', confirmed: 'Confirmed', shipping: 'Shipping', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>,
  },
}
type Lang = keyof typeof T

async function send(payload: Payload, to: string | undefined, subject: string, lines: string[]) {
  if (!to) return
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`
  await payload.sendEmail({ to, subject, html, text: lines.join('\n') })
}

const itemLines = (items: { name: string; quantity: number; price: number }[] = []) => items.map((i) => `${i.name} × ${i.quantity}: ${vnd(i.price * i.quantity)}`)

/** Email của khách theo mã đơn (tìm trong đơn của plugin Cửa hàng; không có thì thôi). */
async function customerOf(payload: Payload, orderNo: string) {
  const o = (await payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true }).catch(() => null))?.docs[0] as { email?: string } | undefined
  return o?.email || undefined
}

/** Plugin thông báo: email cho chủ shop và khách. Lỗi gửi email chỉ ghi log, không làm hỏng đơn. */
const plugin: HossoPlugin = {
  id: 'notify',
  manifest: manifest as PluginManifest,
  adminEn: { 'Thông báo': 'Notifications' },
  adminNav: [{ label: 'Thông báo đơn hàng', href: '/admin/globals/notify-settings', roles: ['admin'] }],
  payload: (config: Config): Config => ({ ...config, globals: [...(config.globals ?? []), Settings] }),
  hooks: {
    onOrderPlaced: async ({ payload, order, customer, items, adjustments, meta }) => {
      const c = await getCfg(payload)
      const lang: Lang = meta?.locale === 'en' ? 'en' : 'vi'
      const t = T[lang]
      const name = await shopName(payload)
      const body = [...itemLines(items), ...(adjustments ?? []).map((a) => `${a.label}: ${a.amount < 0 ? '-' : '+'}${vnd(Math.abs(a.amount))}`), `${t.total}: ${vnd(order.total)}`]
      await send(payload, c.adminEmail, `[${name}] ${T.vi.newOrder(order.id)}`, [`${T.vi.customer}: ${customer.name} · ${customer.phone}${customer.address ? ` · ${customer.address}` : ''}`, ...body])
      if (c.toCustomer !== false) await send(payload, customer.email, `[${name}] ${t.placed(order.id)}`, [t.thanks, ...body, t.track])
    },
    onOrderStatusChanged: async ({ payload, order, to }) => {
      const c = await getCfg(payload)
      if (c.onStatus === false || c.toCustomer === false) return
      await send(payload, order.customer?.email, `[${await shopName(payload)}] ${T.vi.status(order.id)}`, [T.vi.statusLine(T.vi.statuses[to] ?? to), T.vi.track])
    },
    onOrderPaid: async ({ payload, orderNo, amount }) => {
      const c = await getCfg(payload)
      if (c.toCustomer === false) return
      const to = await customerOf(payload, orderNo)
      await send(payload, to, `[${await shopName(payload)}] ${T.vi.paid(orderNo)}`, [T.vi.paidLine, `${T.vi.total}: ${vnd(amount)}`])
    },
  },
}

export default withLicense(plugin)
