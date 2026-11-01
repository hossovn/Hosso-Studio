export const DAY = 86_400_000
export const REF_COOKIE = 'hs_aff_visit'
export type CommissionLine = { productId: string; variantId?: string; base: number; rate: number; source: 'product' | 'category' | 'affiliate' | 'default' }
export type Snapshot = { affiliate: string | number; click?: string | number; type: 'percent' | 'fixed'; rate: number; base: number; holdDays: number; selfReferral: boolean; lines?: CommissionLine[]; attribution?: 'link' | 'assisted' }
export type OrderState = { id: string; status: string; paymentStatus?: string; total: number; refundedAmount?: number; refundedLines?: Record<string, number>; completedAt?: string | null }

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
export function commission(snapshot: Snapshot, refunded = 0, refundedLines?: Record<string, number>) {
  const remaining = Math.max(0, money(snapshot.base) - money(refunded))
  if (snapshot.lines?.length) {
    check(snapshot.lines.reduce((sum, l) => sum + money(l.base), 0) === snapshot.base, 'Commission line bases do not match the order')
    let refundedTotal = 0
    const raw = snapshot.lines.reduce((sum, line) => {
      check(Number.isFinite(line.rate) && line.rate >= 0 && line.rate <= 100, 'Invalid line commission rate')
      const refund = refundedLines ? money(refundedLines[`${line.productId}${line.variantId ? ':' + line.variantId : ''}`] ?? 0) : 0
      check(refund <= line.base, 'Line refund exceeds eligible goods')
      refundedTotal += refund
      return sum + (line.base - refund) * line.rate / 100
    }, 0)
    if (refundedLines) check(refundedTotal === refunded && Object.keys(refundedLines).every((key) => snapshot.lines!.some((l) => `${l.productId}${l.variantId ? ':' + l.variantId : ''}` === key)), 'Line refunds must match cumulative refunded goods')
    return Math.min(remaining, money(Math.round(refundedLines ? raw : snapshot.base ? raw * remaining / snapshot.base : 0)))
  }
  check(Number.isFinite(snapshot.rate) && snapshot.rate >= 0 && (snapshot.type !== 'percent' || snapshot.rate <= 100), 'Invalid commission rate')
  // Fixed commission is per order and prorated on the remaining eligible goods after a partial refund.
  const amount = snapshot.type === 'percent' ? remaining * snapshot.rate / 100 : snapshot.base ? snapshot.rate * remaining / snapshot.base : 0
  return Math.min(remaining, money(Math.round(amount)))
}

/** Largest remainders preserve whole VND and the exact discounted/refunded order base. */
export function allocate(total: number, weights: number[]): number[] {
  money(total)
  const sum = weights.reduce((n, v) => n + money(v), 0)
  if (!sum) return weights.map(() => 0)
  const raw = weights.map((w) => total * w / sum)
  const result = raw.map(Math.floor)
  const order = raw.map((n, i) => ({ i, fraction: n - result[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  for (let n = total - result.reduce((a, b) => a + b, 0), i = 0; i < n; i++) result[order[i].i]++
  return result
}

export function nextPayoutDate(now = new Date(), timeZone = 'Asia/Ho_Chi_Minh') {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')!.value), month = Number(parts.find((p) => p.type === 'month')!.value)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${lastDay}`
}
export function evaluate(snapshot: Snapshot, order: OrderState, now = Date.now()) {
  const cancelled = ['cancelled', 'refunded', 'returned', 'failed'].includes(order.status) || order.paymentStatus === 'refunded'
  const amount = cancelled ? 0 : commission(snapshot, order.refundedAmount ?? 0, order.refundedLines)
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
