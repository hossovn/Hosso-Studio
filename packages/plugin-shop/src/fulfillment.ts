import type { FulfillmentGroup, HossoPlugin, OrderDraft } from '@hosso/studio-blocks'
import type { Payload } from 'payload'

const lineKey = (l: { productId: string; variantId?: string }) => l.productId + (l.variantId ? ':' + l.variantId : '')
export async function fulfillmentGroups(payload: Payload, draft: OrderDraft): Promise<FulfillmentGroup[]> {
  const groups: FulfillmentGroup[] = []
  const used = new Set<string>(), available = new Set(draft.items.map(lineKey))
  for (const plugin of (payload.config.custom?.hossoPlugins || []) as HossoPlugin[]) {
    for (const group of await plugin.commerce?.fulfillmentGroups?.(payload, draft) || []) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(group.key) || groups.some((g) => g.key === group.key) || !group.lineKeys.length || !Number.isSafeInteger(group.fee) || group.fee < 0) throw new Error('Invalid fulfillment configuration')
      for (const key of group.lineKeys) { if (!available.has(key) || used.has(key)) throw new Error('Duplicate or unknown fulfillment line'); used.add(key) }
      groups.push(group)
    }
  }
  const own = draft.items.map(lineKey).filter((key) => !used.has(key))
  if (own.length) groups.unshift({ key: 'store', label: 'Cửa hàng', lineKeys: own, deliveryBy: 'store', codCollector: 'store', fee: 0 })
  return groups
}

function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((n, w) => n + w, 0)
  if (!sum) return weights.map((_, i) => i === 0 ? total : 0)
  const values = weights.map((w) => total * w / sum), result = values.map(Math.floor)
  const remainders = values.map((w, i) => ({ i, remainder: w - result[i] })).sort((a, b) => b.remainder - a.remainder || a.i - b.i)
  for (let i = 0, left = total - result.reduce((n, w) => n + w, 0); i < left; i++) result[remainders[i].i]++
  return result
}

/** Allocate the one customer total once; no supplier may be instructed to collect the full mixed order. */
export function finalizeFulfillment(draft: OrderDraft, total: number) {
  const groups = draft.shipments
  if (!groups?.length) return
  const weights = groups.map((g) => draft.items.filter((line) => g.lineKeys.includes(lineKey(line))).reduce((n, l) => n + l.price * l.quantity, 0))
  const shipping = Math.min(total, Math.max(0, draft.adjustments.filter((a) => a.source === 'shipping' || a.scope === 'shipping').reduce((n, a) => n + a.amount, 0)))
  const fees = allocate(shipping, groups.map((g) => g.fee)), goods = allocate(total - shipping, weights)
  groups.forEach((g, i) => { g.fee = fees[i]; g.codAmount = draft.payment === 'cod' ? goods[i] + fees[i] : 0 })
}
