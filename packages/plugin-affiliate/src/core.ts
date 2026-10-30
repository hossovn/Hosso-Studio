export const DAY = 86_400_000
export const REF_COOKIE = 'hs_aff_visit'
export type Snapshot = { affiliate: string | number; click: string | number; type: 'percent' | 'fixed'; rate: number; base: number; holdDays: number; selfReferral: boolean }
export type OrderState = { id: string; status: string; paymentStatus?: string; total: number; refundedAmount?: number; completedAt?: string | null }

export class AffiliateError extends Error {}
export function check(value: unknown, message: string): asserts value {
  if (!value) throw new AffiliateError(message)
}
export function money(value: unknown): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'Invalid VND amount')
  return value
}
export function eligibleAmount(subtotal: unknown, adjustments: { amount: number; source?: string; scope?: 'goods' | 'shipping' }[] = []) {
  const base = money(subtotal)
  for (const a of adjustments) check(Number.isSafeInteger(a.amount), 'Invalid order adjustment')
  return Math.max(0, base + adjustments.filter((a) => a.amount < 0 && a.source !== 'shipping' && a.scope !== 'shipping').reduce((sum, a) => sum + a.amount, 0))
}
export function commission(snapshot: Snapshot, refunded = 0) {
  const remaining = Math.max(0, money(snapshot.base) - money(refunded))
  check(Number.isFinite(snapshot.rate) && snapshot.rate >= 0 && (snapshot.type !== 'percent' || snapshot.rate <= 100), 'Invalid commission rate')
  // Fixed commission is per order and prorated on the remaining eligible goods after a partial refund.
  const amount = snapshot.type === 'percent' ? remaining * snapshot.rate / 100 : snapshot.base ? snapshot.rate * remaining / snapshot.base : 0
  return Math.min(remaining, money(Math.round(amount)))
}
export function evaluate(snapshot: Snapshot, order: OrderState, now = Date.now()) {
  const cancelled = ['cancelled', 'refunded', 'returned', 'failed'].includes(order.status) || order.paymentStatus === 'refunded'
  const amount = cancelled ? 0 : commission(snapshot, order.refundedAmount ?? 0)
  const completed = order.completedAt ? Date.parse(order.completedAt) : NaN
  const eligibleAt = Number.isFinite(completed) ? new Date(completed + snapshot.holdDays * DAY).toISOString() : null
  const status = !amount ? 'cancelled' : snapshot.selfReferral ? 'review' : order.paymentStatus !== 'paid' ? 'pending' : order.status !== 'completed' || !eligibleAt || Date.parse(eligibleAt) > now ? 'holding' : 'eligible'
  return { commission: amount, status, eligibleAt }
}
export const idOf = (value: any): string | number => value && typeof value === 'object' ? value.id : value
export const cookie = (headers: Headers, name: string) => headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1)
export const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase()
export function sameOrigin(headers: Headers, url: string) {
  const origin = headers.get('origin')
  const host = headers.get('host')
  check(!origin || origin === (host ? new URL(url).protocol + '//' + host : new URL(url).origin), 'Cross-origin action rejected')
}
