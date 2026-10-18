import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import manifest from '../hosso.json'
import type { CollectionConfig, Config, Endpoint, GlobalConfig, Payload } from 'payload'
import React from 'react'
import { FINAL, GHN_NAME, createGhnOrder, getGhnConfig, getGhnFee, getGhnStatus, mapStatus, type Shipment } from './ghn'
import { Track } from './Track'

const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin'))
const adminOnly = { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin }
const bi = (vi: string, en: string) => ({ vi, en })
const GROUP = bi('Giao vận', 'Shipping')
const SETTINGS = 'shipping-settings'

// `{code}` trong đường dẫn theo dõi được thay bằng mã vận đơn.
const defaultCarriers = [
  { name: 'Giao Hàng Nhanh', trackingUrl: 'https://donhang.ghn.vn/?order_code={code}' },
  { name: 'Giao Hàng Tiết Kiệm', trackingUrl: 'https://i.ghtk.vn/{code}' },
  { name: 'Viettel Post', trackingUrl: 'https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?code={code}' },
  { name: 'J&T Express', trackingUrl: 'https://jtexpress.vn/vi/tracking?type=track&billcode={code}' },
]

const Settings: GlobalConfig = {
  slug: SETTINGS,
  label: bi('Đơn vị vận chuyển', 'Carriers'),
  admin: { group: GROUP },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    {
      name: 'carriers',
      type: 'array',
      label: bi('Danh sách đơn vị vận chuyển', 'Carriers'),
      defaultValue: defaultCarriers,
      fields: [
        { name: 'name', type: 'text', required: true, label: bi('Tên', 'Name') },
        { name: 'trackingUrl', type: 'text', label: bi('Đường dẫn theo dõi', 'Tracking URL'), admin: { description: bi('Dùng {code} cho mã vận đơn. Để trống nếu không có.', 'Use {code} for the tracking number. Leave empty if none.') } },
      ],
    },
    {
      type: 'collapsible',
      label: bi('Phí vận chuyển ở bước thanh toán', 'Shipping fee at checkout'),
      fields: [
        { name: 'flatFee', type: 'number', min: 0, defaultValue: 0, label: bi('Phí cố định mỗi đơn giao tận nơi (đ)', 'Flat fee per delivery order (VND)'), admin: { description: bi('0 là không thu phí. Dùng khi không tính phí qua GHN hoặc khi GHN không tính được.', '0 means no fee. Used when the GHN fee is off or GHN cannot calculate it.') } },
        { name: 'freeShipOver', type: 'number', min: 0, defaultValue: 0, label: bi('Miễn phí vận chuyển cho đơn từ (đ)', 'Free shipping for orders from (VND)'), admin: { description: bi('0 là không áp dụng.', '0 means off.') } },
        { name: 'useGhnFee', type: 'checkbox', defaultValue: false, label: bi('Tính phí theo GHN (cần bật GHN bên dưới)', 'Use the GHN fee (requires GHN below)') },
      ],
    },
    {
      type: 'collapsible',
      label: bi('Giao Hàng Nhanh (GHN)', 'GHN (Giao Hàng Nhanh)'),
      admin: { description: bi('Token API đặt trong biến môi trường HOSSO_GHN_TOKEN (không lưu trong cơ sở dữ liệu).', 'Set the API token in the HOSSO_GHN_TOKEN environment variable (it is not stored in the database).') },
      fields: [
        { name: 'ghnEnabled', type: 'checkbox', defaultValue: false, label: bi('Tự tạo vận đơn trên GHN', 'Create GHN shipments automatically') },
        { name: 'ghnSandbox', type: 'checkbox', defaultValue: false, label: bi('Dùng môi trường thử (dev-online-gateway)', 'Use the test environment (dev-online-gateway)') },
        { name: 'ghnShopId', type: 'number', label: bi('Mã cửa hàng GHN (ShopId)', 'GHN shop ID (ShopId)') },
        { name: 'ghnWeight', type: 'number', defaultValue: 500, min: 1, label: bi('Khối lượng mặc định mỗi đơn (gram)', 'Default weight per order (grams)') },
        {
          name: 'ghnRequiredNote',
          type: 'select',
          defaultValue: 'CHOXEMHANGKHONGTHU',
          label: bi('Ghi chú giao hàng', 'Delivery note'),
          options: [
            { value: 'CHOTHUHANG', label: bi('Cho thử hàng', 'Allow trying') },
            { value: 'CHOXEMHANGKHONGTHU', label: bi('Cho xem hàng, không cho thử', 'Allow viewing, no trying') },
            { value: 'KHONGCHOXEMHANG', label: bi('Không cho xem hàng', 'No viewing') },
          ],
        },
      ],
    },
  ],
}

const STATUSES = ['pending', 'handed_over', 'delivering', 'delivered', 'returned', 'cancelled'] as const
const statusLabels = {
  pending: bi('Chờ lấy hàng', 'Awaiting pickup'),
  handed_over: bi('Đã bàn giao vận chuyển', 'Handed to carrier'),
  delivering: bi('Đang giao', 'Out for delivery'),
  delivered: bi('Đã giao', 'Delivered'),
  returned: bi('Hoàn hàng', 'Returned'),
  cancelled: bi('Đã hủy', 'Cancelled'),
}

// Tạo đơn trên GHN cho vận đơn; lỗi được ghi vào `ghnError` để quản trị viên sửa địa chỉ rồi lưu lại (afterChange sẽ thử lại).
async function tryCreateGhn(payload: Payload, s: Shipment) {
  const cfg = await getGhnConfig(payload)
  if (!cfg || s.trackingCode) return
  const update = (data: object) => payload.update({ collection: 'shipments' as any, id: s.id, data, overrideAccess: true, context: { skipGhn: true } })
  try {
    const r = await createGhnOrder(cfg, s)
    await update({ carrier: GHN_NAME, trackingCode: r.orderCode, districtId: r.districtId, wardCode: r.wardCode, ghnStatus: 'ready_to_pick', ghnError: null, syncedAt: new Date().toISOString() })
  } catch (e) {
    await update({ ghnError: e instanceof Error ? e.message : String(e) })
  }
}

/** Áp trạng thái GHN lên vận đơn (webhook và đồng bộ khi khách tra cứu cùng dùng). */
async function applyGhnStatus(payload: Payload, id: number | string, ghn: string) {
  const status = mapStatus(ghn)
  await payload.update({ collection: 'shipments' as any, id, data: { ghnStatus: ghn, syncedAt: new Date().toISOString(), ...(status && { status }) }, overrideAccess: true, context: { skipGhn: true } })
}

const Shipments: CollectionConfig = {
  slug: 'shipments',
  labels: { singular: bi('Vận đơn', 'Shipment'), plural: bi('Vận đơn', 'Shipments') },
  admin: { group: GROUP, useAsTitle: 'orderId', defaultColumns: ['orderId', 'customerName', 'carrier', 'trackingCode', 'status', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'orderId', type: 'text', required: true, unique: true, label: bi('Mã đơn', 'Order ID') },
    { name: 'customerName', type: 'text', label: bi('Người nhận', 'Recipient') },
    { name: 'phone', type: 'text', label: bi('Điện thoại', 'Phone') },
    { name: 'address', type: 'textarea', label: bi('Địa chỉ giao', 'Delivery address') },
    { name: 'orderTotal', type: 'number', label: bi('Giá trị đơn', 'Order total') },
    { name: 'paymentMethod', type: 'text', label: bi('Cách thanh toán', 'Payment method'), admin: { description: bi('cod: shipper thu hộ; khác: đã trả trước, COD = 0.', 'cod: the courier collects; other: prepaid, COD = 0.') } },
    { name: 'carrier', type: 'text', label: bi('Đơn vị vận chuyển', 'Carrier'), admin: { description: bi('Nhập đúng tên trong mục "Đơn vị vận chuyển" để khách có link theo dõi.', 'Use a name from "Carriers" so the customer gets a tracking link.') } },
    { name: 'trackingCode', type: 'text', label: bi('Mã vận đơn', 'Tracking number') },
    { name: 'status', type: 'select', defaultValue: 'pending', label: bi('Trạng thái', 'Status'), options: STATUSES.map((value) => ({ value, label: statusLabels[value] })) },
    { name: 'note', type: 'textarea', label: bi('Ghi chú nội bộ', 'Internal note') },
    { name: 'districtId', type: 'number', label: bi('Mã quận/huyện GHN', 'GHN district ID'), admin: { position: 'sidebar', description: bi('Tự nhận từ địa chỉ; điền tay nếu GHN báo không nhận ra, rồi lưu để thử lại.', 'Detected from the address; fill in manually if GHN could not detect it, then save to retry.') } },
    { name: 'wardCode', type: 'text', label: bi('Mã phường/xã GHN', 'GHN ward code'), admin: { position: 'sidebar' } },
    { name: 'ghnStatus', type: 'text', label: bi('Trạng thái GHN', 'GHN status'), admin: { position: 'sidebar', readOnly: true } },
    { name: 'ghnError', type: 'textarea', label: bi('Lỗi tạo đơn GHN', 'GHN error'), admin: { position: 'sidebar', readOnly: true } },
    { name: 'syncedAt', type: 'date', label: bi('Đồng bộ GHN lần cuối', 'Last GHN sync'), admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    // Lưu lại vận đơn đang lỗi (chưa có mã) thì thử tạo đơn GHN lần nữa. `skipGhn` chặn vòng lặp do chính các cập nhật nội bộ.
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'update' && !req.context.skipGhn && doc.ghnError && !doc.trackingCode) await tryCreateGhn(req.payload, doc)
        return doc
      },
    ],
  },
}

const endpoints: Endpoint[] = [
  {
    // Khách tra cứu: cần mã đơn + 4 số cuối điện thoại (giống trang trạng thái đơn của WIM).
    path: '/plugins/shipping/track',
    method: 'get',
    handler: async (req) => {
      const sp = new URL(req.url!).searchParams
      const orderId = String(sp.get('orderId') ?? '').trim().slice(0, 40)
      const phone4 = String(sp.get('phone4') ?? '').trim()
      const notFound = () => Response.json({ ok: false }, { status: 404 })
      if (!orderId || !/^\d{4}$/.test(phone4)) return notFound()
      let s = (await req.payload.find({ collection: 'shipments' as any, where: { orderId: { equals: orderId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as Shipment | undefined
      if (!s || !(s.phone ?? '').endsWith(phone4)) return notFound()
      // Vận đơn GHN chưa kết thúc và dữ liệu cũ hơn 1 phút: hỏi GHN lấy trạng thái mới (lỗi mạng thì dùng bản đang có).
      if (s.carrier === GHN_NAME && s.trackingCode && !FINAL.includes(s.status) && Date.now() - new Date(s.syncedAt ?? 0).getTime() > 60_000) {
        try {
          const cfg = await getGhnConfig(req.payload)
          if (cfg) {
            await applyGhnStatus(req.payload, s.id, await getGhnStatus(cfg, s.trackingCode))
            s = (await req.payload.findByID({ collection: 'shipments' as any, id: s.id, depth: 0, overrideAccess: true })) as unknown as Shipment
          }
        } catch {
          // giữ trạng thái hiện có
        }
      }
      const cfg = (await req.payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) as { carriers?: { name: string; trackingUrl?: string }[] } | null
      const tpl = cfg?.carriers?.find((c) => c.name === s.carrier)?.trackingUrl
      const url = tpl && s.trackingCode ? tpl.replace('{code}', encodeURIComponent(s.trackingCode)) : undefined
      return Response.json({ ok: true, status: s.status, carrier: s.carrier || undefined, trackingCode: s.trackingCode || undefined, url })
    },
  },
  {
    // GHN gọi khi đổi trạng thái (đăng ký URL này với GHN, kèm ?key=...). Khóa lấy từ HOSSO_GHN_WEBHOOK_KEY.
    path: '/plugins/shipping/ghn/webhook',
    method: 'post',
    handler: async (req) => {
      const key = process.env.HOSSO_GHN_WEBHOOK_KEY?.trim()
      if (!key) return Response.json({ ok: false }, { status: 503 })
      if (new URL(req.url!).searchParams.get('key') !== key) return Response.json({ ok: false }, { status: 401 })
      const b = ((await req.json?.().catch(() => null)) ?? {}) as { OrderCode?: string; Status?: string }
      if (!b.OrderCode || !b.Status) return Response.json({ ok: false }, { status: 400 })
      const s = (await req.payload.find({ collection: 'shipments' as any, where: { trackingCode: { equals: b.OrderCode } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
      if (s) await applyGhnStatus(req.payload, s.id, b.Status)
      return Response.json({ ok: true })
    },
  },
]

const trackBlock: BlockSchema<{ heading: string }> = {
  type: 'ShippingTrack',
  label: 'Tra cứu vận đơn',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Tra cứu vận đơn' },
}

const css = `
.wp-ship{max-width:40rem;margin:0 auto;padding:calc(var(--hs-space)*2) var(--hs-space)}
.wp-ship h2{font-family:var(--hs-font-heading)}
.wp-ship-form{display:grid;gap:var(--hs-space)}.wp-ship-form label{display:grid;gap:.25rem;font-weight:600}
.wp-ship input{font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.wp-ship button{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.wp-ship dl{display:grid;grid-template-columns:max-content 1fr;gap:.35rem 1.5rem;margin:1.5rem 0}.wp-ship dt{color:var(--hs-muted)}.wp-ship dd{margin:0}
.wp-ship a{color:var(--hs-primary)}
`

/** Plugin giao vận: đơn giao tận nơi (từ bất kỳ plugin bán hàng nào phát `onOrderPlaced`) tự thành một vận đơn trong Studio. */
const plugin: HossoPlugin = {
  id: 'shipping',
  manifest: manifest as PluginManifest,
  blocks: [trackBlock],
  fallbackRenderers: { ShippingTrack: (props) => React.createElement(Track, { heading: props.heading }) },
  css,
  adminEn: { 'Giao vận': 'Shipping', 'Tra cứu vận đơn': 'Track shipment', 'Tiêu đề': 'Heading' },
  payload: (config: Config): Config => ({
    ...config,
    collections: [...(config.collections ?? []), Shipments],
    globals: [...(config.globals ?? []), Settings],
    endpoints: [...(config.endpoints ?? []), ...endpoints],
  }),
  hooks: {
    // Thêm phí vận chuyển vào tổng đơn giao tận nơi: GHN (nếu bật) hoặc phí cố định; miễn phí khi đủ giá trị đơn.
    beforeOrder: async ({ payload, draft }) => {
      if (draft.fulfillment.type !== 'delivery') return
      const cfg = (await payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) as { flatFee?: number; freeShipOver?: number; useGhnFee?: boolean } | null
      if (!cfg) return
      if (cfg.freeShipOver && draft.subtotal >= cfg.freeShipOver) return
      let fee = cfg.flatFee ?? 0
      const ghn = cfg.useGhnFee && draft.customer.address ? await getGhnConfig(payload) : null
      if (ghn) {
        try {
          fee = await getGhnFee(ghn, draft.customer.address!, draft.subtotal)
        } catch {
          // GHN không tính được (địa chỉ chưa nhận ra, lỗi mạng): dùng phí cố định.
        }
      }
      if (fee > 0) draft.adjustments.push({ label: draft.meta.locale === 'en' ? 'Shipping fee' : 'Phí vận chuyển', amount: fee, source: 'shipping' })
    },
    onOrderPlaced: async ({ payload, order, customer, fulfillment, payment }) => {
      if (fulfillment.type !== 'delivery') return
      try {
        const created = (await payload.create({
          collection: 'shipments' as any,
          overrideAccess: true,
          data: { orderId: order.id, customerName: customer.name, phone: customer.phone, address: customer.address, orderTotal: order.total, paymentMethod: payment },
        })) as unknown as Shipment
        await tryCreateGhn(payload, created)
      } catch {
        // orderId đã có (WIM trả lại đơn cũ khi thử lại): bỏ qua, không ghi trùng.
      }
    },
  },
}

export default plugin
