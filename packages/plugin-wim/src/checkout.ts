import type { Payload } from 'payload'
import { WimError, wimFetch, wimGet } from './client'
import type { Availability, Branch, CreateOrder, Order, Product } from './client'
import { getWimConfig } from './config'
import { trFor } from './i18n'
import type { HossoPlugin, OrderLine } from '@hosso/studio-blocks'

// Luồng D: khách đặt đơn. Toàn bộ chạy trên server của site; trình duyệt không gọi WIM trực tiếp.

export type CheckoutBody = {
  cartId?: unknown
  items?: unknown
  customer?: { name?: unknown; phone?: unknown; address?: unknown; note?: unknown }
  fulfillment?: { type?: unknown; branchId?: unknown }
  website?: unknown // ô bẫy bot
  locale?: unknown
}

export type CheckoutResult =
  | { status: 200; body: { ok: true; order: { id: string; status: string; total: number }; phone4: string } }
  | { status: number; body: { ok: false; code: string; message: string; productId?: string; available?: number } }

const fail = (status: number, code: string, message: string, extra: { productId?: string; available?: number } = {}): CheckoutResult => ({
  status,
  body: { ok: false, code, message, ...extra },
})

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const PHONE = /^(\+?84|0)\d{8,10}$/
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Idempotency-Key gắn với giỏ hàng: cùng giỏ (cartId) + cùng nội dung -> cùng khóa; sửa giỏ/thông tin -> khóa mới. */
export async function idempotencyKey(cartId: string, payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(`${cartId}:${JSON.stringify(payload)}`)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return `hs-${[...hash].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)}`
}

export async function placeOrder(payload: Payload, input: CheckoutBody, headers = new Headers()): Promise<CheckoutResult> {
  const tr = trFor(String(input.locale ?? '').slice(0, 8))
  if (input.website) return fail(400, 'bad_request', tr('co.badRequest')) // bẫy bot

  // --- Kiểm tra dữ liệu khách gửi ---
  const cartId = text(input.cartId, 64)
  const rawItems = Array.isArray(input.items) ? input.items : []
  const items = rawItems
    .slice(0, 50)
    .map((i: any) => ({ productId: text(i?.productId, 64), quantity: Math.floor(Number(i?.quantity)) }))
    .filter((i) => i.productId && i.quantity >= 1 && i.quantity <= 99)
  const phone = text(input.customer?.phone, 20).replace(/[\s.\-()]/g, '')
  const name = text(input.customer?.name, 120)
  const address = text(input.customer?.address, 300)
  const note = text(input.customer?.note, 500)
  const type = input.fulfillment?.type
  const branchId = text(input.fulfillment?.branchId, 32)

  if (!cartId || cartId.length < 8) return fail(400, 'bad_request', tr('co.cart'))
  if (!items.length || items.length !== rawItems.length) return fail(400, 'bad_request', tr('co.emptyCart'))
  if (!name) return fail(400, 'bad_request', tr('co.name'))
  if (!PHONE.test(phone)) return fail(400, 'bad_request', tr('co.phone'))
  if (type !== 'delivery' && type !== 'pickup') return fail(400, 'bad_request', tr('co.fulfillment'))
  if (type === 'delivery' && !address) return fail(400, 'bad_request', tr('co.address'))
  if (type === 'pickup' && !branchId) return fail(400, 'bad_request', tr('co.branchPick'))

  const cfg = await getWimConfig(payload)
  if (!cfg) return fail(503, 'unavailable', tr('co.unavailable'))

  try {
    if (type === 'pickup') {
      const branches = await wimGet<{ items: Branch[] }>(cfg, '/v1/branches', {}, ['list'], 10)
      if (!branches.items.some((b) => b.id === branchId)) return fail(400, 'bad_request', tr('co.branchBad'))
    }

    // 1. Kiểm tra lại tồn kho ngay lúc đặt (không dùng cache), theo chi nhánh nếu nhận tại chi nhánh.
    const orderLines: OrderLine[] = []
    for (const line of items) {
      let availability: Availability
      try {
        availability = await wimFetch<Availability>(cfg, `/v1/products/${encodeURIComponent(line.productId)}/availability`)
      } catch (e) {
        if (e instanceof WimError && e.status === 404) return fail(409, 'product_not_found', tr('co.productGone'), { productId: line.productId })
        throw e
      }
      const available =
        type === 'pickup'
          ? (availability.branches.find((b) => b.branchId === branchId)?.available ?? 0)
          : availability.branches.reduce((sum, b) => sum + b.available, 0)
      orderLines.push({ productId: line.productId, name: line.productId, code: line.productId, quantity: line.quantity, price: availability.price })
      if (available < line.quantity) {
        const product = await wimGet<Product>(cfg, `/v1/products/${encodeURIComponent(line.productId)}`, {}, [`product:${line.productId}`]).catch(() => null)
        return fail(409, 'out_of_stock', `${product?.name ?? tr('co.product')} ${tr('co.outOfStock')}`, { productId: line.productId, available })
      }
    }

    // 2. Idempotency-Key gắn với giỏ hàng.
    const order: CreateOrder = {
      items,
      customer: { name, phone, ...(address && { address }), ...(note && { note }) },
      fulfillment: type === 'pickup' ? { type, branchId } : { type },
    }
    const key = await idempotencyKey(cartId, order)

    // WIM owns pricing; only run the partner guard, not Shop fee/discount hooks.
    const guard = (payload.config.custom?.hossoPlugins as HossoPlugin[] | undefined)?.find((p) => p.id === 'cross-sell')?.hooks?.beforeOrder
    const guarded = await guard?.({ payload, headers, source: 'wim', draft: {
      items: orderLines, subtotal: orderLines.reduce((s, l) => s + l.price * l.quantity, 0), adjustments: [],
      customer: { name, phone, address }, fulfillment: { type, ...(branchId && { branchId }) }, payment: 'cod', meta: {},
    } })
    if (guarded?.reject) return fail(409, guarded.reject.code, guarded.reject.message)


    const affiliate = (payload.config.custom?.hossoPlugins as HossoPlugin[] | undefined)?.find((p) => p.id === 'affiliate')
    await affiliate?.hooks?.beforeOrder?.({ payload, headers, source: 'wim', draft: { items: orderLines, subtotal: orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0), adjustments: [], customer: { name, phone, address }, fulfillment: { type }, payment: 'cod', meta: { affiliateOrderKey: key } } })

    // 3. Tạo đơn. Lỗi mạng/timeout: thử lại với CÙNG khóa (WIM trả lại đơn cũ nếu lần trước đã tạo xong, không tạo đơn thứ hai).
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await sleep(300 * attempt)
      try {
        const created = await wimFetch<Order>(cfg, '/v1/orders', { method: 'POST', body: order, headers: { 'Idempotency-Key': key } })
        await affiliate?.hooks?.onOrderPlaced?.({ payload, headers, source: 'wim', order: { id: created.id, total: created.total, status: created.status }, customer: { name, phone, address }, fulfillment: { type }, meta: { affiliateOrderKey: key } })
        return { status: 200, body: { ok: true, order: { id: created.id, status: created.status, total: created.total }, phone4: phone.slice(-4) } }
      } catch (e) {
        lastError = e
        const retryable = e instanceof WimError && (e.kind === 'timeout' || e.kind === 'network' || (e.kind === 'http' && (e.status ?? 0) >= 500))
        if (!retryable) throw e
      }
    }
    throw lastError
  } catch (e) {
    if (e instanceof WimError) {
      if (e.status === 409 && e.code === 'out_of_stock') return fail(409, 'out_of_stock', `${e.body?.error?.productId ?? tr('co.product')} ${tr('co.outOfStock')}`, { productId: e.body?.error?.productId })
      if (e.kind === 'timeout' || e.kind === 'network' || (e.status ?? 0) >= 500)
        return fail(504, 'wim_unavailable', tr('co.wimSlow'))
      return fail(e.status && e.status < 500 ? 400 : 502, 'wim_rejected', tr('co.rejected'))
    }
    payload.logger.error(e)
    return fail(500, 'internal', tr('co.internal'))
  }
}
