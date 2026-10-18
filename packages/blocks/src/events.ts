import type { Payload } from 'payload'
import type { BeforeOrderEvent, DescribeOrderEvent, HossoPlugin, OrderDraft, OrderExtras, OrderPaidEvent, OrderPlacedEvent, OrderStatusChangedEvent } from './types'

const pluginsOf = (payload: Payload) => (payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]

// Lỗi của một plugin chỉ được ghi log: không làm hỏng đơn hàng hay plugin khác (trừ `reject` có chủ đích của beforeOrder).
async function each<E extends { payload: Payload }>(e: E, pick: (p: HossoPlugin) => ((e: E) => Promise<unknown>) | undefined, name: string, onResult?: (r: any, p: HossoPlugin) => void) {
  for (const p of pluginsOf(e.payload)) {
    try {
      const r = await pick(p)?.(e)
      if (r !== undefined) onResult?.(r, p)
    } catch (err) {
      e.payload.logger.error(err, `[${p.id}] ${name}`)
    }
  }
}

/** Cho mọi plugin điều chỉnh đơn đang soạn (thêm phí, giảm giá) hoặc từ chối. Trả về lý do từ chối nếu có. */
export async function emitBeforeOrder(payload: Payload, draft: OrderDraft, headers: Headers, source: string) {
  let rejected: { code: string; message: string } | undefined
  await each<BeforeOrderEvent>({ payload, headers, draft, source }, (p) => p.hooks?.beforeOrder, 'beforeOrder', (r) => {
    if (r?.reject && !rejected) rejected = r.reject
  })
  return rejected
}

/** Tổng đơn = tạm tính + các khoản điều chỉnh (không âm). */
export const orderTotal = (d: Pick<OrderDraft, 'subtotal' | 'adjustments'>) => Math.max(0, Math.round(d.subtotal + d.adjustments.reduce((s, a) => s + a.amount, 0)))

/** Gọi `onOrderPlaced` của mọi plugin. Trả `redirectUrl` đầu tiên (nếu plugin thanh toán yêu cầu chuyển khách sang cổng thanh toán). */
export async function emitOrderPlaced(payload: Payload, e: Omit<OrderPlacedEvent, 'payload'>) {
  let redirectUrl: string | undefined
  await each<OrderPlacedEvent>({ ...e, payload }, (p) => p.hooks?.onOrderPlaced, 'onOrderPlaced', (r) => {
    redirectUrl ??= r?.redirectUrl
  })
  return { redirectUrl }
}

export const emitOrderStatusChanged = (payload: Payload, e: Omit<OrderStatusChangedEvent, 'payload'>) => each<OrderStatusChangedEvent>({ ...e, payload }, (p) => p.hooks?.onOrderStatusChanged, 'onOrderStatusChanged')

export const emitOrderPaid = (payload: Payload, e: Omit<OrderPaidEvent, 'payload'>) => each<OrderPaidEvent>({ ...e, payload }, (p) => p.hooks?.onOrderPaid, 'onOrderPaid')

/** Gom thông tin hiển thị thêm cho khách khi tra cứu đơn. */
export async function collectOrderExtras(payload: Payload, order: DescribeOrderEvent['order']) {
  const extras: OrderExtras = {}
  await each<DescribeOrderEvent>({ payload, order }, (p) => p.hooks?.describeOrder, 'describeOrder', (r) => Object.assign(extras, r))
  return extras
}

/** Đường dẫn do plugin đóng góp cho sitemap. */
export async function collectSitemap(payload: Payload) {
  const out: { path: string; lastModified?: string }[] = []
  for (const p of pluginsOf(payload)) {
    try {
      out.push(...((await p.sitemap?.(payload)) ?? []))
    } catch (err) {
      payload.logger.error(err, `[${p.id}] sitemap`)
    }
  }
  return out
}
