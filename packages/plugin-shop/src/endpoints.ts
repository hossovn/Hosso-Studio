import { collectOrderExtras, emitBeforeOrder, emitOrderPlaced, orderTotal, type OrderAdjustment, type OrderDraft, type OrderLine } from '@hosso/studio-blocks'
import type { Endpoint, Payload, PayloadRequest, Where } from 'payload'
import { COLUMNS, parseCsv, toCsv } from './csv'
import { card, pricingOf } from './loaders'
import { adjustStock } from './stock'
import { hasStock } from './product-content'
import { priceOf, slugify, type Product } from './util'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const PHONE = /^(\+?84|0)\d{8,10}$/
const isManager = (req: PayloadRequest) => {
  const r = (req.user as { roles?: string[] } | null)?.roles
  return Boolean(r?.includes('admin') || r?.includes('publisher'))
}
const fail = (status: number, code: string, message: string, extra: object = {}) => json({ ok: false, code, message, ...extra }, status)

type OrderDoc = { id: number | string; orderNo: string; status: string; total: number; subtotal?: number; adjustments?: OrderAdjustment[]; phone: string; email?: string; items: OrderLine[]; paymentMethod: string; paymentStatus: string; fulfillmentType: string }
const publicOrder = (o: OrderDoc) => ({ id: o.orderNo, status: o.status, total: o.total, subtotal: o.subtotal ?? o.total, adjustments: (o.adjustments ?? []).map(({ label, amount }) => ({ label, amount })), payment: o.paymentMethod, paymentStatus: o.paymentStatus, fulfillment: o.fulfillmentType, items: o.items.map(({ name, quantity, price }) => ({ name, quantity, price })) })

type Prepared = { draft: OrderDraft; stock: Record<string, number>; cartId: string; note: string }

/** Đọc và kiểm tra giỏ hàng, lấy giá và tồn kho từ DB (không tin giá từ trình duyệt), dựng đơn nháp. `quote` bỏ qua các trường khách chưa nhập. */
async function prepare(req: PayloadRequest, input: Record<string, any>, quote: boolean): Promise<Prepared | Response> {
  const { payload } = req
  if (input.website) return fail(400, 'bad_request', 'bad_request') // ô bẫy bot
  const cartId = text(input.cartId, 64)
  const rawItems = Array.isArray(input.items) ? input.items : []
  const lines = rawItems
    .slice(0, 50)
    .map((i: any) => ({ productId: text(i?.productId, 40), variantId: text(i?.variantId, 40), quantity: Math.floor(Number(i?.quantity)) }))
    .filter((i) => i.productId && i.quantity >= 1 && i.quantity <= 99)
  const name = text(input.customer?.name, 120)
  const phone = text(input.customer?.phone, 20).replace(/[\s.\-()]/g, '')
  const address = text(input.customer?.address, 300)
  const email = text(input.customer?.email, 200).toLowerCase()
  const note = text(input.customer?.note, 500)
  const type = input.fulfillment?.type === 'pickup' ? 'pickup' : 'delivery'
  const payment = input.payment === 'bank' ? 'bank' : 'cod'

  if (!lines.length || lines.length !== rawItems.length) return fail(400, 'bad_request', 'empty')
  if (!quote) {
    if (cartId.length < 8) return fail(400, 'bad_request', 'cart')
    if (!name) return fail(400, 'bad_request', 'name')
    if (!PHONE.test(phone)) return fail(400, 'bad_request', 'phone')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'bad_request', 'email')
    if (type === 'delivery' && !address) return fail(400, 'bad_request', 'address')
  }

  const items: OrderLine[] = []
  const stock: Record<string, number> = {}
  for (const l of lines) {
    const p = (await payload.findByID({ collection: 'shop-products' as any, id: l.productId, depth: 0, overrideAccess: true }).catch(() => null)) as unknown as (Product & { active?: boolean }) | null
    if (!p || p.active === false) return fail(409, 'product_not_found', 'gone', { productId: l.productId })
    // Sản phẩm có biến thể: khách phải chọn một biến thể; giá và tồn kho lấy theo biến thể.
    let price = priceOf(p)
    let name = p.name
    let available = p.stock
    let code = p.code ?? ''
    if (p.variants?.length) {
      const v = p.variants.find((x) => x.id === l.variantId)
      if (!v) return fail(409, 'product_not_found', 'gone', { productId: l.productId })
      if (v.price && v.price > 0) price = v.price
      name = `${p.name} (${v.name})`
      available = v.stock ?? 0
      code = v.sku || code
    }
    if (p.variants?.length ? available < l.quantity : !hasStock(p, l.quantity)) return fail(409, 'out_of_stock', 'stock', { productId: l.productId, name, available })
    items.push({ productId: String(p.id), ...(p.variants?.length && { variantId: l.variantId }), name, code, price, quantity: l.quantity })
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const meta = typeof input.meta === 'object' && input.meta ? (input.meta as Record<string, unknown>) : {}
  return { draft: { items, subtotal, adjustments: [], customer: { name, phone, address, email }, fulfillment: { type }, payment, meta }, stock, cartId, note }
}

/** Cho plugin điều chỉnh đơn nháp (phí ship, giảm giá); lỗi thì trả Response từ chối. */
async function priced(req: PayloadRequest, p: Prepared) {
  const rejected = await emitBeforeOrder(req.payload, p.draft, req.headers, 'shop')
  if (rejected) return fail(400, rejected.code, rejected.message)
  return { total: orderTotal(p.draft) }
}

export async function placeOrder(req: PayloadRequest, input: Record<string, any>) {
  const { payload } = req
  const p = await prepare(req, input, false)
  if (p instanceof Response) return p

  // Thử lại cùng giỏ (mạng chập chờn): trả đơn cũ, không tạo đơn thứ hai.
  const dup = (await payload.find({ collection: 'shop-orders' as any, where: { cartId: { equals: p.cartId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as OrderDoc | undefined
  if (dup) return json({ ok: true, order: { id: dup.orderNo, status: dup.status, total: dup.total }, phone4: p.draft.customer.phone.slice(-4) })

  const price = await priced(req, p)
  if (price instanceof Response) return price
  const { draft } = p
  const { total } = price

  // ponytail: đọc-kiểm-trừ tồn kho không nằm trong một giao dịch DB; hai đơn cùng lúc cho món cuối có thể cùng qua. Dùng transaction khi lưu lượng lớn.
  const order = (await payload.create({
    collection: 'shop-orders' as any,
    req,
    overrideAccess: true,
    context: req.context,
    data: { cartId: p.cartId, subtotal: draft.subtotal, adjustments: draft.adjustments, total, paymentMethod: draft.payment, fulfillmentType: draft.fulfillment.type, customerName: draft.customer.name, phone: draft.customer.phone, email: draft.customer.email, address: draft.customer.address, note: p.note, items: draft.items },
  })) as unknown as OrderDoc
  const orderNo = `SO-${String(order.id).padStart(6, '0')}`
  await payload.update({ collection: 'shop-orders' as any, id: order.id, req, data: { orderNo }, overrideAccess: true, context: { skipStatusEvent: true } })
  for (const i of draft.items) await adjustStock(payload, i.productId, i.variantId, -i.quantity)

  const { redirectUrl } = await emitOrderPlaced(payload, { headers: req.headers, order: { id: orderNo, total, status: 'new' }, customer: draft.customer, fulfillment: draft.fulfillment, items: draft.items, subtotal: draft.subtotal, adjustments: draft.adjustments, payment: draft.payment, meta: draft.meta, source: 'shop' })
  return json({ ok: true, order: { id: orderNo, status: 'new', total }, phone4: draft.customer.phone.slice(-4), redirectUrl })
}

/** Nhập CSV: cập nhật theo `code` (mã sản phẩm), chưa có thì tạo; danh mục theo tên (chưa có thì tạo); ảnh theo tên tệp đã có trong Media. */
async function importCsv(payload: Payload, csv: string) {
  const [head, ...rows] = parseCsv(csv)
  if (!head) return { created: 0, updated: 0, errors: ['empty'] }
  const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]))
  if (col.name === undefined) return { created: 0, updated: 0, errors: ['missing column: name'] }
  const get = (r: string[], k: string) => (col[k] === undefined ? '' : (r[col[k]] ?? '').trim())
  const cats = new Map<string, number | string>()
  let created = 0
  let updated = 0
  const errors: string[] = []
  for (const [n, r] of rows.entries()) {
    try {
      const name = get(r, 'name')
      if (!name) throw new Error('name is empty')
      let category: number | string | undefined
      const catName = get(r, 'category')
      if (catName) {
        if (!cats.has(catName)) {
          const found = (await payload.find({ collection: 'shop-categories' as any, where: { name: { equals: catName } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
          cats.set(catName, found ? found.id : (await payload.create({ collection: 'shop-categories' as any, data: { name: catName }, overrideAccess: true })).id)
        }
        category = cats.get(catName)
      }
      const imageName = get(r, 'image')
      const media = imageName ? (await payload.find({ collection: 'media', where: { filename: { equals: imageName } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] : undefined
      const num = (k: string) => (get(r, k) === '' ? undefined : Number(get(r, k)))
      const data: Record<string, unknown> = {
        name,
        brand: get(r, 'brand') || undefined,
        price: num('price') ?? 0,
        salePrice: num('salePrice'),
        stock: num('stock') ?? 0,
        makes: get(r, 'makes') ? get(r, 'makes').split(/[,;|]/).map((m) => slugify(m)).filter(Boolean) : undefined,
        description: get(r, 'description') || undefined,
        active: get(r, 'active') === '' ? true : !/^(0|false|no|không)$/i.test(get(r, 'active')),
        ...(category !== undefined && { category }),
        ...(media && { images: [{ image: media.id }] }),
      }
      const code = get(r, 'code')
      const existing = code ? (await payload.find({ collection: 'shop-products' as any, where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] : undefined
      if (existing) {
        await payload.update({ collection: 'shop-products' as any, id: existing.id, data, overrideAccess: true })
        updated++
      } else {
        await payload.create({ collection: 'shop-products' as any, data: { ...data, code: code || undefined }, overrideAccess: true })
        created++
      }
    } catch (e) {
      errors.push(`#${n + 2}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { created, updated, errors }
}

// ponytail: giới hạn tần suất gửi đánh giá nằm trong bộ nhớ của một tiến trình; dùng Redis hoặc bảng riêng khi chạy nhiều bản.
const reviewHits = new Map<string, number[]>()

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const vndText = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')} đ`

/** Trang in đơn hàng + phiếu giao hàng (A4), mở từ admin; chỉ admin/publisher. */
async function printPage(req: PayloadRequest) {
  const key = text(new URL(req.url!).searchParams.get('id'), 40)
  const where: Where = /^\d+$/.test(key) ? { id: { equals: Number(key) } } : { orderNo: { equals: key } }
  const o = (await req.payload.find({ collection: 'shop-orders' as any, where, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as
    | (OrderDoc & { customerName: string; address?: string; note?: string; createdAt: string })
    | undefined
  if (!o) return new Response('Not found', { status: 404 })
  const site = (await req.payload.findGlobal({ slug: 'site-settings' as any, depth: 0, overrideAccess: true }).catch(() => null)) as { siteName?: string; contact?: { phone?: string; address?: string } } | null
  const cod = o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' ? o.total : 0
  const rows = o.items.map((i) => `<tr><td>${esc(i.name)}</td><td class="r">${i.quantity}</td><td class="r">${vndText(i.price)}</td><td class="r">${vndText(i.price * i.quantity)}</td></tr>`).join('')
  const adj = (o.adjustments ?? []).map((a) => `<tr><td colspan="3">${esc(a.label)}</td><td class="r">${a.amount < 0 ? '−' : '+'}${vndText(Math.abs(a.amount))}</td></tr>`).join('')
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(o.orderNo)}</title><style>
body{font:14px/1.5 Arial,sans-serif;margin:0;padding:24px;color:#111}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}.r{text-align:right}.tot td{font-weight:700}
.label{border:2px dashed #111;padding:14px;margin-top:28px;page-break-inside:avoid}.big{font-size:18px;font-weight:700}
@media print{.noprint{display:none}body{padding:0}}</style></head><body>
<p class="noprint"><button onclick="print()">In / Print</button></p>
<h1>${esc(site?.siteName ?? 'Shop')}</h1><p>${esc(site?.contact?.phone ?? '')} ${esc(site?.contact?.address ?? '')}</p>
<h2>Đơn hàng ${esc(o.orderNo)} · ${new Date(o.createdAt).toLocaleString('vi-VN')}</h2>
<p>Khách: <b>${esc(o.customerName)}</b> · ${esc(o.phone)}${o.email ? ' · ' + esc(o.email) : ''}<br>Địa chỉ: ${esc(o.address || '(nhận tại cửa hàng)')}<br>Thanh toán: ${esc(o.paymentMethod)} (${esc(o.paymentStatus)})${o.note ? '<br>Ghi chú: ' + esc(o.note) : ''}</p>
<table><thead><tr><th>Sản phẩm</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead><tbody>${rows}${adj}
<tr class="tot"><td colspan="3">Tổng cộng</td><td class="r">${vndText(o.total)}</td></tr></tbody></table>
<div class="label"><div>PHIẾU GIAO HÀNG · ${esc(o.orderNo)}</div>
<p class="big">${esc(o.customerName)} · ${esc(o.phone)}</p><p>${esc(o.address || '(nhận tại cửa hàng)')}</p>
<p class="big">Thu hộ (COD): ${vndText(cod)}</p><p>Người gửi: ${esc(site?.siteName ?? '')} · ${esc(site?.contact?.phone ?? '')}</p></div>
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export const endpoints: Endpoint[] = [
  {
    path: '/plugins/shop/print',
    method: 'get',
    handler: async (req) => (isManager(req) ? printPage(req) : new Response('Forbidden', { status: 403 })),
  },
  {
    // Danh sách yêu thích: khách gửi các id đã lưu ở trình duyệt, trả thẻ sản phẩm đang bán (tối đa 50).
    path: '/plugins/shop/wishlist',
    method: 'get',
    handler: async (req) => {
      const ids = text(new URL(req.url!).searchParams.get('ids'), 1000).split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).slice(0, 50).map(Number)
      if (!ids.length) return json({ items: [] })
      const r = await req.payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { id: { in: ids } }] }, limit: 50, depth: 2, pagination: false, overrideAccess: true })
      const pr = await pricingOf(req.payload)
      return json({ items: (r.docs as unknown as Product[]).map((p) => card(p, pr)) })
    },
  },
  {
    // Khách gửi đánh giá: chờ quản trị viên duyệt; bẫy bot, tối đa 3 đánh giá mỗi giờ mỗi địa chỉ.
    path: '/plugins/shop/review',
    method: 'post',
    handler: async (req) => {
      const b = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
      if (b.website) return json({ ok: true }) // bẫy bot: giả vờ thành công
      const name = text(b.name, 80)
      const rating = Math.round(Number(b.rating))
      if (!name) return fail(400, 'bad_request', 'name')
      if (!(rating >= 1 && rating <= 5)) return fail(400, 'bad_request', 'rating')
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local'
      const now = Date.now()
      const hits = (reviewHits.get(ip) ?? []).filter((t) => now - t < 3600_000)
      if (hits.length >= 3) return fail(429, 'too_many', 'too_many')
      reviewHits.set(ip, [...hits, now])
      const product = await req.payload.findByID({ collection: 'shop-products' as any, id: text(b.productId, 40), depth: 0, overrideAccess: true }).catch(() => null)
      if (!product) return fail(404, 'product_not_found', 'gone')
      await req.payload.create({ collection: 'shop-reviews' as any, data: { product: product.id, name, rating, comment: text(b.comment, 1000), status: 'pending' }, overrideAccess: true })
      return json({ ok: true })
    },
  },
  {
    // Xem trước tổng tiền (phí ship, giảm giá do plugin khác thêm) trước khi đặt, không tạo đơn.
    path: '/plugins/shop/quote',
    method: 'post',
    handler: async (req) => {
      const p = await prepare(req, (await req.json?.().catch(() => null)) ?? {}, true)
      if (p instanceof Response) return p
      const price = await priced(req, p)
      if (price instanceof Response) return price
      return json({ ok: true, subtotal: p.draft.subtotal, adjustments: p.draft.adjustments.map(({ label, amount }) => ({ label, amount })), total: price.total })
    },
  },
  {
    path: '/plugins/shop/checkout',
    method: 'post',
    handler: async (req) => {
      const body = await req.json?.().catch(() => null)
      return placeOrder(req, body ?? {})
    },
  },
  {
    // Khách tra cứu đơn: mã đơn + 4 số cuối điện thoại.
    path: '/plugins/shop/order',
    method: 'get',
    handler: async (req) => {
      const sp = new URL(req.url!).searchParams
      const orderNo = text(sp.get('id'), 40)
      const phone4 = text(sp.get('phone'), 4)
      const o = orderNo ? ((await req.payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as OrderDoc | undefined) : undefined
      if (!o || !/^\d{4}$/.test(phone4) || !o.phone.endsWith(phone4)) return json({ ok: false }, 404)
      const extras = await collectOrderExtras(req.payload, { id: o.orderNo, total: o.total, status: o.status, payment: o.paymentMethod, paymentStatus: o.paymentStatus })
      return json({ ok: true, order: publicOrder(o), extras })
    },
  },
  {
    path: '/plugins/shop/import',
    method: 'post',
    handler: async (req) => {
      if (!isManager(req)) return json({ ok: false, message: 'forbidden' }, 403)
      const csv = await (typeof req.text === 'function' ? req.text() : Promise.resolve(''))
      return json({ ok: true, ...(await importCsv(req.payload, csv)) })
    },
  },
  {
    path: '/plugins/shop/export',
    method: 'get',
    handler: async (req) => {
      if (!isManager(req)) return json({ ok: false, message: 'forbidden' }, 403)
      const docs = (await req.payload.find({ collection: 'shop-products' as any, limit: 10000, depth: 2, pagination: false, overrideAccess: true })).docs as unknown as (Product & { active?: boolean })[]
      const rows = docs.map((p) => [p.code, p.name, p.category?.name, p.brand, p.price, p.salePrice, p.stock, (p.makes ?? []).join(';'), p.description, p.images?.[0]?.image?.filename, p.active === false ? 0 : 1])
      return new Response(toCsv([[...COLUMNS], ...rows]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="products.csv"' } })
    },
  },
]

