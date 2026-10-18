import type { Payload } from 'payload'
import type { HossoPlugin, OrderPlacedEvent } from './types'

/** Gọi hook `onOrderPlaced` của mọi plugin đã đăng ký. Lỗi của một plugin không ảnh hưởng đơn hàng hay plugin khác. */
export async function emitOrderPlaced(payload: Payload, e: Omit<OrderPlacedEvent, 'payload'>) {
  const plugins = (payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]
  for (const p of plugins) {
    try {
      await p.hooks?.onOrderPlaced?.({ ...e, payload })
    } catch (err) {
      payload.logger.error(err, `[${p.id}] onOrderPlaced`)
    }
  }
}
